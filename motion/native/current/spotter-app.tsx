import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  memo,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { sessionSchema } from "@clio/core/v3";
import { ClioAppShell } from "@clio-ui/components/clio/app-shell";
import { ClioSessionContextBar } from "@clio-ui/components/clio/session-context-bar";
import { ClioComposer } from "@clio-ui/components/clio/composer";
import { NavigationHeader } from "@clio-ui/components/clio/navigation-header";
import { NavigationFooter } from "@clio-ui/components/clio/navigation-footer";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@clio-ui/components/ui/sidebar";
import { FrameTab } from "@clio-ui/components/clio/primitives/frame-bar";
import { IconButton } from "@clio-ui/components/clio/primitives/icon-button";
import { WorkbenchStrip } from "@clio-ui/components/clio/workbench-strip";
import { BrandIcon } from "@clio-ui/components/clio/brand-icon";
import { ContentMarkdown as NativeContentMarkdown } from "@clio-ui/components/clio/content-markdown";
import { ActivityRow } from "@clio-ui/components/clio/activity-row";
import { StatusIndicator } from "@clio-ui/components/clio/primitives/status-indicator";
import { AttentionHeatViewControls } from "@clio-ui/components/clio/attention-heat-view-controls";
import {
  SelectionActionsProvider,
  ClioSelectionActionToolbar as SelectionActionsToolbar,
} from "@clio-ui/components/clio/selection-actions";
import { useSelectionAction } from "@clio-ui/hooks/use-selection-action";
import type { SelectionAction } from "@clio-ui/lib/selection-actions";
import {
  FolderIcon,
  PaperclipIcon,
  BoxIcon,
  ActivityIcon,
  BotIcon,
  TerminalSquareIcon,
  GlobeIcon,
  DatabaseIcon,
  GitBranchIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  BrainIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Maximize2Icon,
  Minimize2Icon,
  PlusIcon,
  XIcon,
  RadarIcon,
  MessageSquareIcon,
  UserIcon,
} from "lucide-react";
import type { PairedReplay } from "../paired-replay";
import { CurrentProviders } from "./workspace";
import type { DemoScene } from "./demo-model";
import { previewFrameAt } from "./demo-model";
import {
  buildSpotterReconstruction,
  type ReconstructedLookup,
} from "./spotter-scenario";
import {
  EvidenceView,
  LineageView,
  LookupRow,
  ReviewerView,
  type RelocatedAttention,
} from "./spotter-views";
import {
  STEP_TIMING,
  SPOTTER_FRAMES,
  SPOTTER_MARKERS,
  spotterSourceAt,
  spotterPocketAt,
  spotterProgress,
  spotterInspectionAt,
  spotterPrefix,
  mainThoughtExcerpt,
  displayedStepText,
  type PocketName,
} from "./spotter-plan";
import { awaitSpotterPaint, reconcileSpotterScroll } from "./spotter-readiness";
import { isCaptureViewport, type CaptureViewport } from "./capture-viewport";
import type { AttentionHeatView } from "../word-attention/attention-segment-heat";
import "./spotter.css";
import pointerTrack from "./spotter-pointer.json";
import { spotterPointerAt, spotterPointerWaypoints } from "./spotter-pointer";
const ContentMarkdown = memo(NativeContentMarkdown);

/** Inline priority beats the native reduced-motion layer's still-animated 1ms rule. */
function freezePointerPortal(node: SVGSVGElement | null): void {
  node?.style.setProperty("transition", "none", "important");
  node?.style.setProperty("animation", "none", "important");
}

const unavailable = async (): Promise<never> => {
  throw new Error(
    "This film presents archived evidence; it cannot execute an agent.",
  );
};
const icons = {
  evidence: <DatabaseIcon />,
  lineage: <GitBranchIcon />,
  spotter: <ShieldCheckIcon />,
};
const names = { evidence: "Evidence", lineage: "Lineage", spotter: "SPOTTER" };
type Request = { frame: number; nonce: number; viewport?: CaptureViewport };

/** Use the actual captured session/snapshot in the isolated current-UI providers. */
function sceneFor(pair: PairedReplay): DemoScene {
  const primary = pair.sessions.find((s) => s.role === "primary")!;
  return {
    schema: "clio.native-scene.v1",
    source: pair.source,
    session: primary.session,
    view: primary.view,
    snapshot: pair.snapshot,
  } as unknown as DemoScene;
}

/** The preview and private renderer share the exact frame-driven film, not a separate slideshow. */
export function SpotterApp() {
  const query = new URLSearchParams(location.search),
    render = query.get("render") === "1";
  const [data, setData] = useState<{
    pair: PairedReplay;
    attention: RelocatedAttention;
  }>();
  const [error, setError] = useState("");
  const [request, setRequest] = useState<Request>({ frame: 0, nonce: 0 });
  const [playing, setPlaying] = useState(false);
  const pending = useRef(request),
    initial = useRef({ width: innerWidth, height: innerHeight });
  useEffect(() => {
    document.cookie = "sidebar_state=false; path=/";
    localStorage.setItem("clio.workbench-share.v1", "0.48");
    let active = true;
    void Promise.all([
      fetch("/opal-chainB-7795459.native.json").then((r) => {
        if (!r.ok) throw new Error("Source replay unavailable");
        return r.json();
      }),
      fetch("/spotter-reconstructed-attention.json").then((r) => {
        if (!r.ok) throw new Error("Captured attention unavailable");
        return r.json();
      }),
    ])
      .then(([pair, attention]) => {
        buildSpotterReconstruction(pair);
        if (attention.sourceSha256 !== pair.source.sha256)
          throw new Error("Attention belongs to a different source");
        if (active) setData({ pair, attention });
      })
      .catch((e) => setError(String(e)));
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!data) return;
    const receive = (event: MessageEvent) => {
      if (
        event.source !== window.parent ||
        event.data?.kind !== "clio-film-frame"
      )
        return;
      const next = event.data;
      if (
        !Number.isInteger(next.frame) ||
        next.frame < 0 ||
        next.frame >= SPOTTER_FRAMES ||
        !Number.isInteger(next.nonce) ||
        (next.viewport && !isCaptureViewport(next.viewport))
      )
        return;
      pending.current = {
        frame: next.frame,
        nonce: next.nonce,
        viewport: next.viewport,
      };
      setRequest(pending.current);
    };
    window.addEventListener("message", receive);
    window.parent.postMessage({ kind: "clio-film-boot" }, "*");
    return () => window.removeEventListener("message", receive);
  }, [data]);
  useLayoutEffect(() => {
    if (!data || !render) return;
    let active = true;
    void awaitSpotterPaint(
      () =>
        active &&
        pending.current.frame === request.frame &&
        pending.current.nonce === request.nonce,
      request.viewport ?? initial.current,
    )
      .then((ready) => {
        if (ready)
          window.parent.postMessage(
            { kind: "clio-film-ready", ...request },
            "*",
          );
      })
      .catch((e) => {
        if (active) setError(String(e));
      });
    return () => {
      active = false;
    };
  }, [data, render, request]);
  useEffect(() => {
    if (error && render)
      window.parent.postMessage(
        { kind: "clio-film-error", message: error },
        "*",
      );
  }, [error, render]);
  useEffect(() => {
    if (!playing || render) return;
    let id = 0,
      epoch: number | undefined;
    const first = request.frame;
    const tick = (now: number) => {
      epoch ??= now;
      const frame = previewFrameAt(first, now - epoch, SPOTTER_FRAMES, 60);
      setRequest({ frame, nonce: 0 });
      if (frame < SPOTTER_FRAMES - 1) id = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing, render]);
  const scene = useMemo(() => (data ? sceneFor(data.pair) : undefined), [data]);
  if (error)
    return (
      <p className="current-demo-error" role="alert">
        {error}
      </p>
    );
  if (!data) return <p>Loading recorded investigation…</p>;
  const seek = (frame: number) => {
    setPlaying(false);
    setRequest({ frame, nonce: 0 });
  };
  return (
    <main
      className="current-demo sv3"
      data-render={render || undefined}
      data-frame={request.frame}
      style={
        {
          ...(render
            ? {
                width: (request.viewport ?? initial.current).width,
                height: (request.viewport ?? initial.current).height,
              }
            : {}),
        } as CSSProperties
      }
    >
      {!render && (
        <div className="current-demo-controls">
          <span className="current-demo-title">
            SPOTTER · Three-step reconstruction
          </span>
          <button onClick={() => setPlaying((v) => !v)}>
            {playing ? "Pause" : "Play"}
          </button>
          <button onClick={() => seek(0)}>Restart</button>
          <input
            aria-label="Demo frame"
            type="range"
            min="0"
            max={SPOTTER_FRAMES - 1}
            value={request.frame}
            onChange={(e) => seek(Number(e.target.value))}
          />
          <select
            aria-label="Shot"
            onChange={(e) => seek(Number(e.target.value) * 60)}
            value=""
          >
            <option value="" disabled>
              Jump to shot
            </option>
            {SPOTTER_MARKERS.map(([s, label]) => (
              <option key={s} value={s}>
                {s}s · {label}
              </option>
            ))}
          </select>
          <span>{(request.frame / 60).toFixed(1)} s</span>
        </div>
      )}
      <div className="current-demo-stage">
        <CurrentProviders scene={scene!} theme="classic-light">
          <SelectionActionsProvider>
            <SpotterWorkspace
              pair={data.pair}
              attention={data.attention}
              frame={request.frame}
              seek={seek}
            />
          </SelectionActionsProvider>
        </CurrentProviders>
      </div>
    </main>
  );
}

/** Product components remain native; source-linked packets are staged explicitly as a reconstruction. */
function SpotterWorkspace({
  pair,
  attention,
  frame,
  seek,
}: {
  pair: PairedReplay;
  attention: RelocatedAttention;
  frame: number;
  seek: (frame: number) => void;
}) {
  const projection = useMemo(() => buildSpotterReconstruction(pair), [pair]);
  const primary = pair.sessions.find((s) => s.role === "primary")!,
    reviewer = pair.sessions.find((s) => s.role === "spotter")!;
  const session = useMemo(
    () =>
      sessionSchema.parse({
        ...primary.session,
        state: primary.session.status,
        provider_id: "vllm",
        model_id: "ibm-granite/granite-4.2-8b",
        agent_id: "appl-core",
        title: "OPAL · Follow the evidence",
      }),
    [primary],
  );
  const source = spotterSourceAt(pair, frame),
    alert = frame >= 159 * 60;
  const activeStep =
    STEP_TIMING.filter((t) => frame >= t.begin).at(-1)?.step ?? 1;
  const [manualPocket, setManualPocket] = useState<{
    at: number;
    pocket: PocketName;
  }>();
  const [manualStep, setManualStep] = useState<{ at: number; step: number }>();
  const [inspected, setInspected] = useState<{
    at: number;
    tool: ReconstructedLookup;
  }>();
  const [maximized, setMaximized] = useState(false);
  const [view, setView] = useState<AttentionHeatView>({
    unit: "word",
    reduction: "max",
  });
  const [quote, setQuote] = useState<{ at: number; text: string }>();
  const live = useRef({ frame, seek });
  live.current = { frame, seek };
  const selectionActions = useMemo<SelectionAction[]>(
    () => [
      {
        id: "film-add-to-chat",
        label: "Add to chat",
        icon: MessageSquareIcon,
        order: 10,
        kinds: ["agent-answer-text"],
        run: (target) => {
          if (target.kind === "agent-answer-text")
            setQuote({ at: live.current.frame, text: target.text });
        },
      },
      {
        id: "film-attention",
        label: "Understand attention",
        icon: RadarIcon,
        order: 40,
        kinds: ["agent-answer-text"],
        isAvailable: (target) =>
          target.kind === "agent-answer-text" &&
          target.messageId === projection.steps[2].answerId &&
          ["73", "ANSWER: 73; MATCHES"].includes(target.text),
        run: (target) => {
          if (target.kind === "agent-answer-text")
            live.current.seek((target.text === "73" ? 191 : 174) * 60);
        },
      },
    ],
    [projection],
  );
  useSelectionAction(selectionActions[0]);
  useSelectionAction(selectionActions[1]);
  const log = useRef<HTMLDivElement>(null);
  const pocket =
    manualPocket?.at === frame ? manualPocket.pocket : spotterPocketAt(frame);
  const step = manualStep?.at === frame ? manualStep.step : activeStep;
  const inspection = spotterInspectionAt(frame);
  const inspectPhase = inspection.active;
  const selectionText = frame < 184 * 60 ? "ANSWER: 73; MATCHES" : "73";
  const record = attention.records.find((r) => r.text === selectionText);
  if (!record) throw new Error(`Captured selection missing: ${selectionText}`);
  const inspectedTool =
    inspected?.at === frame
      ? inspected.tool
      : inspectPhase
        ? projection.steps[2].tools[0]
        : undefined;
  const setPocket = (next: PocketName) =>
    setManualPocket({ at: frame, pocket: next });
  const openTool = (tool: ReconstructedLookup) => {
    setInspected({ at: frame, tool });
    setManualStep({ at: frame, step: tool.step });
    setPocket("evidence");
  };
  useLayoutEffect(() => {
    const host = log.current;
    if (!host) return;
    reconcileSpotterScroll(host);
  }, [frame, inspectPhase, inspectedTool]);
  useLayoutEffect(() => {
    // A frame variable on the whole transcript invalidates every descendant's
    // style. Only the native spinner nodes need this changing value.
    document
      .querySelectorAll<SVGElement>('[data-slot="ring-spinner"]')
      .forEach((node) => {
        node.style.setProperty("--demo-spin", `${frame * 6}deg`);
        node.dataset.spinFrame = String(frame);
      });
  }, [frame]);
  const selecting =
    (frame >= 168 * 60 && frame < 174 * 60) ||
    (frame >= 185.2 * 60 && frame < 191 * 60);
  // Exact DOM selection precedes the menu; all attention inspection freezes source time.
  useLayoutEffect(() => {
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    if (!selecting) return;
    const element = document.querySelector<HTMLElement>(
      '[data-target="answer-line"]',
    );
    if (!element?.firstChild) return;
    const range = document.createRange(),
      full = element.textContent ?? "";
    const start = selectionText === "73" ? full.indexOf("73") : 0;
    const begin = frame < 184 * 60 ? 168 * 60 : 185.2 * 60;
    const length = Math.max(
      1,
      Math.ceil(
        selectionText.length * spotterProgress(frame, begin, begin + 48),
      ),
    );
    range.setStart(element.firstChild, start);
    range.setEnd(element.firstChild, Math.min(full.length, start + length));
    selection.addRange(range);
  }, [frame, selectionText, selecting]);
  useEffect(() => {
    if (selecting) document.dispatchEvent(new Event("selectionchange"));
  }, [selecting]);
  const draftTiming = STEP_TIMING.find(
    (t) => frame >= t.begin && frame < t.submit,
  );
  const promptText = (index: number) => {
    const step = projection.steps[index],
      text = primary.view.messages
        .find((m) => m.id === step.promptId)!
        .blocks.find((b) => b.type === "text")!.text!;
    const task =
      text.indexOf("\n", text.indexOf(`ROUND ${step.sourceRound} - TASK`)) + 1;
    return displayedStepText(
      text.slice(task, text.indexOf("TOOL OUTPUTS", task)).trim(),
    );
  };
  const prompt = draftTiming
    ? spotterPrefix(
        promptText(draftTiming.step - 1),
        frame,
        draftTiming.begin,
        draftTiming.submit - 12,
      )
    : "";
  const canvas = (
    <aside className={`sv3-canvas ${maximized ? "sv3-maximized" : ""}`}>
      <div className="sv3-canvas-main">
        <div
          className="sv3-tabs"
          role="tablist"
          aria-label="Investigation views"
          data-slot="canvas-tab-row"
        >
          {(["evidence", "lineage", "spotter"] as const).map((name) => (
            <FrameTab
              key={name}
              id={name}
              label={names[name]}
              icon={icons[name]}
              active={pocket === name}
              onSelect={() => setPocket(name)}
              onClose={() =>
                setPocket(name === "evidence" ? "lineage" : "evidence")
              }
              data-target={`tab-${name}`}
            />
          ))}
          <span className="sv3-tab-actions">
            <IconButton
              label="Open investigation view"
              icon={<PlusIcon />}
              onClick={() => setPocket("evidence")}
            />
            <IconButton
              label={maximized ? "Restore canvas" : "Maximize canvas"}
              icon={maximized ? <Minimize2Icon /> : <Maximize2Icon />}
              onClick={() => setMaximized((v) => !v)}
            />
          </span>
        </div>
        <div className="sv3-pocket-body clio-scrollbar">
          {pocket === "evidence" ? (
            <EvidenceView
              pair={pair}
              frame={frame}
              step={step}
              onStep={(step) => setManualStep({ at: frame, step })}
              onTool={openTool}
              selectedTool={inspectedTool?.id}
              alert={alert}
            />
          ) : pocket === "lineage" ? (
            <LineageView
              pair={pair}
              frame={frame}
              onTool={openTool}
              alert={alert}
            />
          ) : (
            <ReviewerView session={reviewer} source={source} frame={frame} />
          )}
        </div>
      </div>
      <WorkbenchStrip
        items={[
          { id: "files", label: "Files", icon: <FolderIcon />, pressed: false },
          {
            id: "sources",
            label: "Sources",
            icon: <PaperclipIcon />,
            pressed: pocket === "evidence",
          },
          {
            id: "artifacts",
            label: "Artifacts",
            icon: <BoxIcon />,
            pressed: pocket === "lineage",
          },
          {
            id: "activity",
            label: "Activity",
            icon: <ActivityIcon />,
            pressed: pocket === "spotter",
          },
          { id: "agent", label: "Agent", icon: <BotIcon />, pressed: false },
          {
            id: "terminal",
            label: "Terminal",
            icon: <TerminalSquareIcon />,
            pressed: false,
          },
          {
            id: "browser",
            label: "Browser",
            icon: <GlobeIcon />,
            pressed: false,
          },
        ]}
        onSelect={(id) =>
          setPocket(
            id === "activity" || id === "agent"
              ? "spotter"
              : id === "artifacts"
                ? "lineage"
                : "evidence",
          )
        }
      />
    </aside>
  );
  return (
    <>
      <ClioAppShell
        navigation={
          <Sidebar collapsible="icon" contained>
            <nav
              aria-label="Workspace navigation"
              className="flex h-full min-w-0 flex-1 flex-col"
            >
              <NavigationHeader
                endpoint="https://archive.invalid"
                activeLabel="Offline archive"
                currentPath="/"
                connectionAvailabilities={{}}
                connections={[]}
                onConnect={unavailable}
                onNewSession={() => seek(0)}
                onImportSession={unavailable}
              />
              <SidebarContent className="gap-0 px-2 py-3">
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive title={session.title}>
                      <MessageSquareIcon />
                      <span>{session.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarContent>
              <NavigationFooter
                endpoint="https://archive.invalid"
                from="/"
                availability={undefined}
                onOpenArchived={unavailable}
              />
            </nav>
          </Sidebar>
        }
        contextBar={
          <ClioSessionContextBar
            session={session}
            actionsPending={false}
            onCompact={unavailable}
            onFork={unavailable}
            onShare={unavailable}
            onUndo={unavailable}
            onReturnToParent={unavailable}
          />
        }
        statusStrip={null}
        workbench={frame >= 12 * 60 ? canvas : null}
        workbenchRevealKey={frame >= 12 * 60 ? "investigation" : undefined}
      >
        <div className="sv3-chat">
          {inspectPhase && (
            <AttentionRail record={record} frame={frame} view={view} />
          )}
          {inspectPhase && (
            <div className="sv3-attention" data-slot="attention-mode-banner">
              <div className="sv3-attention-top">
                <RadarIcon size={16} />
                <b>Attention mode</b>
                <q>{selectionText}</q>
                <AttentionHeatViewControls
                  view={view}
                  onChange={setView}
                  meanAvailable={false}
                />
                <IconButton
                  label="Close attention"
                  icon={<XIcon />}
                  data-target="close-attention"
                  onClick={() => seek(184 * 60)}
                />
              </div>
              <AttentionShares record={record} />
              <p>Source grouping follows the reconstructed tool views.</p>
            </div>
          )}
          <div
            ref={log}
            className="sv3-main-log clio-scrollbar"
            role="log"
            aria-label="Conversation"
            data-film-scroll="manual"
            data-inspecting={String(inspectPhase)}
            data-scroll-target={inspectedTool?.id}
            data-scroll-amount={inspection.scrollAmount}
          >
            <div className="sv3-main-content">
              {frame < 18 * 60 && (
                <div className="sv3-initial">
                  <BrandIcon className="size-10 text-primary" />
                  <h2>Follow the evidence.</h2>
                  <p>OPAL scientific analysis with SPOTTER-AI</p>
                  <small className="text-muted-foreground text-xs">
                    Reconstructed lookup views · Recorded answers and attention
                  </small>
                </div>
              )}
              {projection.steps.map((step, index) => {
                const t = STEP_TIMING[index];
                if (frame < t.submit) return null;
                const thought = mainThoughtExcerpt(
                  primary,
                  step.answerId,
                  step.number,
                );
                const collapse =
                  1 - spotterProgress(frame, t.collapse, t.collapse + 24);
                const thinkingText = spotterPrefix(
                  displayedStepText(thought.text),
                  frame,
                  t.thinking,
                  t.thoughtComplete,
                );
                return (
                  <section
                    className="sv3-turn"
                    key={step.number}
                    data-step={step.number}
                  >
                    <div className="sv3-user-label">
                      <UserIcon size={13} />
                      You <span>Step {step.number}</span>
                    </div>
                    <div className="sv3-user">
                      <ContentMarkdown isAnimating={false}>
                        {promptText(index)}
                      </ContentMarkdown>
                    </div>
                    <div className="sv3-agent-label">
                      <BrandIcon className="size-4 text-primary" />
                      <span>CLIO</span>
                    </div>
                    <div className="sv3-tool-group">
                      <div className="sv3-group-label">
                        {frame < t.thinking
                          ? "Reading evidence"
                          : "Used 3 reference lookups"}
                      </div>
                      {step.tools.map(
                        (tool, j) =>
                          frame >= t.tools[j].begin && (
                            <LookupRow
                              key={tool.id}
                              tool={tool}
                              frame={frame}
                              timing={t.tools[j]}
                              inspection={inspectedTool?.id === tool.id}
                              inspectionOpenness={
                                inspectPhase ? inspection.openness : 1
                              }
                              attention={inspectPhase ? record : undefined}
                              view={view}
                              onInspect={openTool}
                            />
                          ),
                      )}
                    </div>
                    {frame >= t.thinking && (
                      <div
                        className="sv3-reasoning"
                        data-source-block={thought.blockId}
                      >
                        <ActivityRow
                          icon={<BrainIcon size={14} />}
                          name={
                            frame < t.thoughtComplete ? "Thinking" : "Thought"
                          }
                          argument="Recorded reasoning excerpt"
                          disclosure={
                            collapse > 0.5 ? (
                              <ChevronDownIcon size={12} />
                            ) : (
                              <ChevronRightIcon size={12} />
                            )
                          }
                          status={
                            <StatusIndicator
                              tone={
                                frame < t.thoughtComplete
                                  ? "running"
                                  : "success"
                              }
                              label={
                                frame < t.thoughtComplete
                                  ? "Thinking"
                                  : "Completed"
                              }
                              display="column"
                              mark="glyph"
                            />
                          }
                        />
                        <div
                          className="sv3-disclosure"
                          style={{
                            gridTemplateRows: `${collapse}fr`,
                            opacity: Math.min(1, collapse * 3),
                          }}
                        >
                          <div>
                            <div
                              className="sv3-thought"
                              data-excerpt-start={thought.start}
                              data-excerpt-end={thought.end}
                            >
                              <ContentMarkdown isAnimating={false}>
                                {thinkingText}
                              </ContentMarkdown>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {frame >= t.answer && (
                      <div
                        className="sv3-answer"
                        data-answer={step.number}
                        data-selection-surface="agent-answer"
                        data-session-id={primary.session.id}
                        data-message-id={step.answerId}
                      >
                        {step.number === 3 ? (
                          <>
                            <span
                              className="sv3-answer-line"
                              data-target="answer-line"
                              data-slot="message-text"
                              data-part-id={
                                primary.view.messages
                                  .find((m) => m.id === step.answerId)
                                  ?.blocks.find((b) => b.type === "text")?.id
                              }
                            >
                              {spotterPrefix(
                                step.answer,
                                frame,
                                t.answer,
                                t.answer + 50,
                              )}
                            </span>
                            <div className="sv3-answer-explanation">
                              <ContentMarkdown isAnimating={false}>
                                {displayedStepText(
                                  spotterPrefix(
                                    primary.view.messages
                                      .find((m) => m.id === step.answerId)!
                                      .blocks.find((b) => b.type === "text")!
                                      .text!.trim()
                                      .split("\n")
                                      .slice(1)
                                      .join("\n"),
                                    frame,
                                    t.answer + 60,
                                    t.complete,
                                  ),
                                )}
                              </ContentMarkdown>
                            </div>
                          </>
                        ) : (
                          <span>
                            {spotterPrefix(
                              step.answer,
                              frame,
                              t.answer,
                              t.complete - 20,
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}
              {alert && (
                <section className="sv3-alert" data-target="alert">
                  <ShieldAlertIcon size={20} />
                  <div>
                    <h3>Instruction from evidence</h3>
                    <p>
                      The answer followed the override inside the lookup result.
                    </p>
                    <span>Raised by SPOTTER · Session quarantined</span>
                    <div className="sv3-alert-actions">
                      <button
                        data-target="inspect-alert"
                        onClick={() => {
                          setPocket("evidence");
                        }}
                      >
                        Inspect evidence
                      </button>
                      <button onClick={() => setPocket("spotter")}>
                        View SPOTTER
                      </button>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>
          <div className="sv3-composer-wrap">
            <ClioComposer
              state={session.state}
              attachments
              contextReferences
              confirmationPolicy={frame < 11 * 60 ? "ask" : "spotter-ai"}
              executionMode="execute"
              provider="vllm"
              model="ibm-granite/granite-4.2-8b"
              modelOptions={[
                {
                  providerId: "vllm",
                  providerName: "vLLM",
                  id: "ibm-granite/granite-4.2-8b",
                  label: "Granite 4.2 · 8B",
                  available: true,
                },
              ]}
              value={quote?.at === frame ? `> ${quote.text}\n\n` : prompt}
              onValueChange={() => {}}
              onSubmit={unavailable}
              variant="docked"
            />
            {frame >= 8 * 60 && frame < 11 * 60 && (
              <div
                className="sv3-security-menu"
                role="menu"
                aria-label="Security mode"
              >
                <h3>Confirmation policy</h3>
                {[
                  ["Ask first", "Review sensitive actions before they run"],
                  ["Bypass checks", "Run without approval prompts"],
                  ["SPOTTER review", "A second agent reviews the session"],
                ].map(([name, detail]) => (
                  <button
                    role="menuitem"
                    key={name}
                    data-target={
                      name === "SPOTTER review" ? "security-spotter" : undefined
                    }
                    onClick={() => seek(11 * 60)}
                  >
                    <ShieldCheckIcon size={16} />
                    <span>
                      <b>{name}</b>
                      <small>{detail}</small>
                    </span>
                    {name === "Ask first" && <span>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </ClioAppShell>
      {frame < 7 * 60 && (
        <div
          className="sv3-intro"
          style={{ opacity: 1 - spotterProgress(frame, 6 * 60, 7 * 60) }}
        >
          <img src="/spotter-v3-logo.png" alt="SPOTTER-AI" />
          <h1>An instruction hidden in the evidence.</h1>
          <p>Track. Detect. Trace.</p>
          <small>
            Reconstructed lookup views · Recorded answers and attention
          </small>
        </div>
      )}
      {frame >= 144 * 60 && frame < 146 * 60 && (
        <div className="sv3-time-cut">
          Later in the recorded review
          <small>Additional source rounds are omitted from this cut.</small>
        </div>
      )}
      {selecting && (
        <SelectionActionsToolbar key={frame < 184 * 60 ? "answer" : "word"} />
      )}
      <FilmCursor frame={frame} />
      {frame >= 204 * 60 && (
        <div
          className="sv3-close"
          style={{ opacity: spotterProgress(frame, 204 * 60, 205 * 60) }}
        >
          <img src="/spotter-v3-logo.png" alt="SPOTTER-AI" />
          <h2>
            Trace the instruction.
            <br />
            Keep the evidence.
          </h2>
          <p>SPOTTER-AI with CLIO</p>
          <a href="https://clio.iowarp.ai">clio.iowarp.ai</a>
        </div>
      )}
    </>
  );
}

/** Captured mass is conserved; the residual stays in the denominator. */
function AttentionShares({
  record,
}: {
  record: RelocatedAttention["records"][number];
}) {
  const colors: Record<string, string> = {
    user: "#1495a2",
    system: "#9e72ba",
    template: "#9ba6a8",
    tool_definitions: "#677a89",
    assistant_output: "#72a088",
    reconstructed_tool_calls: "#c38829",
    reconstructed_tool_results: "#cd6263",
  };
  const labels: Record<string, string> = {
    user: "Your instructions",
    system: "System prompt",
    template: "Formatting",
    tool_definitions: "Tool definitions",
    assistant_output: "Earlier answers",
    reconstructed_tool_calls: "Tool calls",
    reconstructed_tool_results: "Tool results",
  };
  return (
    <>
      <div className="sv3-share-bar">
        {Object.entries(record.displaySources).map(([domain, share]) => (
          <span
            key={domain}
            style={{ width: `${share * 100}%`, background: colors[domain] }}
          />
        ))}
        <span style={{ flex: 1, background: "var(--muted)" }} />
      </div>
      <div className="sv3-share-labels">
        {Object.entries(record.displaySources)
          .sort((a, b) => b[1] - a[1])
          .map(([domain, share]) => (
            <span key={domain}>
              <i style={{ background: colors[domain] }} />
              {labels[domain]} {(share * 100).toFixed(1)}%
            </span>
          ))}
        <span>Spread thin {(record.residual * 100).toFixed(1)}%</span>
      </div>
    </>
  );
}
/** Source-position rail uses the same unamplified heat as the visible source words. */
function AttentionRail({
  record,
  frame,
  view,
}: {
  record: RelocatedAttention["records"][number];
  frame: number;
  view: AttentionHeatView;
}) {
  const previous = useRef<{ record: object; layout: string } | undefined>(
    undefined,
  );
  const [marks, setMarks] = useState<
    Array<{ at: number; value: number; tool: string }>
  >([]);
  useLayoutEffect(() => {
    const host = document.querySelector<HTMLElement>(".sv3-main-log");
    if (!host) return;
    const layout = JSON.stringify([host.scrollHeight, host.clientWidth, view]);
    if (
      previous.current?.record === record &&
      previous.current.layout === layout
    )
      return;
    previous.current = { record, layout };
    const top = host.getBoundingClientRect().top;
    const items = record.displayBlocks
      .filter((b) => b.field === "result")
      .flatMap((block) => {
        const element = host.querySelector<HTMLElement>(
          `[data-tool="${block.toolId}"]`,
        );
        if (!element) return [];
        const heat = [
          ...element.querySelectorAll<HTMLElement>("[data-heat]"),
        ].filter((e) => e.getBoundingClientRect().height > 0);
        if (heat.length)
          return heat.map((e) => ({
            at:
              (e.getBoundingClientRect().top - top + host.scrollTop) /
              host.scrollHeight,
            value: Number(e.dataset.heat),
            tool: block.toolId,
          }));
        return [
          {
            at:
              (element.getBoundingClientRect().top - top + host.scrollTop) /
              host.scrollHeight,
            value: Math.max(0, ...block.displayRuns.map((r) => r[2])),
            tool: block.toolId,
          },
        ];
      });
    setMarks(items);
  }, [record, frame, view]);
  return (
    <div
      className="sv3-heat-rail"
      aria-label="Conversation attention intensity"
    >
      {marks.map((m, i) => (
        <button
          key={i}
          aria-label={`Attention in ${m.tool}`}
          title={`${(m.value * 100).toFixed(0)}% display intensity`}
          style={{
            top: `${Math.max(0, Math.min(1, m.at)) * 100}%`,
            width: 2 + m.value * 7,
            background: `rgba(209,58,61,${m.value * 0.7})`,
          }}
          onClick={() =>
            document
              .querySelector(`[data-tool="${m.tool}"]`)
              ?.scrollIntoView({ block: "center" })
          }
        />
      ))}
    </div>
  );
}
/** Measured, immutable waypoints make direct seeks and sequential renders identical. */
function FilmCursor({ frame }: { frame: number }) {
  const controls =
    document.querySelector(".current-demo-controls")?.getBoundingClientRect()
      .height ?? 0;
  const width = innerWidth,
    height = innerHeight - controls;
  const profile = [...pointerTrack.profiles].sort(
    (a, b) =>
      Math.abs(a.width / a.height - width / height) -
      Math.abs(b.width / b.height - width / height),
  )[0];
  const pose = spotterPointerAt(spotterPointerWaypoints(profile), frame);
  const point = {
    x: (pose.x * width) / profile.width,
    y: controls + (pose.y * height) / profile.height,
  };
  return createPortal(
    <svg
      className="sv3-pointer"
      ref={freezePointerPortal}
      aria-hidden
      viewBox="0 0 32 40"
      style={{ left: point.x, top: point.y }}
    >
      <path d="M3 2 3 30 10 23 16 36 22 33 16 21 27 21Z" />
    </svg>,
    document.body,
  );
}
