import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { videoHash } from "./video-tools";
import { OPAL_SCENARIO_SHA } from "../native/spotter-pocket-plan";

/** Bound diagnosed body-frame candidates with parked-pointer handles, retaining original source order. */
export function paintRepairRanges(
  candidates: readonly number[],
  poses: Record<number, { x: number; y: number }>,
): { start: number; end: number }[] {
  const parked = (f: number) => {
    const pose = poses[f];
    if (!pose || !Number.isFinite(pose.x) || !Number.isFinite(pose.y))
      throw new Error("Missing measured repair pose " + f);
    return Math.hypot(pose.x - 1260, pose.y - 775) < 0.1;
  };
  if (candidates.some((f) => !Number.isInteger(f) || f < 420 || f >= 15000))
    throw new Error("Inspect out-of-body candidates separately");
  const ranges: { start: number; end: number }[] = [];
  for (const f of [...candidates].sort((a, b) => a - b)) {
    let start = Math.max(420, f - 30),
      end = Math.min(15000, f + 31);
    while (start > 420 && !(parked(start) && parked(start - 1))) start--;
    while (end < 15000 && !(parked(end) && parked(end + 1))) end++;
    const previous = ranges.at(-1);
    if (previous && start <= previous.end)
      previous.end = Math.max(end, previous.end);
    else ranges.push({ start, end });
  }
  return ranges;
}

/** Index measured flash candidates with stable pointer handles and a genuine setup prelude for native focus state. */
async function main(): Promise<void> {
  const root = new URL("../out/spotter-v2/", import.meta.url);
  const video = new URL("spotter-opal-investigation-v2.serial.mp4", root);
  const scan = JSON.parse(
    await readFile(new URL(video.href + ".flash-scan.json"), "utf8"),
  );
  const baseSha256 = await videoHash(fileURLToPath(video));
  if (scan.sha256 !== baseSha256 || scan.frames !== 16406)
    throw new Error("Paint candidates belong to a different encode");
  const poses = JSON.parse(
    await readFile(new URL(video.href + ".cursor.raw.json"), "utf8"),
  ) as Record<number, { x: number; y: number }>;
  const badFrames = (scan.candidates as { frame: number }[])
    .map((c) => c.frame - 450)
    .sort((a, b) => a - b);
  const ranges = paintRepairRanges(badFrames, poses);
  const seedFrames = 300;
  const frames = [
    ...Array.from({ length: seedFrames }, (_, i) => i),
    ...ranges.flatMap((r) =>
      Array.from({ length: r.end - r.start }, (_, i) => r.start + i),
    ),
  ];
  const manifest = {
    sourceSha256: OPAL_SCENARIO_SHA,
    baseSha256,
    seedFrames,
    badFrames,
    ranges,
    frames,
    cause:
      "Native code-container deferred paint and intrinsic placeholder sizing; capture forces full layout",
  };
  await writeFile(
    new URL("../native/spotter-paint-repairs.json", import.meta.url),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log(JSON.stringify({ ranges, frames: frames.length }));
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
