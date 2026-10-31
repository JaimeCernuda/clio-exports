import { test } from "node:test";
import assert from "node:assert/strict";
import {
  engineeringFilmPose,
  engineeringReplayEdits,
  ENGINEERING_FILM_FRAMES,
  engineeringFieldHover,
  engineeringTimeBridge,
  engineeringSourceFrames,
  engineeringSourceToGlobal,
} from "../native/engineering-film-plan";
import { buildReplayPlan } from "../native/replay-plan";

test("the short watcher launch is followed by an editorial pause, not a fake runtime clock", () => {
  assert.equal(engineeringTimeBridge(37), 0);
  assert.equal(engineeringTimeBridge(39), 1);
  assert.equal(engineeringTimeBridge(41.2), 0);
  assert.equal(engineeringFilmPose(39 * 60).sourceFrame, 2309);
  assert.equal(engineeringFilmPose(40.5 * 60).sourceFrame, 2309);
  assert.ok(engineeringFilmPose(41.5 * 60).sourceFrame > 2309);
  assert.equal(engineeringSourceFrames("e4"), 6570);
  assert.equal(engineeringSourceToGlobal(2309, "e4"), 2309);
  assert.equal(engineeringSourceToGlobal(2310, "e4"), 2460);
  assert.equal(engineeringSourceToGlobal(5129, "e4"), 5279);
  assert.equal(engineeringSourceToGlobal(5130, "e4"), 9240);
  assert.equal(engineeringSourceToGlobal(0, "e5"), 11700);
});
test("the closing returns through Results and keeps the final design and curve fully visible", () => {
  assert.equal(engineeringFilmPose(343 * 60).tab, "tSaved");
  assert.equal(engineeringFilmPose(350 * 60).tab, "tRes");
  assert.equal(engineeringFilmPose(350 * 60).expansion, 1);
  assert.ok(
    engineeringFilmPose(350 * 60).orbit > engineeringFilmPose(348 * 60).orbit,
  );
});

test("field inspection preserves pauses and clears native tooltips before resuming", () => {
  assert.equal(engineeringFieldHover(312 * 60), "mesh");
  assert.equal(engineeringFieldHover(318 * 60), "mesh");
  assert.equal(engineeringFieldHover(322 * 60), undefined);
  assert.equal(engineeringFieldHover(327 * 60), "chart");
  assert.equal(engineeringFieldHover(332 * 60), "chart");
  assert.equal(engineeringFieldHover(334 * 60), undefined);
  for (const seconds of [312, 318, 327, 332])
    assert.equal(engineeringFilmPose(seconds * 60).sourceFrame, 3719);
});

test("both source clocks freeze for inspections, including expansion and restoration", () => {
  for (const seconds of [88, 89, 94, 115, 136, 150, 153])
    assert.equal(engineeringFilmPose(seconds * 60).sourceFrame, 5129);
  assert.equal(engineeringFilmPose(152.2 * 60).expansion, 0);
  assert.ok(engineeringFilmPose(155 * 60).sourceFrame > 5129);
  for (const seconds of [257, 260, 280, 302, 323, 338, 350])
    assert.equal(engineeringFilmPose(seconds * 60).sourceFrame, 3719);
  assert.equal(engineeringFilmPose(194 * 60).run, "e4");
  assert.equal(engineeringFilmPose(195 * 60).run, "e5");
});
test("saved mesh cases stay distinct from actual iteration history", () => {
  assert.equal(engineeringFilmPose(135 * 60).selection, 9);
  assert.equal(engineeringFilmPose(136 * 60).selection, 4);
  assert.equal(engineeringFilmPose(281.5 * 60).threshold, 0.1);
  const iterations = new Set(
    Array.from(
      { length: 31 * 60 },
      (_, f) => engineeringFilmPose(278 * 60 + f).iteration,
    ),
  );
  assert.equal(engineeringFilmPose(279 * 60).iteration, 10);
  assert.deepEqual(
    [...iterations].sort((a, b) => a - b),
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
  assert.equal(engineeringFilmPose(304 * 60).threshold, 0.5);
  assert.equal(engineeringFilmPose(322 * 60).report, "fields");
  assert.equal(engineeringFilmPose(338 * 60).tab, "tSaved");
  assert.equal(ENGINEERING_FILM_FRAMES, 21360);
});
test("weighted replay preserves source order and places the next request after the inspection boundary", () => {
  const messages = [
    {
      id: "user",
      role: "user",
      blocks: [{ id: "request", type: "text", text: "A real request" }],
    },
    {
      id: "agent",
      role: "assistant",
      blocks: [
        { id: "call", type: "tool", tool_id: "real-call" },
        { id: "answer", type: "text", text: "The saved result" },
      ],
    },
    {
      id: "follow-up",
      role: "user",
      blocks: [
        {
          id: "part_5fe40ff0460b",
          type: "text",
          text: "Compare the saved work",
        },
      ],
    },
  ];
  const plan = buildReplayPlan(
    messages,
    engineeringSourceFrames("e4"),
    20,
    engineeringReplayEdits(messages, "e4"),
  );
  assert.equal(plan.events.at(-1)!.start, 5130);
  assert.deepEqual(
    plan.events.map((e) => e.blockId),
    ["request", "call", "answer", "part_5fe40ff0460b"],
  );
});
