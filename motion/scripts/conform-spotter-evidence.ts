import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mediaCommand, videoHash, encodeArgs } from "./video-tools";

/** Keep editorial repairs on exact frame boundaries without duplicating or dropping conversation time. */
export function replacementParts(total: number, start: number, frames: number) {
  return conformParts(total, [{ start, frames }]);
}

/** Keep multiple ordered corrections on their original film frames; reject overlaps. */
export function conformParts(
  total: number,
  ranges: { start: number; frames: number }[],
) {
  let end = 0;
  const parts: { input: number; start: number; end: number }[] = [];
  if (!Number.isInteger(total) || total < 1)
    throw new Error("Invalid frame-exact replacement range");
  ranges.forEach((range, i) => {
    if (
      ![range.start, range.frames].every(Number.isInteger) ||
      range.start < end ||
      range.frames < 1 ||
      range.start + range.frames > total
    )
      throw new Error("Invalid frame-exact replacement range");
    if (range.start > end)
      parts.push({ input: 0, start: end, end: range.start });
    parts.push({ input: i + 1, start: 0, end: range.frames });
    end = range.start + range.frames;
  });
  if (end < total) parts.push({ input: 0, start: end, end: total });
  return parts;
}

async function probe(file: string, frames: number): Promise<void> {
  const data = JSON.parse(
    await mediaCommand("ffprobe", [
      "-v",
      "error",
      "-show_streams",
      "-of",
      "json",
      file,
    ]),
  );
  const streams = data.streams as Record<string, string | number>[];
  if (
    streams.length !== 1 ||
    streams[0].codec_type !== "video" ||
    streams[0].width !== 1280 ||
    streams[0].height !== 720 ||
    streams[0].r_frame_rate !== "60/1" ||
    Number(streams[0].nb_frames) !== frames
  )
    throw new Error("Unexpected SPOTTER media format: " + file);
}

/** Conform the corrected evidence and selection intervals; full rerenders use the same updated scene code. */
async function main(): Promise<void> {
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../out/spotter-v2",
  );
  const base = path.join(root, "spotter-opal-investigation-v2.base.mp4"),
    output = path.join(root, "spotter-opal-investigation-v2.mp4");
  const total = 16406;
  const patches = [
    {
      file: path.join(root, "evidence-revision.mp4"),
      bodyStart: 7490,
      frames: 898,
      renderedFrames: 1650,
    },
    {
      file: path.join(root, "public-reply-revision.mp4"),
      bodyStart: 8388,
      frames: 712,
      renderedFrames: 712,
    },
    {
      file: path.join(root, "selection-revision.mp4"),
      bodyStart: 12761,
      frames: 1626,
      renderedFrames: 1626,
    },
  ];
  await probe(base, total);
  for (const patch of patches) await probe(patch.file, patch.renderedFrames);
  const parts = conformParts(
    total,
    patches.map((p) => ({ start: 450 + p.bodyStart, frames: p.frames })),
  );
  const filter = parts.map(
    (p, i) =>
      `[${p.input}:v]trim=start_frame=${p.start}:end_frame=${p.end},setpts=PTS-STARTPTS,settb=expr=1/60,format=yuv420p[p${i}]`,
  );
  filter.push(
    parts.map((_, i) => `[p${i}]`).join("") +
      `concat=n=${parts.length}:v=1:a=0[out]`,
  );
  await mediaCommand("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-i",
    base,
    ...patches.flatMap((p) => ["-i", p.file]),
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
  await probe(output, total);
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
  const poses = JSON.parse(
    await readFile(
      path.join(root, "spotter-opal-investigation-v2.base.mp4.cursor.raw.json"),
      "utf8",
    ),
  ) as Record<string, unknown>;
  for (const patch of patches) {
    const updates = JSON.parse(
      await readFile(patch.file + ".cursor.raw.json", "utf8"),
    ) as Record<string, unknown>;
    for (
      let frame = patch.bodyStart;
      frame < patch.bodyStart + patch.frames;
      frame++
    ) {
      if (!updates[frame])
        throw new Error("Missing revised pointer frame " + frame);
      poses[frame] = updates[frame];
    }
  }
  await writeFile(
    output + ".cursor.raw.json",
    JSON.stringify(poses, null, 2) + "\n",
  );
  await writeFile(
    path.join(root, "conform.json"),
    JSON.stringify(
      {
        base: { file: path.basename(base), sha256: await videoHash(base) },
        replacements: await Promise.all(
          patches.map(async (p) => ({
            file: path.basename(p.file),
            sha256: await videoHash(p.file),
            start: 450 + p.bodyStart,
            frames: p.frames,
            renderedFrames: p.renderedFrames,
          })),
        ),
        output: {
          file: path.basename(output),
          frames: total,
          sha256: await videoHash(output),
        },
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
