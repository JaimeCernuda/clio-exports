import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pointerRepairFilter } from "../scripts/spotter-pointer-repair.mjs";

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
