import assert from "node:assert/strict";
import test from "node:test";
import {
  conformParts,
  replacementParts,
} from "../scripts/conform-spotter-evidence";

test("the evidence repair preserves every frame around its conversation boundaries", () => {
  const parts = replacementParts(16406, 7940, 1610);
  assert.deepEqual(parts, [
    { input: 0, start: 0, end: 7940 },
    { input: 1, start: 0, end: 1610 },
    { input: 0, start: 9550, end: 16406 },
  ]);
  assert.equal(
    parts.reduce((n, p) => n + p.end - p.start, 0),
    16406,
  );
  assert.deepEqual(replacementParts(10, 0, 10), [
    { input: 1, start: 0, end: 10 },
  ]);
  assert.throws(() => replacementParts(10, 9, 2), /range/);
  assert.throws(() => replacementParts(10, 1.5, 2), /range/);
  const multi = conformParts(16406, [
    { start: 7940, frames: 898 },
    { start: 8838, frames: 712 },
    { start: 13211, frames: 1626 },
  ]);
  assert.deepEqual(multi, [
    { input: 0, start: 0, end: 7940 },
    { input: 1, start: 0, end: 898 },
    { input: 2, start: 0, end: 712 },
    { input: 0, start: 9550, end: 13211 },
    { input: 3, start: 0, end: 1626 },
    { input: 0, start: 14837, end: 16406 },
  ]);
  assert.equal(
    multi.reduce((n, p) => n + p.end - p.start, 0),
    16406,
  );
  assert.throws(
    () =>
      conformParts(10, [
        { start: 2, frames: 4 },
        { start: 5, frames: 2 },
      ]),
    /range/,
  );
});
