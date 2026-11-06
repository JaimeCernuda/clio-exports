/** Inspect every encoded frame of the settled map-label interval for disappearing/oversized glyphs. */
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mercator } from "../src/maps.ts";

const root = path.resolve(import.meta.dirname, ".."),
  file = path.resolve(root, process.argv[2] ?? "output/07-selection.mp4");
const probe = JSON.parse(
  execFileSync(
    "ffprobe",
    ["-v", "error", "-show_streams", "-of", "json", file],
    { encoding: "utf8" },
  ),
);
const scale = probe.streams.find((s) => s.codec_type === "video").width / 1920;
const project = mercator(940, 490, -77, 27, [21, 33]),
  records = [];
for (const [lon, lat, name, width] of [
  [-82, 28, "FLORIDA", 150],
  [-79.7, 22, "CUBA", 100],
  [-76.6, 23.7, "THE BAHAMAS", 200],
  [-69.6, 30, "ATLANTIC", 160],
]) {
  const [px, py] = project(lon, lat),
    w = 2 * Math.round((width * scale) / 2),
    h = 2 * Math.round((30 * scale) / 2),
    x = Math.round((145 + px - width / 2) * scale),
    y = Math.round((310 + py - 21) * scale);
  const data = execFileSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-ss",
      "8.5",
      "-i",
      file,
      "-t",
      "19",
      "-vf",
      `crop=${w}:${h}:${x}:${y}`,
      "-pix_fmt",
      "rgb24",
      "-f",
      "rawvideo",
      "-",
    ],
    { maxBuffer: 80e6 },
  );
  const frameBytes = w * h * 3,
    frames = data.length / frameBytes,
    ink = [];
  if (!Number.isInteger(frames) || frames !== 1140)
    throw new Error(`Missing label frames: ${name} (${frames})`);
  for (let f = 0; f < frames; f++) {
    let count = 0;
    for (let i = f * frameBytes; i < (f + 1) * frameBytes; i += 3)
      if ((data[i] + data[i + 1] + data[i + 2]) / 3 < 145) count++;
    ink.push(count);
  }
  const min = Math.min(...ink),
    max = Math.max(...ink),
    median = [...ink].sort((a, b) => a - b)[570];
  // H.264 edge noise changes a few antialiased pixels. Missing or gigantic labels
  // change their ink coverage by far more; raw image sheets remain part of review.
  if (min < 40 * scale * scale || min / median < 0.8 || max / median > 1.2)
    throw new Error(`Unstable encoded label ${name}: ${min}/${median}/${max}`);
  records.push({ name, frames, minInk: min, medianInk: median, maxInk: max });
}
const result = {
  file: path.basename(file),
  sha256: createHash("sha256")
    .update(await fs.readFile(file))
    .digest("hex"),
  interval: [8.5, 27.5],
  framesPerLabel: 1140,
  records,
};
await fs.writeFile(
  path.join(root, "review/map-labels.json"),
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result));
