import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mediaCommand, videoHash, encodeArgs } from "./video-tools";

/** Map a single sequential repair reel onto its original absolute frames without dropping any base frames. */
export function textRepairParts(
  total: number,
  ranges: { start: number; end: number }[],
  intro = 450,
  settleFrames = 0,
  seedFrames = 0,
) {
  if (
    !Number.isInteger(total) ||
    total < 1 ||
    !Number.isInteger(intro) ||
    intro < 0 ||
    !Number.isInteger(settleFrames) ||
    settleFrames < 0 ||
    !Number.isInteger(seedFrames) ||
    seedFrames < 0
  )
    throw new Error("Invalid text-repair range");
  const parts: { input: number; start: number; end: number }[] = [];
  let previous = 0,
    offset = seedFrames;
  for (const range of ranges) {
    const start = intro + range.start,
      end = intro + range.end;
    if (
      ![total, intro, start, end].every(Number.isInteger) ||
      start < previous ||
      end <= start ||
      end > total
    )
      throw new Error("Invalid text-repair range");
    const settledStart = Math.min(end, start + settleFrames);
    if (settledStart > previous)
      parts.push({ input: 0, start: previous, end: settledStart });
    if (settledStart < end)
      parts.push({
        input: 1,
        start: offset + settledStart - start,
        end: offset + end - start,
      });
    offset += end - start;
    previous = end;
  }
  if (previous < total) parts.push({ input: 0, start: previous, end: total });
  return { parts, patchFrames: offset };
}

/** Apply bounded native text repairs to the reviewed film; keep its predecessor until the replacement validates. */
async function main(): Promise<void> {
  const motion = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const root = path.join(motion, "out/spotter-v2");
  const option = (name: string, fallback: string) => {
    const at = process.argv.indexOf(name);
    return at < 0 ? fallback : path.resolve(process.argv[at + 1]);
  };
  const manifest = JSON.parse(
    await readFile(
      option(
        "--manifest",
        path.join(motion, "native/spotter-text-repairs.json"),
      ),
      "utf8",
    ),
  ) as {
    baseSha256: string;
    ranges: { start: number; end: number }[];
    frames: number[];
    badFrames: number[];
    seedFrames?: number;
  };
  const baseArg = process.argv.indexOf("--base");
  const base =
      baseArg >= 0
        ? path.resolve(process.argv[baseArg + 1])
        : path.join(root, "spotter-opal-investigation-v2.mp4"),
    patch = option("--patch", path.join(root, "text-repairs.mp4")),
    output = option(
      "--output",
      path.join(root, "spotter-opal-investigation-v2.reviewed.mp4"),
    );
  if ((await videoHash(base)) !== manifest.baseSha256)
    throw new Error("Text repairs belong to a different encoded base");
  const settleFrames = 3;
  const { parts, patchFrames } = textRepairParts(
    16406,
    manifest.ranges,
    450,
    settleFrames,
    manifest.seedFrames ?? 0,
  );
  const retained = manifest.ranges.flatMap(({ start, end }) =>
    Array.from(
      { length: Math.max(0, end - start - settleFrames) },
      (_, i) => start + settleFrames + i,
    ),
  );
  const retainedSet = new Set(retained);
  if (manifest.badFrames.some((frame) => !retainedSet.has(frame)))
    throw new Error("Settling handles would discard a required text repair");
  const probe = JSON.parse(
    await mediaCommand("ffprobe", [
      "-v",
      "error",
      "-show_streams",
      "-of",
      "json",
      patch,
    ]),
  );
  if (
    probe.streams.length !== 1 ||
    probe.streams[0].width !== 1280 ||
    probe.streams[0].height !== 720 ||
    probe.streams[0].r_frame_rate !== "60/1" ||
    Number(probe.streams[0].nb_frames) !== patchFrames ||
    patchFrames !== manifest.frames.length
  )
    throw new Error("Incomplete text-repair reel");
  const poses = JSON.parse(
    await readFile(base + ".cursor.raw.json", "utf8"),
  ) as Record<string, unknown>;
  const revised = JSON.parse(
    await readFile(patch + ".cursor.raw.json", "utf8"),
  ) as Record<string, unknown>;
  for (const f of retained) {
    if (!revised[f]) throw new Error("Missing repair pose " + f);
    poses[f] = revised[f];
  }
  await writeFile(
    output + ".cursor.raw.json",
    JSON.stringify(poses, null, 2) + "\n",
  );
  await mediaCommand(
    process.execPath,
    [
      path.join(motion, "node_modules/tsx/dist/cli.mjs"),
      path.join(motion, "scripts/audit-spotter-pointer.ts"),
      output + ".cursor.raw.json",
    ],
    motion,
  );
  const filter = parts.map(
    (p, i) =>
      `[${p.input}:v]trim=start_frame=${p.start}:end_frame=${p.end},setpts=PTS-STARTPTS,settb=expr=1/60,format=yuv420p[p${i}]`,
  );
  filter.push(
    parts.map((_, i) => `[p${i}]`).join("") +
      `concat=n=${parts.length}:v=1:a=0[repaired]`,
  );
  // The native approval button receives keyboard focus during setup. Keep its
  // original frame-matched paint; a sparse seek has no preceding focus event.
  // Measured at the fixed 1280x720 stage: only this unchanged control is restored.
  filter.push("[0:v]crop=152:38:338:642,settb=expr=1/60[approval]");
  filter.push("[repaired][approval]overlay=338:642:eof_action=repeat[out]");
  await mediaCommand("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-i",
    base,
    "-i",
    patch,
    "-filter_complex",
    filter.join(";"),
    "-map",
    "[out]",
    "-r",
    "60",
    "-fps_mode",
    "cfr",
    ...encodeArgs,
    output,
  ]);
  const actual = JSON.parse(
    await mediaCommand("ffprobe", [
      "-v",
      "error",
      "-show_streams",
      "-of",
      "json",
      output,
    ]),
  );
  if (
    actual.streams.length !== 1 ||
    Number(actual.streams[0].nb_frames) !== 16406 ||
    actual.streams[0].r_frame_rate !== "60/1"
  )
    throw new Error("Text-repair conformation changed the film duration");
  await mediaCommand("ffmpeg", [
    "-v",
    "error",
    "-xerror",
    "-i",
    output,
    "-f",
    "null",
    "-",
  ]);
  await writeFile(
    path.join(root, "conform-text.json"),
    JSON.stringify(
      {
        baseSha256: manifest.baseSha256,
        patchSha256: await videoHash(patch),
        outputSha256: await videoHash(output),
        ranges: manifest.ranges,
        patchFrames,
        retainedPatchFrames: retained.length,
        settleFrames,
        seedFrames: manifest.seedFrames ?? 0,
        preservedControl: {
          x: 338,
          y: 642,
          width: 152,
          height: 38,
          source: "original frame-matched approval control",
        },
        filmFrames: 16406,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(output);
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
