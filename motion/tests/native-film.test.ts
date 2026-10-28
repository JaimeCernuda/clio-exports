import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  filmInput,
  filmPose,
  FILM_FRAMES,
  progress,
  filmStage,
  sourceExcerpt,
} from "../native/film-plan";
import story from "../native/film-story.json";

test("all film poses and text are deterministic and remain source-linked", () => {
  const scene = JSON.parse(
    readFileSync(
      new URL("../native/public/tahoe.native.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(scene.session.id, story.sourceSessionId);
  const questions = story.questionIds.map((id) => {
    const message = scene.view.messages.find(
      (message: { id: string }) => message.id === id,
    );
    assert.equal(message.role, "user");
    return message.blocks
      .filter((block: { type: string }) => block.type === "text")
      .map((block: { text: string }) => block.text)
      .join("\n");
  });
  for (let frame = 0; frame < FILM_FRAMES; frame++) {
    const pose = filmPose(frame);
    assert.deepEqual(pose, filmPose(frame));
    assert(Object.values(pose).every(Number.isFinite));
    assert(pose.mapScale > 0 && pose.mapScale <= 1);
    const input = filmInput(frame, questions[0], questions[1]);
    assert(questions[0].startsWith(input) || questions[1].startsWith(input));
  }
  assert.equal(progress(-1, 0, 10), 0);
  assert.equal(progress(11, 0, 10), 1);
  assert.throws(() => filmPose(NaN), /finite/);
  for (const id of story.toolIds)
    assert(scene.view.tools.some((tool: { id: string }) => tool.id === id));
  assert(!JSON.stringify(story.questionIds).includes("825e7fe2"));
  assert.equal(story.mapSurfaceId, "tahoe-boundary-map");
  assert.equal(story.chartSurfaceId, "tahoe-shoreline-resolution");
});

test("the story covers the film and each generated view follows its real generating call", () => {
  const scene = JSON.parse(
    readFileSync(
      new URL("../native/public/tahoe.native.json", import.meta.url),
      "utf8",
    ),
  );
  let end = 0;
  for (const stage of story.stages) {
    assert.equal(stage.start, end);
    assert(stage.end > stage.start);
    assert(stage.caption.length < 40);
    assert.equal(filmStage(stage.start).id, stage.id);
    end = stage.end;
    if ("cause" in stage) {
      const tool = scene.view.tools.find(
        (value: { id: string }) => value.id === stage.cause,
      );
      assert.equal(tool.name, "create_a2ui_surface");
      const frame = stage.start;
      assert.equal(
        stage.id === "map"
          ? filmPose(frame).mapOpacity
          : filmPose(frame).chartOpacity,
        0,
      );
      assert(
        (stage.id === "map"
          ? filmPose(frame + 160).mapOpacity
          : filmPose(frame + 160).chartOpacity) > 0,
      );
    }
  }
  assert.equal(end, FILM_FRAMES);
  const positions = story.toolIds.map((id) =>
    scene.view.tools.findIndex((value: { id: string }) => value.id === id),
  );
  assert.deepEqual(
    positions,
    [...positions].sort((a, b) => a - b),
  );
});

test("recorded explanations and thoughts are verbatim excerpts with their own source identities", () => {
  const scene = JSON.parse(
    readFileSync(
      new URL("../native/public/tahoe.native.json", import.meta.url),
      "utf8",
    ),
  );
  for (const value of Object.values(story.fragments)) {
    const selection = value as {
      message: string;
      part: string;
      from?: string;
      until?: string;
    };
    const message = scene.view.messages.find(
      (entry: { id: string }) => entry.id === selection.message,
    );
    const block = message.blocks.find(
      (entry: { id: string }) => entry.id === selection.part,
    );
    assert(["text", "reasoning"].includes(block.type));
    const excerpt = sourceExcerpt(block.text, selection.from, selection.until);
    assert(excerpt.length > 0 && block.text.includes(excerpt));
    assert(!excerpt.toLowerCase().includes("saved outputs"));
  }
  assert.throws(() => sourceExcerpt("actual source", "invented"), /missing/);
  assert.throws(
    () => sourceExcerpt("actual source", undefined, "invented"),
    /missing/,
  );
  const movie = readFileSync(
    new URL("../native/narrative.tsx", import.meta.url),
    "utf8",
  );
  assert(!movie.includes("film-status"));
  assert(!movie.includes("film-context-credit"));
});
