/** Encode deployment videos and stable-palette GIFs from a website composition. */
import { execFileSync } from "node:child_process";
import path from "node:path";
const ff = (args) =>
  execFileSync("ffmpeg", ["-v", "error", "-y", ...args], {
    stdio: ["ignore", "ignore", "pipe"],
  });
export function encodeWebsite(asset, native, output) {
  const mp4 = path.join(output, "loop.mp4");
  ff([
    "-i",
    native,
    "-vf",
    "scale=in_range=auto:out_range=tv:out_color_matrix=bt709,format=yuv420p",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "18",
    "-an",
    "-color_range",
    "tv",
    "-colorspace",
    "bt709",
    "-color_primaries",
    "bt709",
    "-color_trc",
    "bt709",
    "-movflags",
    "+faststart",
    mp4,
  ]);
  ff([
    "-i",
    mp4,
    "-c:v",
    "libvpx-vp9",
    "-b:v",
    "0",
    "-crf",
    "28",
    "-row-mt",
    "1",
    "-threads",
    "4",
    "-cpu-used",
    "5",
    "-an",
    path.join(output, "loop.webm"),
  ]);
  ff([
    "-i",
    mp4,
    "-filter_complex",
    "fps=25,scale=960:-2:flags=lanczos,format=rgb24,lutrgb=r='if(gte(val,250),255,val)':g='if(gte(val,250),255,val)':b='if(gte(val,250),255,val)',split[frames][colors];[colors]palettegen=max_colors=192:reserve_transparent=0[palette];[frames][palette]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle",
    "-loop",
    "0",
    path.join(output, "loop.gif"),
  ]);
  ff([
    "-ss",
    String(asset.seconds - 1.1),
    "-i",
    mp4,
    "-frames:v",
    "1",
    path.join(output, "poster.png"),
  ]);
}
