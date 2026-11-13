import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  pointerRepairFilter,
  DELIVERY_FRAME_ARGS,
} from "../scripts/spotter-pointer-repair.mjs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";

test("repair intervals reject overlap, noninteger coordinates and extent errors", () => {
  for (const ranges of [
    [[9, 14]],
    [
      [10, 15],
      [14, 18],
    ],
    [[10, 61]],
    [[10, 10]],
    [[10.5, 11]],
    [],
  ])
    assert.throws(() => pointerRepairFilter({ first: 10, end: 60, ranges }));
});

test("intro plus gapped replacements delivers exact CFR metadata and frame count", async () => {
  const root = path.resolve(".native-ui");
  await mkdir(root, { recursive: true });
  const dir = await mkdtemp(path.join(root, "pointer-conform-test-"));
  try {
    const file = path.join(dir, "test.mp4"),
      plan = {
        first: 420,
        end: 480,
        ranges: [
          [430, 435],
          [460, 466],
        ],
      };
    const { graph, frames } = pointerRepairFilter(plan, 1, 2);
    const run = promisify(execFile);
    await run("ffmpeg", [
      "-v",
      "error",
      "-filter_complex_threads",
      "1",
      "-f",
      "lavfi",
      "-i",
      `color=c=white:s=16x16:r=60:d=${4 / 60}`,
      "-f",
      "lavfi",
      "-i",
      "color=c=red:s=16x16:r=60:d=1",
      "-f",
      "lavfi",
      "-i",
      `color=c=blue:s=16x16:r=60:d=${frames / 60}`,
      "-filter_complex",
      graph +
        ";[0:v]setpts=PTS-STARTPTS[i];[repaired]setpts=PTS-STARTPTS[b];[i][b]concat=n=2:v=1:a=0[v]",
      "-map",
      "[v]",
      "-c:v",
      "libx264",
      "-threads",
      "1",
      ...DELIVERY_FRAME_ARGS,
      file,
    ]);
    const video = JSON.parse(
      (
        await run("ffprobe", [
          "-v",
          "error",
          "-count_frames",
          "-show_streams",
          "-of",
          "json",
          file,
        ])
      ).stdout,
    ).streams[0];
    assert.equal(video.avg_frame_rate, "60/1");
    assert.equal(Number(video.nb_read_frames), 64);
    assert.ok(Math.abs(Number(video.duration) - 64 / 60) < 1e-5);
  } finally {
    assert.ok(path.resolve(dir).startsWith(root + path.sep));
    await rm(dir, { recursive: true, force: true });
  }
});
test("discontinuous replacement preserves every untouched frame and both boundaries exactly", async () => {
  const plan = {
    first: 420,
    end: 480,
    ranges: [
      [430, 435],
      [460, 466],
    ],
  };
  const { graph, frames } = pointerRepairFilter(plan);
  assert.equal(frames, 11);
  const { stdout } = await promisify(execFile)(
    "ffmpeg",
    [
      "-v",
      "error",
      "-filter_complex_threads",
      "1",
      "-f",
      "lavfi",
      "-i",
      "color=c=red:s=16x16:r=60:d=1",
      "-f",
      "lavfi",
      "-i",
      `color=c=blue:s=16x16:r=60:d=${frames / 60}`,
      "-filter_complex",
      graph,
      "-map",
      "[repaired]",
      "-frames:v",
      "60",
      "-pix_fmt",
      "rgb24",
      "-threads",
      "1",
      "-f",
      "rawvideo",
      "pipe:1",
    ],
    { encoding: null, maxBuffer: 1024 * 1024 },
  );
  assert.equal(stdout.length, 60 * 16 * 16 * 3);
  for (let f = 0; f < 60; f++) {
    const at = (f * 16 * 16 + 8 * 16 + 8) * 3,
      changed = (f >= 10 && f < 15) || (f >= 40 && f < 46);
    assert.ok(stdout[at + (changed ? 2 : 0)] > 200, `Wrong frame at ${f}`);
    assert.ok(
      stdout[at + (changed ? 0 : 2)] < 20,
      `Leaking replacement at ${f}`,
    );
  }
});
