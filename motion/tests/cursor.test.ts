import assert from "node:assert/strict";
import test from "node:test";
import {
  bindCursorTrack,
  cursorAt,
  cursorBeats,
  cursorObservation,
  inspectionUiFrame,
} from "../native/cursor-plan";
import { campaigns } from "../native/campaign-catalog";
import { controlAt } from "../native/control-plan";

test("long pointer travel cruises steadily instead of accelerating through the whole leg", () => {
  const keys = [
    { at: 0, sampleAt: 0, kind: "button" as const, x: 0, y: 0, size: 24 },
    {
      at: 100,
      sampleAt: 100,
      kind: "button" as const,
      x: 1000,
      y: 0,
      size: 24,
    },
  ];
  const steps = Array.from(
    { length: 40 },
    (_, i) => cursorAt(keys, 31 + i, 120).x - cursorAt(keys, 30 + i, 120).x,
  );
  assert(Math.max(...steps) / Math.min(...steps) < 1.001);
  assert.equal(cursorAt(keys, 100, 120).x, 1000);
});

test("pointer travel is continuous, holds its click target, and is independent of seek order", () => {
  const focus = campaigns.alta.focuses[1],
    beats = cursorBeats(focus);
  const samples = Object.fromEntries(
    beats.map((beat, index) => [
      beat.sampleAt,
      { x: 100 + (index % 3) * 200, y: 100 + (index % 2) * 100, size: 31.5 },
    ]),
  );
  const hover = beats.find((b) => b.kind === "observation")!;
  const click = beats.find((b) => b.kind === "observation" && b.pulse)!;
  samples[click.sampleAt] = samples[hover.sampleAt];
  const track = bindCursorTrack(focus, samples);
  const forward = Array.from({ length: focus.frames }, (_, f) =>
    cursorAt(track, f, focus.frames),
  );
  for (let f = focus.frames - 1; f >= 0; f--)
    assert.deepEqual(cursorAt(track, f, focus.frames), forward[f]);
  for (const key of track) {
    assert.equal(cursorAt(track, key.at, focus.frames).x, key.x);
    assert.equal(cursorAt(track, key.at, focus.frames).y, key.y);
  }
  for (let f = 1; f < focus.frames; f++) {
    const a = forward[f - 1],
      b = forward[f];
    assert(Math.hypot(b.x - a.x, b.y - a.y) < 40, `Pointer jumped at ${f}`);
  }
  assert.equal(forward[0].opacity, 0);
  assert.throws(
    () => bindCursorTrack(focus, {}),
    /Missing native cursor anchor/,
  );
});

test("native hover leaves before pointer travel and remains through selection of the same mark", () => {
  const focus = campaigns.alta.focuses[1];
  assert.equal(cursorObservation(focus, 590), focus.observations![0].label);
  assert.equal(cursorObservation(focus, 608), focus.observations![0].label);
  assert.equal(cursorObservation(focus, 680), undefined);
});

test("UI frame reuse preserves every continuous resize, slider and scroll frame and every action endpoint", () => {
  for (const campaign of Object.values(campaigns))
    for (const focus of campaign.focuses.filter((f) => f.canvas)) {
      let previous = -1;
      for (let age = 0; age < focus.frames; age++) {
        const frame = inspectionUiFrame(focus, age);
        assert(frame >= previous && frame <= age);
        previous = frame;
      }
      for (const beat of cursorBeats(focus))
        assert.equal(inspectionUiFrame(focus, beat.sampleAt), beat.sampleAt);
      for (let f = 72; f <= 132; f++)
        assert.equal(inspectionUiFrame(focus, f), f);
      for (const control of focus.controls ?? [])
        for (let frame = 0; frame < focus.frames; frame++)
          assert.deepEqual(
            controlAt(control, inspectionUiFrame(focus, frame)).value,
            controlAt(control, frame).value,
          );
    }
});
