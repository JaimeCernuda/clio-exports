import assert from "node:assert/strict";
import test from "node:test";
import {
  adAddition,
  adContributions,
  adEditMarks,
  adMenu,
  adModuleRows,
  adOpeningCase,
  adPointer,
  adPointerStops,
  adPluginControl,
  adRemoval,
  adPromptBounds,
  adSelection,
  adState,
  adTreeLayout,
  adTreePoses,
  adWheel,
  adWords,
  copy,
  paper,
  profiles,
  tree,
  wheelDurations,
  wheelStops,
} from "../src/composable-ad-plan";
import type { PromptLayout, WordBox } from "../src/prompt-morph";
import { phase } from "../src/prompt-morph";

const overlap = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) =>
  Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));

test("the wheel smoothly shortens each change and derives blur from cadence and motion", () => {
  assert.equal(wheelDurations[0], 72);
  assert.equal(wheelDurations.at(-1), 12);
  assert.ok(Math.abs(wheelStops.at(-1)! - copy.wheel.end) < 1e-7);
  for (let i = 1; i < wheelDurations.length; i++)
    assert.ok(wheelDurations[i] < wheelDurations[i - 1]);
  for (const [i, frame] of wheelStops.entries()) {
    assert.ok(Math.abs(adWheel(frame).position - i) < 1e-7);
    const before = adWheel(frame - 0.00001),
      after = adWheel(frame + 0.00001);
    assert.ok(Math.abs(before.velocity - after.velocity) < 0.0001);
    assert.ok(Math.abs(before.blur - after.blur) < 0.0001);
  }
  for (const frame of [
    0,
    copy.wheel.holdFrames,
    copy.wheel.end,
    copy.wheel.end + 30,
  ])
    assert.equal(adWheel(frame).blur, 0);
  let peak = 0;
  for (let frame = 1; frame <= copy.wheel.end; frame++) {
    const wheel = adWheel(frame);
    assert.ok(wheel.position >= adWheel(frame - 1).position - 1e-9);
    assert.ok(wheel.blur <= copy.wheel.motionBlur.maxPixels);
    if (wheel.position <= 3.5) assert.ok(wheel.blur < 2);
    peak = Math.max(peak, wheel.blur);
  }
  assert.ok(peak > 8);
  assert.equal(adWheel(copy.wheel.end).position, copy.wheel.words.length - 1);
  assert.equal(copy.wheel.words.at(-1), "composable");
  assert.ok(new Set(copy.wheel.words).size >= 12);
});

test("sentence case changes without a doubled letter", () => {
  assert.deepEqual(adOpeningCase(copy.staging.brandAt), { upper: 1, lower: 0 });
  for (let f = copy.staging.brandAt; f < copy.staging.brandAt + 50; f++)
    assert.ok(adOpeningCase(f).upper === 0 || adOpeningCase(f).lower === 0);
});

test("the prompt stays the same size and position while plugin branches change", () => {
  const expected = { x: 140, y: 245, width: 1240 * 0.82, height: 620 * 0.82 };
  assert.deepEqual(adPromptBounds(), expected);
  assert.equal(paper.scale, 0.82);
  for (let frame = copy.staging.selectAt; frame < copy.closing.at; frame++) {
    const poses = adTreePoses(frame).filter((pose) => pose.opacity > 0.2),
      addition = adAddition(frame);
    const boxes = [
      ...poses,
      ...(addition && frame < addition.change.at && addition.opacity > 0.2
        ? [addition]
        : []),
    ].sort((a, b) => a.y - b.y);
    for (const box of boxes) {
      assert.equal(overlap(box, expected), 0);
      assert.ok(box.y + box.height < 990);
    }
    for (let i = 1; i < boxes.length; i++)
      assert.equal(
        overlap(boxes[i - 1], boxes[i]),
        0,
        "Tree branches overlap at " + frame,
      );
  }
});

test("the selected native row retains its shape and clears the fixed prompt", () => {
  const first = adSelection(copy.staging.selectAt);
  assert.deepEqual(
    { x: first.x, y: first.y, width: first.width, height: first.height },
    copy.selection.source,
  );
  assert.equal(adMenu(copy.staging.selectAt - 1).hover, 1);
  assert.equal(adMenu(copy.staging.selectAt).sourceOpacity, 0);
  let previous = first;
  for (
    let frame = copy.staging.selectAt;
    frame <= copy.staging.dockAt;
    frame++
  ) {
    const next = adSelection(frame);
    assert.equal(overlap(next, adPromptBounds()), 0);
    assert.ok(Math.hypot(next.x - previous.x, next.y - previous.y) < 20);
    assert.equal(next.height, tree.header);
    previous = next;
  }
  assert.equal(previous.x, tree.x);
  assert.equal(previous.y, tree.y);
  assert.equal(previous.width, tree.width);
});

test("workflow clicks precede instruction and capability additions without a row jump", () => {
  for (const change of copy.changes.filter(
    (c) => c.bundle && c.from !== "base",
  )) {
    const offer = adAddition(change.at - 1)!;
    assert.equal(offer.opacity, 1);
    assert.equal(offer.added, 0);
    assert.equal(adPointer(offer.clickAt).press, 1);
    assert.equal(adPointer(offer.clickAt).opacity, 1);
    for (
      let frame = change.at - copy.addition.leadFrames;
      frame < change.at;
      frame++
    )
      assert.equal(adState(frame).to.id, change.from);
    const added = adTreePoses(change.at).find(
      (pose) => pose.module.id === offer.module.id,
    )!;
    for (const key of ["x", "y", "width", "height", "opacity"] as const)
      assert.equal(added[key], offer[key]);
    assert.ok(added.rows.every((row) => row.opacity === 0));
  }
});

test("capabilities persist with their owner and follow domain removals and additions", () => {
  for (const change of copy.changes) {
    const end = adTreePoses(change.at + change.duration).filter(
      (p) => p.opacity > 0.99,
    );
    assert.deepEqual(
      end.map((p) => p.module.id),
      profiles[change.to].modules.map((m) => m.id),
    );
    for (const pose of end) {
      assert.equal(pose.open, 1);
      assert.ok(
        pose.rows.every(
          (row) => row.opacity === 1 && row.owner === pose.module.id,
        ),
      );
    }
    for (let f = 0; f <= change.duration; f++) {
      const poses = adTreePoses(change.at + f),
        reports = poses.find((p) => p.module.id === "reports");
      if (profiles[change.from].modules.some((m) => m.id === "reports")) {
        assert.ok(reports);
        assert.equal(reports.opacity, 1);
        assert.ok(reports.rows.every((r) => r.opacity === 1));
      }
    }
  }
  const all = adContributions(profiles.reports);
  assert.equal(all.length, 10);
  assert.ok(all.some((row) => row.family === "mcpServers"));
  assert.ok(all.some((row) => row.family === "hooks"));
});

test("each tree leaf reveals after its parent opens and remains readable", () => {
  for (const change of copy.changes.filter((c) => c.bundle)) {
    const target = profiles[change.to].modules.find(
      (m) => !profiles[change.from].modules.some((a) => a.id === m.id),
    )!;
    for (let f = 0; f <= change.duration + 40; f++) {
      const pose = adTreePoses(change.at + f).find(
        (p) => p.module.id === target.id,
      )!;
      if (pose.rows.some((row) => row.opacity > 0.01))
        assert.equal(pose.open, 1);
      for (let i = 1; i < pose.rows.length; i++)
        if (pose.rows[i].opacity > 0)
          assert.ok(
            pose.rows[i - 1].opacity > pose.rows[i].opacity ||
              pose.rows[i].opacity === 1,
          );
    }
    const lastAt = change.at + 16 + (adModuleRows(target).length - 1) * 8 + 10;
    const next = copy.changes.find((c) => c.at > change.at)!;
    assert.ok(next.at - lastAt > 60);
  }
});

test("the opaque pointer follows one continuous route and exits through the frame edge", () => {
  assert.equal(adPointer(copy.staging.menuAt - 6).press, 1);
  assert.equal(adPointer(copy.staging.selectAt - 1).press, 1);
  let previous = adPointer(0);
  for (let frame = 1; frame < copy.closing.at; frame++) {
    const point = adPointer(frame);
    assert.equal(point.opacity, 1);
    assert.ok(Math.hypot(point.x - previous.x, point.y - previous.y) < 24);
    previous = point;
  }
  const stops = adPointerStops();
  for (let i = 1; i < stops.length; i++) assert.ok(stops[i].f > stops[i - 1].f);
  for (const stop of stops.filter((s) => s.x > 1920))
    assert.ok(adPointer(stop.f).x > 1920);
  assert.ok(adPointer(copy.closing.at).x > 1920);
});

test("add clicks use plus, then a check, and expose X only after the cursor has left", () => {
  for (const change of copy.changes.filter(
    (c) => c.bundle && c.from !== "base",
  )) {
    const offer = adAddition(change.at - 1)!;
    assert.equal(adPluginControl(offer.clickAt, offer.module.id).kind, "add");
    assert.equal(
      adPluginControl(change.at + 16, offer.module.id).kind,
      "added",
    );
    for (let f = offer.clickAt - 4; f <= change.at + 45; f++) {
      const control = adPluginControl(f, offer.module.id);
      if (control.kind === "remove") assert.ok(adPointer(f).x > 1920);
    }
  }
});

test("each rapid domain change has a settled reading beat before the next transformation", () => {
  for (const change of copy.changes.filter((c) => c.action === "transform")) {
    const nextAt =
      copy.changes.find((c) => c.at > change.at)?.at ?? copy.closing.at;
    assert.ok(
      nextAt - change.at - change.duration >= 36,
      change.to + " has no reading beat",
    );
    const final = adTreePoses(change.at + change.duration);
    assert.ok(
      final
        .filter((p) => p.opacity === 1)
        .every((p) => p.rows.every((row) => row.opacity === 1)),
    );
  }
});

test("the first removals visibly operate the existing X and retain Reports", () => {
  const removals = copy.changes.filter((c) => c.action === "remove");
  assert.deepEqual(
    removals.map((c) => c.controlId),
    ["simulation", "manufacturing"],
  );
  for (const change of removals) {
    const removal = adRemoval(change.at - 2)!;
    assert.equal(removal.module.id, change.controlId);
    assert.equal(adPointer(removal.clickAt).press, 1);
    assert.equal(
      adPluginControl(removal.clickAt, change.controlId).kind,
      "remove",
    );
    assert.ok(
      profiles[change.from].modules.some((m) => m.id === change.controlId),
    );
    assert.ok(
      !profiles[change.to].modules.some((m) => m.id === change.controlId),
    );
    assert.ok(profiles[change.to].modules.some((m) => m.id === "reports"));
  }
});

test("prompt edits use the owning plugin color and leave stable text unmarked", () => {
  const word = (block: string, text: string, y: number): WordBox => ({
    id: block,
    block,
    text,
    x: 0,
    y,
    width: 160,
    height: 30,
    fontSize: 28,
    fontWeight: 450,
    color: "#15364a",
    mono: true,
  });
  const a: PromptLayout = {
    words: [word("stable", "Keep this", 0)],
    boxes: [],
    height: 44,
  };
  const b: PromptLayout = {
    words: [...a.words, word("simulation:design", "Run simulations", 44)],
    boxes: [],
    height: 88,
  };
  const at = copy.changes.find((c) => c.to === "simulation")!.at;
  const marks = adEditMarks(a, b, at + 84);
  assert.equal(marks.length, 1);
  assert.equal(marks[0].color, profiles.simulation.modules[1].color);
  assert.ok(marks[0].y > 0);
  assert.deepEqual(adEditMarks(a, b, at + 84 + 48), []);
});

test("all domain changes resolve before a stationary five-second closing", () => {
  for (const [i, change] of copy.changes.entries()) {
    assert.equal(change.from, i ? copy.changes[i - 1].to : "base");
    assert.equal(adState(change.at).p, 0);
    assert.equal(adState(change.at + change.duration).p, 1);
    assert.ok(change.at + change.duration < copy.closing.at);
  }
  assert.ok(copy.frames - copy.closing.settled >= 300);
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
