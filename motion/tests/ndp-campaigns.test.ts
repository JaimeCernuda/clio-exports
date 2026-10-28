import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { campaigns, campaignStory } from "../native/campaign-catalog";
import { campaignFrame } from "../native/campaign-plan";
import { buildReplayPlan, replayText } from "../native/replay-plan";
import { buildPresentation, presentationAt } from "../native/presentation-plan";
import { inspectionPlan } from "../scripts/inspection-plan";
import { controlAt, validateControlTrack } from "../native/control-plan";
import { downloadPhase } from "../native/download-plan";

test("native choice and slider tracks change data controls and return to the captured values", () => {
  for (const id of ["alta", "konza"] as const)
    for (const focus of campaigns[id].focuses)
      for (const control of focus.controls ?? []) {
        const original = JSON.stringify(control);
        validateControlTrack(control, focus.frames);
        for (let frame = 0; frame < focus.frames; frame++) {
          const pose = controlAt(control, frame);
          assert.deepEqual(pose, controlAt(control, frame));
          if (pose.kind === "range") {
            assert(pose.value[0] < pose.value[1]);
            for (const value of pose.value)
              assert.equal(value / pose.step, Math.round(value / pose.step));
          }
        }
        const final = controlAt(control, focus.frames - 168);
        assert.deepEqual([...final.value].sort(), [...control.initial].sort());
        assert.equal(JSON.stringify(control), original);
      }
  const months = campaigns.alta.focuses[1].controls!.find(
    (c) => c.id === "months",
  )!;
  assert.deepEqual(controlAt(months, 540).value, ["Jan", "Feb", "Mar"]);
  const hours = campaigns.konza.focuses[0].controls![0];
  assert.deepEqual(controlAt(hours, 420).value, [8, 20]);
  assert.deepEqual(controlAt(hours, 700).value, [16, 17]);
  const invalid = structuredClone(hours);
  if (invalid.kind === "range") invalid.keyframes.at(-1)!.value = [8, 20];
  assert.throws(() => validateControlTrack(invalid, 1140), /captured state/);
});

test("the download is a distinct native menu, format and save action", () => {
  const beat = campaigns.alta.focuses[1].download!;
  assert.equal(downloadPhase(beat, beat.open - 1), "closed");
  assert.equal(downloadPhase(beat, beat.open), "menu");
  assert.equal(downloadPhase(beat, beat.formats), "formats");
  assert.equal(downloadPhase(beat, beat.save), "saved");
  assert(beat.save < campaigns.alta.focuses[1].frames - 168);
});

test("canvas inspections reflow one native view and restore it before the source clock resumes", () => {
  for (const id of ["tahoe", "alta", "konza"] as const) {
    const story = campaigns[id],
      scene = JSON.parse(
        readFileSync(
          new URL(`../native/public/${story.sceneFile}`, import.meta.url),
          "utf8",
        ),
      );
    const replay = buildReplayPlan(
      scene.view.messages,
      story.pitch.sourceFrames,
      story.pitch.turns ?? 2,
      story.replay,
    );
    const plan = buildPresentation(replay, story.focuses);
    for (const focus of plan.focuses.filter((f) => f.canvas)) {
      assert.equal(presentationAt(plan, focus.start).canvasExpansion, 0);
      assert.equal(presentationAt(plan, focus.start + 132).canvasExpansion, 1);
      assert.equal(presentationAt(plan, focus.end - 60).canvasExpansion, 0);
      assert.equal(presentationAt(plan, focus.end - 60).canvasMaximized, false);
      let previous = 0;
      for (let frame = focus.start; frame < focus.end; frame++) {
        const pose = presentationAt(plan, frame);
        assert.equal(pose.zoom, 1);
        assert.equal(pose.sourceFrame, focus.sourceFrame);
        assert(Math.abs(pose.canvasExpansion - previous) < 0.026);
        previous = pose.canvasExpansion;
        assert.deepEqual(pose, presentationAt(plan, frame));
      }
      assert.equal(
        presentationAt(plan, focus.end).sourceFrame,
        focus.sourceFrame,
      );
      assert(
        presentationAt(plan, focus.end + 1).sourceFrame > focus.sourceFrame,
      );
    }
    const jobs = inspectionPlan(id, scene.view.messages);
    for (const job of jobs)
      assert.equal(
        job.frameOffset - 120,
        plan.focuses.find((f) => `${id}-${f.id}` === job.id)!.start,
      );
  }
  const konza = campaigns.konza.focuses[1];
  assert.deepEqual(
    konza.observations?.map((o) => o.label),
    ["16:41", "16:23"],
  );
});
for (const id of ["alta", "konza"] as const) {
  test(`${id} retains genuine ordered actions, public replies and view generation`, () => {
    const story = campaigns[id];
    const scene = JSON.parse(
      readFileSync(
        new URL(`../native/public/${story.sceneFile}`, import.meta.url),
        "utf8",
      ),
    );
    const plan = buildReplayPlan(
      scene.view.messages,
      story.pitch.sourceFrames,
      story.pitch.turns!,
      story.replay,
    );
    const original = scene.view.messages.flatMap(
      (m: { blocks: Array<{ id: string }> }) => m.blocks.map((b) => b.id),
    );
    let prev = -1;
    for (const event of plan.events) {
      const index = original.indexOf(event.blockId);
      assert(index > prev);
      prev = index;
      const block = scene.view.messages
        .flatMap((m: { blocks: unknown[] }) => m.blocks)
        .find((b: { id: string }) => b.id === event.blockId);
      if (event.text) assert(block.text.startsWith(event.text));
      if (event.toolId)
        assert(
          scene.view.tools.some((t: { id: string }) => t.id === event.toolId),
        );
      if (event.surfaceId) {
        const before = plan.events.filter(
          (e) => e.end <= event.start && e.toolId,
        );
        assert(
          before.some(
            (e) =>
              scene.view.tools.find((t: { id: string }) => t.id === e.toolId)
                ?.name === "create_a2ui_surface",
          ),
        );
      }
      if (event.type === "text")
        for (let f = event.start; f < event.end - 1; f++)
          assert(replayText(event, f + 1).startsWith(replayText(event, f)));
    }
    assert.equal(plan.events.filter((e) => e.role === "user").length, 2);
    assert(
      !plan.events.some((e) =>
        /reproducibility|handoff\.zip/i.test(e.text ?? ""),
      ),
    );
    for (const beat of story.focuses) {
      const event = plan.events.find((e) =>
        beat.surfaceId
          ? e.surfaceId === beat.surfaceId
          : e.blockId === beat.blockId,
      )!;
      assert(event);
      if (beat.selectionText) assert(event.text?.includes(beat.selectionText));
    }
    const presentation = buildPresentation(plan, story.focuses);
    const stage = story.pitch.stages.find((s) => s.id === "conversation")!;
    assert.equal(presentation.frames, stage.end - stage.start);
    for (const focus of presentation.focuses)
      for (let f = focus.start; f < focus.end; f++)
        assert.equal(
          presentationAt(presentation, f).sourceFrame,
          focus.sourceFrame,
        );
    assert.equal(campaignFrame(stage.start, "pitch", story).turns, 2);
    if (id === "konza") {
      assert(!story.workbench.searchCall);
      assert(
        !plan.events.some(
          (e) =>
            scene.view.tools.find((t: { id: string }) => t.id === e.toolId)
              ?.name === "connected_data_download",
        ),
      );
    }
  });
}
test("campaign selection rejects a typo rather than substituting Tahoe", () => {
  assert.equal(campaignStory("alta").sceneFile, "alta.native.json");
  assert.throws(() => campaignStory("atlta"));
});

import { interpolateMeasurements, smoothScroll } from "../native/replay-layout";
test("native layout keyframes preserve endpoints and produce a bounded per-frame path", () => {
  const samples: Array<number | undefined> = [];
  samples[0] = 0;
  samples[6] = 120;
  samples[12] = 30;
  const raw = interpolateMeasurements(samples, 13);
  assert.deepEqual(raw, [0, 20, 40, 60, 80, 100, 120, 105, 90, 75, 60, 45, 30]);
  const scroll = smoothScroll(raw);
  for (let i = 1; i < scroll.length; i++)
    assert(Math.abs(scroll[i] - scroll[i - 1]) <= 9.001);
  assert.throws(() => interpolateMeasurements([0], 2));
  assert.throws(() => interpolateMeasurements([0, NaN], 2));
  assert.throws(() => interpolateMeasurements([0, -1], 2));
});

import { replayMarkdown, replayPlainText } from "../native/replay-markdown";
test("streamed artifact links never insert a blocked placeholder protocol", () => {
  const text =
    "Using the [aligned observations](workspace-file:/D:/data.csv) for April 15.";
  for (let i = 0; i <= text.length; i++) {
    const part = replayMarkdown(text.slice(0, i));
    assert(!part.includes("streamdown:"));
    assert(!part.includes("[blocked]"));
  }
  assert.equal(replayMarkdown("Using the ["), "Using the ");
  assert.equal(replayMarkdown("Using the [aligned]"), "Using the aligned");
  assert.equal(
    replayPlainText(text),
    replayPlainText("Using the aligned observations for April 15."),
  );
});

import { surfaceScrollOffset } from "../native/replay-layout";
test("a canvas keeps its inspected position when the source event changes to prose", () => {
  assert.equal(surfaceScrollOffset(200, 100, 400, 100), 0);
  assert.equal(surfaceScrollOffset(200, 100, 400, 400), 200);
  assert.equal(surfaceScrollOffset(200, 100, 400, 1000), 200);
  assert.equal(surfaceScrollOffset(200, 900, 1200, 900), 0);
  let previous = 0;
  for (let f = 100; f <= 400; f++) {
    const value = surfaceScrollOffset(200, 100, 400, f);
    assert(value >= previous);
    assert(value <= 200);
    previous = value;
  }
  assert.throws(() => surfaceScrollOffset(-1, 100, 400, 0));
});

import { usesTahoeContext } from "../native/map-context-selection";
test("unrelated sessions cannot inherit the Tahoe reference map", () => {
  for (const q of ["", "?campaign=tahoe", "?scene=tahoe.native.json"])
    assert(usesTahoeContext(q));
  for (const q of [
    "?campaign=alta",
    "?campaign=konza",
    "?scene=another-session.native.json",
    "?scene=alta.native.json&campaign=tahoe",
  ])
    assert(!usesTahoeContext(q));
});

import { layoutKey, validateLayout } from "../native/replay-layout";
for (const id of ["alta", "konza"] as const)
  test(
    id + " measured viewport belongs to its export and has no scroll snaps",
    () => {
      const c = campaigns[id];
      const scene = JSON.parse(
        readFileSync(
          new URL("../native/public/" + c.sceneFile, import.meta.url),
          "utf8",
        ),
      );
      const track = JSON.parse(
        readFileSync(
          new URL("../native/public/" + c.pitch.layoutFile, import.meta.url),
          "utf8",
        ),
      );
      validateLayout(
        track,
        layoutKey(
          scene.session.id + ":" + scene.source.sha256,
          c.pitch.sourceFrames,
          2,
          false,
          c.replay,
        ),
        c.pitch.sourceFrames,
      );
      assert.equal(track.measurementStep, 6);
      assert.deepEqual(track.scroll, smoothScroll(track.raw));
      for (let i = 1; i < track.scroll.length; i++)
        assert(Math.abs(track.scroll[i] - track.scroll[i - 1]) <= 9.001);
      assert(Math.abs(track.scroll.at(-1) - track.raw.at(-1)) < 1);
    },
  );
