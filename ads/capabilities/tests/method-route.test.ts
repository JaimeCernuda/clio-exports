import test from "node:test";
import assert from "node:assert/strict";
import {
  methodPayload,
  resultLane,
  stepCenters,
} from "../films/01-method/route";

test("the beam remains on its result lane before, during and after revision", () => {
  for (let f = 600; f <= 1620; f++) {
    const point = methodPayload(f / 60);
    assert.equal(point.y, resultLane);
    assert.ok(point.x >= stepCenters[0] && point.x <= stepCenters[3]);
  }
  assert.equal(methodPayload(16).x, stepCenters[3]);
  assert.equal(methodPayload(20).x, stepCenters[1]);
  assert.equal(methodPayload(22.5).x, stepCenters[2]);
});
