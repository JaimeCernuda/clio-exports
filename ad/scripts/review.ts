import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import {
  adWords,
  adSelection,
  adState,
  adPointer,
  adAddition,
  adFocus,
  adInspection,
  adInspectionTiming,
  adPluginPoses,
  adPromptBounds,
  profiles,
  copy,
  type OpeningGeometry,
} from "../src/composable-ad-plan";
import { ease, phase } from "../src/prompt-morph";
import type { PromptLayout } from "../src/prompt-morph";

const layouts: Record<string, PromptLayout> = JSON.parse(
  readFileSync("review/composable-ad-layouts.json", "utf8"),
);
for (const [name, layout] of Object.entries(layouts)) {
  assert.ok(layout.height <= 600, `Instructions exceed the film card: ${name}`);
  assert.ok(
    layout.words.every(
      (word) => word.x >= 0 && word.x + word.width <= 1120 && word.width > 0,
    ),
    `Text clipping: ${name}`,
  );
}
const opening: OpeningGeometry = JSON.parse(
  readFileSync("review/composable-ad-opening.json", "utf8"),
);
assert.ok(
  Math.abs(
    opening.logo.y +
      opening.logo.height / 2 -
      (opening.plus.y + opening.plus.height / 2),
  ) < 0.1,
  "Brand and plus are misaligned",
);
assert.ok(opening.brand && opening.prefix && opening.slot && opening.suffix);
for (const [a, b] of [
  [opening.brand, opening.prefix],
  [opening.prefix, opening.slot],
  [opening.slot, opening.suffix],
  [opening.suffix, opening.plus],
])
  assert.ok(
    Math.abs(b.x - a.x - a.width - 20) < 0.5,
    "Opening spacing must follow the measured text",
  );
const plugins: Array<{
  id: string;
  width: number;
  nameRight: number;
  closeLeft: number;
  closeRight: number;
}> = JSON.parse(readFileSync("review/composable-ad-plugins.json", "utf8"));
for (const module of copy.modules)
  assert.ok(
    plugins.some(
      (plugin) => plugin.id === module.id && Math.abs(plugin.width - 310) < 0.1,
    ),
    `Missing compact header measurement: ${module.id}`,
  );
for (const plugin of plugins) {
  assert.ok(
    plugin.closeLeft - plugin.nameRight >= 8,
    `Plugin name crowds removal: ${plugin.id}`,
  );
  assert.ok(
    plugin.closeRight <= plugin.width - 12,
    `Removal is clipped: ${plugin.id}`,
  );
}
type Rect = { x: number; y: number; width: number; height: number };
const selections: Array<{
  frame: number;
  source: Rect;
  piece: Rect;
  sourceName: Rect;
  pieceName: Rect;
}> = JSON.parse(readFileSync("review/composable-ad-selections.json", "utf8"));
const selectedStart = selections.find(
  (entry) => entry.frame === copy.staging.selectAt,
);
assert.ok(
  selectedStart,
  "Measure the exact frame when the menu choice is selected",
);
for (const key of ["x", "y", "width", "height"] as const) {
  assert.ok(
    Math.abs(selectedStart.source[key] - selectedStart.piece[key]) < 0.1,
    `Selection card jumps in ${key}`,
  );
  assert.ok(
    Math.abs(selectedStart.sourceName[key] - selectedStart.pieceName[key]) <
      1.6,
    `Selected label jumps in ${key}`,
  );
}
const additions: Array<Record<string, number | string>> = JSON.parse(
  readFileSync("review/composable-ad-additions.json", "utf8"),
);
for (const change of copy.changes.filter(
  (entry) => entry.bundle && entry.from !== "base",
)) {
  const before = additions.find(
    (entry) => entry.id === change.to && entry.frame === change.at - 1,
  );
  const after = additions.find(
    (entry) => entry.id === change.to && entry.frame === change.at,
  );
  assert.ok(
    before && after,
    `Measure both sides of the ${change.to} add click`,
  );
  for (const key of [
    "x",
    "y",
    "width",
    "height",
    "labelX",
    "labelY",
    "labelWidth",
    "labelHeight",
  ])
    assert.ok(
      Math.abs(Number(before[key]) - Number(after[key])) < 0.1,
      `${change.to} add handoff jumps in ${key}`,
    );
}
assert.deepEqual(
  [
    ...new Set(
      Object.values(layouts).flatMap((layout) =>
        layout.words.map((word) => word.fontSize),
      ),
    ),
  ],
  [28],
  "Prompt typography must be uniform",
);
assert.deepEqual(
  [
    ...new Set(
      Object.values(layouts).flatMap((layout) =>
        layout.words.map((word) => word.fontWeight),
      ),
    ),
  ],
  [450],
  "Prompt weight must be uniform",
);
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
const componentOcclusions: unknown[] = [];
const overlap = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) =>
  Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
for (let frame = copy.staging.selectAt; frame < copy.staging.dockAt; frame++) {
  const actor = adSelection(frame),
    paper = adPromptBounds(layouts.base.height + 96, actor.focus);
  paper.y += 20 * (1 - phase(frame, copy.staging.promptAt, 70));
  if (overlap(actor, paper) > 0)
    componentOcclusions.push({ frame, kind: "menu extraction" });
}
for (const change of copy.changes.filter(
  (entry) => entry.bundle && entry.from !== "base",
)) {
  for (
    let frame = change.at - copy.addition.leadFrames;
    frame < change.at;
    frame++
  ) {
    const offer = adAddition(frame)!;
    if (offer.opacity <= 0.2) continue;
    const paper = adPromptBounds(
      layouts[change.from].height + 96,
      adFocus(frame),
    );
    if (overlap(offer, paper) > 0)
      componentOcclusions.push({ frame, kind: "offered plugin covers prompt" });
  }
}
for (const change of copy.changes.filter((change) => change.bundle)) {
  const from = profiles[change.from],
    to = profiles[change.to],
    target = adPluginPoses(from, to, 1).find((pose) => pose.added)!;
  for (
    let elapsed = 0;
    elapsed <= adInspectionTiming(change.at).end;
    elapsed++
  ) {
    const p = Math.min(1, elapsed / change.duration),
      actor = adInspection(change.at + elapsed, change.at, target.x, true);
    const height =
      layouts[from.id].height +
      (layouts[to.id].height - layouts[from.id].height) * ease(p) +
      96;
    const prompt = adPromptBounds(height, actor.focus);
    const rows =
      1 +
      target.module.skills.length +
      target.module.mcpServers.length +
      target.module.tools.length +
      target.module.hooks.length;
    const card = {
      x: actor.x,
      y: actor.y,
      width: actor.width,
      height: 76 + (rows * 43 + 15) * actor.expand,
    };
    if (actor.opacity > 0.2 && overlap(card, prompt) > 0)
      componentOcclusions.push({ frame: change.at + elapsed, kind: "prompt" });
    if (actor.travel > 0) {
      assert.equal(actor.expand, 0);
      assert.equal(actor.bodyOpacity, 0);
    }
    for (const other of adPluginPoses(from, to, p).filter(
      (pose) => pose.name !== target.name && pose.opacity > 0.2,
    ))
      if (
        overlap(card, {
          x: other.x,
          y: 820 - (other.kept ? 0 : 35 * (1 - other.opacity)),
          width: 310,
          height: 76,
        }) > 0
      )
        componentOcclusions.push({
          frame: change.at + elapsed,
          kind: "retained plugin",
        });
  }
}
assert.deepEqual(
  componentOcclusions,
  [],
  "Whole plugin cards obscure other elements",
);
if (process.argv.includes("--geometry-only")) {
  console.log(
    `Measured geometry passed: ${Object.keys(layouts).length} prompts, uniform font, aligned logo and plus, no word or component collisions.`,
  );
  process.exit(0);
}
const video = process.argv[2] ?? "out/composable/clio-composable-ad-v9.mp4";
// Inspect every encoded inspection frame, including every render worker. DOM
// bounds alone cannot detect a browser compositing glyph outside its container.
const inspectionFrames = copy.changes
  .filter((change) => change.bundle)
  .flatMap((change) =>
    Array.from(
      {
        length: adInspectionTiming(change.at).end + 1,
      },
      (_, elapsed) => ({ frame: change.at + elapsed, change, elapsed }),
    ),
  );
const offerFrames = copy.changes
  .filter((change) => change.bundle && change.from !== "base")
  .flatMap((change) =>
    Array.from(
      { length: copy.addition.leadFrames },
      (_, index) => change.at - copy.addition.leadFrames + index,
    ),
  );
const paintFrames = [
  ...Array.from(
    { length: copy.staging.dockAt - copy.staging.selectAt },
    (_, index) => copy.staging.selectAt + index,
  ),
  ...inspectionFrames.map((entry) => entry.frame),
  ...offerFrames,
].sort((a, b) => a - b);
const selection =
  `between(n\\,${copy.staging.selectAt}\\,${copy.staging.dockAt - 1})+` +
  copy.changes
    .filter((change) => change.bundle)
    .map(
      (change) =>
        `between(n\\,${change.at - (change.from === "base" ? 0 : copy.addition.leadFrames)}\\,${change.at + adInspectionTiming(change.at).end})`,
    )
    .join("+");
const paintWidth = 640,
  paintHeight = 360,
  paintSize = paintWidth * paintHeight;
const paint = execFileSync(
  "ffmpeg",
  [
    "-v",
    "error",
    "-i",
    video,
    "-vf",
    `select='${selection}',scale=${paintWidth}:${paintHeight},format=gray`,
    "-fps_mode",
    "passthrough",
    "-f",
    "rawvideo",
    "-",
  ],
  { maxBuffer: 256 * 1024 * 1024 },
);
assert.equal(paint.length, paintFrames.length * paintSize);
const paintLeaks: Array<{ frame: number; darkPixels: number }> = [];
for (const [index, frame] of paintFrames.entries()) {
  const { from, to, p, change } = adState(frame),
    target = adPluginPoses(from, to, 1).find((pose) => pose.added),
    actor = change
      ? adInspection(frame, change.at, target!.x, true)
      : { ...adSelection(frame), expand: 0 },
    height =
      layouts[from.id].height +
      (layouts[to.id].height - layouts[from.id].height) * ease(p) +
      96;
  const rows = target
    ? 1 +
      target.module.skills.length +
      target.module.mcpServers.length +
      target.module.tools.length +
      target.module.hooks.length
    : 0;
  const paper = adPromptBounds(height, adFocus(frame));
  paper.y += 20 * (1 - phase(frame, copy.staging.promptAt, 70));
  const logoTravel = phase(frame, 500, 100),
    startX = 960 - opening.width / 2 + opening.logo.x,
    startY = 540 - opening.height / 2 + opening.logo.y,
    pointer = adPointer(frame, opening);
  const boxes = [
    paper,
    {
      x: startX + (245 - startX) * logoTravel,
      y: startY + (160 - startY) * logoTravel,
      width: 84 - 12 * logoTravel,
      height: 84 - 12 * logoTravel,
    },
    { x: pointer.x, y: pointer.y, width: 34, height: 43 },
    ...(adAddition(frame) && frame < adAddition(frame)!.change.at
      ? [adAddition(frame)!]
      : []),
    ...(frame < copy.staging.selectAt + copy.selection.retireFrames
      ? [{ x: 1040, y: 602, width: 600, height: 367 }]
      : []),
    {
      x: actor.x,
      y: actor.y,
      width: actor.width,
      height: change
        ? 76 + (rows * 43 + 15) * actor.expand
        : adSelection(frame).height,
    },
    ...adPluginPoses(from, to, p)
      .filter((pose) => pose.name !== target?.name)
      .map((pose) => ({
        x: pose.x,
        y: 820 - (pose.kept ? 0 : 35 * (1 - pose.opacity)),
        width: 310,
        height: 76,
      })),
  ];
  const mask = new Uint8Array(paintSize);
  for (const box of boxes) {
    // Three output pixels cover codec ringing and the antialiased card edge.
    const left = Math.max(0, Math.floor(box.x / 3) - 3),
      right = Math.min(paintWidth, Math.ceil((box.x + box.width) / 3) + 3),
      top = Math.max(0, Math.floor(box.y / 3) - 3),
      bottom = Math.min(paintHeight, Math.ceil((box.y + box.height) / 3) + 3);
    for (let y = top; y < bottom; y++)
      mask.fill(1, y * paintWidth + left, y * paintWidth + right);
  }
  let darkPixels = 0;
  for (let pixel = 0; pixel < paintSize; pixel++)
    if (!mask[pixel] && paint[index * paintSize + pixel] < 205) darkPixels++;
  if (darkPixels > 12) paintLeaks.push({ frame, darkPixels });
}
writeFileSync(
  "review/composable-ad-paint.json",
  JSON.stringify({ frames: paintFrames.length, paintLeaks }, null, 2) + "\n",
);
assert.deepEqual(paintLeaks, [], "Ink escapes the encoded component bounds");
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
  bundleReadSeconds: copy.changes
    .filter((change) => change.bundle)
    .map((change) => ({
      plugin: change.to,
      seconds: change.readFrames / copy.fps,
    })),
  measuredPluginHeaders: plugins.length,
  wordCollisions: collisions,
  componentOcclusions,
  encodedInspectionFrames: inspectionFrames.length,
  encodedOfferFrames: offerFrames.length,
  encodedExtractionFrames: copy.staging.dockAt - copy.staging.selectAt,
  paintLeaks,
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
