import assert from "node:assert/strict";
import test from "node:test";
import { vectorFontSize } from "../native/vector-chart-paint";

test("isolated vector paint retains valid native font sizes and rejects corrupt sizes", () => {
  assert.equal(vectorFontSize("10", "100px"), "10px");
  assert.equal(vectorFontSize("12.5px", "100px"), "12.5px");
  assert.equal(vectorFontSize(null, "14px"), "14px");
  assert.equal(vectorFontSize("48", "12px"), "48px");
  assert.equal(vectorFontSize(null, "100px"), "12px");
  for (const invalid of ["NaN", "0", "-12"])
    assert.equal(vectorFontSize(invalid, "14px"), "12px");
});
