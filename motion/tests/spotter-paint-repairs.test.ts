import assert from "node:assert/strict";
import test from "node:test";
import { paintRepairRanges } from "../scripts/prepare-spotter-paint-repairs";

test("paint repairs cover diagnosed frames and include complete pointer travel at their boundaries", () => {
  const poses = Object.fromEntries(
    Array.from({ length: 15716 }, (_, i) => [i, { x: 1260, y: 775 }]),
  );
  for (let i = 4468; i <= 4472; i++) poses[i] = { x: 1200, y: 700 };
  const bad = [4600, 4500, 4510];
  const ranges = paintRepairRanges(bad, poses);
  assert.deepEqual(ranges, [
    { start: 4467, end: 4541 },
    { start: 4570, end: 4631 },
  ]);
  for (const f of bad)
    assert(ranges.some((r) => f >= r.start + 3 && f < r.end));
  for (const r of ranges) {
    assert.equal(poses[r.start].y, 775);
    assert.equal(poses[r.start - 1].y, 775);
    assert.equal(poses[r.end].y, 775);
    assert.equal(poses[r.end + 1].y, 775);
  }
  assert.throws(() => paintRepairRanges([100], poses), /out-of-body/);
  assert.throws(() => paintRepairRanges([4500], {}), /Missing measured/);
});
