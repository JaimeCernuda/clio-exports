import assert from "node:assert/strict";
import test from "node:test";
import { textRepairParts } from "../scripts/conform-spotter-text";

test("a sequential repair reel retains original timing across gaps and uses each repair frame once", () => {
  const { parts, patchFrames } = textRepairParts(
    100,
    [
      { start: 10, end: 12 },
      { start: 30, end: 33 },
    ],
    5,
  );
  assert.deepEqual(parts, [
    { input: 0, start: 0, end: 15 },
    { input: 1, start: 0, end: 2 },
    { input: 0, start: 17, end: 35 },
    { input: 1, start: 2, end: 5 },
    { input: 0, start: 38, end: 100 },
  ]);
  assert.equal(patchFrames, 5);
  assert.equal(
    parts.reduce((n, p) => n + p.end - p.start, 0),
    100,
  );
  assert.throws(
    () =>
      textRepairParts(
        100,
        [
          { start: 10, end: 20 },
          { start: 19, end: 21 },
        ],
        5,
      ),
    /Invalid/,
  );
  assert.throws(() => textRepairParts(-1, [], 0), /Invalid/);
  assert.throws(() => textRepairParts(100, [], -1), /Invalid/);
  assert.throws(
    () => textRepairParts(100, [{ start: 90, end: 100 }], 5),
    /Invalid/,
  );
});

test("seek settling handles use the original frames and retain all timeline positions", () => {
  const { parts, patchFrames } = textRepairParts(
    100,
    [
      { start: 10, end: 20 },
      { start: 30, end: 32 },
    ],
    5,
    3,
  );
  assert.deepEqual(parts, [
    { input: 0, start: 0, end: 18 },
    { input: 1, start: 3, end: 10 },
    { input: 0, start: 25, end: 37 },
    { input: 0, start: 37, end: 100 },
  ]);
  assert.equal(patchFrames, 12);
  assert.equal(
    parts.reduce((sum, p) => sum + p.end - p.start, 0),
    100,
  );
  assert.throws(() => textRepairParts(100, [], 0, -1), /Invalid/);
});
