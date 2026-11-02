import assert from "node:assert/strict";
import test from "node:test";
import { parseAdRenderArgs } from "../scripts/ad-options.mjs";

test("standalone rendering defaults to this ad and 1080p", () => {
  for (const args of [[], ["stills"], ["video"]]) {
    const options = parseAdRenderArgs(args);
    assert.equal(options.composition, "ClioComposableAd");
    assert.equal(options.scale, 1);
  }
});

test("standalone CLI retains explicit output, inspection frames and render settings", () => {
  const video = parseAdRenderArgs([
    "video",
    "--scale",
    "1.5",
    "--output",
    "out/test.mp4",
    "--concurrency",
    "4",
  ]);
  assert.equal(video.output, "out/test.mp4");
  assert.equal(video.scale, 1.5);
  assert.equal(video.concurrency, 4);
  assert.deepEqual(
    parseAdRenderArgs(["stills", "--frames", "933,934"]).frames,
    [933, 934],
  );
  assert.throws(
    () => parseAdRenderArgs(["video", "--composition", "ClioProof"]),
    /only renders/,
  );
  assert.throws(
    () => parseAdRenderArgs(["stills", "--frames", "1,,2"]),
    /empty/,
  );
});
