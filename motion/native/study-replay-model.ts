import { projectPairedSession, type PairedSession } from "./paired-replay";

// These are transport records from a versioned native export. Native schemas
// validate them at the production component boundary, after time projection.
export type JsonRecord = Record<string, any>;
export type StudyReplay = {
  schema: "clio.study-replay.v1";
  source: { archive: string; sha256: string };
  rootSessionId: string;
  origin: string;
  durationMs: number;
  sessions: PairedSession[];
  study: JsonRecord;
  snapshot: JsonRecord;
  flows: JsonRecord[];
  science: Array<{
    id: string;
    at: number;
    sessionId: string;
    record: JsonRecord;
  }>;
  tasks: Array<{
    id: string;
    at: number;
    sessionId: string;
    record: JsonRecord;
  }>;
  boards: Array<{
    at: number;
    sessionId: string;
    callId: string;
    event: JsonRecord;
    result: JsonRecord;
  }>;
};

const projections = new WeakMap<
  PairedSession,
  {
    times: number[];
    index: number;
    prefix?: string;
    view: ReturnType<typeof projectPairedSession>;
  }
>();
const presentationProjections: typeof projections = new WeakMap();
/** Index the last observed boundary, so a spinner frame does not rebuild an unchanged transcript. */
export function boundaryAt(times: readonly number[], at: number): number {
  let low = 0,
    high = times.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (times[mid] <= at) low = mid + 1;
    else high = mid;
  }
  return low - 1;
}

/** A native session projection shared by every panel; navigation never resets time. */
export function studySessionAt(
  replay: StudyReplay,
  sessionId: string,
  at: number,
  presentation = false,
) {
  const session = replay.sessions.find((s) => s.session.id === sessionId);
  if (!session) throw new Error(`Uncaptured study session ${sessionId}`);
  const cache = presentation ? presentationProjections : projections;
  let cached = cache.get(session);
  if (!cached) {
    cached = {
      times: [
        ...new Set(
          session.blocks
            .flatMap((b) => [b.start, b.end, ...b.checkpoints.map((p) => p[0])])
            .concat(session.turns.map((t) => t.end)),
        ),
      ].sort((a, b) => a - b),
      index: -2,
      view: session.view,
    };
    cache.set(session, cached);
  }
  const index = boundaryAt(cached.times, at);
  const active = presentation
    ? session.blocks.find(
        (t) =>
          t.start <= at &&
          at < t.end &&
          session.view.messages.some(
            (m) =>
              m.role === "assistant" &&
              m.blocks.some((b) => b.id === t.blockId && b.type === "text"),
          ),
      )
    : undefined;
  const prefix = active
    ? `${active.blockId}/${Math.floor(((at - active.start) / (active.end - active.start)) * (active.checkpoints.at(-1)?.[1] ?? 0))}`
    : "";
  if (cached.index === index && cached.prefix === prefix)
    return { session, view: cached.view };
  const publicIds = new Set(
    session.view.messages
      .filter((m) => m.role === "assistant")
      .flatMap((m) =>
        m.blocks.filter((b) => b.type === "text").map((b) => b.id),
      ),
  );
  const view = projectPairedSession(
    session,
    at,
    presentation
      ? (block, timing, time) =>
          publicIds.has(block.id) && timing.end > timing.start
            ? Math.floor(
                Array.from(block.text ?? "").length *
                  Math.max(
                    0,
                    Math.min(
                      1,
                      (time - timing.start) / (timing.end - timing.start),
                    ),
                  ),
              )
            : undefined
      : undefined,
  );
  cached.view = {
    ...view,
    artifacts: view.artifacts.filter((a: unknown) => {
      const stamp = (a as { created_at?: string }).created_at;
      return !stamp || Date.parse(stamp) - Date.parse(replay.origin) <= at;
    }),
  };
  cached.index = index;
  cached.prefix = prefix;
  return { session, view: cached.view };
}

/** Latest recorded task observations, including cancellations and queued work. */
export function studyTasksAt(
  replay: StudyReplay,
  at: number,
): Map<string, JsonRecord> {
  const result = new Map<string, JsonRecord>();
  for (const event of replay.tasks) {
    if (event.at > at) break;
    result.set(event.record.handle, event.record);
  }
  return result;
}

/** Reveal accepted entries once, then apply status mutations only when they occurred. */
export function scienceAt(replay: StudyReplay, at: number): JsonRecord {
  const entries = new Map<string, JsonRecord>();
  for (const event of replay.science) {
    if (event.at > at) break;
    const record = event.record;
    if (record.type === "status") {
      const prior = entries.get(record.fields.entry);
      if (prior)
        entries.set(prior.id, {
          ...prior,
          status: record.fields.status,
          status_reason: record.fields.reason,
        });
    } else entries.set(record.id, { ...record });
  }
  const tasks = studyTasksAt(replay, at);
  const started = new Set(
    replay.sessions
      .filter((s) => Math.min(...s.blocks.map((b) => b.start)) <= at)
      .map((s) => s.session.id),
  );
  return {
    ...replay.study,
    branches: replay.study.branches
      .filter(
        (b: JsonRecord) =>
          b.session_id === replay.rootSessionId ||
          started.has(b.session_id) ||
          tasks.has(b.handle),
      )
      .map((b: JsonRecord) => ({
        ...b,
        task_status: tasks.get(b.handle)?.status ?? "unknown",
      })),
    entries: [...entries.values()],
    views: (replay.study.views ?? []).filter((v: JsonRecord) =>
      entries.has(v.entry),
    ),
  };
}

/** Derive workflow lifecycle from its actual task records and captured worker starts. */
export function flowAt(replay: StudyReplay, at: number): JsonRecord {
  const final = replay.flows[0];
  const tasks = studyTasksAt(replay, at);
  const elapsed = (stamp: string | null | undefined) =>
    stamp ? Date.parse(stamp) - Date.parse(replay.origin) : Infinity;
  const states = new Map<string, string>();
  const steps = final.view.steps.map((step: JsonRecord) => {
    const task = tasks.get(step.handle);
    const timing = final.timings[step.handle];
    const branch = replay.study.branches.find(
      (b: JsonRecord) => b.handle === step.handle,
    );
    const session = replay.sessions.find(
      (s) => s.session.id === branch?.session_id,
    );
    const began = session
      ? Math.min(...session.turns.map((t) => t.start))
      : Infinity;
    const terminal = elapsed(timing?.terminal_at);
    const created = elapsed(timing?.created_at);
    const state =
      terminal <= at
        ? step.status
        : task?.activity === "busy" ||
            task?.activity === "executing" ||
            began <= at
          ? "running"
          : "pending";
    states.set(step.handle, state);
    return {
      ...step,
      status: state,
      task_status: task?.status ?? "unknown",
      handle: created <= at ? step.handle : undefined,
      invocation: created <= at ? step.invocation : undefined,
    };
  });
  const complete = elapsed(final.timings[final.root_handle]?.terminal_at) <= at;
  return {
    ...final,
    status: complete ? final.status : "running",
    view: { ...final.view, steps },
    calls: final.calls
      .filter(
        (c: JsonRecord) => elapsed(final.timings[c.handle]?.created_at) <= at,
      )
      .map((c: JsonRecord) => ({
        ...c,
        status:
          states.get(c.handle) === "pending"
            ? "accepted"
            : states.get(c.handle),
      })),
    result: complete ? final.result : null,
    outcome: complete ? final.outcome : null,
    usage: complete ? final.usage : undefined,
    events: final.events.filter(
      (e: JsonRecord) =>
        e.handle && elapsed(final.timings[e.handle]?.terminal_at) <= at,
    ),
    timings: Object.fromEntries(
      Object.entries(final.timings as Record<string, JsonRecord>)
        .filter(([, t]) => elapsed(t.created_at) <= at)
        .map(([k, t]) => [
          k,
          {
            ...t,
            updated_at: new Date(
              Date.parse(replay.origin) + Math.min(at, elapsed(t.updated_at)),
            ).toISOString(),
            terminal_at: elapsed(t.terminal_at) <= at ? t.terminal_at : null,
          },
        ]),
    ),
  };
}

/** Each tool result replaces its game key; no board or feedback predates its source call. */
export function boardsAt(replay: StudyReplay, at: number, sessionId?: string) {
  const games = new Map<string, StudyReplay["boards"][number]>();
  let spec: JsonRecord | undefined;
  for (const update of replay.boards) {
    if (update.at > at) break;
    if (sessionId && update.sessionId !== sessionId) continue;
    if (update.event.component?.spec) spec = update.event.component.spec;
    games.set(`${update.event.group}/${update.event.key}`, update);
  }
  const rows = [...games.values()].flatMap((u) =>
    (u.event.rows ?? []).map((r: JsonRecord) => ({
      ...r,
      branch:
        replay.sessions.find((s) => s.session.id === u.sessionId)?.session
          .title ?? u.sessionId,
    })),
  );
  return { spec, rows, games: [...games.values()] };
}
