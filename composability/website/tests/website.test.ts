import assert from "node:assert/strict";
import test from "node:test";
import { assets, selectAssets } from "../src/assets";
import {
  pose as many,
  config as manyConfig,
  words as manyWords,
} from "../many-agents/plan";
import {
  pose as one,
  config as oneConfig,
  words as oneWords,
} from "../one-composable-agent/plan";
import {
  config,
  sourceFrame,
  sourceStart,
  sourceEnd,
  firstEffect,
  firstOffer,
  control,
  pointer,
  pointerStops,
  clicks,
  opacity,
} from "../plugin-composition/plan";
import { adState, adTreePoses, copy } from "../../ad/src/composable-ad-plan";

test("all requested assets have complete render settings and bounded poster frames", () => {
  assert.equal(assets.length, 3);
  assert.deepEqual(selectAssets([]), assets);
  assert.throws(() => selectAssets(["../escape"]), /Unknown website asset/);
  for (const a of assets) {
    assert.ok(a.poster >= 0 && a.poster < a.frames);
    assert.equal(
      (a.frames / a.fps) * a.gifFps,
      Math.round((a.frames / a.fps) * a.gifFps),
    );
  }
});
test("the many-agent cycle includes a dozen domains and closes without a cut", () => {
  assert.equal(manyWords.length, 12);
  assert.ok(!manyWords.includes("composable"));
  assert.deepEqual(many(0), many(manyConfig.frames));
  assert.ok(
    Math.abs(many(manyConfig.frames - 1).position - manyWords.length) < 0.001,
  );
  for (let f = 1; f < manyConfig.frames; f++)
    assert.ok(many(f).position >= many(f - 1).position);
});
test("the accelerated sequence holds composable sharp before rolling forward to restart", () => {
  assert.equal(one(copy.wheel.end + 36).neighborOpacity, 0);
  for (let f = copy.wheel.end; f <= copy.wheel.end + 72; f++) {
    assert.equal(one(f).position, oneWords.length - 1);
    assert.equal(one(f).blur, 0);
  }
  assert.deepEqual(one(0), one(oneConfig.frames));
  assert.ok(
    Math.abs(one(oneConfig.frames - 1).position - oneWords.length) < 0.001,
  );
  assert.ok(one(copy.wheel.end - 15).blur > 2);
});
test("the compact composition shows three additions, two removals and the Genomics addition", () => {
  assert.equal(sourceFrame(firstEffect), sourceStart);
  assert.equal(sourceFrame(config.frames - 1), sourceEnd);
  assert.equal(adState(sourceFrame(config.poster)).to.id, "genomics");
  assert.equal(clicks.length, 6);
  const seen = new Set(
    Array.from(
      { length: config.frames },
      (_, f) => adState(sourceFrame(f)).to.id,
    ),
  );
  assert.deepEqual(
    [...seen],
    [
      "base",
      "manufacturing",
      "simulation",
      "reports",
      "without-simulation",
      "reports-only",
      "genomics",
    ],
  );
  const final = adTreePoses(sourceEnd).filter((p) => p.opacity === 1);
  assert.deepEqual(
    final.map((p) => p.module.id),
    ["genomics", "reports"],
  );
});
test("the first plugin is offered with plus before its prompt or leaves change", () => {
  const f = firstEffect - 8;
  assert.ok(firstOffer(f));
  assert.equal(control(f, "manufacturing").kind, "add");
  assert.equal(pointer(f).press, 1);
  assert.equal(adState(sourceFrame(f)).to.id, "base");
  assert.equal(control(firstEffect + 16, "manufacturing").kind, "added");
  assert.equal(firstOffer(firstEffect), undefined);
});
test("cursor routes stay continuous and the loop resets while hidden", () => {
  for (let i = 1; i < pointerStops.length; i++)
    assert.ok(pointerStops[i].f > pointerStops[i - 1].f);
  for (let f = 1; f < config.frames; f++) {
    const a = pointer(f - 1),
      b = pointer(f);
    assert.ok(Math.hypot(b.x - a.x, b.y - a.y) < 24);
  }
  assert.equal(opacity(0), 0);
  assert.equal(opacity(config.frames), 0);
  assert.ok(pointer(960).x > 1920);
});
