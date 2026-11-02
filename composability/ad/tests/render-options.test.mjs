import assert from "node:assert/strict";
import test from "node:test";
import { parseRenderArgs } from "../scripts/render-options.mjs";

test("legacy and named commands preserve output scale and selected frames", () => {
  assert.equal(parseRenderArgs(["video", "1"]).scale, 1);
  assert.deepEqual(
    parseRenderArgs(["stills", "130", "270"]).frames,
    [130, 270],
  );
  const options = parseRenderArgs([
    "stills",
    "--composition",
    "ClioComponents",
    "--frames",
    "0,240",
    "--props",
    "examples/gallery-activity.json",
    "--scale",
    "2",
  ]);
  assert.equal(options.composition, "ClioComponents");
  assert.equal(options.propsFile, "examples/gallery-activity.json");
  assert.deepEqual(options.frames, [0, 240]);
  assert.equal(options.scale, 2);
});

test("invalid render requests fail before a browser or filesystem is touched", () => {
  assert.throws(() => parseRenderArgs(["stills", "--frames", "1,,2"]), /empty/);
  for (const args of [
    ["video", "0"],
    ["video", "NaN"],
    ["video", "--concurrency", "1.5"],
    ["stills", "-1"],
    ["stills", "0.5"],
    ["video", "--frames", "50"],
    ["stills", "--output", "out.mp4"],
    ["video", "--output", "input.json"],
    ["video", "--composition", "../bad"],
    ["stills", "--props"],
    ["video", "--unknown", "x"],
  ])
    assert.throws(() => parseRenderArgs(args), Error);
});
