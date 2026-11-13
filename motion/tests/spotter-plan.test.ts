import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import type { PairedReplay } from "../native/paired-replay";
import pointerTrack from "../native/current/spotter-pointer.json";
import {
  spotterPointerAt,
  spotterPointerWaypoints,
  spotterPointerMotionRanges,
} from "../native/current/spotter-pointer";
import { buildSpotterReconstruction } from "../native/current/spotter-scenario";
import {
  STEP_TIMING,
  SPOTTER_FRAMES,
  spotterSourceAt,
  mainThoughtExcerpt,
  spotterPocketAt,
  spotterPrefix,
  displayedStepText,
  spotterInspectionAt,
} from "../native/current/spotter-plan";

const pair = JSON.parse(
  readFileSync("native/public/opal-chainB-7795459.native.json", "utf8"),
) as PairedReplay;
test("correction windows cover every visible moving frame and settling handle", () => {
  const profile = pointerTrack.profiles[0],
    points = spotterPointerWaypoints(profile);
  const ranges = spotterPointerMotionRanges(profile, 420, SPOTTER_FRAMES);
  for (let f = 420; f < SPOTTER_FRAMES - 1; f++) {
    const a = spotterPointerAt(points, f),
      b = spotterPointerAt(points, f + 1);
    if (
      Math.hypot(b.x - a.x, b.y - a.y) < 1e-6 ||
      (a.x > profile.width + 24 && b.x > profile.width + 24)
    )
      continue;
    assert.ok(
      ranges.some(([start, end]) => f >= start && f + 1 < end),
      `Uncovered visible movement at ${f}`,
    );
  }
});
test("the whole pointer track retains measured targets, forward/backward parity and bounded peak speed", () => {
  for (const profile of pointerTrack.profiles) {
    const points = spotterPointerWaypoints(profile);
    for (let index = 1; index < points.length; index++)
      assert.ok(points[index].frame > points[index - 1].frame);
    for (const target of profile.points) {
      const actual = spotterPointerAt(points, target.frame);
      assert.equal(actual.x, target.x);
      assert.equal(actual.y, target.y);
    }
    const poses = Array.from({ length: SPOTTER_FRAMES }, (_, frame) =>
      spotterPointerAt(points, frame),
    );
    for (let frame = poses.length - 1; frame > 0; frame--) {
      assert.deepEqual(spotterPointerAt(points, frame), poses[frame]);
      assert.ok(
        Math.hypot(
          poses[frame].x - poses[frame - 1].x,
          poses[frame].y - poses[frame - 1].y,
        ) <= 30.01,
        `Pointer spike at ${frame}`,
      );
    }
  }
});
test("attention opens smoothly, returns to the answer before closing, and stays stable beneath the outro", () => {
  assert.equal(spotterInspectionAt(174 * 60).openness, 0);
  assert.ok(
    spotterInspectionAt(174 * 60 + 12).openness > 0 &&
      spotterInspectionAt(174 * 60 + 12).openness < 1,
  );
  assert.equal(spotterInspectionAt(182 * 60).scrollAmount, 1);
  assert.ok(
    spotterInspectionAt(183 * 60).scrollAmount > 0 &&
      spotterInspectionAt(183 * 60).scrollAmount < 1,
  );
  assert.equal(spotterInspectionAt(184 * 60).active, false);
  assert.equal(spotterInspectionAt(205 * 60).active, true);
});
test("the graph is visible while new step groups and their actual result nodes arrive", () => {
  for (const step of STEP_TIMING.slice(1)) {
    assert.equal(spotterPocketAt(step.submit), "lineage");
    assert.equal(spotterPocketAt(step.tools[0].result + 12), "lineage");
  }
  assert.equal(spotterPocketAt(114 * 60), "evidence");
});
test("renumbering preserves references to omitted ranges instead of aliasing them to the poisoned step", () => {
  assert.equal(
    displayedStepText("Round 1; round 2; ROUND 5."),
    "Step 1; Step 2; Step 3.",
  );
  assert.equal(
    displayedStepText("Round 1–3; Round 5-6; Round 12."),
    "Round 1–3; Round 5-6; Round 12.",
  );
});
test("every step stages prompt, three tool results, thinking, smooth collapse and response in causal order", () => {
  for (const timing of STEP_TIMING) {
    assert.ok(timing.begin < timing.submit);
    assert.equal(timing.tools.length, 3);
    let prior = timing.submit;
    for (const tool of timing.tools) {
      assert.ok(prior < tool.begin);
      assert.ok(tool.begin < tool.result && tool.result < tool.compact);
      prior = tool.compact;
    }
    assert.ok(prior < timing.thinking);
    assert.ok(
      timing.thinking < timing.thoughtComplete &&
        timing.thoughtComplete < timing.collapse,
    );
    assert.ok(timing.collapse + 24 < timing.answer);
    assert.ok(timing.answer < timing.complete);
  }
});
test("the main and reviewer source clock is monotonic, finishes after the alert and freezes throughout inspection", () => {
  let previous = -1;
  for (let frame = 0; frame < SPOTTER_FRAMES; frame += 30) {
    const next = spotterSourceAt(pair, frame);
    assert.ok(next >= previous);
    previous = next;
  }
  assert.ok(spotterSourceAt(pair, 159 * 60) >= 558644);
  for (const sec of [167, 174, 184, 191, 203])
    assert.equal(spotterSourceAt(pair, sec * 60), 567811);
  assert.equal(spotterPocketAt(150 * 60), "spotter");
});
test("selected recorded thinking is neither fabricated nor silently read from a different round", () => {
  const main = pair.sessions.find((s) => s.role === "primary")!;
  for (const step of buildSpotterReconstruction(pair).steps) {
    const excerpt = mainThoughtExcerpt(main, step.answerId, step.number);
    const block = main.view.messages
      .flatMap((m) => m.blocks)
      .find((b) => b.id === excerpt.blockId)!;
    assert.equal(
      [...block.text!].slice(excerpt.start, excerpt.end).join(""),
      excerpt.text,
    );
    assert.ok(excerpt.text.length > 200 && excerpt.text.length < 2000);
    assert.equal(
      spotterPrefix(excerpt.text, 15, 10, 20),
      [...excerpt.text]
        .slice(0, Math.floor([...excerpt.text].length / 2))
        .join(""),
    );
  }
});
