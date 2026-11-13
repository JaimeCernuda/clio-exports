import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { demoTheme, DEMO_THEMES } from "../native/current/theme";
import { isCaptureViewport } from "../native/current/capture-viewport";
import { parseRepairRanges } from "../native/current/repair-ranges";
import {
  demoAt,
  demoPlan,
  demoPocket,
  createDemoSpec,
  previewFrameAt,
  recordedNowAt,
  validateDemo,
  type DemoScene,
  type DemoSpec,
} from "../native/current/demo-model";
const scene = JSON.parse(
  readFileSync(
    new URL("../native/public/tahoe.native.json", import.meta.url),
    "utf8",
  ),
) as DemoScene;
const spec = JSON.parse(
  readFileSync(
    new URL("../native/public/demos/tahoe-current.json", import.meta.url),
    "utf8",
  ),
) as DemoSpec;

test("capture viewport metadata rejects malformed or unbounded dimensions", () => {
  assert.ok(isCaptureViewport({ width: 1920, height: 1080 }));
  for (const value of [
    null,
    undefined,
    {},
    "1920x1080",
    { width: 1920, height: 0 },
    { width: 1.5, height: 1080 },
    { width: Infinity, height: 1080 },
    { width: 1920, height: 20000 },
  ])
    assert.equal(isCaptureViewport(value), false);
});

test("repair ranges preserve exact source frames and reject overlap, overflow and invalid syntax", () => {
  assert.deepEqual(parseRepairRanges("1688:1693", 2400), [
    { start: 1688, end: 1693 },
  ]);
  assert.deepEqual(parseRepairRanges("0:1,2:3", 3), [
    { start: 0, end: 1 },
    { start: 2, end: 3 },
  ]);
  for (const value of [
    "",
    "-1:3",
    "4:4",
    "3:2",
    "1:2401",
    "1:3,2:4",
    "1.5:2",
    "1:",
  ])
    assert.throws(() => parseRepairRanges(value, 2400), /ranges/);
});

test("native theme selection defaults to Cool, preserves explicit palettes and rejects unknown values", () => {
  assert.equal(demoTheme(), "classic-light");
  for (const theme of DEMO_THEMES) {
    assert.equal(demoTheme(theme.id), theme.id);
    validateDemo({ ...spec, theme: theme.id }, scene);
  }
  assert.throws(() => demoTheme("cream"), /Unknown native demo theme/);
  assert.throws(
    () =>
      validateDemo({ ...spec, theme: "cream" } as unknown as DemoSpec, scene),
    /Unknown native demo theme/,
  );
});

test("native elapsed-time labels follow captured execution time, not wall time or editorial seconds", () => {
  const plan = demoPlan(spec, scene);
  const event = plan.events.find((value) => value.toolId)!;
  const tool = scene.view.tools.find((value) => value.id === event.toolId)!;
  const start = Date.parse(String(tool.started_at));
  const duration = Number(tool.duration_ms);
  assert.equal(recordedNowAt(scene, plan, event.start), start);
  assert.equal(recordedNowAt(scene, plan, event.revealEnd), start + duration);
  const frame = Math.floor((event.start + event.revealEnd) / 2);
  const expected =
    start +
    (duration * (frame - event.start)) / (event.revealEnd - event.start);
  assert.equal(recordedNowAt(scene, plan, frame), expected);
  demoAt(scene, plan, 2399);
  assert.equal(recordedNowAt(scene, plan, frame), expected);
});

test("normal preview playback never creates a negative frame from an early animation tick", () => {
  assert.equal(previewFrameAt(0, -0.5, 2400, 60), 0);
  assert.equal(previewFrameAt(100, -0.5, 2400, 60), 100);
  assert.equal(previewFrameAt(100, 1000, 2400, 60), 160);
  assert.equal(previewFrameAt(100, 60000, 2400, 60), 2399);
  assert.throws(() => previewFrameAt(-1, 0, 2400, 60), /preview clock/);
  assert.throws(() => previewFrameAt(0, NaN, 2400, 60), /preview clock/);
});

test("leading assistant context is its own turn; selecting it never leaks a later question", () => {
  const withContext: DemoScene = {
    ...scene,
    view: {
      ...scene.view,
      messages: [
        {
          id: "leading",
          role: "assistant",
          blocks: [
            { id: "leading-text", type: "text", text: "Recorded context." },
          ],
        },
        ...scene.view.messages,
      ],
    },
  };
  const one = createDemoSpec(
    withContext,
    "context.native.json",
    "context",
    30,
    1,
  );
  const plan = demoPlan(one, withContext);
  assert.deepEqual(
    plan.events.map((event) => event.messageId),
    ["leading"],
  );
  assert.deepEqual(
    demoAt(withContext, plan, one.frames - 1).view.messages.map(
      (message) => message.id,
    ),
    ["leading"],
  );
});

test("streaming keeps complete Unicode code points in the native composer", () => {
  const input = structuredClone(scene);
  const first = input.view.messages[0].blocks.find(
    (block) => block.type === "text",
  )!;
  first.text = "A 🧬 café";
  const plan = demoPlan(spec, input);
  const event = plan.events[0];
  const text = Array.from(first.text);
  const prefixes = new Set(
    text.map((_, index) => text.slice(0, index).join("")),
  );
  for (let frame = event.start; frame < event.revealEnd; frame++)
    assert.ok(prefixes.has(demoAt(input, plan, frame).draft));
});

test("a new transcript gets its own manifest, source identity, turn boundaries and generated views", () => {
  const created = createDemoSpec(
    scene,
    "tahoe.native.json",
    "another-demo",
    120,
    2,
  );
  assert.equal(created.turns, 2);
  assert.equal(created.frames, 7200);
  assert.equal(created.sourceSha256, scene.source.sha256);
  assert.equal(created.pocket?.length, 4);
  assert.throws(
    () => createDemoSpec(scene, "tahoe.native.json", "../bad", 120),
    /manifest/,
  );
  assert.throws(
    () => createDemoSpec(scene, "tahoe.native.json", "ok", 120, 999),
    /turn range/,
  );
  assert.throws(
    () => createDemoSpec(scene, "tahoe.native.json", "ok", NaN),
    /duration/,
  );
});

test("current demos retain source identity, ordered real calls and immutable captured output", () => {
  const original = JSON.stringify(scene);
  const plan = demoPlan(spec, scene);
  const final = demoAt(scene, plan, spec.frames - 1);
  assert.ok(final.view.messages.length >= 2);
  assert.ok(final.view.tools.length > 0);
  assert.ok(final.view.tools.every((t) => scene.view.tools.includes(t)));
  for (const e of plan.events) {
    const source = scene.view.messages
      .find((m) => m.id === e.messageId)!
      .blocks.find((b) => b.id === e.blockId)!;
    assert.equal(e.type, source.type);
    assert.equal(
      demoAt(scene, plan, e.start)
        .view.messages.flatMap((m) => m.blocks)
        .some((b) => b.id === source.id && b.text === source.text),
      source.text === "" || source.text === undefined,
    );
  }
  assert.equal(JSON.stringify(scene), original);
});
test("running tools hide captured completion and backward seeks restore their earlier state", () => {
  const plan = demoPlan(spec, scene);
  const e = plan.events.find((e) => e.toolId)!;
  const running = demoAt(scene, plan, e.start).view.tools.find(
    (t) => t.id === e.toolId,
  )!;
  assert.equal(running.state, "running");
  assert.equal(running.output, undefined);
  assert.equal(running.duration_ms, undefined);
  assert.deepEqual(
    demoAt(scene, plan, e.revealEnd).view.tools.find((t) => t.id === e.toolId),
    scene.view.tools.find((t) => t.id === e.toolId),
  );
  assert.equal(
    demoAt(scene, plan, e.start - 1).view.tools.some((t) => t.id === e.toolId),
    false,
  );
});
test("source-bound pocket views wait for their generation block, including backward seeking", () => {
  const plan = demoPlan(spec, scene);
  const p = spec.pocket![0];
  const event = plan.events.find((e) => e.blockId === p.afterBlock)!;
  assert.equal(demoPocket(spec, plan, event.revealEnd - 1).length, 0);
  assert.equal(
    demoPocket(spec, plan, event.revealEnd)[0].surfaceId,
    p.surfaceId,
  );
  assert.equal(demoPocket(spec, plan, 0).length, 0);
});
test("new scenes must supply matching hashes, IDs, timing and captured surface anchors", () => {
  assert.throws(
    () => validateDemo({ ...spec, sourceSha256: "wrong" }, scene),
    /source identity/,
  );
  assert.throws(
    () => validateDemo({ ...spec, sceneFile: "../outside.json" }, scene),
    /local JSON/,
  );
  assert.throws(
    () => validateDemo({ ...spec, holdFrames: spec.frames }, scene),
    /timing/,
  );
  assert.throws(
    () =>
      validateDemo(
        {
          ...spec,
          pocket: [
            { afterBlock: "missing", surfaceId: "missing", label: "Wrong" },
          ],
        },
        scene,
      ),
    /captured block/,
  );
});
