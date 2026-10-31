import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { campaignFrame, type CampaignCut } from "../native/campaign-plan";
import {
  buildReplayPlan,
  replayAt,
  replayText,
  type ReplayMessage,
} from "../native/replay-plan";
import campaign from "../native/campaign-story.json";
import {
  buildPresentation,
  presentationAt,
  type FocusBeat,
} from "../native/presentation-plan";
import {
  smoothScroll,
  layoutKey,
  validateLayout,
  type ReplayLayoutTrack,
} from "../native/replay-layout";
import remend from "remend";
const scene = JSON.parse(
  readFileSync(
    new URL("../native/public/tahoe.native.json", import.meta.url),
    "utf8",
  ),
);

test("measured scroll absorbs line wraps and large result changes with bounded motion", () => {
  const raw = [
    ...Array(60).fill(0),
    ...Array(120).fill(600),
    ...Array(120).fill(0),
    ...Array(120).fill(21),
  ];
  const scroll = smoothScroll(raw);
  assert.deepEqual(scroll, smoothScroll(raw));
  assert.equal(scroll.length, raw.length);
  scroll.forEach((value, index) => {
    assert(value >= 0);
    if (index) assert(Math.abs(value - scroll[index - 1]) <= 9.001);
  });
  assert(Math.abs(scroll[179] - 600) < 0.1);
  assert(Math.abs(scroll[299]) < 0.1);
  assert(Math.abs(scroll.at(-1)! - 21) < 0.1);
  assert.throws(() => smoothScroll([]));
  assert.throws(() => smoothScroll([Number.NaN]));
  assert.throws(() => smoothScroll(new Array(4)));
});

test("layout tracks cannot silently reuse another scene or incomplete measurements", () => {
  const key = layoutKey("session-a", 3, 2, false, {});
  const track: ReplayLayoutTrack = {
    schema: "clio.replay-layout.v1",
    key,
    frames: 3,
    raw: [0, 21, 42],
    scroll: smoothScroll([0, 21, 42]),
  };
  validateLayout(track, key, 3);
  assert.throws(() =>
    validateLayout(track, layoutKey("session-b", 3, 2, false, {}), 3),
  );
  assert.throws(() => validateLayout(track, key, 4));
  assert.throws(() => validateLayout({ ...track, scroll: [0] }, key, 3));
  assert.throws(() =>
    validateLayout({ ...track, raw: [0, Number.NaN, 42] }, key, 3),
  );
});

test("the captured Tahoe layout matches this source and remains stationary through every inspection", () => {
  const track = JSON.parse(
    readFileSync(
      new URL("../native/public/tahoe-pitch-layout.json", import.meta.url),
      "utf8",
    ),
  ) as ReplayLayoutTrack;
  const key = layoutKey(
    `${scene.session.id}:${scene.source.sha256}`,
    campaign.pitch.sourceFrames,
    2,
    false,
    campaign.replay,
  );
  validateLayout(track, key, campaign.pitch.sourceFrames);
  assert.deepEqual(track.scroll, smoothScroll(track.raw));
  const plan = buildPresentation(
    buildReplayPlan(
      scene.view.messages,
      campaign.pitch.sourceFrames,
      2,
      campaign.replay,
    ),
    campaign.focuses as FocusBeat[],
  );
  let previous = track.scroll[0];
  for (let frame = 0; frame < plan.frames; frame++) {
    const transport = presentationAt(plan, frame),
      offset = track.scroll[transport.sourceFrame];
    assert(Math.abs(offset - previous) <= 9.001);
    if (transport.focus)
      assert.equal(offset, track.scroll[transport.focus.sourceFrame]);
    previous = offset;
  }
  assert(Math.abs(track.scroll.at(-1)! - track.raw.at(-1)!) < 1);
});

test("partial Markdown uses CLIO's own completion parser and the result has reading time", () => {
  assert.equal(remend("**Quite s"), "**Quite s**");
  assert.equal(remend("Use `metres"), "Use `metres`");
  const result = campaign.pitch.stages.find((stage) => stage.id === "result")!;
  assert(result.end - result.start >= 240);
  assert.equal(
    campaignFrame(result.start, "pitch").replayFrame,
    campaignFrame(result.end - 1, "pitch").replayFrame,
  );
  assert.equal(campaignFrame(result.end - 1, "pitch").nativeOpacity, 1);
});

test("campaign replays one continuous conversation for each format", () => {
  for (const cut of ["pitch", "social"] as CampaignCut[]) {
    let end = 0;
    for (const stage of campaign[cut].stages) {
      assert.equal(stage.start, end);
      end = stage.end;
    }
    assert.equal(end, campaign[cut].frames);
    const first = campaignFrame(campaign[cut].stages[1].start, cut);
    const plan = buildReplayPlan(
      scene.view.messages,
      first.replayFrames,
      first.turns,
    );
    const eventIds = new Set(plan.events.map((event) => event.blockId));
    let users = 0;
    for (const message of scene.view.messages as ReplayMessage[]) {
      if (message.role === "user") users++;
      if (users > first.turns) break;
      for (const block of message.blocks) {
        if (
          ["text", "tool", "reasoning", "injection", "a2ui"].includes(
            block.type,
          )
        )
          assert(eventIds.has(block.id));
      }
    }
    let previous = -1;
    for (let frame = 0; frame < plan.frames; frame++) {
      const pose = replayAt(plan, frame);
      assert(pose.index >= previous);
      previous = pose.index;
      assert(pose.progress >= 0 && pose.progress <= 1);
      assert(pose.visible.every((event) => event.start <= frame));
      assert.deepEqual(pose, replayAt(plan, frame));
    }
    assert.equal(plan.events[0].role, "user");
    assert.equal(plan.events.at(-1)?.end, plan.frames);
    assert.equal(
      plan.events.filter((event) => event.role === "user").length,
      first.turns,
    );
  }
  assert.throws(() => campaignFrame(-1, "pitch"), /outside/);
});

test("widget generation precedes its native view and all displayed text is contiguous source", () => {
  const plan = buildReplayPlan(scene.view.messages, 4500, 2);
  for (const event of plan.events) {
    if (event.text) {
      const message = scene.view.messages.find(
        (value: ReplayMessage) => value.id === event.messageId,
      );
      const block = message.blocks.find(
        (value: { id: string }) => value.id === event.blockId,
      );
      assert(block.text.includes(event.text));
    }
  }
  for (const [tool, surface] of [
    ["call_a2327bf600cb", "tahoe-boundary-map"],
    ["call_afddda4755fa", "tahoe-shoreline-resolution"],
  ]) {
    const action = plan.events.find((event) => event.toolId === tool)!;
    const result = plan.events.find((event) => event.surfaceId === surface)!;
    assert(action.end <= result.start);
  }
  const map = plan.events.find(
    (event) => event.surfaceId === "tahoe-boundary-map",
  )!;
  assert(map.end - map.start < 300, "result hold stays below five seconds");
  assert.throws(() => replayAt(plan, -1), /outside/);
  assert.throws(() => buildReplayPlan([], 100, 1), /too short/);
});

test("editorial edits select source events without changing their order or original export", () => {
  const before = JSON.stringify(scene);
  const plan = buildReplayPlan(scene.view.messages, 3600, 2, campaign.replay);
  assert(
    plan.events
      .filter((event) => event.type === "tool")
      .every((event) => campaign.replay.toolIds.includes(event.toolId!)),
  );
  assert(plan.events.every((event) => event.type !== "injection"));
  assert(
    plan.events
      .filter((event) => event.type === "reasoning")
      .every((event) => campaign.replay.reasoningIds.includes(event.blockId)),
  );
  const map = plan.events.find(
    (event) => event.surfaceId === "tahoe-boundary-map",
  )!;
  assert(map.end - map.start < 300);
  const omitted = buildReplayPlan(scene.view.messages, 3600, 2, {
    ...campaign.replay,
    omitBlockIds: [map.blockId],
  });
  assert(!omitted.events.some((event) => event.blockId === map.blockId));
  assert.equal(JSON.stringify(scene), before);
  assert.throws(
    () =>
      buildReplayPlan(scene.view.messages, 3600, 2, {
        weightsByBlockId: { [plan.events[0].blockId]: -1 },
      }),
    /Invalid replay weight/,
  );
});

test("canvas bindings and selected NDP resources come from this archive", () => {
  const config = campaign.workbench;
  const tool = (id: string) =>
    scene.view.tools.find((value: { id: string }) => value.id === id);
  assert.equal(tool(config.searchCall).name, "connected_data_search_ndp");
  assert.equal(tool(config.connectCall).name, "connected_data_connect");
  assert.equal(tool(config.downloadCall).name, "connected_data_download");
  assert(campaign.replay.toolIds.includes(config.connectCall));
  const dataset = tool(config.searchCall).output.datasets.find(
    (value: { id: string }) => value.id === config.datasetId,
  );
  assert(dataset);
  for (const id of tool(config.connectCall).input.configuration.resource_ids)
    assert(dataset.resources.some((value: { id: string }) => value.id === id));
  for (const tab of config.tabs)
    assert(
      scene.snapshot.sessions[scene.session.id].some(
        (value: { id: string }) => value.id === tab.surfaceId,
      ),
    );
});

test("the replay scheduler also accepts another parent and an assistant-only child", () => {
  for (const file of [
    "reading-guide.native.json",
    "reading-child.native.json",
  ]) {
    const other = JSON.parse(
      readFileSync(
        new URL(`../native/public/${file}`, import.meta.url),
        "utf8",
      ),
    );
    const plan = buildReplayPlan(other.view.messages, 12000, 1);
    assert(plan.events.length > 0);
    assert(
      plan.events.every((event) =>
        other.view.messages.some(
          (message: ReplayMessage) => message.id === event.messageId,
        ),
      ),
    );
  }
});

test("every focus shot freezes the conversation through zoom, interaction and return", () => {
  const replay = buildReplayPlan(
    scene.view.messages,
    campaign.pitch.sourceFrames,
    2,
    campaign.replay,
  );
  const plan = buildPresentation(replay, campaign.focuses as FocusBeat[]);
  assert.equal(
    plan.frames,
    campaign.pitch.stages[1].end - campaign.pitch.stages[1].start,
  );
  for (const focus of plan.focuses) {
    let previousZoom = 1;
    for (let frame = focus.start; frame < focus.end; frame++) {
      const pose = presentationAt(plan, frame);
      assert.equal(pose.sourceFrame, focus.sourceFrame);
      assert(Math.abs(pose.zoom - previousZoom) < 0.007);
      previousZoom = pose.zoom;
      assert(pose.zoom >= 1 && pose.zoom <= 1.25);
    }
    assert.equal(
      presentationAt(plan, focus.end).sourceFrame,
      focus.sourceFrame,
    );
    assert.equal(presentationAt(plan, focus.end).zoom, 1);
  }
  let previous = -1;
  for (let frame = 0; frame < plan.frames; frame++) {
    const pose = presentationAt(plan, frame);
    assert(pose.sourceFrame >= previous && pose.sourceFrame <= previous + 1);
    previous = pose.sourceFrame;
  }
});

test("the follow-up reply grows by a bounded source prefix on every frame", () => {
  const plan = buildReplayPlan(
    scene.view.messages,
    campaign.pitch.sourceFrames,
    2,
    campaign.replay,
  );
  for (const event of plan.events.filter((value) => value.type === "text")) {
    let previous = "";
    const maximum = Math.ceil(
      (event.text?.length ?? 0) / (event.revealEnd - event.start),
    );
    for (let frame = event.start; frame <= event.end; frame++) {
      const text = replayText(event, frame);
      assert(text.startsWith(previous));
      assert(text.length - previous.length <= maximum);
      previous = text;
    }
    assert.equal(previous, event.text);
  }
});
