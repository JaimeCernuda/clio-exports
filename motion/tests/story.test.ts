import assert from "node:assert/strict";
import test from "node:test";
import storyJson from "../story/ndp-connected.json";
import { buildStoryPlan, storyAt, type StorySpec } from "../src/story-plan";
const story = storyJson as StorySpec;
test("the connected story has continuous coverage and retains frame-accurate source ranges", () => {
  const plan = buildStoryPlan(story);
  for (let f = 0; f < plan.frames; f++) {
    const layers = storyAt(story, f);
    assert(layers.length >= 1 && layers.length <= 2);
    assert.deepEqual(layers, storyAt(story, f));
    for (const layer of layers)
      if (layer.kind === "clip") {
        assert(
          layer.sourceFrame! >= layer.inFrame &&
            layer.sourceFrame! < layer.outFrame,
        );
      }
  }
  for (let i = 1; i < plan.segments.length; i++)
    assert.equal(
      plan.segments[i].start,
      plan.segments[i - 1].end - story.crossfadeFrames,
    );
  assert.throws(() => storyAt(story, plan.frames));
});
test("source identities, ranges and bridge references fail closed", () => {
  const mutate = (fn: (value: StorySpec) => void) => {
    const copy = structuredClone(story);
    fn(copy);
    assert.throws(() => buildStoryPlan(copy));
  };
  mutate((s) => (s.segments[1].id = s.segments[0].id));
  mutate((s) => (s.cards[0].publisher = 500));
  mutate((s) => {
    const clip = s.segments.find((v) => v.kind === "clip")!;
    if (clip.kind === "clip") clip.outFrame = clip.sourceFrames + 1;
  });
  mutate((s) => {
    const clip = s.segments.find((v) => v.kind === "clip")!;
    if (clip.kind === "clip") clip.file = "../outside.mp4";
  });
  mutate((s) => (s.crossfadeFrames = 0));
});
