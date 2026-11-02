import assert from "node:assert/strict";
import test from "node:test";
import {
  adHeadline,
  adPointer,
  adPluginPoses,
  adState,
  adWheel,
  adWords,
  copy,
  profiles,
} from "../src/composable-ad-plan";
import type { PromptLayout, WordBox } from "../src/prompt-morph";

test("opening types, holds and backspaces the changing word in a classic cadence", () => {
  for (const pass of copy.intro) {
    assert.equal(adHeadline(pass.typed).text, pass.word);
    assert.equal(adHeadline(pass.typed + 4).text, pass.word);
    if (pass.erase < copy.frames) {
      const frames = Array.from(
        { length: pass.end - pass.erase },
        (_, i) => adHeadline(pass.erase + i).text,
      );
      assert.ok(
        frames.every(
          (text, i) =>
            pass.word.startsWith(text) &&
            (!i || text.length <= frames[i - 1].length),
        ),
      );
      assert.equal(adHeadline(pass.end).text, "");
    }
  }
});

test("the ad uses broad example domains and names its actual composition pieces", () => {
  const text = JSON.stringify(copy);
  assert.ok(
    !/opal|earthscope|factorio|core|filesystem|shell_bash|slurm|parquet/iu.test(
      text,
    ),
  );
  assert.ok(new Set(copy.wheel.words).size >= 12);
  assert.ok(copy.choices.length >= 12);
  assert.ok(profiles.reports.lines.length >= 14);
  assert.ok(
    copy.modules.some((module) => module.kind === "skill" && module.name),
  );
  assert.ok(
    copy.modules.some((module) => module.kind === "mcp" && module.name),
  );
  assert.ok(/illustrative/iu.test(copy.copyMode));
});

test("every build step preserves the base prompt and appends its contribution", () => {
  for (const change of copy.changes) {
    const before = profiles[change.from],
      after = profiles[change.to];
    assert.deepEqual(after.lines.slice(0, before.lines.length), before.lines);
    assert.ok(after.lines.length > before.lines.length);
    assert.deepEqual(
      after.modules.slice(0, before.modules.length),
      before.modules,
    );
    assert.equal(
      new Set(after.lines.map((line) => line.id)).size,
      after.lines.length,
    );
  }
  assert.deepEqual(profiles.simulation.pieces, ["Manufacturing", "Simulation"]);
  assert.equal(profiles.reports.modules.length, 5);
});

test("the horizontal wheel accelerates and resolves after traversing many domains", () => {
  let previousSpeed = 0;
  for (let frame = copy.wheel.at + 1; frame <= copy.wheel.end; frame++) {
    const speed = adWheel(frame).position - adWheel(frame - 1).position;
    assert.ok(speed >= previousSpeed - 1e-9);
    previousSpeed = speed;
  }
  assert.equal(adWheel(copy.wheel.at).opacity, 0);
  assert.equal(adWheel(copy.wheel.end).opacity, 0);
  assert.ok(adWheel(copy.wheel.end).position >= 12);
});

test("new plugins leave clearance for retained plugins during every docking frame", () => {
  for (const change of copy.changes) {
    for (let f = 0; f <= change.duration; f++) {
      const poses = adPluginPoses(
        profiles[change.from],
        profiles[change.to],
        f / change.duration,
      )
        .filter((pose) => pose.enter > 0.1)
        .sort((a, b) => a.x - b.x);
      for (let i = 1; i < poses.length; i++)
        assert.ok(poses[i].x - (poses[i - 1].x + poses[i - 1].width) >= 13.99);
    }
  }
});

test("every semantic change follows the prior one and resolves before the five-second close", () => {
  for (const [i, change] of copy.changes.entries()) {
    assert.equal(change.from, i ? copy.changes[i - 1].to : "base");
    assert.equal(adState(change.at).p, 0);
    assert.equal(adState(change.at + change.duration).p, 1);
    assert.ok(change.at + change.duration < copy.closing.at);
  }
  assert.ok(copy.frames - copy.closing.settled >= 300);
});

test("the pointer has one bounded entry, press and deliberate exit", () => {
  assert.equal(adPointer(506).press, 1);
  assert.equal(adPointer(550).opacity, 0);
  let max = 0;
  for (let frame = 468; frame < 545; frame++) {
    const a = adPointer(frame - 1),
      b = adPointer(frame);
    max = Math.max(max, Math.hypot(a.x - b.x, a.y - b.y));
  }
  assert.ok(max < 20);
});

test("new instruction lines stay inside the space the moving conclusion has opened", () => {
  const word = (block: string, y: number): WordBox => ({
    id: block,
    block,
    text: block,
    x: 0,
    y,
    width: 130,
    height: 40,
    fontSize: 32,
    fontWeight: 400,
    color: "#123",
    mono: false,
  });
  const a: PromptLayout = {
    words: [word("role", 0), word("result", 70)],
    boxes: [],
    height: 140,
  };
  const b: PromptLayout = {
    words: [word("role", 0), word("simulation", 70), word("result", 140)],
    boxes: [],
    height: 210,
  };
  for (let i = 0; i <= 60; i++) {
    const p = i / 60,
      words = adWords(a, b, p),
      row = words.find((word) => word.block === "simulation")!,
      footer = words.find((word) => word.block === "result")!;
    if (row.opacity > 0.1 && row.clipBottom < row.height)
      assert.ok(row.y + row.height - row.clipBottom <= footer.y - 9);
  }
});
