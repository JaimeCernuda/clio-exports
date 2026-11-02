import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { morphWords, morphBoxes, type PromptLayout } from "../src/prompt-morph";
import { transformations, PROMPT_WIDTH } from "../src/composable-plan";
import { pointerAt } from "../src/composable-pointer";

const layouts: Record<string, PromptLayout> = JSON.parse(
  readFileSync("review/composable-layouts.json", "utf8"),
);
const collisions: unknown[] = [];
for (const [id, layout] of Object.entries(layouts)) {
  assert.ok(layout.height <= 616, `${id} is clipped vertically`);
  assert.ok(
    layout.words.every(
      (word) =>
        word.width > 0 &&
        word.height > 0 &&
        word.x >= 0 &&
        word.x + word.width <= PROMPT_WIDTH,
    ),
    `${id} is clipped horizontally`,
  );
}
for (const change of transformations)
  for (let frame = 0; frame <= change.duration; frame++) {
    const p = frame / change.duration;
    const boxes = morphBoxes(layouts[change.from], layouts[change.to], p);
    const words = morphWords(layouts[change.from], layouts[change.to], p)
      .filter((word) => word.opacity > 0.2)
      .map((word) => {
        const card = boxes.find(
          (box) => box.id === `${word.block.split(":")[0]}:card`,
        );
        return {
          ...word,
          height: card
            ? Math.min(word.height, card.y + card.height - word.y)
            : word.height,
        };
      })
      .filter((word) => word.height > 0);
    for (let i = 0; i < words.length; i++)
      for (let j = i + 1; j < words.length; j++) {
        const a = words[i],
          b = words[j];
        const overlapX =
          Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const overlapY =
          Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
        if (overlapX > 2 && overlapY > 2)
          collisions.push({
            frame: change.at + frame,
            a: a.text,
            b: b.text,
            overlapX,
            overlapY,
          });
      }
  }
assert.deepEqual(collisions, [], "Visible words collide during an edit");
let maxPointerStep = 0;
for (let frame = 1; frame < 1200; frame++) {
  const a = pointerAt(frame - 1),
    b = pointerAt(frame);
  maxPointerStep = Math.max(maxPointerStep, Math.hypot(a.x - b.x, a.y - b.y));
}
assert.ok(maxPointerStep < 70);
const video = process.argv[2] ?? "out/composable/clio-composable-v1.mp4";
const still = "review/composable-encoded-end.png";
execFileSync("ffmpeg", [
  "-v",
  "error",
  "-y",
  "-i",
  video,
  "-vf",
  "select=eq(n\\,1750)",
  "-frames:v",
  "1",
  still,
]);
const image = PNG.sync.read(readFileSync(still));
const qr = jsQR(new Uint8ClampedArray(image.data), image.width, image.height);
assert.equal(
  qr?.data,
  "https://clio.iowarp.ai/",
  "The QR must decode from the encoded video",
);
const metadata = JSON.parse(
  execFileSync(
    "ffprobe",
    ["-v", "error", "-count_frames", "-show_streams", "-of", "json", video],
    { encoding: "utf8" },
  ),
);
const stream = metadata.streams.find(
  (row: { codec_type: string }) => row.codec_type === "video",
);
assert.equal(stream.width, 1920);
assert.equal(stream.height, 1080);
assert.equal(stream.r_frame_rate, "60/1");
assert.equal(Number(stream.nb_read_frames), 1800);
execFileSync("ffmpeg", ["-v", "error", "-i", video, "-f", "null", "-"]);
const difference = "review/composable-end-difference.txt";
execFileSync("ffmpeg", [
  "-v",
  "error",
  "-y",
  "-ss",
  "25",
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
assert.ok(Math.max(...values) < 1, "The settled ending must not flicker");
const report = {
  video,
  sha256: createHash("sha256").update(readFileSync(video)).digest("hex"),
  frames: 1800,
  fps: 60,
  width: 1920,
  height: 1080,
  layoutStates: Object.keys(layouts).length,
  transitionsCheckedAtEveryFrame: transformations.length,
  wordCollisions: collisions,
  maxPointerStep,
  qr: qr?.data,
  settledEndDifferenceMax: Math.max(...values),
  decode: "passed",
  reviewBoundary:
    "Measured geometry and encoded-frame checks; creative approval belongs to the user.",
};
writeFileSync(
  "review/composable-review.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
