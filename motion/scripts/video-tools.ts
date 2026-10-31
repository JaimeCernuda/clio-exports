import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
const execute = promisify(execFile);

/** Execute media tools without a shell and retain meaningful failure diagnostics. */
export async function mediaCommand(
  executable: string,
  args: string[],
  cwd?: string,
): Promise<string> {
  try {
    return (
      await execute(executable, args, { maxBuffer: 8 * 1024 * 1024, cwd })
    ).stdout;
  } catch (error) {
    throw new Error(`${executable} failed: ${String(error)}`, { cause: error });
  }
}
/** Hash the exact moving source bytes without loading a whole film into memory. */
export async function videoHash(file: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}
/** Verify the established delivery format and exact frame count. */
export async function verifyVideo(file: string, frames: number) {
  const probe = JSON.parse(
    await mediaCommand("ffprobe", [
      "-v",
      "error",
      "-show_streams",
      "-show_format",
      "-of",
      "json",
      file,
    ]),
  );
  const streams = probe.streams as Array<Record<string, string | number>>;
  const video = streams.find((s) => s.codec_type === "video");
  if (
    !video ||
    streams.length !== 1 ||
    video.width !== 1920 ||
    video.height !== 1080 ||
    video.r_frame_rate !== "60/1" ||
    video.pix_fmt !== "yuv420p" ||
    video.color_space !== "bt709" ||
    video.color_range !== "tv" ||
    Number(video.nb_frames) !== frames
  )
    throw new Error(`Unexpected video format or frame count: ${file}`);
  return {
    frames,
    width: 1920,
    height: 1080,
    fps: 60,
    sha256: await videoHash(file),
    bytes: Number(probe.format.size),
  };
}
export const encodeArgs = [
  "-an",
  "-c:v",
  "libx264",
  "-crf",
  "16",
  "-preset",
  "fast",
  "-pix_fmt",
  "yuv420p",
  "-color_range",
  "tv",
  "-colorspace",
  "bt709",
  "-color_trc",
  "bt709",
  "-color_primaries",
  "bt709",
  "-movflags",
  "+faststart",
];
