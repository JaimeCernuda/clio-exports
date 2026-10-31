import { execFileSync } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Inspect encoded streams without confusing container/audio padding with video duration. */
export function engineeringProbe(filename) {
  return JSON.parse(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "stream=codec_type,width,height,avg_frame_rate,nb_frames:format=duration",
        "-of",
        "json",
        filename,
      ],
      { encoding: "utf8" },
    ),
  );
}
const fpsOf = (stream) => {
  const [n, d] = stream.avg_frame_rate.split("/").map(Number);
  return n / d;
};

/** Join exact video durations and omit silent AAC padding without re-encoding the captured frames. */
export async function assembleEngineeringChunks(chunks, output, fps = 60) {
  if (!chunks.length) throw new Error("No engineering chunks supplied");
  const records = chunks.map((filename) => {
    const probe = engineeringProbe(filename);
    const video = probe.streams.find((s) => s.codec_type === "video");
    if (
      !video ||
      fpsOf(video) !== fps ||
      !Number.isInteger(Number(video.nb_frames)) ||
      Number(video.nb_frames) <= 0
    )
      throw new Error(`Invalid video chunk: ${filename}`);
    return {
      filename,
      frames: Number(video.nb_frames),
      width: video.width,
      height: video.height,
    };
  });
  if (
    records.some(
      (r) => r.width !== records[0].width || r.height !== records[0].height,
    )
  )
    throw new Error("Chunk dimensions differ");
  if (
    chunks.some(
      (c) => path.resolve(c) === path.resolve(output) || /[\r\n']/.test(c),
    )
  )
    throw new Error("Unsafe or overlapping assembly paths");
  const list = output + ".concat.txt";
  await writeFile(
    list,
    records
      .map(
        (r) =>
          `file '${path.resolve(r.filename).replaceAll("\\", "/")}'\nduration ${(r.frames / fps).toFixed(9)}`,
      )
      .join("\n") + "\n",
  );
  execFileSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      list,
      "-map",
      "0:v:0",
      "-c:v",
      "copy",
      "-an",
      "-movflags",
      "+faststart",
      output,
    ],
    { stdio: "inherit" },
  );
  const probe = engineeringProbe(output),
    video = probe.streams.find((s) => s.codec_type === "video"),
    frames = records.reduce((sum, r) => sum + r.frames, 0);
  if (
    !video ||
    fpsOf(video) !== fps ||
    Number(video.nb_frames) !== frames ||
    probe.streams.some((s) => s.codec_type === "audio") ||
    Math.abs(Number(probe.format.duration) - frames / fps) > 0.001
  )
    throw new Error(
      "Assembly failed exact frame-rate, duration, frame-count or silent-track validation",
    );
  await unlink(list);
  return {
    frames,
    fps,
    duration: frames / fps,
    width: video.width,
    height: video.height,
    audio: "absent",
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { readdir } = await import("node:fs/promises");
  const folder = path.resolve(process.argv[2]),
    output = path.resolve(process.argv[3]);
  const chunks = (await readdir(folder))
    .filter((n) => /^\d+-\d+\.mp4$/.test(n))
    .sort((a, b) => Number(a.split("-")[0]) - Number(b.split("-")[0]))
    .map((n) => path.join(folder, n));
  console.log(JSON.stringify(await assembleEngineeringChunks(chunks, output)));
}
