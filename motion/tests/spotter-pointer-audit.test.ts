import assert from "node:assert/strict";
import test from "node:test";
import { auditPointer } from "../scripts/audit-spotter-pointer";

test("the measured-pose audit detects worker oscillation and stale paint without mistaking an ordinary pause", () => {
  const sample = (frame: number, x: number, paintedFrame = frame) => ({
    frame,
    pose: { x, y: 0, opacity: 1, count: 1, paintedFrame },
  });
  const clean = auditPointer([
    sample(0, 0),
    sample(1, 10),
    sample(2, 20),
    sample(3, 20),
    sample(4, 20),
    sample(5, 10),
  ]);
  assert.deepEqual(clean.reversals, []);
  assert.deepEqual(clean.jumps, []);
  assert.deepEqual(clean.stale, []);
  const bad = auditPointer([
    sample(0, 0),
    sample(1, 10),
    sample(2, 4, 1),
    sample(4, 100),
  ]);
  assert.deepEqual(bad.reversals, [2]);
  assert.deepEqual(bad.stale, [2]);
  assert.deepEqual(bad.missing, [3]);
  assert.deepEqual(
    auditPointer([
      {
        frame: 0,
        pose: {
          x: 12,
          y: 0,
          intendedX: 10,
          intendedY: 0,
          opacity: 1,
          count: 1,
          paintedFrame: 0,
        },
      },
    ]).stale,
    [0],
  );
  assert.equal(
    auditPointer([sample(0, 0), sample(1, 100)]).jumps[0].pixels,
    100,
  );
  assert.deepEqual(
    auditPointer([sample(10, 0), sample(11, 0)], undefined, {
      first: 10,
      frames: 2,
    }).coverageErrors,
    [],
  );
  assert.deepEqual(
    auditPointer([sample(10, 0)], undefined, { first: 0, frames: 12 })
      .coverageErrors,
    ["sample count", "first frame", "last frame"],
  );
});
