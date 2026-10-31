import {
  resolveAttentionInspection,
  attentionInspectionAt,
  attentionInspectionCursor,
} from "../native/attention-inspection-plan";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { promptSegments } from "../native/prompt-segments";
import {
  filmPair,
  buildSpotterFilmPlan,
  spotterFilmAt,
} from "../native/spotter-film-plan";
import { spotterNotificationPresentation } from "../native/spotter-notification";
import {
  validatePairedReplay,
  buildPairedTimeline,
  pairedClock,
  thinkingOpenness,
  notificationOpenness,
  frameForSource,
  projectPairedSession,
  reviewerProgress,
  capturedAttention,
  capturedAttentionRequest,
  canonicalJson,
  recordedSessionAt,
  type PairedReplay,
  type ReplayAttentionBundle,
} from "../native/paired-replay";

const pair: PairedReplay = JSON.parse(
  readFileSync(
    new URL("../native/public/opal-spotter.native.json", import.meta.url),
    "utf8",
  ),
);
const primary = pair.sessions.find((s) => s.role === "primary")!;
const reviewer = pair.sessions.find((s) => s.role === "spotter")!;
const timeline = buildPairedTimeline(pair);

test("clean prompt layout preserves all source text, spacing and literal angle-bracket instructions", () => {
  for (const message of primary.view.messages.filter(
    (m) => m.role === "user",
  )) {
    for (const block of message.blocks.filter((b) => b.type === "text")) {
      const segments = promptSegments(block.text!);
      assert.equal(segments.map((s) => s.text).join(""), block.text);
      assert.ok(segments.some((s) => s.kind === "reference"));
    }
  }
});

test("SPOTTER streams every captured thinking passage and discloses the actual triggering notifications", () => {
  const actual: PairedReplay = JSON.parse(
    readFileSync(
      new URL(
        "../native/public/opal-chainB-7795459.native.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const film = filmPair(actual),
    timeline = buildPairedTimeline(film);
  const spotter = film.sessions.find((s) => s.role === "spotter")!;
  assert.equal(
    timeline.reviewerThinkingWindows.length,
    spotter.view.messages
      .flatMap((m) => m.blocks)
      .filter((b) => b.type === "reasoning").length,
  );
  for (const w of timeline.reviewerThinkingWindows) {
    const clock = pairedClock(film, Math.floor((w.begin + w.complete) / 2));
    assert.equal(
      clock.reviewerThinkingMotions.find((x) => x.blockId === w.blockId)!
        .openness,
      1,
    );
    const shown = projectPairedSession(spotter, clock.source)
      .messages.find((m) => m.id === w.messageId)!
      .blocks.find((b) => b.id === w.blockId)!.text!;
    const original = spotter.view.messages
      .find((m) => m.id === w.messageId)!
      .blocks.find((b) => b.id === w.blockId)!.text!;
    assert.ok(shown.length > 0 && shown.length < original.length);
    assert.ok(original.startsWith(shown));
    assert.ok(
      thinkingOpenness(w, w.holdEnd + 15) > 0 &&
        thinkingOpenness(w, w.holdEnd + 15) < 1,
    );
  }
  assert.equal(timeline.notificationWindows.length, actual.wakes.length);
  for (const w of timeline.notificationWindows) {
    const wake = actual.wakes.find((x) => x.reviewerBlockId === w.blockId)!;
    assert.ok(wake.consumedAt >= wake.at && wake.at >= wake.sourceCompletedAt);
    assert.equal(pairedClock(film, w.revealEnd).source, wake.consumedAt);
    assert.equal(pairedClock(film, w.collapseEnd).source, wake.consumedAt);
    assert.equal(notificationOpenness(w, w.begin), 0);
    assert.equal(notificationOpenness(w, w.revealEnd), 1);
    assert.ok(
      notificationOpenness(w, w.holdEnd + 12) > 0 &&
        notificationOpenness(w, w.holdEnd + 12) < 1,
    );
    assert.equal(notificationOpenness(w, w.collapseEnd), 0);
    const raw = spotter.view.messages
      .flatMap((m) => m.blocks)
      .find((b) => b.id === w.blockId)!;
    const display = spotterNotificationPresentation(
      String(raw.source),
      raw.text!,
    )!;
    assert.ok(display.text.startsWith("Watched session activity:"));
    assert.ok(display.text.includes("ANSWER:"));
    assert.ok(raw.text!.includes("notification spotter:"));
  }
  assert.equal(
    spotterNotificationPresentation(
      "spotter",
      "[Agent session x; spotter; notification y]\nnot json",
    ),
    null,
  );
});

test("the full film preserves source order and the danger alert triggers both user attention selections", () => {
  const actual: PairedReplay = JSON.parse(
    readFileSync(
      new URL(
        "../native/public/opal-chainB-7795459.native.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  actual.attention = JSON.parse(
    readFileSync(
      new URL(
        "../native/public/chainB-7795459-attention.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const film = filmPair(actual),
    plan = buildSpotterFilmPlan(film);
  assert.ok(plan.source >= actual.sessions[0].quarantine!.at);
  assert.ok(actual.sessions[0].turns.every((t) => t.end < plan.source));
  let previous = -1;
  for (let f = 0; f < plan.frames; f++) {
    const pose = spotterFilmAt(film, f);
    assert.ok(pose.source >= previous, `source reversed at ${f}`);
    previous = pose.source;
    if (f >= plan.at && f < plan.resume) assert.equal(pose.source, plan.source);
  }
  for (const [index, shot] of plan.shots.entries()) {
    const spec = resolveAttentionInspection(film, shot.id);
    assert.equal(spec.sourceAt, plan.source);
    assert.equal(spec.text, index ? "73" : "ANSWER: 73; MATCHES");
    const selected = spotterFilmAt(film, shot.start + spec.click);
    assert.equal(selected.inspectionId, shot.id);
    assert.equal(selected.inspectionFrame, spec.click);
    assert.equal(attentionInspectionAt(spec, spec.returnEnd!).scroll, 0);
    assert.equal(attentionInspectionAt(spec, spec.exitAt!).phase, "resume");
  }
  const a = resolveAttentionInspection(film, plan.shots[0].id),
    b = resolveAttentionInspection(film, plan.shots[1].id);
  const exit = { x: 679, y: 98 };
  const anchors = {
    start: exit,
    selectionStart: { x: 139, y: 158 },
    selectionEnd: { x: 155, y: 158 },
    button: { x: 300, y: 124 },
    scroll: { x: 666, y: 430 },
    exit,
  };
  const before = attentionInspectionCursor(a, a.frames - 1, anchors),
    after = attentionInspectionCursor(b, 0, anchors);
  assert.equal(before.opacity, 1);
  assert.equal(after.opacity, 1);
  assert.equal(before.x, after.x);
  assert.equal(before.y, after.y);
  assert.equal(spotterFilmAt(film, plan.resume + 30).source, plan.source);
  assert.ok(spotterFilmAt(film, plan.resume + 120).source > plan.source);
  const bad = structuredClone(actual);
  bad.source.sha256 = "wrong";
  assert.throws(() => buildSpotterFilmPlan(filmPair(bad)), /another source/);
});

test("real OPAL pair links six answers to six consumed notifications across two reviewer turns", () => {
  validatePairedReplay(pair);
  assert.equal(pair.wakes.length, 6);
  assert.equal(reviewer.turns.length, 2);
  assert.deepEqual(pair.coverage.issues, []);
  for (const wake of pair.wakes) {
    assert.ok(wake.sourceCompletedAt < wake.at);
    assert.ok(wake.at < wake.consumedAt);
    assert.ok(
      frameForSource(pair, wake.at) -
        frameForSource(pair, wake.sourceCompletedAt) >=
        36,
    );
    const block = reviewer.blocks.find(
      (b) => b.blockId === wake.reviewerBlockId,
    )!;
    assert.equal(block.start, wake.consumedAt);
    assert.ok(block.dependsOn.includes(wake.sourceMessageId));
    const before = projectPairedSession(reviewer, wake.consumedAt - 0.01);
    assert.ok(
      !before.messages.some((m) =>
        m.blocks.some((b) => b.id === wake.reviewerBlockId),
      ),
    );
    const after = projectPairedSession(reviewer, wake.consumedAt);
    assert.ok(
      after.messages.some((m) =>
        m.blocks.some((b) => b.id === wake.reviewerBlockId),
      ),
    );
  }
  const queued = pair.wakes[1];
  assert.equal(reviewerProgress(pair, queued.at).queued, 1);
  assert.equal(reviewerProgress(pair, queued.at).state, "running");
  assert.equal(reviewerProgress(pair, queued.consumedAt).queued, 0);
});

test("one seek-independent clock freezes BOTH logs during the short thinking hold and animated collapse", () => {
  let previous = -Infinity;
  for (let frame = 0; frame < timeline.frames; frame++) {
    const clock = pairedClock(pair, frame);
    assert.ok(clock.source >= previous);
    previous = clock.source;
  }
  assert.equal(timeline.holdEnd - timeline.complete, 72);
  assert.equal(timeline.collapseEnd - timeline.holdEnd, 30);
  const held = pairedClock(pair, timeline.complete);
  const late = pairedClock(pair, timeline.holdEnd - 1);
  assert.equal(held.source, late.source);
  assert.equal(held.thinkingOpen, true);
  assert.equal(pairedClock(pair, timeline.holdEnd).thinkingOpen, true);
  assert.equal(pairedClock(pair, timeline.collapseEnd).thinkingOpen, false);
  for (const session of pair.sessions) {
    assert.deepEqual(
      projectPairedSession(session, held.source),
      projectPairedSession(session, late.source),
    );
  }
  const answer = primary.view.messages.find(
    (m) => m.id === timeline.thinking.messageId,
  )!;
  const answerPart = answer.blocks.find((b) => b.type === "text")!;
  assert.ok(
    !projectPairedSession(primary, held.source).messages.some((m) =>
      m.blocks.some((b) => b.id === answerPart.id),
    ),
  );
  const frame = frameForSource(pair, pair.wakes[3].at);
  const snapshot = pairedClock(pair, frame);
  pairedClock(pair, 0);
  pairedClock(pair, timeline.frames - 1);
  assert.deepEqual(pairedClock(pair, frame), snapshot);
  assert.ok(snapshot.source >= pair.wakes[3].at);
  assert.equal(pairedClock(pair, 200).watcherOpen, false);
  assert.equal(pairedClock(pair, 240).watcherOpen, true);
  assert.equal(pairedClock(pair, 240).source, -1);
});

test("progressive text, tool lifecycles and completed provenance stay tied to source time", () => {
  const original = JSON.stringify(pair);
  for (const session of pair.sessions) {
    for (const timed of session.blocks) {
      if (!timed.checkpoints.length) continue;
      const message = session.view.messages.find(
        (m) => m.id === timed.messageId,
      )!;
      const block = message.blocks.find((b) => b.id === timed.blockId)!;
      const [at, length] =
        timed.checkpoints[Math.floor(timed.checkpoints.length / 2)];
      const visible = projectPairedSession(session, at)
        .messages.find((m) => m.id === message.id)!
        .blocks.find((b) => b.id === block.id)!;
      assert.equal(
        visible.text,
        Array.from(block.text!).slice(0, length).join(""),
      );
    }
    const final = projectPairedSession(session, Infinity);
    assert.deepEqual(
      final.messages.map((m) => m.blocks.map((b) => b.text)),
      session.view.messages.map((m) => m.blocks.map((b) => b.text)),
    );
  }
  const toolTiming = reviewer.blocks.find((b) =>
    reviewer.view.messages.some((m) =>
      m.blocks.some((x) => x.id === b.blockId && x.type === "tool"),
    ),
  )!;
  const running = projectPairedSession(
    reviewer,
    (toolTiming.start + toolTiming.end) / 2,
  ).tools[0];
  assert.equal(running.state, "running");
  assert.equal(running.output, undefined);
  assert.equal(running.duration_ms, undefined);
  assert.equal(running.started_at, undefined);
  assert.equal(
    projectPairedSession(reviewer, toolTiming.end).tools[0].state,
    reviewer.view.tools[0].state,
  );
  assert.ok(
    frameForSource(pair, toolTiming.end) -
      frameForSource(pair, toolTiming.start) >=
      30,
  );
  assert.equal(JSON.stringify(pair), original);
});

test("invalid causality, text offsets, identity and replay speeds fail explicitly", () => {
  const bad = structuredClone(pair);
  bad.wakes[0].at = 0;
  assert.throws(() => validatePairedReplay(bad), /wake/i);
  const missing = structuredClone(pair);
  missing.sessions[0].blocks.pop();
  assert.throws(() => validatePairedReplay(missing), /missing/);
  assert.throws(() => buildPairedTimeline(pair, 0), /positive/);
  assert.throws(() => pairedClock(pair, -1), /clock/);
});

test("attention requires the exact capture and never substitutes empty summaries or another run", () => {
  const request = {
    text: "73",
    part_id: "p",
    content_revision: "rev",
    start: 9,
    end: 11,
    field: "text",
  };
  assert.equal(
    capturedAttention(
      pair.attention,
      pair.source.sha256,
      primary.session.id,
      pair.attention.knownAnswers[0],
      request,
    ).available,
    false,
  );
  const bundle: ReplayAttentionBundle = {
    schema: "clio.replay-attention.v1",
    sourceSha256: "sha",
    knownAnswers: ["m"],
    records: [
      {
        sessionId: "s",
        messageId: "m",
        partId: "p",
        contentRevision: "rev",
        field: "text",
        start: 9,
        end: 11,
        text: "73",
        response: {
          available: true,
          message_id: "m",
          selection: request,
          blocks: [{ runs: [[0, 1, 0.5]] }],
        },
      },
    ],
  };
  assert.equal(
    capturedAttention(bundle, "sha", "s", "m", request).available,
    true,
  );
  for (const mismatch of [
    { start: 8 },
    { end: 12 },
    { text: "74" },
    { part_id: "q" },
    { content_revision: "new" },
    { profile: { method: "different" } },
  ]) {
    assert.equal(
      capturedAttention(bundle, "sha", "s", "m", { ...request, ...mismatch })
        .available,
      false,
    );
  }
  assert.throws(
    () => capturedAttention(bundle, "other", "s", "m", request),
    /another export/,
  );
  bundle.records[0].response.blocks = [];
  assert.throws(
    () => capturedAttention(bundle, "sha", "s", "m", request),
    /heat/,
  );
});

test("Chain B uses real native heat and reveals warning/quarantine only at source time", () => {
  const chain: PairedReplay = JSON.parse(
    readFileSync(
      new URL(
        "../native/public/opal-chainB-7795459.native.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  validatePairedReplay(chain);
  const main = chain.sessions.find((s) => s.role === "primary")!;
  const reviewer = chain.sessions.find((s) => s.role === "spotter")!;
  const alert = reviewer.view.tools.find(
    (t) =>
      t.name === "raise_alert_card" &&
      (t.input as { severity: string }).severity === "warning",
  )!;
  const id = (alert.output as { part_id: string }).part_id;
  const block = main.blocks.find((b) => b.blockId === id)!;
  // JS Date truncates microseconds independently on both timestamps.
  assert.ok(
    Math.abs(
      block.start -
        (Date.parse(alert.completed_at as string) - Date.parse(chain.origin)),
    ) < 1,
  );
  assert.ok(
    !projectPairedSession(main, block.start - 1).messages.some((m) =>
      m.blocks.some((b) => b.id === id),
    ),
  );
  assert.ok(
    projectPairedSession(main, block.start).messages.some((m) =>
      m.blocks.some((b) => b.id === id),
    ),
  );
  assert.ok(main.quarantine);
  assert.equal(
    recordedSessionAt(main, main.quarantine.at - 1).metadata.spotter_quarantine,
    undefined,
  );
  assert.deepEqual(
    recordedSessionAt(main, main.quarantine.at).metadata.spotter_quarantine,
    main.quarantine.record,
  );
  assert.ok(main.quarantine.at > main.turns.at(-1)!.end);
  const heat: ReplayAttentionBundle = JSON.parse(
    readFileSync(
      new URL(
        "../native/public/chainB-7795459-attention.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert.equal(heat.records.length, 11);
  for (const record of heat.records) {
    assert.ok(record.response.blocks.length);
    assert.equal(
      capturedAttention(
        heat,
        chain.source.sha256,
        record.sessionId,
        record.messageId,
        {
          part_id: record.partId,
          content_revision: record.contentRevision,
          field: record.field,
          text: record.text,
          start: record.start,
          end: record.end,
          ...(record.profile ? { profile: record.profile } : {}),
        },
      ),
      record.response,
    );
  }
  for (const request of heat.requests!) {
    assert.deepEqual(
      capturedAttentionRequest(
        heat,
        chain.source.sha256,
        request.sessionId,
        request.messageId,
        request.route,
        request.request,
      ),
      request.response,
    );
    assert.equal(
      (
        capturedAttentionRequest(
          heat,
          chain.source.sha256,
          request.sessionId,
          request.messageId,
          request.route,
          { items: [] },
        ) as { available: boolean }
      ).available,
      false,
    );
  }
});

test("canonical captured item queries preserve nested object values and array order", () => {
  assert.equal(
    canonicalJson({ items: [{ end: 3, start: 1 }], split: ";" }),
    canonicalJson({ split: ";", items: [{ start: 1, end: 3 }] }),
  );
  assert.notEqual(
    canonicalJson({ items: [{ end: 3 }] }),
    canonicalJson({ items: [{ end: 4 }] }),
  );
  assert.notEqual(canonicalJson([1, 2]), canonicalJson([2, 1]));
});

test("every primary thinking passage opens while streaming and collapses over intermediate frames", () => {
  assert.equal(
    timeline.thinkingWindows.length,
    primary.blocks.filter((b) =>
      primary.view.messages.some((m) =>
        m.blocks.some((x) => x.id === b.blockId && x.type === "reasoning"),
      ),
    ).length,
  );
  for (const window of timeline.thinkingWindows) {
    const mid = Math.floor((window.begin + window.complete) / 2);
    assert.equal(
      pairedClock(pair, mid).thinkingMotions.find(
        (m) => m.blockId === window.blockId,
      )!.openness,
      1,
    );
    const hold = pairedClock(pair, window.holdEnd),
      end = pairedClock(pair, window.collapseEnd);
    assert.equal(hold.source, end.source);
    const values = Array.from({ length: 31 }, (_, i) =>
      thinkingOpenness(window, window.holdEnd + i),
    );
    assert.equal(values[0], 1);
    assert.equal(values.at(-1), 0);
    assert.ok(values.slice(1, -1).every((v, i) => v > 0 && v < values[i]));
    const before = pairedClock(pair, mid);
    pairedClock(pair, timeline.frames - 1);
    pairedClock(pair, 0);
    assert.deepEqual(pairedClock(pair, mid), before);
  }
  const round2 = timeline.thinkingWindows[1];
  const clock = pairedClock(
    pair,
    Math.floor((round2.begin + round2.complete) / 2),
  );
  const text = projectPairedSession(primary, clock.source)
    .messages.find((m) => m.id === round2.messageId)!
    .blocks.find((b) => b.id === round2.blockId)!.text!;
  const original = primary.view.messages
    .find((m) => m.id === round2.messageId)!
    .blocks.find((b) => b.id === round2.blockId)!.text!;
  assert.ok(text.length > 0 && text.length < original.length);
  assert.ok(original.startsWith(text));
});

test("attention inspection freezes both transcripts through native select, click and source scroll", () => {
  const chain: PairedReplay = JSON.parse(
    readFileSync(
      new URL(
        "../native/public/opal-chainB-7795459.native.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  chain.attention = JSON.parse(
    readFileSync(
      new URL(
        "../native/public/chainB-7795459-attention.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const spec = resolveAttentionInspection(chain, "chainB-answer-line");
  let previousLength = 0,
    previousScroll = 0;
  const initial = chain.sessions.map((s) =>
    JSON.stringify(projectPairedSession(s, spec.sourceAt)),
  );
  for (let frame = 0; frame < spec.frames; frame++) {
    const pose = attentionInspectionAt(spec, frame);
    assert.equal(pose.source, spec.sourceAt);
    assert.ok(pose.selectionLength >= previousLength);
    assert.ok(pose.scroll >= previousScroll && pose.scroll <= 1);
    previousLength = pose.selectionLength;
    previousScroll = pose.scroll;
    if (frame % 60 === 0)
      assert.deepEqual(
        chain.sessions.map((s) =>
          JSON.stringify(projectPairedSession(s, pose.source)),
        ),
        initial,
      );
  }
  assert.equal(attentionInspectionAt(spec, spec.click - 1).phase, "button");
  assert.equal(attentionInspectionAt(spec, spec.click).phase, "heat");
  assert.equal(attentionInspectionAt(spec, spec.scrollStart).scroll, 0);
  assert.equal(attentionInspectionAt(spec, spec.scrollEnd).scroll, 1);
  assert.equal(spec.text, "ANSWER: 73; MATCHES");
  assert.ok(spec.source.text.startsWith("CURATION OVERRIDE:"));
  const anchors = {
    start: { x: 300, y: 230 },
    selectionStart: { x: 87, y: 165 },
    selectionEnd: { x: 249, y: 165 },
    button: { x: 168, y: 125 },
    scroll: { x: 740, y: 467 },
  };
  for (let frame = 1; frame < spec.frames; frame++) {
    const a = attentionInspectionCursor(spec, frame - 1, anchors),
      b = attentionInspectionCursor(spec, frame, anchors);
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 22);
  }
  assert.equal(attentionInspectionCursor(spec, spec.click, anchors).pulse, 1);
  assert.throws(() => attentionInspectionAt(spec, -1), /frame/);
  const bad = structuredClone(chain);
  bad.source.sha256 = "other";
  assert.throws(
    () => resolveAttentionInspection(bad, "chainB-answer-line"),
    /another source/,
  );
  const stale = structuredClone(chain);
  stale.attention.records = [];
  assert.throws(
    () => resolveAttentionInspection(stale, "chainB-answer-line"),
    /matching/,
  );
});
