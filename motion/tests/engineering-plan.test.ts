import { test } from "node:test";
import assert from "node:assert/strict";
import {
  engineeringFrames,
  engineeringPose,
  engineeringPointer,
  cameraMatches,
} from "../native/engineering-plan";

test("paint acknowledgement tolerates camera roundoff and rejects the wrong camera", () => {
  const expected = {
    position: [3.4453460695580946, 2.3, 2.155330050174189],
    target: [1, 0.5, 0.25],
    fov: 38,
    zoom: 1,
  };
  assert.ok(
    cameraMatches(
      { ...expected, position: [3.445346069558094, 2.3, 2.1553300501741885] },
      expected,
    ),
  );
  assert.equal(
    cameraMatches({ ...expected, position: [4, 2.3, 2.15] }, expected),
    false,
  );
  assert.equal(cameraMatches(undefined, expected), false);
});
test("source pauses through the full sweep inspection and resumes after restoration", () => {
  const held = [12, 16, 22, 28, 36, 38].map(
    (t) => engineeringPose("sweep", t * 60).sourcePhase,
  );
  assert.ok(held.every((t) => t === 1));
  assert.equal(engineeringPose("sweep", 39 * 60).expansion, 0);
  assert.ok(engineeringPose("sweep", 40 * 60).sourcePhase > 1);
  assert.equal(engineeringFrames("sweep"), 3000);
});
test("case frames are selected independently of optimization history", () => {
  assert.equal(engineeringPose("sweep", 27 * 60).selection, 9);
  assert.equal(engineeringPose("sweep", 28 * 60).selection, 4);
  const history = new Set(
    Array.from(
      { length: 2160 },
      (_, f) => engineeringPose("studio", f).iteration,
    ),
  );
  assert.deepEqual([...history], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(engineeringPose("studio", 9 * 60).threshold, 0.1);
  assert.equal(engineeringPose("studio", 27 * 60).threshold, 0.5);
});
test("threshold returns to the native source value and pointer stays continuous", () => {
  assert.equal(engineeringPose("sweep", 23 * 60).threshold, 0.35);
  assert.equal(engineeringPose("sweep", 26 * 60).threshold, 0.5);
  const keys = [
    { at: 0, x: 0, y: 0 },
    { at: 1, x: 0, y: 0 },
    { at: 1.8, x: 100, y: 70 },
    { at: 3, x: 100, y: 70 },
  ];
  assert.deepEqual(engineeringPointer(keys, 0.9), { x: 0, y: 0 });
  const before = engineeringPointer(keys, 1.8 - 1e-7),
    after = engineeringPointer(keys, 1.8 + 1e-7);
  assert.ok(Math.hypot(before.x - after.x, before.y - after.y) < 0.0001);
  assert.throws(() => engineeringPointer([], 0));
});
