import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { adWords, copy } from "../src/composable-ad-plan";
import type { PromptLayout } from "../src/prompt-morph";

const layouts: Record<string, PromptLayout> = JSON.parse(
  readFileSync("review/composable-ad-layouts.json", "utf8"),
);
for (const [name, layout] of Object.entries(layouts)) {
  assert.ok(layout.height <= 680, `Instructions exceed the film card: ${name}`);
  assert.ok(
    layout.words.every(
      (word) => word.x >= 0 && word.x + word.width <= 1268 && word.width > 0,
    ),
    `Text clipping: ${name}`,
  );
}
const collisions: unknown[] = [];
for (const change of copy.changes)
  for (let f = 0; f <= change.duration; f++) {
    const words = adWords(
      layouts[change.from],
      layouts[change.to],
      f / change.duration,
    )
      .filter((word) => word.opacity > 0.2 && word.clipBottom < word.height)
      .map((word) => ({ ...word, height: word.height - word.clipBottom }));
    for (let i = 0; i < words.length; i++)
      for (let j = i + 1; j < words.length; j++) {
        const a = words[i],
          b = words[j];
        if (
          Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 2 &&
          Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 2
        )
          collisions.push({ frame: change.at + f, a: a.text, b: b.text });
      }
  }
assert.deepEqual(collisions, [], "Instruction words collide");
const video = process.argv[2] ?? "out/composable/clio-composable-ad.mp4";
const metadata = JSON.parse(
  execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-count_frames",
      "-show_streams",
      "-show_format",
      "-of",
      "json",
      video,
    ],
    { encoding: "utf8" },
  ),
);
const stream = metadata.streams.find(
  (row: { codec_type: string }) => row.codec_type === "video",
);
assert.equal(stream.width, 1920);
assert.equal(stream.height, 1080);
assert.equal(stream.r_frame_rate, "60/1");
assert.equal(Number(stream.nb_read_frames), copy.frames);
assert.ok(
  metadata.streams.some(
    (row: { codec_type: string }) => row.codec_type === "audio",
  ),
);
assert.ok(
  Math.abs(Number(metadata.format.duration) - copy.frames / copy.fps) < 0.04,
);
execFileSync("ffmpeg", ["-v", "error", "-i", video, "-f", "null", "-"]);
const still = "review/composable-ad-end.png";
execFileSync("ffmpeg", [
  "-v",
  "error",
  "-y",
  "-i",
  video,
  "-vf",
  `select=eq(n\\,${copy.frames - 50})`,
  "-frames:v",
  "1",
  still,
]);
const png = PNG.sync.read(readFileSync(still));
const qr = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
assert.equal(qr?.data, "https://clio.iowarp.ai/");
const difference = "review/composable-ad-end-difference.txt";
execFileSync("ffmpeg", [
  "-v",
  "error",
  "-y",
  "-ss",
  String(copy.closing.settled / copy.fps),
  "-i",
  video,
  "-vf",
  `tblend=all_mode=difference,signalstats,metadata=print:file=${difference}`,
  "-an",
  "-f",
  "null",
  "-",
]);
const values = [
  ...readFileSync(difference, "utf8").matchAll(
    /lavfi\.signalstats\.YAVG=([^\r\n]+)/gu,
  ),
].map((match) => Number(match[1]));
assert.ok(values.length >= 295);
assert.ok(Math.max(...values) < 1);
const report = {
  video,
  sha256: createHash("sha256").update(readFileSync(video)).digest("hex"),
  frames: copy.frames,
  fps: 60,
  width: 1920,
  height: 1080,
  audio: "original procedural sound design",
  profiles: Object.keys(layouts).length,
  transitions: copy.changes.length,
  wordCollisions: collisions,
  qr: qr?.data,
  settledFrameDifferenceMax: Math.max(...values),
  decode: "passed",
  reviewBoundary:
    "Frame geometry and encoding verification. Creative review is separate; illustrative prompts are not recorded agent runs.",
};
writeFileSync(
  "review/composable-ad-review.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
