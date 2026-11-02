import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import {
  adAddition,
  adChooser,
  chooser,
  adContributions,
  adEditMarks,
  adPromptBounds,
  adSelection,
  adState,
  adTreePoses,
  adPointer,
  adBrandPose,
  adPromptOpacity,
  adWords,
  copy,
  tree,
  wheelDurations,
  type OpeningGeometry,
} from "../src/composable-ad-plan";
import type { PromptLayout } from "../src/prompt-morph";
const read = (name: string) =>
  JSON.parse(readFileSync("review/composable-ad-" + name + ".json", "utf8"));
const layouts: Record<string, PromptLayout> = read("layouts"),
  opening: OpeningGeometry = read("opening");
for (const [id, layout] of Object.entries(layouts)) {
  assert.ok(layout.height <= 524, id + " prompt height");
  for (const word of layout.words) {
    assert.equal(word.fontSize, 28);
    assert.equal(word.fontWeight, 450);
    assert.ok(word.x >= 0 && word.x + word.width <= 1120);
  }
}
assert.ok(opening.brand && opening.prefix && opening.slot && opening.suffix);
assert.ok(
  Math.abs(
    opening.logo.y +
      opening.logo.height / 2 -
      opening.plus.y -
      opening.plus.height / 2,
  ) < 0.1,
);
for (const [a, b] of [
  [opening.brand, opening.prefix],
  [opening.prefix, opening.slot],
  [opening.slot, opening.suffix],
  [opening.suffix, opening.plus],
])
  assert.ok(Math.abs(b.x - a.x - a.width - 20) < 0.5);
const headers: Array<{
  id: string;
  width: number;
  nameRight: number;
  closeLeft: number;
  closeRight: number;
}> = read("plugins");
for (const module of copy.modules)
  assert.ok(
    headers.some((p) => p.id === module.id && p.width === tree.width),
    "Missing header " + module.id,
  );
for (const head of headers) {
  assert.ok(
    head.closeLeft - head.nameRight >= 8,
    "Name crowds control " + head.id,
  );
  assert.ok(head.closeRight <= head.width - 12);
}
const selections: Array<{
  frame: number;
  source: Record<string, number>;
  piece: Record<string, number>;
  sourceName: Record<string, number>;
  pieceName: Record<string, number>;
}> = read("selections");
const selected = selections.find(
  (item) => item.frame === copy.staging.selectAt,
);
assert.ok(selected);
for (const key of ["x", "y", "width", "height"]) {
  assert.ok(
    Math.abs(selected.source[key] - selected.piece[key]) < 0.1,
    "Menu row jumps " + key,
  );
  assert.ok(
    Math.abs(selected.sourceName[key] - selected.pieceName[key]) < 1.6,
    "Menu label jumps " + key,
  );
}
const additions: Array<Record<string, number | string>> = read("additions");
for (const change of copy.changes.filter(
  (c) => c.bundle && c.from !== "base",
)) {
  const a = additions.find(
      (p) => p.id === change.to && p.frame === change.at - 1,
    ),
    b = additions.find((p) => p.id === change.to && p.frame === change.at);
  assert.ok(a && b);
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
      Math.abs(Number(a[key]) - Number(b[key])) < 0.1,
      change.to + " add row jumps " + key,
    );
}
const papers: Array<Record<string, number>> = read("paper"),
  expectedPaper = adPromptBounds();
assert.ok(papers.length > 10);
for (const measured of papers)
  for (const key of ["x", "y", "width", "height"] as const)
    assert.ok(
      Math.abs(measured[key] - expectedPaper[key]) < 0.06,
      "Prompt moves/resizes at " + measured.frame,
    );
const controls: Array<{
  frame: number;
  id: string;
  action: string;
  x: number;
  y: number;
  width: number;
  height: number;
}> = read("controls");
const chooserControls: Array<{
  frame: number;
  id: string;
  disabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}> = read("chooser");
const clickChecks = copy.changes
  .filter((c) => (c.bundle && c.from !== "base") || c.action === "remove")
  .flatMap((change) => {
    const removing = change.action === "remove",
      choice = adChooser(change.at - 1),
      checks = removing
        ? [
            {
              frame: change.at - copy.removal.clickBefore,
              id: change.controlId,
              action: "remove",
            },
          ]
        : [
            { frame: choice!.openClick, id: "global-plus", action: "open" },
            {
              frame: choice!.selectClick,
              id: choice!.target.module.id,
              action: "choose",
            },
          ];
    return checks.map(({ frame, id, action }) => {
      const control = removing
          ? controls.find((c) => c.frame === frame && c.id === id)
          : chooserControls.find((c) => c.frame === frame && c.id === id),
        cursor = adPointer(frame, opening);
      assert.ok(control, "Missing measured control at " + frame + ": " + id);
      if (removing)
        assert.equal((control as (typeof controls)[number]).action, "remove");
      else
        assert.equal(
          (control as (typeof chooserControls)[number]).disabled,
          false,
        );
      assert.equal(cursor.press, 1);
      assert.ok(
        cursor.x + 4 >= control.x && cursor.x + 4 <= control.x + control.width,
      );
      assert.ok(
        cursor.y + 3 >= control.y && cursor.y + 3 <= control.y + control.height,
      );
      return { frame, id, action };
    });
  });
const closing = read("closing");
assert.ok(closing.url.fontSize >= 40);
assert.ok(closing.qr.width >= 280 && closing.qr.height >= 280);
assert.ok(closing.qr.x + closing.qr.width < 1820);
assert.equal(closing.credit.system.text, copy.closing.credit.system);
assert.equal(closing.credit.byline.text, copy.closing.credit.byline);
assert.ok(closing.credit.system.fontSize >= 30);
assert.ok(closing.credit.byline.fontSize >= 26);
assert.ok(closing.credit.logo.width >= 80);
assert.equal(closing.credit.logo.width, closing.credit.logo.height);
assert.ok(
  closing.credit.system.x - closing.credit.logo.x - closing.credit.logo.width >=
    19.9,
);
assert.ok(
  closing.credit.byline.x - closing.credit.logo.x - closing.credit.logo.width >=
    19.9,
);
assert.ok(
  closing.credit.y >=
    Math.max(
      closing.url.y + closing.url.height,
      closing.qr.y + closing.qr.height,
    ) +
      40,
);
assert.ok(closing.credit.y + closing.credit.height <= 1000);
for (const part of [
  closing.credit.system,
  closing.credit.byline,
  closing.credit.logo,
]) {
  assert.ok(part.x >= closing.credit.x);
  assert.ok(part.x + part.width <= closing.credit.x + closing.credit.width);
}
const capabilities: Array<{
  id: string;
  owner: string;
  width: number;
  nameRight: number;
  nameLeft: number;
}> = read("capabilities");
const allLeaves = new Set(
  copy.modules
    .flatMap((module) =>
      adContributions({
        id: "measured",
        role: "",
        color: "",
        lines: [],
        pieces: [module.name],
        modules: [module],
      }),
    )
    .map((row) => row.id),
);
for (const id of allLeaves)
  assert.ok(
    capabilities.some((row) => row.id === id),
    "Missing measured capability " + id,
  );
for (const row of capabilities) {
  assert.ok(row.nameRight <= row.width, "Leaf clips " + row.id);
  assert.ok(row.nameLeft > 0);
}
const collisions: unknown[] = [],
  componentOcclusions: unknown[] = [];
const overlap = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) =>
  Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
const logoOcclusions: unknown[] = [];
let cursorPeakSpeed = 0;
for (let frame = copy.staging.menuAt + 10; frame < copy.frames; frame++) {
  const logo = adBrandPose(frame, opening);
  if (adPromptOpacity(frame) > 0.01 && overlap(logo, expectedPaper) > 1)
    logoOcclusions.push({ frame, opacity: adPromptOpacity(frame) });
  const cursor = adPointer(frame, opening),
    previous = adPointer(frame - 1, opening);
  assert.equal(cursor.opacity, 1);
  cursorPeakSpeed = Math.max(
    cursorPeakSpeed,
    Math.hypot(cursor.x - previous.x, cursor.y - previous.y),
  );
}
assert.deepEqual(logoOcclusions, []);
assert.ok(cursorPeakSpeed < 24);
const domainHolds = copy.changes
  .filter((c) => c.action === "transform")
  .map((change) => ({
    id: change.to,
    frames:
      (copy.changes.find((c) => c.at > change.at)?.at ?? copy.closing.at) -
      change.at -
      change.duration,
  }));
assert.ok(domainHolds.every((hold) => hold.frames >= 36));
for (const change of copy.changes)
  for (let f = 0; f <= change.duration; f++) {
    const words = adWords(
      layouts[change.from],
      layouts[change.to],
      f / change.duration,
    )
      .filter((w) => w.opacity > 0.2 && w.clipBottom < w.height)
      .map((w) => ({ ...w, height: w.height - w.clipBottom }));
    for (let i = 0; i < words.length; i++)
      for (let j = i + 1; j < words.length; j++)
        if (overlap(words[i], words[j]) > 4)
          collisions.push({
            frame: change.at + f,
            a: words[i].text,
            b: words[j].text,
          });
  }
for (let frame = copy.staging.selectAt; frame < copy.closing.at; frame++) {
  const addition = adAddition(frame),
    boxes = [
      ...adTreePoses(frame).filter((p) => p.opacity > 0.2),
      ...(addition && frame < addition.change.at && addition.opacity > 0.2
        ? [addition]
        : []),
      ...(frame < copy.staging.dockAt ? [adSelection(frame)] : []),
    ].sort((a, b) => a.y - b.y);
  for (const box of boxes) {
    if (overlap(box, expectedPaper) > 0)
      componentOcclusions.push({ frame, kind: "prompt" });
    assert.ok(box.y + box.height < 990);
  }
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++)
      if (overlap(boxes[i], boxes[j]) > 1)
        componentOcclusions.push({ frame, kind: "tree" });
}
assert.deepEqual(collisions, []);
assert.deepEqual(componentOcclusions, []);
if (process.argv.includes("--geometry-only")) {
  console.log(
    "Measured geometry passed: fixed prompt, all owned capability rows, stable add handoffs, no collisions.",
  );
  process.exit(0);
}
const video = process.argv[2] ?? "out/composable/clio-composable-ad-v14.mp4";
const auditFrames = Array.from(
    { length: copy.closing.at - copy.staging.selectAt },
    (_, i) => copy.staging.selectAt + i,
  ),
  paintWidth = 640,
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
    `select='between(n\\,${copy.staging.selectAt}\\,${copy.closing.at - 1})',scale=640:360,format=gray`,
    "-fps_mode",
    "passthrough",
    "-f",
    "rawvideo",
    "-",
  ],
  { maxBuffer: 512 * 1024 * 1024 },
);
assert.equal(paint.length, auditFrames.length * paintSize);
const paintLeaks: Array<{ frame: number; darkPixels: number }> = [];
for (const [index, frame] of auditFrames.entries()) {
  const pointer = adPointer(frame, opening),
    addition = adAddition(frame),
    logo = adBrandPose(frame, opening);
  const boxes = [
    expectedPaper,
    {
      x: chooser.x,
      y: chooser.y,
      width: chooser.width,
      height: chooser.height,
    },
    ...(adChooser(frame)?.opacity
      ? [
          {
            x: chooser.x,
            y: chooser.menuY,
            width: chooser.width,
            height: chooser.menuHeight,
          },
        ]
      : []),
    { x: 1152, y: 238, width: 125, height: 710 },
    logo,
    { x: pointer.x, y: pointer.y, width: 34, height: 43 },
    ...adTreePoses(frame),
    ...(addition && frame < addition.change.at ? [addition] : []),
    ...(frame < copy.staging.dockAt ? [adSelection(frame)] : []),
    ...(frame < copy.staging.selectAt + copy.selection.retireFrames
      ? [{ x: 1190, y: 602, width: 600, height: 367 }]
      : []),
  ];
  const mask = new Uint8Array(paintSize);
  for (const box of boxes) {
    const l = Math.max(0, Math.floor(box.x / 3) - 3),
      r = Math.min(paintWidth, Math.ceil((box.x + box.width) / 3) + 3),
      t = Math.max(0, Math.floor(box.y / 3) - 3),
      b = Math.min(paintHeight, Math.ceil((box.y + box.height) / 3) + 3);
    for (let y = t; y < b; y++)
      mask.fill(1, y * paintWidth + l, y * paintWidth + r);
  }
  let darkPixels = 0;
  for (let p = 0; p < paintSize; p++)
    if (!mask[p] && paint[index * paintSize + p] < 205) darkPixels++;
  if (darkPixels > 12) paintLeaks.push({ frame, darkPixels });
}
writeFileSync(
  "review/composable-ad-paint.json",
  JSON.stringify({ frames: auditFrames.length, paintLeaks }, null, 2),
);
assert.deepEqual(paintLeaks, []);
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
  wheelChangeFrames: wheelDurations,
  clickChecks,
  closing,
  measuredCapabilityLeaves: capabilities.length,
  measuredPromptFrames: papers.length,
  promptBounds: expectedPaper,
  wordCollisions: collisions,
  componentOcclusions,
  logoOcclusions,
  cursorPeakSpeed,
  domainHolds,
  encodedCompositionFrames: auditFrames.length,
  paintLeaks,
  qr: qr?.data,
  settledFrameDifferenceMax: Math.max(...values),
  decode: "passed",
  reviewBoundary:
    "Measured geometry and encoded frames; creative and uninterrupted playback review are separate.",
};
writeFileSync(
  "review/composable-ad-review.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
