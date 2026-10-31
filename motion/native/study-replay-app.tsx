import {
  Component,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useContext,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  ClioRepository,
  flowRunSchema,
  scienceLogSchema,
  sessionSchema,
  messageSchema,
  toolInvocationSchema,
  type SessionReviewSnapshot,
  type ScienceStudy,
} from "@clio/core/v3";
import { RepositoryOverrideProvider } from "@clio-ui/providers/repository-override";
import { ArchiveConversation } from "@clio-ui/lib/session-export/archive-conversation";
import { ScienceLogView } from "@clio-ui/components/clio/science-log-tab";
import { StudyViews } from "@clio-ui/components/clio/study-views";
import { FlowRunDetails } from "@clio-ui/components/clio/flow-run-view";
import {
  workflowSteps,
  flowMembers,
  flowVerdict,
} from "@clio-ui/components/clio/flow-run-presentation";
import { flowDiagrams } from "@clio-ui/hooks/use-flow-presentation";
import { ClioChart } from "@clio-ui/components/clio/a2ui-chart";
import { ClioComposer } from "@clio-ui/components/clio/composer";
import { Button } from "@clio-ui/components/ui/button";
import { BrandIcon } from "@clio-ui/components/clio/brand-icon";
import { TranscriptDisclosureContext } from "@clio-ui/components/clio/transcript-disclosure-context";
import { conversationTurnPresentation } from "@clio-ui/components/clio/conversation-turn-model";
import type { WorkbenchTab } from "@clio-ui/components/clio/workbench-shared";
import { NativeProviders } from "./workspace";
import { RecordedWorkbench } from "./recorded-workbench";
import { RecordedThinkingContext } from "./recorded-thinking";
import { RecordedSessionContextBar } from "./recorded-context-bar";
import { StudyControls, type StudyChoices } from "./study-controls";
import {
  scienceAt,
  flowAt,
  boardsAt,
  studySessionAt,
  type StudyReplay,
} from "./study-replay-model";
import { StudyTransport } from "./study-transport";
import {
  buildStudyShots,
  buildStudyProof,
  studyFilmAt,
  STUDY_DURATION_SECONDS,
  STUDY_PROOF_SECONDS,
} from "./study-film-plan";
import { studyReadingPose, studyTargetMeasurement } from "./study-dom";
import { studyFrameForSource } from "./study-pacing";
import {
  studyLayoutKey,
  type StudyLayoutBook,
  type StudyLayoutTrack,
} from "./study-layout";
import {
  studyCursorAt,
  studyCursorKeys,
  type StudyCursorBook,
} from "./study-cursor";
import { paintVectorCharts } from "./vector-chart-paint";
import "./study-replay.css";

const noop = () => {};
const seedElapsedAt = (begin: number, frame: number) => frame / 60 - begin;
const nextPaint = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const query = new URLSearchParams(location.search);
const renderMode = query.get("render") === "1";
const recordingLayout = query.get("layout") === "record";

class StudyErrorBoundary extends Component<
  { children: ReactNode },
  { error?: string }
> {
  public state: { error?: string } = {};
  public static getDerivedStateFromError(error: Error) {
    return { error: String(error) };
  }
  public componentDidCatch(error: Error) {
    window.parent.postMessage(
      { kind: "clio-film-error", message: String(error) },
      "*",
    );
  }
  public render() {
    return this.state.error ? (
      <pre role="alert">{this.state.error}</pre>
    ) : (
      this.props.children
    );
  }
}

function StudyConversation({
  replay,
  source,
  sessionId,
  call,
  frame,
  shots,
  run,
  layout,
}: {
  replay: StudyReplay;
  source: number;
  sessionId: string;
  call?: string;
  frame: number;
  shots: ReturnType<typeof buildStudyShots>;
  run: "run60" | "run30";
  layout?: StudyLayoutTrack;
}) {
  const outerControls = useContext(StudyControls);
  const { session, view } = useMemo(
    () => studySessionAt(replay, sessionId, source, true),
    [replay, sessionId, source],
  );
  const scroll = useRef<HTMLDivElement>(null);
  const [readerChoices, setReaderChoices] = useState<
    ReadonlyMap<string, boolean>
  >(new Map());
  const current = session.blocks.findLast((b) => b.start <= source);
  const block = session.view.messages
    .flatMap((m) => m.blocks)
    .find((b) => b.id === current?.blockId);
  const { choices, motions } = useMemo(() => {
    const motions = new Map<string, number>();
    const result = new Map(readerChoices);
    const tools = Object.fromEntries(
      view.tools.map((t) => [t.id, toolInvocationSchema.parse(t)]),
    );
    for (const message of view.messages.map((m) => messageSchema.parse(m))) {
      if (message.role !== "assistant") continue;
      const presentation = conversationTurnPresentation(message, tools);
      for (const segment of presentation.segments) {
        if (segment.kind !== "iterations") continue;
        const groups: (typeof presentation.iterations)[] = [];
        for (const iteration of segment.iterations) {
          if (iteration.nextThoughts.length || !groups.length)
            groups.push([iteration]);
          else groups.at(-1)!.push(iteration);
        }
        for (const group of groups) {
          const key = `activity:${group[0].id}`;
          const active = group.some(
            (i) =>
              i.activity.some(
                (x) => x.id === block?.tool_id || x.id === block?.id,
              ) || i.thinking.some((x) => x.id === block?.id),
          );
          const activities = group.flatMap((i) => i.activity);
          const ids = new Set(
            group.flatMap((i) => [
              ...i.activity.map((x) => x.id),
              ...(activities.length ? [] : i.thinking.map((x) => x.id)),
            ]),
          );
          const groupEnd = Math.max(
            ...session.blocks
              .filter(
                (b) =>
                  ids.has(b.blockId) ||
                  session.view.messages.some((m) =>
                    m.blocks.some(
                      (x) =>
                        x.id === b.blockId && x.tool_id && ids.has(x.tool_id),
                    ),
                  ),
              )
              .map((b) => b.end),
          );
          const finish = studyFrameForSource(shots, run, groupEnd);
          const hold = activities.length > 3 ? 14 : 6;
          const duration = activities.length > 3 ? 16 : 11;
          const p = Math.max(
            0,
            Math.min(1, (frame - finish - hold) / duration),
          );
          const close = Number.isFinite(groupEnd)
            ? 1 - p * p * (3 - 2 * p)
            : Number(active);
          const pinned = Boolean(call && activities.some((x) => x.id === call));
          motions.set(
            key,
            readerChoices.has(key)
              ? Number(readerChoices.get(key))
              : pinned
                ? 1
                : close,
          );
          if (!readerChoices.has(key))
            result.set(
              key,
              close > 0 ||
                (active && block?.type !== "text") ||
                Boolean(
                  call &&
                    group.some((i) => i.activity.some((x) => x.id === call)),
                ),
            );
        }
      }
    }
    return { choices: result, motions };
  }, [view, block, call, readerChoices, frame, session, shots, run]);
  useLayoutEffect(() => {
    const host = scroll.current;
    if (!host) return;
    let cancelled = false;
    const follow = () => {
      if (cancelled) return;
      const log = host.querySelector<HTMLElement>(".study-transcript-body");
      if (!log) return;
      log.style.transform = "";
      host.scrollTop = 0;
      for (const row of host.querySelectorAll<HTMLElement>(
        '[data-slot="tool-activity"]',
      )) {
        const activity = row.closest<HTMLElement>("[data-turn-activity]")
          ?.dataset.turnActivity;
        const id = activity?.replace(/^tool:/, "");
        const timed = session.blocks.find((t) =>
          session.view.messages.some((m) =>
            m.blocks.some((b) => b.id === t.blockId && b.tool_id === id),
          ),
        );
        row.style.maxHeight = "";
        row.style.overflow = "";
        row.style.opacity = "";
        if (timed) {
          const age = frame - studyFrameForSource(shots, run, timed.start);
          const p = Math.max(0, Math.min(1, age / 10));
          const amount = p * p * (3 - 2 * p);
          row.style.maxHeight = `${row.scrollHeight * amount}px`;
          row.style.overflow = "hidden";
          row.style.opacity = String(amount);
        }
      }
      const bottom = Math.max(0, log.offsetHeight - host.clientHeight);
      const target = call
        ? host.querySelector<HTMLElement>(`[data-turn-activity="tool:${call}"]`)
        : null;
      const raw = target
        ? Math.max(
            0,
            Math.min(
              bottom,
              target.getBoundingClientRect().top -
                host.getBoundingClientRect().top -
                60,
            ),
          )
        : bottom;
      host.dataset.studyRaw = String(raw);
      host.dataset.studySession = sessionId;
      const offset = Math.min(bottom, layout?.scroll[frame] ?? raw);
      host.dataset.studyOffset = String(offset);
      log.style.transform = `translateY(${-offset}px)`;
    };
    follow();
    const observer = new ResizeObserver(follow);
    observer.observe(host.firstElementChild ?? host);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [frame, source, sessionId, call, shots, run, layout, session]);
  return (
    <div
      className="study-transcript"
      aria-label={`${session.session.title} conversation`}
      ref={scroll}
      style={
        { "--study-spinner-angle": `${frame * 6}deg` } as React.CSSProperties
      }
    >
      <div className="study-transcript-body">
        <StudyControls.Provider
          value={{
            ...outerControls,
            choices: {
              ...outerControls.choices,
              flowSelection: undefined,
              seedMenu: false,
              seedQuery: "",
            },
          }}
        >
          <TranscriptDisclosureContext.Provider
            value={{
              sessionId,
              choices,
              setOpen: (id, open) =>
                setReaderChoices((old) => new Map(old).set(id, open)),
            }}
          >
            <RecordedThinkingContext.Provider value={motions}>
              <ArchiveConversation
                sessionId={sessionId}
                metadata={sessionSchema.parse(session.session).metadata}
                view={view}
                snapshot={replay.snapshot as SessionReviewSnapshot}
                onOpenArtifact={noop}
                onOpenFile={noop}
              />
            </RecordedThinkingContext.Provider>
          </TranscriptDisclosureContext.Provider>
        </StudyControls.Provider>
      </div>
    </div>
  );
}

function RecordedFlow({
  replay,
  source,
  onOpen,
  maximized,
  onMaximize,
}: {
  replay: StudyReplay;
  source: number;
  onOpen: (handle: string) => void;
  maximized: boolean;
  onMaximize: () => void;
}) {
  const projected = useMemo(
    () => flowRunSchema.parse(flowAt(replay, source)),
    [replay, source],
  );
  const presentation = useMemo(() => {
    const steps = workflowSteps(projected, "science"),
      members = flowMembers(projected, "science"),
      verdict = flowVerdict(projected);
    const handleElapsed = new Map(
      Object.entries(projected.timings ?? {}).map(([handle, time]) => [
        handle,
        Math.max(
          0,
          Math.min(
            Date.parse(
              time.terminal_at ??
                new Date(Date.parse(replay.origin) + source).toISOString(),
            ),
            Date.parse(replay.origin) + source,
          ) - Date.parse(time.created_at),
        ),
      ]),
    );
    const elapsed = new Map(
      [...steps, ...members].flatMap((row) => {
        const time = row.handle ? handleElapsed.get(row.handle) : undefined;
        return time === undefined
          ? []
          : [["id" in row ? row.id : row.key, time] as const];
      }),
    );
    return {
      steps,
      members,
      verdict,
      elapsed,
      runElapsed: handleElapsed.get(projected.root_handle),
      flows: new Map(),
      ...flowDiagrams(projected, { steps, members, verdict }),
    };
  }, [projected, replay.origin, source]);
  return (
    <div className="study-flow" data-native-flow="true">
      <FlowRunDetails
        run={projected}
        handle={projected.root_handle}
        label="Wordle study"
        presentation={presentation}
        layout={maximized ? "wide" : "panel"}
        onOpenHandle={onOpen}
        onFullScreen={onMaximize}
      />
    </div>
  );
}

function WordleBoards({
  replay,
  source,
  sessionId,
  game,
}: {
  replay: StudyReplay;
  source: number;
  sessionId?: string;
  game?: string;
}) {
  const boardKey = replay.boards.findLast(
    (b) => b.at <= source && (!sessionId || b.sessionId === sessionId),
  )?.callId;
  const board = useMemo(
    () => boardsAt(replay, source, sessionId),
    [replay, boardKey, sessionId],
  );
  const [choice, setChoice] = useState(game ?? "all");
  useEffect(() => setChoice(game ?? "all"), [game]);
  const selected = choice === "all" ? undefined : choice;
  const rows = useMemo(
    () =>
      selected ? board.rows.filter((r) => r.game === selected) : board.rows,
    [board.rows, selected],
  );
  const spec = useMemo(() => {
    if (!board.spec) return undefined;
    const spec = structuredClone(board.spec);
    spec.vconcat[1].columns = selected ? 1 : 3;
    spec.vconcat[1].spec.width = selected ? 240 : 130;
    spec.vconcat[1].spec.height = selected ? 252 : 162;
    spec.vconcat[1].spec.layer[1].mark.fontSize = selected ? 22 : 13;
    return spec;
  }, [board.spec, selected]);
  return (
    <section className="study-boards" aria-label="Recorded Wordle boards">
      <div className="study-board-controls">
        <strong>Wordle boards</strong>
        <label>
          Game{" "}
          <select
            aria-label="Game"
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
          >
            <option value="all">All games</option>
            {board.games.map((g) => (
              <option key={g.event.key} value={g.event.key}>
                {g.event.key}
                {g.event.key === game ? " · following" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      {spec && rows.length ? (
        <ClioChart
          componentId="recorded-wordle-board"
          title="Recorded game feedback"
          data={rows}
          spec={spec}
          height={420}
        />
      ) : (
        <p className="text-sm text-muted-foreground p-4">
          The first game is starting…
        </p>
      )}
    </section>
  );
}

function Pointer({
  frame,
  shots,
  book,
  proof,
}: {
  frame: number;
  shots: ReturnType<typeof buildStudyShots>;
  book?: StudyCursorBook;
  proof: boolean;
}) {
  const keys = useMemo(
    () => studyCursorKeys(shots, book?.[proof ? "proof" : "full"] ?? []),
    [shots, book, proof],
  );
  const point = studyCursorAt(keys, frame);
  return createPortal(
    <svg
      data-study-pointer="true"
      data-x={point.x}
      data-y={point.y}
      width="40"
      height="40"
      viewBox="0 0 40 40"
      style={{
        position: "fixed",
        left: point.x - 3,
        top: point.y - 2,
        pointerEvents: "none",
        zIndex: 2147483647,
        filter: "drop-shadow(0 1px 2px #203e5066)",
      }}
    >
      {point.pulse > 0 ? (
        <circle
          cx="3"
          cy="2"
          r={5 + 8 * (1 - point.pulse)}
          fill="none"
          stroke="#0da2ae"
          strokeWidth="2"
          opacity={point.pulse}
        />
      ) : null}
      <path
        d="M3 2 L3 27 L9 20 L14 31 L19 28 L14 18 L24 17 Z"
        fill="#fff"
        stroke="#143c50"
        strokeWidth="1.6"
      />
    </svg>,
    document.body,
  );
}

function StudyStage({
  runs,
  frame,
  proof,
  interactive,
  book,
  layouts,
}: {
  runs: Record<"run60" | "run30", StudyReplay>;
  frame: number;
  proof: boolean;
  interactive: boolean;
  book?: StudyCursorBook;
  layouts?: StudyLayoutBook;
}) {
  const shots = useMemo(
    () =>
      proof
        ? buildStudyProof(runs.run60, runs.run30)
        : buildStudyShots(runs.run60, runs.run30),
    [runs, proof],
  );
  const pose = studyFilmAt(shots, frame),
    { shot, source } = pose;
  const replay = runs[shot.run];
  const layout = layouts?.[proof ? "proof" : "full"];
  if (layout && layout.key !== studyLayoutKey(shots))
    throw new Error("Remeasure Wordle scroll geometry for this edit");
  const [manual, setManual] = useState<{
    session?: string;
    tab?: string;
    maximized?: boolean;
    choices?: StudyChoices;
  }>({});
  const [jump, setJump] = useState<string>();
  useEffect(() => {
    setManual({});
    setJump(undefined);
  }, [pose.index]);
  const sessionId = manual.session ?? shot.session;
  const session = replay.sessions.find((s) => s.session.id === sessionId)!;
  const tab = manual.tab ?? shot.tab;
  const seedElapsed = pose.seconds - pose.intent.begin;
  const seedChange = Boolean(
    pose.intent.seed && pose.intent.target?.startsWith("seed:"),
  );
  const priorSeed =
    shots.slice(0, pose.index).findLast((s) => s.seed)?.seed ?? "5";
  const choices: StudyChoices = {
    branch: sessionId,
    entry: undefined,
    mode: "graph",
    graphScope: shot.choices?.entry ? "linked" : "all",
    flowSelection: undefined,
    viewEntry: undefined,
    toolCall: jump ?? shot.call,
    seed: seedChange && seedElapsed < 2.4 ? priorSeed : shot.seed,
    seedMenu: seedChange && seedElapsed >= 1.2 && seedElapsed < 2.4,
    seedQuery:
      seedChange && seedElapsed >= 1.6 && seedElapsed < 2.4
        ? seedElapsed < 1.9
          ? pose.intent.seed?.slice(0, 1)
          : pose.intent.seed
        : "",
    sourcesEntry:
      pose.intent.target?.startsWith("source:") ||
      shot.call ||
      (shot.choices?.entry === "e_eabe97d01f4b" &&
        shot.maximized &&
        pose.seconds - shot.begin >= 1.2)
        ? "e_eabe97d01f4b"
        : "",
    ...shot.choices,
    ...manual.choices,
  };
  const transport = useMemo(() => new StudyTransport(replay), [replay]);
  transport.at = source;
  const repository = useMemo(() => new ClioRepository(transport), [transport]);
  const scienceKey = `${replay.science.findLast((e) => e.at <= source)?.id}/${replay.tasks.findLast((e) => e.at <= source)?.id}/${replay.sessions.filter((s) => Math.min(...s.blocks.map((b) => b.start)) <= source).length}`;
  const study = useMemo(
    () => scienceLogSchema.parse(scienceAt(replay, source)) as ScienceStudy,
    [replay, scienceKey],
  );
  const contextFlow = useMemo(
    () => flowRunSchema.parse(flowAt(replay, source)),
    [replay, Math.floor(source / 1000)],
  );
  const open = (handle: string) => {
    const branch = replay.study.branches.find(
      (b: { handle: string }) => b.handle === handle,
    );
    if (!branch) throw new Error(`No captured branch for ${handle}`);
    setManual((old) => ({ ...old, session: branch.session_id }));
  };
  const viewCall = (sid: string, call: string) => {
    setManual((old) => ({ ...old, session: sid, maximized: false }));
    setJump(call);
  };
  const maximized = manual.maximized ?? Boolean(shot.maximized);
  const width =
    manual.maximized === undefined
      ? 52 + 48 * pose.maximize
      : maximized
        ? 100
        : 52;
  const tabs: WorkbenchTab[] = [
    {
      id: "flow",
      kind: "flow",
      label: "Flow run",
      handle: replay.flows[0].root_handle,
      sessionId: replay.rootSessionId,
      workspaceId: session.session.workspace_id,
    },
    { id: "science-log", kind: "science-log", label: "Science log" },
  ];
  if (replay.boards.some((b) => b.at <= source))
    tabs.push({ id: "resources", kind: "resources", label: "Resources" });
  const activeBranches = replay.sessions.filter(
    (s) =>
      Math.min(...s.blocks.map((b) => b.start)) <= source &&
      s.session.id !== replay.rootSessionId,
  );
  const control = (key: string, value: unknown) =>
    setManual((old) => ({ ...old, choices: { ...old.choices, [key]: value } }));
  return (
    <RepositoryOverrideProvider repository={repository}>
      <StudyControls.Provider
        value={{
          choices,
          now: Date.parse(replay.origin) + source,
          flow: contextFlow,
          change: interactive ? control : undefined,
        }}
      >
        <div
          className="study-film"
          data-study-run={shot.run}
          data-source-ms={source}
          data-study-frame={frame}
        >
          <div className="study-chapter">
            <span>{shot.label}</span>
            <span>
              {shot.run === "run60"
                ? "60 games, 20 shared seeds"
                : "30 games, 10 shared seeds"}
            </span>
          </div>
          <div className="study-window replay-window">
            <header className="study-context">
              <BrandIcon className="size-5" />
              <RecordedSessionContextBar
                session={sessionSchema.parse(replay.sessions[0].session)}
                agentLabel="Science"
                onOpenAgent={noop}
                onExplainComposition={noop}
                readonlyAction={async () => {
                  throw new Error("This recorded study is read-only");
                }}
              />
            </header>
            <main className="study-main">
              <div className="study-chat" style={{ width: "48%" }}>
                <nav
                  data-study-navigation="true"
                  aria-label="Study conversations"
                >
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() =>
                      setManual((old) => ({
                        ...old,
                        session: replay.rootSessionId,
                      }))
                    }
                  >
                    Study
                  </Button>
                  <span>/</span>
                  <select
                    aria-label="Open recorded worker"
                    value={sessionId}
                    onChange={(e) =>
                      setManual((old) => ({ ...old, session: e.target.value }))
                    }
                  >
                    <option value={replay.rootSessionId}>Wordle study</option>
                    {activeBranches.map((s) => (
                      <option key={s.session.id} value={s.session.id}>
                        {s.session.title}
                      </option>
                    ))}
                  </select>
                </nav>
                <StudyConversation
                  key={sessionId}
                  replay={replay}
                  source={source}
                  sessionId={sessionId}
                  call={jump ?? shot.call}
                  frame={frame}
                  shots={shots}
                  run={shot.run}
                  layout={layout}
                />
                <div className="study-composer">
                  <ClioComposer
                    state="paused"
                    attachments={false}
                    contextReferences={false}
                    provider="claude_code"
                    model="claude-opus-5-5"
                    modelOptions={[
                      {
                        providerId: "claude_code",
                        providerName: "Claude Code",
                        id: "claude-opus-5-5",
                        label: "Opus 5.5",
                        available: true,
                      },
                    ]}
                    value=""
                    onValueChange={noop}
                    onSubmit={async () => {}}
                    confirmationPolicy="bypass"
                    variant="docked"
                  />
                </div>
              </div>
              <aside
                className="study-workbench"
                style={{ width: `${width}%` }}
                data-study-maximized={maximized}
              >
                <RecordedWorkbench
                  workspaceId={session.session.workspace_id}
                  sessionId={sessionId}
                  presentation={{
                    tabs,
                    activeTabId: tab === "board" ? "resources" : tab,
                    maximized,
                    onTabChange: (id) =>
                      setManual((old) => ({
                        ...old,
                        tab: id === "resources" ? "board" : id,
                      })),
                    onMaximizedChange: (value) =>
                      setManual((old) => ({ ...old, maximized: value })),
                    content:
                      tab === "flow" ? (
                        <RecordedFlow
                          replay={replay}
                          source={source}
                          onOpen={open}
                          maximized={maximized}
                          onMaximize={() =>
                            setManual((old) => ({
                              ...old,
                              maximized: !maximized,
                            }))
                          }
                        />
                      ) : tab === "board" ? (
                        <WordleBoards
                          replay={replay}
                          source={source}
                          sessionId={
                            sessionId === replay.rootSessionId
                              ? undefined
                              : sessionId
                          }
                          game={maximized ? shot.game : undefined}
                        />
                      ) : study.entries.length ? (
                        <ScienceLogView
                          study={study}
                          sessionId={sessionId}
                          onOpenTask={open}
                          onViewCall={viewCall}
                          onViewInTranscript={(e) =>
                            viewCall(e.session, e.invocation)
                          }
                          folderAvailable={() => false}
                          views={
                            study.views.length ? (
                              <StudyViews study={study} />
                            ) : undefined
                          }
                        />
                      ) : (
                        <p className="p-4 text-sm text-muted-foreground">
                          The study question will appear here when it is
                          recorded.
                        </p>
                      ),
                  }}
                />
              </aside>
            </main>
          </div>
          {shot.card ? (
            <div className="study-card">
              <BrandIcon className="size-14" />
              <h1>
                {shot.card === "intro"
                  ? "CLIO"
                  : shot.card === "second"
                    ? "Explore the results"
                    : "Explore the study"}
              </h1>
              <p>
                {shot.card === "intro"
                  ? "From question to evidence"
                  : shot.card === "second"
                    ? "A separate study with ten shared seeds"
                    : "Follow the evidence"}
              </p>
            </div>
          ) : null}
        </div>
        {!shot.card ? (
          <Pointer frame={frame} shots={shots} book={book} proof={proof} />
        ) : null}
      </StudyControls.Provider>
    </RepositoryOverrideProvider>
  );
}

export function StudyReplayApp() {
  const [runs, setRuns] = useState<Record<"run60" | "run30", StudyReplay>>();
  const [error, setError] = useState("");
  const [book, setBook] = useState<StudyCursorBook>();
  const [layouts, setLayouts] = useState<StudyLayoutBook>();
  useEffect(() => {
    if (recordingLayout) return;
    void fetch("./wordle-layout.json")
      .then(async (response) => {
        if (
          response.ok &&
          response.headers.get("content-type")?.includes("application/json")
        )
          setLayouts((await response.json()) as StudyLayoutBook);
        else if (renderMode)
          setError("Measure Wordle scroll geometry before rendering");
      })
      .catch((error) => setError(String(error)));
  }, []);
  useEffect(() => {
    void fetch("./wordle-cursor.json").then(async (response) => {
      if (
        response.ok &&
        response.headers.get("content-type")?.includes("application/json")
      )
        setBook((await response.json()) as StudyCursorBook);
    });
  }, []);
  const [frame, setFrame] = useState(Number(query.get("frame") ?? 0));
  const [nonce, setNonce] = useState(0);
  const [playing, setPlaying] = useState(false);
  const proof = query.get("cut") === "proof";
  const duration = (proof ? STUDY_PROOF_SECONDS : STUDY_DURATION_SECONDS) * 60;
  const pending = useRef(false);
  const lastReady = useRef<{ frame: number; key: string } | undefined>(
    undefined,
  );
  useEffect(() => {
    void Promise.all(
      ["run60", "run30"].map(async (id) => {
        const response = await fetch(`./${id}.json`);
        if (!response.ok) throw new Error(`${id} replay unavailable`);
        return response.json() as Promise<StudyReplay>;
      }),
    )
      .then(([a, b]) => setRuns({ run60: a, run30: b }))
      .catch((e) => setError(String(e)));
  }, []);
  useEffect(() => {
    if (!playing) return;
    const start = performance.now(),
      initial = frame;
    let id = 0;
    const tick = () => {
      const next = Math.min(
        duration - 1,
        initial + Math.floor((performance.now() - start) * 0.06),
      );
      setFrame(next);
      if (next < duration - 1) id = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing, duration]);
  useEffect(() => {
    if (!renderMode) return;
    const receive = (event: MessageEvent) => {
      if (
        event.source !== window.parent ||
        event.data?.kind !== "clio-film-frame"
      )
        return;
      pending.current = true;
      setFrame(event.data.frame);
      setNonce(event.data.nonce);
    };
    window.addEventListener("message", receive);
    window.parent.postMessage({ kind: "clio-film-boot" }, "*");
    return () => window.removeEventListener("message", receive);
  }, []);
  useLayoutEffect(() => {
    if (
      !runs ||
      !renderMode ||
      !pending.current ||
      (!recordingLayout && (!book || !layouts))
    )
      return;
    let active = true;
    void (async () => {
      await document.fonts.ready;
      const pose = studyFilmAt(
        proof
          ? buildStudyProof(runs.run60, runs.run30)
          : buildStudyShots(runs.run60, runs.run30),
        frame,
      );
      const scienceKey =
        runs[pose.intent.run].science.findLast((e) => e.at <= pose.source)
          ?.id ?? "none";
      const key = `${pose.index}/${scienceKey}`;
      const cold =
        lastReady.current?.key !== key ||
        Math.abs(frame - (lastReady.current?.frame ?? -100)) > 2;
      await nextPaint();
      if (cold || (pose.maximize > 0 && pose.maximize < 1)) await nextPaint();
      let stable = 0;
      for (let attempt = 0; attempt < 1200; attempt++) {
        const loading = document.querySelector(
          '[data-replay-markdown-pending], [data-slot="a2ui-chart"] [role="status"], [data-replay-data-pending]:not([data-replay-data-pending="0"]), [data-replay-chart-pending]:not([data-replay-chart-pending="0"])',
        );
        const reading = [
          ...document.querySelectorAll('.study-workbench [role="status"]'),
        ].some((e) =>
          /^(Reading the call|Loading the answer)/u.test(e.textContent ?? ""),
        );
        const requiredChart =
          (pose.shot.tab === "board" &&
            runs[pose.shot.run].boards.some(
              (b) =>
                b.at <= pose.source &&
                (pose.shot.session === runs[pose.shot.run].rootSessionId ||
                  b.sessionId === pose.shot.session) &&
                b.event.rows?.length,
            )) ||
          (pose.shot.tab === "science-log" &&
            pose.shot.choices?.mode === "views");
        let chartReady =
          !requiredChart ||
          Boolean(
            document.querySelector(
              '.study-workbench [data-slot="a2ui-chart"] svg.marks',
            ),
          );
        if (
          pose.shot.run === "run30" &&
          pose.shot.choices?.viewEntry === "e_9cdb51455051"
        ) {
          const shots = buildStudyShots(runs.run60, runs.run30);
          const prior =
            shots.slice(0, pose.index).findLast((s) => s.seed)?.seed ?? "5";
          const changing =
            pose.intent.target?.startsWith("seed:") &&
            pose.seconds - pose.intent.begin < 2.4;
          const seed = changing ? prior : (pose.shot.seed ?? "5");
          const table =
            runs.run30.snapshot.tables.artifact_b1305778b28d422d8a74b407bf83e402
              .columns;
          const ids = new Set(
            table.game.flatMap((game: string, index: number) =>
              game === `Seed ${seed}` ? [table.observation[index]] : [],
            ),
          );
          const labels = [
            ...document.querySelectorAll(
              ".study-workbench svg.marks path[aria-label]",
            ),
          ]
            .map((e) => e.getAttribute("aria-label") ?? "")
            .filter((label) => label.includes("log entry:"));
          chartReady =
            chartReady &&
            labels.length > 0 &&
            labels.every((label) =>
              [...ids].some((id) => label.includes(String(id))),
            );
        }
        if (!loading && !reading && chartReady) {
          stable++;
          if (stable >= (cold ? 3 : 1)) break;
        } else stable = 0;
        if (attempt === 1199) throw new Error("Study assets have not painted");
        await nextPaint();
      }
      studyReadingPose(pose.shot, pose.seconds);
      if (pose.shot.scroll || pose.seconds - pose.intent.begin < 1.1)
        await nextPaint();
      const pointer = document.querySelector<HTMLElement>(
        "[data-study-pointer]",
      );
      const x = Number(pointer?.dataset.x),
        y = Number(pointer?.dataset.y);
      const node =
        Number.isFinite(x) && Number.isFinite(y)
          ? document.elementFromPoint(x, y)
          : null;
      if (
        pose.intent.target?.startsWith("chart:") &&
        pose.seconds - pose.intent.begin > 4.1
      ) {
        node?.dispatchEvent(
          new MouseEvent("mouseover", {
            bubbles: true,
            clientX: x,
            clientY: y,
          }),
        );
        node?.dispatchEvent(
          new MouseEvent("mousemove", {
            bubbles: true,
            clientX: x,
            clientY: y,
          }),
        );
      } else
        document.querySelectorAll("svg.marks").forEach((svg) =>
          svg.dispatchEvent(
            new MouseEvent("mouseout", {
              bubbles: true,
              clientX: x,
              clientY: y,
            }),
          ),
        );
      await paintVectorCharts();
      if (document.querySelector(".study-workbench svg.marks"))
        await nextPaint();
      if (active) lastReady.current = { frame, key };
      if (active)
        window.parent.postMessage(
          {
            kind: "clio-film-ready",
            frame,
            nonce,
            layout: {
              chat: {
                frame,
                session:
                  document.querySelector<HTMLElement>(".study-transcript")
                    ?.dataset.studySession,
                raw: Number(
                  document.querySelector<HTMLElement>(".study-transcript")
                    ?.dataset.studyRaw ?? 0,
                ),
                scroll: Number(
                  document.querySelector<HTMLElement>(".study-transcript")
                    ?.dataset.studyOffset ?? 0,
                ),
              },
              studyTarget: studyTargetMeasurement(pose.intent),
              seedOption:
                pose.intent.seed && seedElapsedAt(pose.intent.begin, frame) > 2
                  ? studyTargetMeasurement({
                      ...pose.intent,
                      target: `seed-option:${pose.intent.seed}`,
                    })
                  : undefined,
            },
          },
          "*",
        );
    })().catch((e) =>
      window.parent.postMessage(
        { kind: "clio-film-error", message: String(e) },
        "*",
      ),
    );
    return () => {
      active = false;
    };
  }, [runs, frame, nonce, book, layouts]);
  return (
    <NativeProviders>
      <StudyErrorBoundary>
        {error ? (
          <pre role="alert">{error}</pre>
        ) : !runs ? (
          <p>Loading recorded studies…</p>
        ) : (
          <>
            {!renderMode ? (
              <div className="study-review-controls">
                <Button size="xs" onClick={() => setPlaying(!playing)}>
                  {playing ? "Pause" : "Play"}
                </Button>
                <input
                  aria-label="Film position"
                  type="range"
                  min="0"
                  max={duration - 1}
                  value={frame}
                  onChange={(e) => {
                    setPlaying(false);
                    setFrame(Number(e.target.value));
                  }}
                />
                <output>{(frame / 60).toFixed(1)}s</output>
                <a href={`?mode=study&cut=${proof ? "full" : "proof"}`}>
                  {proof ? "Full walkthrough" : "Moving proof"}
                </a>
              </div>
            ) : null}
            <StudyStage
              runs={runs}
              frame={frame}
              proof={proof}
              interactive={!renderMode && !playing}
              book={book}
              layouts={recordingLayout ? undefined : layouts}
            />
          </>
        )}
      </StudyErrorBoundary>
    </NativeProviders>
  );
}
