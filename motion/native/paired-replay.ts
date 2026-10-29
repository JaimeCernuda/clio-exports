export type TimedBlock = {
  messageId: string;
  blockId: string;
  start: number;
  end: number;
  checkpoints: Array<[number, number]>;
  dependsOn: string[];
  precision: string;
};
export type RecordedMessage = {
  id: string;
  session_id: string;
  role: string;
  blocks: Array<{
    id: string;
    type: string;
    text?: string;
    tool_id?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};
export type PairedSession = {
  role: "primary" | "spotter";
  session: {
    id: string;
    workspace_id: string;
    title: string;
    [key: string]: unknown;
  };
  view: {
    messages: RecordedMessage[];
    tools: Array<{ id: string; state: string; [key: string]: unknown }>;
    tasks: unknown[];
    subagents: unknown[];
    artifacts: unknown[];
    surfaces: unknown[];
    [key: string]: unknown;
  };
  blocks: TimedBlock[];
  turns: Array<{ id: string; messageId: string; start: number; end: number }>;
  reasoningSetting?: unknown;
  quarantine?: {
    at: number;
    record: {
      status: string;
      title: string;
      detail: string;
      watcher_handle: string;
      raised_at: string;
    };
  } | null;
};

/** Hide final quarantine metadata until its recorded mutation reaches the shared clock. */
export function recordedSessionAt(session: PairedSession, source: number) {
  const metadata = {
    ...((session.session.metadata as Record<string, unknown>) ?? {}),
  };
  delete metadata.spotter_quarantine;
  if (session.quarantine && source >= session.quarantine.at)
    metadata.spotter_quarantine = session.quarantine.record;
  return { ...session.session, metadata };
}
export type PairedReplay = {
  schema: "clio.paired-replay.v1";
  source: { archive: string; sha256: string };
  origin: string;
  sessions: PairedSession[];
  snapshot: unknown;
  wakes: Array<{
    id: string;
    at: number;
    consumedAt: number;
    sourceMessageId: string;
    sourceCompletedAt: number;
    reviewerBlockId: string;
  }>;
  attention: ReplayAttentionBundle;
  coverage: { issues: string[]; [key: string]: unknown };
  timing?: {
    charactersPerSecond?: number;
    idleSpeed?: number;
    thinkingHoldFrames?: number;
    answerHoldFrames?: number;
    collapseFrames?: number;
    thinkingSeconds?: number;
    toolResultHoldFrames?: number;
  };
};
export type ThinkingWindow = {
  sessionId: string;
  messageId: string;
  blockId: string;
  begin: number;
  complete: number;
  holdEnd: number;
  collapseEnd: number;
};
export type NotificationWindow = ThinkingWindow & { revealEnd: number };

/** Show a received notification, then compact it before the next recorded work. */
export function notificationOpenness(
  window: NotificationWindow,
  frame: number,
): number {
  if (frame < window.begin || frame >= window.collapseEnd) return 0;
  if (frame < window.revealEnd) {
    const t = (frame - window.begin) / (window.revealEnd - window.begin);
    return t * t * (3 - 2 * t);
  }
  return thinkingOpenness(window, frame);
}

/** Frame-based disclosure geometry; the native body stays mounted throughout collapse. */
export function thinkingOpenness(
  window: ThinkingWindow,
  frame: number,
): number {
  if (frame < window.begin || frame >= window.collapseEnd) return 0;
  if (frame <= window.holdEnd) return 1;
  const p = (frame - window.holdEnd) / (window.collapseEnd - window.holdEnd);
  return 1 - p * p * (3 - 2 * p);
}
export type ReplayAttentionRecord = {
  sessionId: string;
  messageId: string;
  partId: string;
  contentRevision: string;
  field: string;
  start: number;
  end: number;
  text: string;
  sourceSelectionText?: string;
  profile?: unknown;
  response: {
    available: true;
    message_id: string;
    selection: Record<string, unknown>;
    blocks: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };
};
export type ReplayAttentionBundle = {
  schema: "clio.replay-attention.v1";
  sourceSha256: string;
  knownAnswers: string[];
  records: ReplayAttentionRecord[];
  summaries?: unknown[];
  requests?: Array<{
    sessionId: string;
    messageId: string;
    route: string;
    request: unknown;
    response: unknown;
  }>;
};

/** Stable equality for exact captured requests, including objects inside item arrays. */
export function canonicalJson(value: unknown): string {
  const normalize = (item: unknown): unknown =>
    Array.isArray(item)
      ? item.map(normalize)
      : item && typeof item === "object"
        ? Object.fromEntries(
            Object.keys(item)
              .sort()
              .map((key) => [
                key,
                normalize((item as Record<string, unknown>)[key]),
              ]),
          )
        : (item ?? null);
  return JSON.stringify(normalize(value));
}

/** Replay native item discovery/export responses for precisely captured selection bodies. */
export function capturedAttentionRequest(
  bundle: ReplayAttentionBundle,
  sourceSha: string,
  sessionId: string,
  messageId: string,
  route: string,
  request: unknown,
): unknown {
  if (
    bundle.sourceSha256 !== sourceSha ||
    bundle.schema !== "clio.replay-attention.v1"
  )
    throw new Error("Attention capture belongs to another export");
  const found = bundle.requests?.find(
    (record) =>
      record.sessionId === sessionId &&
      record.messageId === messageId &&
      record.route === route &&
      canonicalJson(record.request) === canonicalJson(request),
  );
  return (
    found?.response ?? {
      available: false,
      reason: "replay_capture_missing",
      message:
        "This exact attention inspection was not recorded for this replay.",
    }
  );
}

/** Validate identities, recorded prefix coordinates and explicit parent-before-reviewer edges. */
export function validatePairedReplay(pair: PairedReplay): void {
  if (
    pair.schema !== "clio.paired-replay.v1" ||
    pair.sessions.length !== 2 ||
    new Set(pair.sessions.map((s) => s.role)).size !== 2 ||
    pair.attention.sourceSha256 !== pair.source.sha256
  )
    throw new Error("Invalid paired replay identity");
  if (pair.coverage.issues.length)
    throw new Error(
      "Unresolved source timing: " + pair.coverage.issues.join(", "),
    );
  const primary = pair.sessions.find((s) => s.role === "primary")!;
  const sourceAnswers = new Map(primary.turns.map((t) => [t.messageId, t.end]));
  for (const wake of pair.wakes) {
    if (
      sourceAnswers.get(wake.sourceMessageId) !== wake.sourceCompletedAt ||
      wake.at < wake.sourceCompletedAt ||
      !Number.isFinite(wake.consumedAt) ||
      wake.consumedAt < wake.at
    )
      throw new Error("Reviewer wake precedes or mismatches its source answer");
  }
  for (const session of pair.sessions) {
    const messages = new Map(session.view.messages.map((m) => [m.id, m]));
    const ids = new Set<string>();
    const previousEnd = new Map<string, number>();
    for (const block of session.blocks) {
      const original = messages
        .get(block.messageId)
        ?.blocks.find((b) => b.id === block.blockId);
      if (
        !original ||
        ids.has(block.blockId) ||
        !Number.isFinite(block.start) ||
        !Number.isFinite(block.end) ||
        block.end < block.start ||
        block.start < (previousEnd.get(block.messageId) ?? -Infinity)
      )
        throw new Error("Invalid or duplicate source block");
      ids.add(block.blockId);
      previousEnd.set(block.messageId, block.end);
      let previousAt = -Infinity,
        previousLength = 0;
      for (const [at, length] of block.checkpoints) {
        if (
          at < previousAt ||
          length < previousLength ||
          !Number.isInteger(length) ||
          length > Array.from(original.text ?? "").length ||
          !Number.isFinite(at) ||
          at < block.start ||
          at > block.end
        )
          throw new Error("Invalid recorded text prefix");
        previousAt = at;
        previousLength = length;
      }
      if (
        original.text &&
        (original.type === "text" || original.type === "reasoning") &&
        previousLength !== Array.from(original.text).length
      )
        throw new Error("Incomplete recorded text prefix");
      for (const cause of block.dependsOn)
        if (
          !sourceAnswers.has(cause) ||
          block.start < sourceAnswers.get(cause)!
        )
          throw new Error("Reviewer block precedes its source answer");
    }
    if (
      ids.size !==
      session.view.messages.reduce((n, m) => n + m.blocks.length, 0)
    )
      throw new Error("Source block missing from replay");
  }
  const reviewer = pair.sessions.find((s) => s.role === "spotter")!;
  for (const wake of pair.wakes) {
    const block = reviewer.blocks.find(
      (b) => b.blockId === wake.reviewerBlockId,
    );
    if (
      !block ||
      block.start !== wake.consumedAt ||
      !block.dependsOn.includes(wake.sourceMessageId)
    )
      throw new Error("Wake does not match its consumed transcript block");
  }
}

/** Distinguish mail arrival from consumption while preserving concurrent review turns. */
export function reviewerProgress(pair: PairedReplay, source: number) {
  const reviewer = pair.sessions.find((s) => s.role === "spotter")!;
  const received = pair.wakes.filter((w) => w.at <= source);
  const consumed = received.filter((w) => w.consumedAt <= source);
  const active = reviewer.turns.some(
    (t) => t.start <= source && source < t.end,
  );
  return {
    received: received.length,
    consumed: consumed.length,
    queued: received.length - consumed.length,
    state: active
      ? ("running" as const)
      : received.length > consumed.length
        ? ("queued" as const)
        : ("paused" as const),
  };
}

/** Find the source prefix at a shared source time, independent of playback/seek history. */
export function prefixAt(
  points: ReadonlyArray<readonly [number, number]>,
  at: number,
): number {
  let lo = 0,
    hi = points.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (points[mid][0] <= at) lo = mid + 1;
    else hi = mid;
  }
  return lo ? points[lo - 1][1] : 0;
}

/** Project both transcripts from the same source clock, including real tool lifecycle boundaries. */
export function projectPairedSession(session: PairedSession, at: number) {
  const timing = new Map(session.blocks.map((b) => [b.blockId, b]));
  const tools = session.view.tools
    .filter((tool) =>
      session.blocks.some(
        (b) =>
          b.start <= at &&
          session.view.messages.some((m) =>
            m.blocks.some((x) => x.id === b.blockId && x.tool_id === tool.id),
          ),
      ),
    )
    .map((tool) => {
      const block = session.blocks.find((b) =>
        session.view.messages.some((m) =>
          m.blocks.some((x) => x.id === b.blockId && x.tool_id === tool.id),
        ),
      )!;
      return at < block.end
        ? {
            ...tool,
            state: "running",
            output: undefined,
            completed_at: undefined,
            started_at: undefined,
            duration_ms: undefined,
            presentation: undefined,
          }
        : tool;
    });
  const messages = session.view.messages.flatMap((message) => {
    const blocks = message.blocks.flatMap((block) => {
      const timed = timing.get(block.id)!;
      if (!timed || at < timed.start) return [];
      if (!block.text || !timed.checkpoints.length) return [block];
      const length = prefixAt(timed.checkpoints, at);
      if (!length) return [];
      const full = Array.from(block.text),
        complete = length === full.length;
      return [
        {
          ...block,
          text: full.slice(0, length).join(""),
          streaming: !complete,
          ...(block.type === "reasoning" && !complete
            ? { started_at: undefined }
            : {}),
        },
      ];
    });
    if (!blocks.length) return [];
    const turn = session.turns.find((t) => t.messageId === message.id);
    return [
      {
        ...message,
        blocks,
        ...(turn && at < turn.end
          ? {
              completed_at: undefined,
              stop_reason: undefined,
              usage: undefined,
            }
          : {}),
      },
    ];
  });
  return { ...session.view, messages, tools };
}

export const SPOTTER_PRELUDE = {
  menuAt: 60,
  selectAt: 180,
  openAt: 240,
  sourceAt: 420,
  fps: 60,
};
const timelineCache = new WeakMap<
  PairedReplay,
  ReturnType<typeof buildPairedTimeline>
>();

/** Pace visible text across both agents on one monotonic source clock. */
export function buildPairedTimeline(
  pair: PairedReplay,
  charactersPerSecond = pair.timing?.charactersPerSecond ?? 100,
  idleSpeed = pair.timing?.idleSpeed ?? 10,
) {
  if (
    !Number.isFinite(charactersPerSecond) ||
    charactersPerSecond <= 0 ||
    !Number.isFinite(idleSpeed) ||
    idleSpeed <= 0
  )
    throw new Error("Replay speed must be positive");
  const primary = pair.sessions.find((s) => s.role === "primary")!;
  const allThinking = pair.sessions.flatMap((session) =>
    session.blocks
      .filter((b) =>
        session.view.messages.some((m) =>
          m.blocks.some((x) => x.id === b.blockId && x.type === "reasoning"),
        ),
      )
      .map((b) => ({ ...b, sessionId: session.session.id })),
  );
  const thinkingBlocks = allThinking.filter(
    (b) => b.sessionId === primary.session.id,
  );
  const thinking = thinkingBlocks[0];
  if (!thinking)
    throw new Error("No captured thinking passage for this preparation");
  const thinkingHoldFrames = pair.timing?.thinkingHoldFrames ?? 72;
  const answerHoldFrames = pair.timing?.answerHoldFrames ?? 36;
  const collapseFrames = pair.timing?.collapseFrames ?? 30;
  const toolResultHoldFrames = pair.timing?.toolResultHoldFrames ?? 0;
  const thinkingSeconds = pair.timing?.thinkingSeconds;
  if (
    thinkingSeconds !== undefined &&
    (!Number.isFinite(thinkingSeconds) || thinkingSeconds <= 0)
  )
    throw new Error("Thinking duration must be positive");
  if (
    ![
      thinkingHoldFrames,
      answerHoldFrames,
      collapseFrames,
      toolResultHoldFrames,
    ].every(Number.isInteger) ||
    thinkingHoldFrames < 0 ||
    answerHoldFrames < 0 ||
    toolResultHoldFrames < 0 ||
    collapseFrames < 1
  )
    throw new Error("Invalid replay disclosure timing");
  const changes = new Map<number, [number, number]>();
  const velocityChanges = new Map<number, [number, number]>();
  const velocity = (at: number, role: number, amount: number) => {
    const values = velocityChanges.get(at) ?? [0, 0];
    values[role] += amount;
    velocityChanges.set(at, values);
  };
  const toolStarts = new Set<number>();
  const toolEnds = new Set<number>();
  const completedAnswers = new Set(primary.turns.map((turn) => turn.end));
  const add = (
    at: number,
    role: number,
    chars = 0,
    speed = charactersPerSecond,
  ) => {
    const value = changes.get(at) ?? [0, 0];
    value[role] += chars / speed;
    changes.set(at, value);
  };
  add(0, 0);
  pair.sessions.forEach((session, index) => {
    if (session.quarantine) add(session.quarantine.at, index);
    for (const block of session.blocks) {
      add(block.start, index);
      add(block.end, index);
      const message = session.view.messages.find(
        (m) => m.id === block.messageId,
      )!;
      const original = message.blocks.find((b) => b.id === block.blockId)!;
      if (original.type === "tool") {
        toolStarts.add(block.start);
        toolEnds.add(block.end);
      }
      if (
        message.role !== "assistant" ||
        (original.type !== "text" && original.type !== "reasoning")
      )
        continue;
      let length = 0,
        previousAt = block.start;
      for (const [at, next] of block.checkpoints) {
        const speed =
          original.type === "reasoning" && thinkingSeconds
            ? Array.from(original.text ?? "").length / thinkingSeconds
            : charactersPerSecond;
        if (thinkingSeconds && at > previousAt) {
          const rate = (next - length) / speed / (at - previousAt);
          velocity(previousAt, index, rate);
          velocity(at, index, -rate);
          add(previousAt, index);
          add(at, index);
        } else add(at, index, next - length, speed);
        length = next;
        previousAt = at;
      }
    }
    session.turns.forEach((t) => {
      add(t.start, index);
      add(t.end, index);
    });
  });
  pair.wakes.forEach((w) => {
    add(w.at, 1);
    add(w.consumedAt, 1);
  });
  const knots: Array<[number, number]> = [[SPOTTER_PRELUDE.sourceAt, 0]];
  let frame = SPOTTER_PRELUDE.sourceAt,
    previous = 0;
  const thinkingBegins = new Map<string, number>();
  const allWindows: ThinkingWindow[] = [];
  const notificationWindows: NotificationWindow[] = [];
  const rates = [0, 0];
  for (const [at, chars] of [...changes].sort((a, b) => a[0] - b[0])) {
    if (at < 0) continue;
    frame +=
      (thinkingSeconds
        ? Math.max(
            (at - previous) / 1000 / idleSpeed,
            (at - previous) * Math.max(0, ...rates),
          ) + Math.max(...chars)
        : Math.max((at - previous) / 1000 / idleSpeed, Math.max(...chars))) *
      60;
    const change = velocityChanges.get(at);
    if (change)
      rates.forEach((_, i) => {
        rates[i] += change[i];
      });
    knots.push([Math.ceil(frame), at]);
    for (const wake of pair.wakes.filter((wake) => wake.consumedAt === at)) {
      const reviewer = pair.sessions.find((s) => s.role === "spotter")!;
      const begin = Math.ceil(frame),
        revealEnd = begin + 18,
        holdEnd = revealEnd + 90,
        collapseEnd = holdEnd + 24;
      notificationWindows.push({
        sessionId: reviewer.session.id,
        messageId: reviewer.blocks.find(
          (b) => b.blockId === wake.reviewerBlockId,
        )!.messageId,
        blockId: wake.reviewerBlockId,
        begin,
        complete: revealEnd,
        revealEnd,
        holdEnd,
        collapseEnd,
      });
      frame = collapseEnd;
      knots.push([revealEnd, at], [holdEnd, at], [collapseEnd, at]);
    }
    for (const block of allThinking.filter((b) => b.start === at))
      thinkingBegins.set(block.blockId, Math.ceil(frame));
    const endedThinking = allThinking.filter((b) => b.end === at);
    if (endedThinking.length) {
      const complete = Math.ceil(frame),
        holdEnd = complete + thinkingHoldFrames,
        collapseEnd = holdEnd + collapseFrames;
      allWindows.push(
        ...endedThinking.map((block) => ({
          blockId: block.blockId,
          sessionId: block.sessionId,
          messageId: block.messageId,
          begin: thinkingBegins.get(block.blockId)!,
          complete,
          holdEnd,
          collapseEnd,
        })),
      );
      frame = collapseEnd;
      knots.push([holdEnd, at], [frame, at]);
    }
    if (toolStarts.has(at)) {
      // Keep a short native running state readable; both agents pause together.
      frame = Math.ceil(frame) + 30;
      knots.push([frame, at]);
    }
    if (toolEnds.has(at) && toolResultHoldFrames) {
      frame = Math.ceil(frame) + toolResultHoldFrames;
      knots.push([frame, at]);
    }
    if (completedAnswers.has(at)) {
      // Let the viewer read the answer before its reviewer notification arrives.
      frame = Math.ceil(frame) + answerHoldFrames;
      knots.push([frame, at]);
    }
    previous = at;
  }
  const thinkingWindows = allWindows.filter(
    (w) => w.sessionId === primary.session.id,
  );
  return {
    knots,
    thinking,
    ...thinkingWindows[0],
    thinkingWindows,
    reviewerThinkingWindows: allWindows.filter(
      (w) => w.sessionId !== primary.session.id,
    ),
    notificationWindows,
    frames: Math.ceil(frame) + 120,
    charactersPerSecond,
    idleSpeed,
  };
}

/** Seek to a recorded event without giving either transcript a separate clock. */
export function frameForSource(pair: PairedReplay, source: number): number {
  const { knots } = buildPairedTimeline(pair);
  const index = knots.findIndex((point) => point[1] >= source);
  if (index < 0) return knots[knots.length - 1][0];
  if (!index) return knots[0][0];
  const before = knots[index - 1],
    after = knots[index];
  return Math.ceil(
    before[0] +
      ((after[0] - before[0]) * (source - before[1])) / (after[1] - before[1]),
  );
}

/** Keep both conversations on one clock, including each thinking hold and animated collapse. */
export function pairedClock(pair: PairedReplay, frame: number) {
  if (!Number.isInteger(frame) || frame < 0)
    throw new Error("Invalid replay clock");
  let timeline = timelineCache.get(pair);
  if (!timeline) {
    timeline = buildPairedTimeline(pair);
    timelineCache.set(pair, timeline);
  }
  const { knots } = timeline;
  let lo = 0,
    hi = knots.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (knots[mid][0] <= frame) lo = mid + 1;
    else hi = mid;
  }
  const before = knots[Math.max(0, lo - 1)],
    after = knots[lo] ?? before;
  const p =
    after[0] === before[0]
      ? 0
      : Math.max(0, Math.min(1, (frame - before[0]) / (after[0] - before[0])));
  const source =
    frame < SPOTTER_PRELUDE.sourceAt
      ? -1
      : before[1] + (after[1] - before[1]) * p;
  return {
    source,
    policy:
      frame < SPOTTER_PRELUDE.selectAt
        ? ("ask" as const)
        : ("spotter-ai" as const),
    menuOpen:
      frame >= SPOTTER_PRELUDE.menuAt && frame < SPOTTER_PRELUDE.selectAt,
    watcherOpen: frame >= SPOTTER_PRELUDE.openAt,
    thinkingOpen: thinkingOpenness(timeline.thinkingWindows[0], frame) > 0,
    thinkingMotions: timeline.thinkingWindows.map((window) => ({
      ...window,
      openness: thinkingOpenness(window, frame),
    })),
    reviewerThinkingMotions: timeline.reviewerThinkingWindows.map((window) => ({
      ...window,
      openness: thinkingOpenness(window, frame),
    })),
    notificationMotions: timeline.notificationWindows.map((window) => ({
      ...window,
      openness: notificationOpenness(window, frame),
    })),
    thinking: timeline.thinking,
    phase:
      frame < SPOTTER_PRELUDE.sourceAt
        ? "setup"
        : frame < timeline.complete
          ? "thinking"
          : frame < timeline.holdEnd
            ? "hold"
            : frame < timeline.collapseEnd
              ? "collapse"
              : "conversation",
  };
}

/** Require an exact captured request; never derive token heat from a summary or another dataset. */
export function capturedAttention(
  bundle: ReplayAttentionBundle,
  sourceSha: string,
  sessionId: string,
  messageId: string,
  request: {
    text: string;
    part_id?: string;
    content_revision?: string;
    start?: number;
    end?: number;
    profile?: unknown;
    field?: string;
  },
) {
  if (
    bundle.schema !== "clio.replay-attention.v1" ||
    bundle.sourceSha256 !== sourceSha
  )
    throw new Error("Attention capture belongs to another export");
  const record = bundle.records.find(
    (r) =>
      r.sessionId === sessionId &&
      r.messageId === messageId &&
      r.partId === request.part_id &&
      r.contentRevision === request.content_revision &&
      r.field === (request.field ?? "text") &&
      r.start === request.start &&
      r.end === request.end &&
      r.text === request.text &&
      canonicalJson(r.profile) === canonicalJson(request.profile),
  );
  if (!record)
    return {
      available: false as const,
      reason: "replay_capture_missing",
      message:
        "Token attention for this exact selection was not captured. Add its recorded attention response to this replay.",
    };
  if (
    record.response.message_id !== messageId ||
    record.response.selection.text !==
      (record.sourceSelectionText ?? request.text) ||
    ["part_id", "content_revision", "start", "end"].some(
      (key) =>
        request[key as keyof typeof request] !== record.response.selection[key],
    ) ||
    !record.response.blocks.some(
      (b) => Array.isArray(b.runs) && b.runs.length > 0,
    )
  )
    throw new Error(
      "Captured response lacks matching token-to-transcript heat",
    );
  return record.response;
}
