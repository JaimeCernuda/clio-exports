import test from "node:test";
import assert from "node:assert/strict";
import { clickFrames } from "../scripts/interactions.mjs";
test("click capture reads syntax rather than matching text or comments", () => {
  const source = `const label = "{at:8,press:true}";
  // {at: 9, press: true}
  const keys=[{at:1.25,x:200,press:true},{at:2,press:false},{at:3,x:calculate(),press:true}];`;
  assert.deepEqual(clickFrames(source), [75, 180]);
});
