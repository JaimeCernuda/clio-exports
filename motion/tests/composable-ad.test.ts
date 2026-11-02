import assert from "node:assert/strict";
import test from "node:test";
import {
  adContributions,
  adInspection,
  adInspectionRoute,
  adInspectionTiming,
  adContributionOpacity,
  adSelection,
  adMenu,
  adPromptBounds,
  adPointer,
  adPluginPoses,
  adState,
  adWheel,
  adOpeningCase,
  adWords,
  copy,
  profiles,
} from "../src/composable-ad-plan";
import type { PromptLayout, WordBox } from "../src/prompt-morph";
import { phase } from "../src/prompt-morph";

test("selected menu row preserves source geometry and clears neighbors before growing", () => {
  const start = adSelection(copy.staging.selectAt);
  assert.deepEqual(
    { x: start.x, y: start.y, width: start.width, height: start.height },
    copy.selection.source,
  );
  assert.equal(adMenu(559).hover, 1);
  assert.equal(adMenu(559).sourceOpacity, 1);
  assert.equal(adMenu(copy.staging.selectAt).sourceOpacity, 0);
  let previous = start;
  for (
    let frame = copy.staging.selectAt;
    frame <= copy.staging.dockAt;
    frame++
  ) {
    const actor = adSelection(frame);
    if (adMenu(frame).opacity > 0.001) {
      assert.equal(actor.morph, 0);
      assert.equal(actor.height, copy.selection.source.height);
      assert.ok(
        actor.y + actor.height <=
          copy.selection.source.y + copy.selection.source.height,
      );
    }
    assert.ok(Math.abs(actor.height - previous.height) < 3);
    previous = actor;
  }
  assert.equal(previous.height, 76);
  assert.equal(previous.morph, 1);
});

test("opening sentence case clears the uppercase glyph before revealing lowercase", () => {
  assert.deepEqual(adOpeningCase(copy.staging.brandAt), { upper: 1, lower: 0 });
  assert.deepEqual(adOpeningCase(copy.staging.brandAt + 34), {
    upper: 0,
    lower: 1,
  });
  for (
    let frame = copy.staging.brandAt;
    frame <= copy.staging.brandAt + 50;
    frame++
  ) {
    const glyph = adOpeningCase(frame);
    assert.equal(glyph.upper * glyph.lower, 0);
  }
});

test("menu extraction clears the appearing prompt and hands off without a jump", () => {
  let previous = adSelection(copy.staging.selectAt);
  for (let f = copy.staging.selectAt; f <= copy.staging.dockAt; f++) {
    const actor = adSelection(f),
      paper = adPromptBounds(316, actor.focus),
      body = phase(f, copy.staging.promptAt, 70);
    paper.y += 20 * (1 - body);
    const overlapX =
        Math.min(actor.x + actor.width, paper.x + paper.width) -
        Math.max(actor.x, paper.x),
      overlapY =
        Math.min(actor.y + 76, paper.y + paper.height) -
        Math.max(actor.y, paper.y);
    assert.ok(overlapX <= 0 || overlapY <= 0, `Prompt crossed at frame ${f}`);
    assert.ok(Math.hypot(actor.x - previous.x, actor.y - previous.y) < 20);
    previous = actor;
  }
  const end = adSelection(copy.staging.dockAt),
    inspection = adInspection(
      copy.staging.dockAt,
      copy.staging.dockAt,
      805,
      true,
    );
  assert.ok(Math.abs(end.x - inspection.x) < 0.001);
  assert.ok(Math.abs(end.y - inspection.y) < 0.001);
  assert.equal(end.width, inspection.width);
  assert.equal(end.focus, inspection.focus);
});

test("one vertical wheel holds whole words, accelerates, and stops on composable", () => {
  assert.equal(adWheel(0).position, 0);
  assert.equal(adWheel(70).position, 1);
  assert.equal(adWheel(126).position, 2);
  assert.equal(copy.wheel.words.at(-1), "composable");
  let maximum = 0;
  for (let f = 1; f <= copy.wheel.end; f++) {
    assert.ok(adWheel(f).position >= adWheel(f - 1).position - 1e-9);
    maximum = Math.max(maximum, adWheel(f).velocity);
  }
  assert.ok(maximum > 18);
  assert.equal(
    adWheel(copy.wheel.end + 1).position,
    copy.wheel.words.length - 1,
  );
  assert.equal(adWheel(copy.wheel.end + 1).blur, 0);
  assert.ok(!("intro" in copy));
  assert.ok(new Set(copy.wheel.words).size >= 12);
});

test("plugins bring bundles of capabilities, never independently added skills or MCPs", () => {
  for (const module of copy.modules) {
    assert.ok(module.lines.length >= 2);
    assert.ok(
      module.skills.length > 0 &&
        module.tools.length > 0 &&
        module.hooks.length > 0,
    );
  }
  const first = adContributions(profiles.manufacturing);
  assert.deepEqual(
    new Set(first.map((item) => item.owner)),
    new Set(["manufacturing"]),
  );
  assert.deepEqual(
    new Set(first.map((item) => item.family)),
    new Set(["skills", "mcpServers", "tools", "hooks"]),
  );
});

test("adding plugins extends instructions while retaining the active domain", () => {
  for (const id of ["simulation", "reports"]) {
    const change = copy.changes.find((change) => change.to === id)!;
    const before = profiles[change.from],
      after = profiles[id];
    assert.deepEqual(after.lines.slice(0, before.lines.length), before.lines);
    assert.deepEqual(
      after.modules.slice(0, before.modules.length),
      before.modules,
    );
    assert.equal(after.role, "You are a manufacturing agent.");
  }
  assert.equal(profiles.reports.modules.length, 3);
});

test("different domains change identity and domain content while reusing Reports", () => {
  const roles = new Set<string>();
  for (const id of [
    "genomics",
    "climate",
    "robotics",
    "materials",
    "medical",
  ]) {
    const profile = profiles[id];
    assert.equal(profile.modules[0].id, id);
    assert.ok(profile.modules.some((module) => module.id === "reports"));
    assert.equal(profile.lines[0].text, profile.modules[0].role);
    assert.deepEqual(
      profile.lines.filter((line) => line.id.startsWith("reports:")),
      copy.modules.find((module) => module.id === "reports")!.lines,
    );
    assert.ok(
      !adContributions(profile).some((item) => item.owner === "manufacturing"),
    );
    roles.add(profile.role);
  }
  assert.equal(roles.size, 5);
});

test("common operating instructions stay unchanged through all domain changes", () => {
  for (const profile of Object.values(profiles)) {
    assert.deepEqual(
      profile.lines.slice(1, copy.baseLines.length),
      copy.baseLines.slice(1),
    );
    assert.equal(
      new Set(profile.lines.map((line) => line.id)).size,
      profile.lines.length,
    );
    assert.ok(
      profile.modules.every(
        (module) =>
          module.id in
          Object.fromEntries(copy.modules.map((entry) => [entry.id, true])),
      ),
    );
  }
});

test("retained and arriving plugin slots keep clearance during reconfiguration", () => {
  for (const change of copy.changes)
    for (let f = 0; f <= change.duration; f++) {
      const poses = adPluginPoses(
        profiles[change.from],
        profiles[change.to],
        f / change.duration,
      )
        .filter((pose) => pose.opacity > 0.2)
        .sort((a, b) => a.x - b.x);
      for (let i = 1; i < poses.length; i++)
        assert.ok(poses[i].x - (poses[i - 1].x + poses[i - 1].width) >= 19.99);
      if (f === change.duration)
        assert.deepEqual(
          poses.map((pose) => pose.name),
          profiles[change.to].pieces,
        );
    }
});

test("domain changes resolve before a stationary five-second close", () => {
  for (const [i, change] of copy.changes.entries()) {
    assert.equal(change.from, i ? copy.changes[i - 1].to : "base");
    assert.equal(adState(change.at).p, 0);
    assert.equal(adState(change.at + change.duration).p, 1);
    assert.ok(change.at + change.duration < copy.closing.at);
  }
  assert.ok(copy.frames - copy.closing.settled >= 300);
  assert.ok(/illustrative/iu.test(copy.copyMode));
});

test("a new domain identity follows a visible incoming plugin", () => {
  const role = (text: string): WordBox => ({
    id: "role:0",
    block: "role",
    text,
    x: 0,
    y: 0,
    width: 130,
    height: 30,
    fontSize: 28,
    fontWeight: 450,
    color: "#15364a",
    mono: true,
  });
  const before: PromptLayout = {
    words: [role("climate")],
    boxes: [],
    height: 44,
  };
  const after: PromptLayout = {
    words: [role("robotics")],
    boxes: [],
    height: 44,
  };
  for (let f = 0; f <= 72; f++) {
    const p = f / 72,
      word = adWords(before, after, p).find(
        (entry) => entry.text === "robotics",
      )!;
    const plugin = adPluginPoses(profiles.climate, profiles.robotics, p).find(
      (entry) => entry.name === "Robotics",
    )!;
    if (word.opacity > 0.5) assert.ok(plugin.opacity > 0.2);
  }
});

test("the pointer continuously presses the aligned plus and the plugin choice", () => {
  assert.equal(adPointer(484).press, 1);
  assert.equal(adPointer(559).press, 1);
  assert.equal(adPointer(610).opacity, 0);
  let maximum = 0;
  for (let frame = 441; frame <= 605; frame++) {
    const a = adPointer(frame - 1),
      b = adPointer(frame);
    maximum = Math.max(maximum, Math.hypot(a.x - b.x, a.y - b.y));
  }
  assert.ok(maximum < 32);
});

test("inserted instructions cannot cover a retained lower fragment", () => {
  const word = (block: string, y: number): WordBox => ({
    id: block,
    block,
    text: block,
    x: 0,
    y,
    width: 130,
    height: 30,
    fontSize: 28,
    fontWeight: 450,
    color: "#15364a",
    mono: true,
  });
  const a: PromptLayout = {
    words: [word("role", 0), word("report", 60)],
    boxes: [],
    height: 120,
  };
  const b: PromptLayout = {
    words: [word("role", 0), word("domain", 60), word("report", 120)],
    boxes: [],
    height: 180,
  };
  for (let f = 0; f <= 90; f++) {
    const words = adWords(a, b, f / 90),
      insert = words.find((entry) => entry.block === "domain")!,
      retained = words.find((entry) => entry.block === "report")!;
    if (insert.opacity > 0.1 && insert.clipBottom < insert.height)
      assert.ok(
        insert.y + insert.height - insert.clipBottom <= retained.y - 6.9,
      );
  }
});

test("removed instructions clear before a retained report moves through them", () => {
  const word = (block: string, y: number): WordBox => ({
    id: block,
    block,
    text: block,
    x: 0,
    y,
    width: 130,
    height: 37,
    fontSize: 28,
    fontWeight: 450,
    color: "#15364a",
    mono: true,
  });
  const before: PromptLayout = {
    words: [word("role", 0), word("removed", 44), word("report", 88)],
    boxes: [],
    height: 132,
  };
  const after: PromptLayout = {
    words: [word("role", 0), word("report", 44)],
    boxes: [],
    height: 88,
  };
  for (let f = 0; f <= 90; f++) {
    const words = adWords(before, after, f / 90),
      removed = words.find((entry) => entry.block === "removed")!,
      report = words.find((entry) => entry.block === "report")!;
    if (removed.opacity > 0.1 && removed.clipBottom < removed.height)
      assert.ok(
        removed.y + removed.height - removed.clipBottom <= report.y - 6.9,
      );
  }
});

test("a plugin closes before transfer and routes around the prompt and retained plugins", () => {
  const overlap = (
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number },
  ) =>
    Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  for (const change of copy.changes.filter((change) => change.bundle)) {
    const from = profiles[change.from],
      to = profiles[change.to];
    const target = adPluginPoses(from, to, 1).find((pose) => pose.added)!;
    let previous = adInspection(
      change.at,
      change.at,
      target.x,
      from.id === "base",
    );
    for (
      let elapsed = 0;
      elapsed <= adInspectionTiming(change.at).end;
      elapsed++
    ) {
      const p = Math.min(1, elapsed / change.duration),
        state = adInspection(
          change.at + elapsed,
          change.at,
          target.x,
          from.id === "base",
        );
      const lineCount =
        from.lines.length +
        (to.lines.length - from.lines.length) *
          (p * p * p * (p * (p * 6 - 15) + 10));
      const prompt = adPromptBounds(lineCount * 44 + 96, state.focus);
      const rows =
        1 +
        target.module.skills.length +
        target.module.mcpServers.length +
        target.module.tools.length +
        target.module.hooks.length;
      const card = {
        x: state.x,
        y: state.y,
        width: state.width,
        height: 76 + (rows * 43 + 15) * state.expand,
      };
      if (state.opacity > 0.2)
        assert.equal(
          overlap(card, prompt),
          0,
          `${change.to} covers the prompt at ${elapsed}`,
        );
      if (state.travel > 0) {
        assert.equal(state.expand, 0);
        assert.equal(state.bodyOpacity, 0);
      }
      if (state.bodyOpacity > 0.01) assert.equal(state.expand, 1);
      for (const other of adPluginPoses(from, to, p).filter(
        (pose) => pose.name !== target.name && pose.opacity > 0.2,
      )) {
        assert.equal(
          overlap(card, {
            x: other.x,
            y: 820 - (other.kept ? 0 : 35 * (1 - other.opacity)),
            width: 310,
            height: 76,
          }),
          0,
        );
      }
      assert.ok(Math.hypot(state.x - previous.x, state.y - previous.y) < 50);
      previous = state;
    }
    assert.deepEqual(adInspectionRoute(target.x, 0), { x: 1300, y: 300 });
    assert.deepEqual(adInspectionRoute(target.x, 1), { x: target.x, y: 820 });
  }
});

test("bundle rows reveal in order and stay fully readable before closing", () => {
  const inspections = copy.changes.filter((change) => change.bundle);
  assert.equal(inspections.length, 3);
  assert.equal(inspections[0].to, "manufacturing");
  assert.ok(copy.changes.filter((change) => !change.bundle).length >= 5);
  for (const [index, change] of inspections.entries()) {
    const timing = adInspectionTiming(change.at),
      next = copy.changes.find((candidate) => candidate.at > change.at);
    assert.ok(timing.fadeAt - timing.allRowsAt >= (index === 0 ? 108 : 60));
    assert.ok(next && change.at + timing.end < next.at);
    for (let elapsed = timing.allRowsAt; elapsed <= timing.fadeAt; elapsed++)
      for (let row = 0; row < timing.rows; row++)
        assert.equal(
          adContributionOpacity(change.at + elapsed, change.at, row),
          1,
        );
    for (let row = 1; row < timing.rows; row++) {
      const start =
        change.at +
        copy.inspection.contentsAt +
        row * copy.inspection.rowStaggerFrames;
      assert.equal(adContributionOpacity(start, change.at, row), 0);
      assert.ok(adContributionOpacity(start, change.at, row - 1) > 0);
    }
    for (let row = 0; row < timing.rows; row++)
      assert.equal(
        adContributionOpacity(change.at + timing.transferAt, change.at, row),
        0,
      );
  }
  assert.throws(() => adInspectionTiming(0), /No bundle inspection/);
  assert.throws(
    () => adContributionOpacity(620, 620, -1),
    /Invalid contribution row/,
  );
});
