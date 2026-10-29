import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  introRoutes,
  routePoint,
  reverseRoute,
  spotterIntroFrame,
} from "../src/spotter-intro-plan";

test("intro routes retain endpoints and tracing reverses the same provenance geometry", () => {
  for (const route of Object.values(introRoutes)) {
    assert.deepEqual(routePoint(route, 0), route[0]);
    assert.deepEqual(routePoint(route, 1), route[3]);
    for (let i = 0; i <= 100; i++) {
      const forward = routePoint(route, i / 100),
        reverse = routePoint(reverseRoute(route), 1 - i / 100);
      forward.forEach((value, axis) =>
        assert.ok(Math.abs(value - reverse[axis]) < 1e-8),
      );
    }
  }
});

test("guardian is visible before observation arrives and tracing follows detection", () => {
  assert.ok(spotterIntroFrame(20).guardian > 0);
  assert.equal(spotterIntroFrame(20).clio, 0);
  assert.equal(spotterIntroFrame(20).opal, 0);
  for (let frame = 0; frame < 480; frame++) {
    const pose = spotterIntroFrame(frame);
    if (frame >= 225) assert.equal(pose.guardian, 1);
    if (pose.returnToAgent > 0) assert.equal(pose.detect, 1);
    if (pose.returnToData > 0) assert.equal(pose.returnToAgent, 1);
    for (const value of Object.values(pose.routes))
      assert.ok(value >= 0 && value <= 1);
    assert.deepEqual(spotterIntroFrame(frame), pose);
  }
  assert.throws(() => spotterIntroFrame(-1), /frame/);
});

test("the inspected source and transparent logo assets retain their recorded bytes", () => {
  for (const [name, hash] of [
    [
      "FlowceptLogo.png",
      "8867f53ff5d83cbc96b540367c06554ae5cdfa6726da63f0f5216dca4bcb97f8",
    ],
    [
      "OpalLogo.png",
      "cc976172846044b950f9b64c223548bc1f7411e78ff1aef3923f411b7eea775f",
    ],
    [
      "SpotterLogo.png",
      "41dcb1c946c44ff6b75d5f35458bbfa893b4713e60eee91ab075c2183ff8874b",
    ],
    [
      "SpotterLogo.transparent.png",
      "080846d832566514df59e6bb1e00ce9103b6713a02a644f2c314657b519016d2",
    ],
  ])
    assert.equal(
      createHash("sha256")
        .update(
          readFileSync(
            new URL(`../public/spotter/branding/${name}`, import.meta.url),
          ),
        )
        .digest("hex"),
      hash,
    );
});
