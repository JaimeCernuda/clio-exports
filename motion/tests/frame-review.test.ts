import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseFrameDifferences,
  inspectionBoundaries,
} from "../scripts/frame-review";
import { mediaCommand } from "../scripts/video-tools";

test("frame metadata rejects missing, reordered and invalid measurements", () => {
  const row = (frame: number, value: string) =>
    `frame:${frame} pts:0 pts_time:0\nlavfi.signalstats.YDIF=${value}\n`;
  assert.deepEqual(
    parseFrameDifferences(row(0, "0") + row(1, "1.5"), 2).map(
      (r) => r.difference,
    ),
    [0, 1.5],
  );
  for (const data of [
    row(0, "0"),
    row(1, "0") + row(0, "0"),
    row(0, "0") + row(1, "1e999"),
  ])
    assert.throws(() => parseFrameDifferences(data, 2), /invalid frame scan/);
});

test("inspection boundaries retain source trims and never invent an outside join", () => {
  const clip = { start: 100, inFrame: 20, outFrame: 80 };
  assert.deepEqual(
    inspectionBoundaries(clip, [
      { id: "a", frameOffset: 30, shotFrames: 10 },
      { id: "b", frameOffset: 75, shotFrames: 20 },
    ]),
    [
      { shot: "a", boundary: "enter", frame: 110 },
      { shot: "a", boundary: "leave", frame: 120 },
      { shot: "b", boundary: "enter", frame: 155 },
    ],
  );
  assert.throws(
    () =>
      inspectionBoundaries(clip, [
        { id: "bad", frameOffset: -1, shotFrames: 10 },
      ]),
    /Invalid inspection/,
  );
  assert.throws(
    () => inspectionBoundaries({ ...clip, outFrame: 10 }, []),
    /Invalid story/,
  );
});

test("real FFmpeg metadata decodes every frame using an explicit working directory", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const parent = path.join(root, "review");
  const { mkdir } = await import("node:fs/promises");
  await mkdir(parent, { recursive: true });
  const folder = await mkdtemp(path.join(parent, "frame-test-"));
  try {
    await mediaCommand(
      "ffmpeg",
      [
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=64x64:rate=60",
        "-frames:v",
        "12",
        "-vf",
        "signalstats,metadata=mode=print:file=frames.txt",
        "-f",
        "null",
        "-",
      ],
      folder,
    );
    const rows = parseFrameDifferences(
      await readFile(path.join(folder, "frames.txt"), "utf8"),
      12,
    );
    assert.equal(rows.at(-1)?.frame, 11);
    assert(rows.some((row) => row.difference > 0));
  } finally {
    const relative = path.relative(parent, path.resolve(folder));
    assert(
      relative && !relative.startsWith("..") && !path.isAbsolute(relative),
    );
    await rm(folder, { recursive: true, force: true });
  }
});
