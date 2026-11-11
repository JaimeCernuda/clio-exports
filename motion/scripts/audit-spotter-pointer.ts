import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  buildSpotterFilmPlan,
  filmPair,
  spotterFilmAt,
} from "../native/spotter-film-plan";
import type { PairedReplay } from "../native/paired-replay";

type Pose = {
  x: number;
  y: number;
  opacity: number;
  count: number;
  paintedFrame?: number;
  intendedX?: number;
  intendedY?: number;
};
type Sample = { frame: number; pose: Pose };

/** Detect paint lag, duplicate owners, missing frames and oscillation in the measured render poses. */
export function auditPointer(
  samples: Sample[],
  expectedFrame: (frame: number) => number = (f) => f,
  range?: { first: number; frames: number },
) {
  const ordered = [...new Map(samples.map((s) => [s.frame, s])).values()].sort(
    (a, b) => a.frame - b.frame,
  );
  const missing: number[] = [],
    stale: number[] = [],
    owners: number[] = [],
    jumps: { frame: number; pixels: number }[] = [],
    reversals: number[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const { frame, pose } = ordered[i];
    if (pose.count !== 1 || pose.opacity !== 1) owners.push(frame);
    if (
      (pose.paintedFrame !== undefined &&
        pose.paintedFrame !== expectedFrame(frame)) ||
      (pose.intendedX !== undefined &&
        pose.intendedY !== undefined &&
        Math.hypot(pose.x - pose.intendedX, pose.y - pose.intendedY) > 0.5)
    )
      stale.push(frame);
    const previous = ordered[i - 1];
    if (!previous) continue;
    for (let f = previous.frame + 1; f < frame; f++) missing.push(f);
    const vx = pose.x - previous.pose.x,
      vy = pose.y - previous.pose.y,
      length = Math.hypot(vx, vy);
    if (frame === previous.frame + 1 && length > 40)
      jumps.push({ frame, pixels: length });
    const before = ordered[i - 2];
    if (!before || before.frame !== frame - 2) continue;
    const ax = previous.pose.x - before.pose.x,
      ay = previous.pose.y - before.pose.y,
      earlier = Math.hypot(ax, ay);
    if (
      length > 2.5 &&
      earlier > 2.5 &&
      ax * vx + ay * vy < -0.25 * length * earlier
    )
      reversals.push(frame);
  }
  const coverageErrors = range
    ? [
        ...(ordered.length !== range.frames ? ["sample count"] : []),
        ...(ordered[0]?.frame !== range.first ? ["first frame"] : []),
        ...(ordered.at(-1)?.frame !== range.first + range.frames - 1
          ? ["last frame"]
          : []),
      ]
    : [];
  return {
    samples: ordered.length,
    first: ordered[0]?.frame,
    last: ordered.at(-1)?.frame,
    missing,
    stale,
    owners,
    jumps,
    reversals,
    coverageErrors,
  };
}

async function main(): Promise<void> {
  const input = process.argv[2];
  if (!input)
    throw new Error(
      "Provide a measured cursor JSON or an in-progress render log",
    );
  const text = await readFile(input, "utf8");
  const samples: Sample[] = input.endsWith(".log")
    ? [...text.matchAll(/__CLIO_CURSOR__(.+)/gu)].flatMap((m) => {
        try {
          return [JSON.parse(m[1]) as Sample];
        } catch {
          return [];
        }
      })
    : Object.entries(JSON.parse(text) as Record<string, Pose>).map(
        ([frame, pose]) => ({ frame: Number(frame), pose }),
      );
  const setup = process.argv.includes("--setup");
  const pair = setup
    ? undefined
    : filmPair(
        JSON.parse(
          await readFile(
            new URL(
              "../native/public/opal-chainB-7795459.native.json",
              import.meta.url,
            ),
            "utf8",
          ),
        ) as PairedReplay,
      );
  const audit = auditPointer(
    samples,
    pair
      ? (frame) => {
          const p = spotterFilmAt(pair, frame);
          return p.inspectionFrame ?? p.replayFrame;
        }
      : undefined,
    input.endsWith(".log")
      ? undefined
      : {
          first: process.argv.includes("--first")
            ? Number(process.argv[process.argv.indexOf("--first") + 1])
            : 0,
          frames: process.argv.includes("--frames")
            ? Number(process.argv[process.argv.indexOf("--frames") + 1])
            : pair
              ? buildSpotterFilmPlan(pair).frames
              : 300,
        },
  );
  const receipt = {
    ...audit,
    coverage: input.endsWith(".log")
      ? "partial render log"
      : "completed render poses",
    failed:
      audit.stale.length +
        audit.missing.length +
        audit.coverageErrors.length +
        audit.owners.length +
        audit.jumps.length +
        audit.reversals.length >
      0,
  };
  if (!input.endsWith(".log"))
    await writeFile(
      input + ".audit.json",
      JSON.stringify(receipt, null, 2) + "\n",
    );
  console.log(JSON.stringify(receipt));
  if (receipt.failed) process.exitCode = 1;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
