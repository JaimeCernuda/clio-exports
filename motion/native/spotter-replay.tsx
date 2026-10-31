import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ComponentProps,
  type CSSProperties,
} from "react";
import {
  ClioRepository,
  messageSchema,
  sessionSchema,
  toolInvocationSchema,
  type MessageBehavior,
  type SubagentRun,
  type SessionReviewSnapshot,
} from "@clio/core/v3";
import { BotIcon, ArrowUpLeftIcon } from "lucide-react";
import { RepositoryOverrideProvider } from "@clio-ui/providers/repository-override";
import { ArchiveConversation } from "@clio-ui/lib/session-export/archive-conversation";
import { conversationTurnPresentation } from "@clio-ui/components/clio/conversation-turn-model";
import {
  ClioComposer,
  type ClioComposerProps,
} from "@clio-ui/components/clio/composer";
import { ClioStatus } from "@clio-ui/components/clio/status";
import { Button } from "@clio-ui/components/ui/button";
import {
  SelectionActionsProvider,
  ClioSelectionActionToolbar,
} from "@clio-ui/components/clio/selection-actions";
import { TranscriptDisclosureContext } from "@clio-ui/components/clio/transcript-disclosure-context";
import { AttentionModeBanner } from "@clio-ui/components/clio/attention-mode-banner";
import { ClioTranscriptMinimap } from "@clio-ui/components/clio/transcript-minimap";
import { useAttentionMode } from "@clio-ui/hooks/use-attention-mode";
import { useAttentionHighlights } from "@clio-ui/hooks/use-attention-highlights";
import { useMoreDetails } from "@clio-ui/hooks/use-more-details";
import { useAddToChatSelectionAction } from "@clio-ui/hooks/use-add-to-chat-selection-action";
import type { ComposerAnnotation } from "@clio-ui/lib/composer-annotations";
import { RecordedSessionContextBar } from "./recorded-context-bar";
import { RecordedWorkbench } from "./recorded-workbench";
import { SpotterQuarantineCard } from "./recorded-quarantine";
import { RecordedThinkingContext } from "./recorded-thinking";
import { RecordedAttentionInspection } from "./attention-inspection";
import { RecordedSetupPointer } from "./recorded-pointer";
import {
  filmPair,
  buildSpotterFilmPlan,
  spotterFilmAt,
} from "./spotter-film-plan";
import {
  resolveAttentionInspection,
  type ResolvedAttentionInspection,
} from "./attention-inspection-plan";
import { NativeProviders } from "./workspace";
import { PairedAttentionTransport } from "./paired-attention-transport";
import { sceneAssetPath } from "./scene-selection";
import {
  pairedClock,
  buildPairedTimeline,
  projectPairedSession,
  validatePairedReplay,
  SPOTTER_PRELUDE,
  reviewerProgress,
  frameForSource,
  recordedSessionAt,
  type PairedReplay,
  type PairedSession,
} from "./paired-replay";
import "./spotter-replay.css";

const ControlledComposer = ClioComposer as ComponentType<
  ClioComposerProps & { recordedApprovalMenuOpen?: boolean }
>;
const RecordedAttentionBanner = AttentionModeBanner as ComponentType<
  ComponentProps<typeof AttentionModeBanner> & {
    onFocusItem?: (focus: unknown) => void;
  }
>;
const noFile = () => {};
const noThinkingMotions: ReturnType<typeof pairedClock>["thinkingMotions"] = [];

type PaneProps = {
  pair: PairedReplay;
  session: PairedSession;
  source: number;
  thinkingOpen: boolean;
  thinkingMotions?: ReturnType<typeof pairedClock>["thinkingMotions"];
  notificationMotions?: ReturnType<typeof pairedClock>["notificationMotions"];
  primary?: boolean;
  attention?: ReturnType<typeof useAttentionMode>;
  inspection?: ResolvedAttentionInspection;
  inspectionFrame?: number;
};
function AttentionTranscriptPane(props: PaneProps) {
  const count = useMemo(
    () => projectPairedSession(props.session, props.source).messages.length,
    [props.session, props.source],
  );
  const attention = useAttentionMode(props.session.session.id, count);
  return <TranscriptPane {...props} primary attention={attention} />;
}
function TranscriptPane({
  pair,
  session,
  source,
  thinkingOpen,
  thinkingMotions = noThinkingMotions,
  notificationMotions,
  primary = false,
  attention,
  inspection,
  inspectionFrame = 0,
}: PaneProps) {
  const view = useMemo(
    () => projectPairedSession(session, source),
    [session, source],
  );
  const scroll = useRef<HTMLDivElement>(null);
  const messages = useMemo(
    () => view.messages.map((m) => messageSchema.parse(m)),
    [view.messages],
  );
  const tools = useMemo(
    () =>
      Object.fromEntries(
        view.tools.map((t) => [t.id, toolInvocationSchema.parse(t)]),
      ),
    [view.tools],
  );
  useAttentionHighlights(scroll, attention?.heat, messages, tools);
  const [readerChoices, setReaderChoices] = useState<
    ReadonlyMap<string, boolean>
  >(new Map());
  const { choices, motionValues } = useMemo(() => {
    const choices = new Map(readerChoices);
    const motionValues = new Map<string, number>();
    const current = session.blocks.findLast((block) => block.start <= source);
    const activeBlock =
      current &&
      session.view.messages
        .find((m) => m.id === current.messageId)
        ?.blocks.find((b) => b.id === current.blockId);
    for (const message of messages) {
      if (message.role !== "assistant") continue;
      const presentation = conversationTurnPresentation(message, tools);
      for (const segment of presentation.segments) {
        if (segment.kind !== "iterations") continue;
        const groups: (typeof presentation.iterations)[] = [];
        for (const iteration of segment.iterations) {
          if (iteration.nextThoughts.length || !groups.length)
            groups.push([iteration]);
          else groups[groups.length - 1].push(iteration);
        }
        for (const group of groups) {
          const key = `activity:${group[0].id}`;
          if (readerChoices.has(key)) continue;
          choices.set(
            key,
            activeBlock?.type !== "text" &&
              group.some(
                (iteration) =>
                  iteration.activity.some(
                    (entry) =>
                      entry.id === activeBlock?.tool_id ||
                      entry.id === activeBlock?.id,
                  ) ||
                  iteration.thinking.some(
                    (entry) => entry.id === activeBlock?.id,
                  ),
              ),
          );
        }
      }
    }
    for (const motion of thinkingMotions) {
      const key = `thinking:${session.session.id}:${motion.messageId}:${motion.blockId}:text`;
      if (!readerChoices.has(key)) choices.set(key, motion.openness > 0);
      motionValues.set(
        key,
        readerChoices.has(key)
          ? readerChoices.get(key)
            ? 1
            : 0
          : motion.openness,
      );
    }
    for (const motion of notificationMotions ?? []) {
      const key = `injection:${motion.blockId}`;
      if (!readerChoices.has(key)) choices.set(key, motion.openness > 0);
      motionValues.set(
        key,
        readerChoices.has(key)
          ? readerChoices.get(key)
            ? 1
            : 0
          : motion.openness,
      );
    }
    return { choices, motionValues };
  }, [
    messages,
    tools,
    readerChoices,
    source,
    session,
    thinkingMotions,
    primary,
    notificationMotions,
  ]);
  // A paused inspection changes only its pointer, selection and scroll pose.
  // Keep native Markdown mounted without rebuilding either recorded chat.
  const conversation = useMemo(
    () => (
      <TranscriptDisclosureContext.Provider
        value={{
          sessionId: session.session.id,
          choices,
          setOpen: (id, open) =>
            setReaderChoices((current) => new Map(current).set(id, open)),
        }}
      >
        <RecordedThinkingContext.Provider value={motionValues}>
          <ArchiveConversation
            sessionId={session.session.id}
            metadata={recordedSessionAt(session, source).metadata}
            view={view}
            snapshot={pair.snapshot as SessionReviewSnapshot}
            onOpenArtifact={noFile}
            onOpenFile={noFile}
          />
        </RecordedThinkingContext.Provider>
      </TranscriptDisclosureContext.Provider>
    ),
    [session, source, view, pair.snapshot, choices, motionValues],
  );
  useLayoutEffect(() => {
    const host = scroll.current;
    if (!host || inspection || (attention && attention.state.status !== "idle"))
      return;
    const follow = () => {
      host.scrollTop = Math.max(0, host.scrollHeight - host.clientHeight);
      for (const detail of host.querySelectorAll<HTMLElement>(
        '[data-slot="transcript-reasoning-text"]',
      ))
        detail.scrollTop = Math.max(
          0,
          detail.scrollHeight - detail.clientHeight,
        );
    };
    follow();
    // Native Markdown paints after the parent layout effect. Follow its measured
    // content, including the inner thinking scroller, rather than a timeout.
    const observer = new ResizeObserver(follow);
    observer.observe(host);
    for (const content of host.querySelectorAll(
      '.paired-messages,[data-slot="transcript-reasoning-text"] > *',
    ))
      observer.observe(content);
    const id = requestAnimationFrame(follow);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(id);
    };
  }, [view, thinkingOpen, attention?.state.status, inspection]);
  return (
    <div className="paired-transcript">
      {inspection && attention ? (
        <RecordedAttentionInspection
          spec={inspection}
          frame={inspectionFrame}
          scroll={scroll}
          attention={attention}
        />
      ) : null}
      {attention ? (
        <RecordedAttentionBanner
          state={attention.state}
          onDismiss={attention.dismiss}
          onProfileChange={attention.changeProfile}
          onFocusItem={
            (attention as unknown as { focusItem?: (focus: unknown) => void })
              .focusItem
          }
        />
      ) : null}
      <div className="paired-log-wrap">
        {primary ? (
          <div className="paired-rail">
            <ClioTranscriptMinimap
              attention={attention?.heat}
              activeIndex={Math.max(0, messages.length - 1)}
              messages={messages}
              visible
              onJump={(index) => {
                scroll.current
                  ?.querySelector<HTMLElement>(
                    `#message-${messages[index]?.id}`,
                  )
                  ?.scrollIntoView({ block: "start" });
              }}
            />
          </div>
        ) : null}
        <div
          className="paired-log"
          ref={scroll}
          role="log"
          aria-label={primary ? "OPAL conversation" : "SPOTTER conversation"}
        >
          <div className="paired-messages">{conversation}</div>
        </div>
      </div>
    </div>
  );
}

function RecordedSelectionExtras({
  sessionId,
  model,
  annotations,
  setAnnotations,
}: {
  sessionId: string;
  model: { provider_id: string; model_id: string };
  annotations: readonly ComposerAnnotation[];
  setAnnotations: (values: readonly ComposerAnnotation[]) => void;
}) {
  useMoreDetails(sessionId, model);
  useAddToChatSelectionAction(
    { annotations, onAnnotationsChange: setAnnotations },
    () =>
      document
        .querySelector<HTMLTextAreaElement>(".paired-composer textarea")
        ?.focus(),
  );
  return null;
}

function SpotterStage({
  pair,
  frame,
  setFrame,
  playing,
  setPlaying,
  renderMode,
  inspection,
  inspectionFrame,
  replayFrameOverride,
  cinematic = false,
  caption,
  sourceOverride,
}: {
  pair: PairedReplay;
  frame: number;
  setFrame: (frame: number) => void;
  playing: boolean;
  setPlaying: (playing: boolean) => void;
  renderMode: boolean;
  inspection?: ResolvedAttentionInspection;
  inspectionFrame?: number;
  replayFrameOverride?: number;
  cinematic?: boolean;
  caption?: string;
  sourceOverride?: number;
}) {
  const inspectionReplayFrame = useMemo(
    () => (inspection ? frameForSource(pair, inspection.sourceAt) : undefined),
    [pair, inspection],
  );
  const replayFrame = inspectionReplayFrame ?? replayFrameOverride ?? frame;
  const baseClock = useMemo(
    () => pairedClock(pair, replayFrame),
    [pair, replayFrame],
  );
  const clock = useMemo(
    () => ({
      ...baseClock,
      ...(sourceOverride !== undefined ? { source: sourceOverride } : {}),
      ...(inspection ? { source: inspection.sourceAt } : {}),
    }),
    [baseClock, inspection, sourceOverride],
  );
  const primary = pair.sessions.find((s) => s.role === "primary")!,
    reviewer = pair.sessions.find((s) => s.role === "spotter")!;
  const [manualPolicy, setManualPolicy] =
    useState<MessageBehavior["confirmation_policy"]>();
  const [annotations, setAnnotations] = useState<readonly ComposerAnnotation[]>(
    [],
  );
  useEffect(() => {
    if (frame === 0 && playing) setManualPolicy(undefined);
  }, [frame, playing]);
  const policy = manualPolicy ?? clock.policy;
  const watcherOpen =
    policy === "spotter-ai" &&
    (clock.watcherOpen || manualPolicy === "spotter-ai");
  const progress = reviewerProgress(pair, clock.source);
  const status = progress.state;
  const quarantine =
    primary.quarantine && clock.source >= primary.quarantine.at
      ? primary.quarantine.record
      : undefined;
  const model = primary.session.model as {
    provider_id: string;
    model_id: string;
  };
  const firstPrompt = primary.view.messages
    .find((m) => m.role === "user")!
    .blocks.find((b) => b.type === "text")!.text!;
  const draft =
    replayFrame >= 300 && replayFrame < SPOTTER_PRELUDE.sourceAt
      ? firstPrompt
      : "";
  const repository = useMemo(
    () => new ClioRepository(new PairedAttentionTransport(pair)),
    [pair],
  );
  const entry = {
    id: reviewer.session.id,
    child_session_id: reviewer.session.id,
    session_id: primary.session.id,
    title: "SPOTTER",
    agent_id: (reviewer.session.agent as { id: string }).id,
    state: status,
  } as SubagentRun;
  return (
    <RepositoryOverrideProvider repository={repository}>
      <RecordedSelectionExtras
        sessionId={primary.session.id}
        model={model}
        annotations={annotations}
        setAnnotations={setAnnotations}
      />
      {cinematic && !inspection ? (
        <RecordedSetupPointer frame={replayFrame} />
      ) : null}
      {caption ? <div className="spotter-film-caption">{caption}</div> : null}
      <div
        className="opal-replay"
        onPointerDown={() => setPlaying(false)}
        data-frame={frame}
        data-attention-shot={inspection?.id}
        data-cinematic={cinematic || undefined}
        style={
          { "--attention-shot-spinner": `${frame * 6}deg` } as CSSProperties
        }
        data-source-time={clock.source}
        data-policy={policy}
        data-phase={clock.phase}
        data-watcher-open={watcherOpen}
        data-spotter-received={progress.received}
        data-spotter-consumed={progress.consumed}
        data-spotter-queued={progress.queued}
      >
        <div className="paired-main">
          <div className="paired-context">
            <RecordedSessionContextBar
              session={sessionSchema.parse(
                recordedSessionAt(primary, clock.source),
              )}
              agentLabel="OPAL"
              onOpenAgent={noFile}
              onExplainComposition={noFile}
              readonlyAction={async () => {
                throw new Error("Recorded presentation has no live action");
              }}
            />
          </div>
          <AttentionTranscriptPane
            pair={pair}
            session={primary}
            source={clock.source}
            thinkingOpen={clock.thinkingOpen}
            thinkingMotions={clock.thinkingMotions}
            inspection={inspection}
            inspectionFrame={inspectionFrame ?? frame}
          />
          <div className="paired-composer">
            {quarantine ? (
              <SpotterQuarantineCard
                quarantine={quarantine}
                lifting
                onDiscuss={() =>
                  document
                    .querySelector('[aria-label="SPOTTER conversation"]')
                    ?.scrollTo({ top: 1e8, behavior: "smooth" })
                }
                onLift={noFile}
                compact={cinematic}
              />
            ) : null}
            {!quarantine ? (
              <ControlledComposer
                state="paused"
                attachments={false}
                contextReferences={false}
                provider={model.provider_id}
                model={model.model_id}
                modelOptions={[
                  {
                    providerId: model.provider_id,
                    providerName: model.provider_id,
                    id: model.model_id,
                    label: "Granite 4.2-8B",
                    available: true,
                  },
                ]}
                confirmationPolicy={policy}
                value={draft}
                annotations={annotations}
                onAnnotationsChange={setAnnotations}
                disabled={Boolean(quarantine)}
                onValueChange={() => {}}
                onBehaviorChange={async (behavior) => {
                  setManualPolicy(behavior.confirmation_policy);
                  setPlaying(false);
                }}
                onSubmit={async () => {
                  setFrame(SPOTTER_PRELUDE.sourceAt);
                  setPlaying(true);
                }}
                recordedApprovalMenuOpen={
                  renderMode || playing ? clock.menuOpen : undefined
                }
                variant="docked"
              />
            ) : null}
          </div>
        </div>
        {watcherOpen ? (
          <div className="paired-canvas">
            <RecordedWorkbench
              workspaceId={primary.session.workspace_id}
              sessionId={primary.session.id}
              presentation={{
                tabs: [
                  {
                    id: "spotter",
                    kind: "subagent",
                    label: "SPOTTER",
                    subagent: entry,
                    workspaceId: primary.session.workspace_id,
                  },
                ],
                activeTabId: "spotter",
                content: (
                  <div className="paired-reviewer">
                    <header className="paired-reviewer-header">
                      <BotIcon className="size-4 text-primary" />
                      <div>
                        <strong>SPOTTER</strong>{" "}
                        {status !== "paused" ? (
                          <ClioStatus value={status} />
                        ) : null}
                        <p>
                          {status === "running"
                            ? "Reviewing this session"
                            : "Watching this session"}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" disabled>
                        <ArrowUpLeftIcon />
                        Make central
                      </Button>
                    </header>
                    <TranscriptPane
                      pair={pair}
                      session={reviewer}
                      source={clock.source}
                      thinkingOpen={false}
                      thinkingMotions={clock.reviewerThinkingMotions}
                      notificationMotions={clock.notificationMotions}
                    />
                  </div>
                ),
              }}
            />
          </div>
        ) : null}
      </div>
      <ClioSelectionActionToolbar />
    </RepositoryOverrideProvider>
  );
}

/** Native paired replay: one source clock, real approval controls, and exact captured attention lookups. */
export function SpotterReplayApp() {
  const query = new URLSearchParams(location.search),
    renderMode = query.get("render") === "1";
  const cinematic = query.get("spotterFilm") === "1";
  const [pair, setPair] = useState<PairedReplay>(),
    [error, setError] = useState("");
  const [frame, setFrame] = useState(Number(query.get("frame") ?? 0)),
    [playing, setPlaying] = useState(false);
  const pending = useRef<{ frame: number; nonce: number } | null>(null);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    void fetch(sceneAssetPath(query.get("pair") ?? "opal-spotter.native.json"))
      .then(async (r) => {
        if (!r.ok) throw new Error(`Paired replay unavailable: ${r.status}`);
        const data: PairedReplay = await r.json();
        const captureFile = query.get("attention");
        if (captureFile) {
          const capture = await fetch(sceneAssetPath(captureFile));
          if (!capture.ok)
            throw new Error(`Attention capture unavailable: ${capture.status}`);
          data.attention = await capture.json();
        }
        validatePairedReplay(data);
        setPair(cinematic ? filmPair(data) : data);
      })
      .catch((e) => setError(String(e)));
  }, []);
  const timeline = useMemo(
    () => (pair ? buildPairedTimeline(pair) : undefined),
    [pair],
  );
  const filmPose = useMemo(
    () => (pair && cinematic ? spotterFilmAt(pair, frame) : undefined),
    [pair, cinematic, frame],
  );
  const inspectionId = filmPose?.inspectionId ?? query.get("attentionShot");
  const inspection = useMemo(
    () =>
      pair && inspectionId
        ? resolveAttentionInspection(pair, inspectionId)
        : undefined,
    [pair, inspectionId],
  );
  const duration =
    pair && cinematic
      ? buildSpotterFilmPlan(pair).frames
      : (inspection?.frames ?? timeline?.frames ?? 3600);
  const inspectionReplayFrame = useMemo(
    () =>
      pair && inspection
        ? frameForSource(pair, inspection.sourceAt)
        : undefined,
    [pair, inspection],
  );
  useEffect(() => {
    if (!playing) return;
    const start = performance.now(),
      initial = frame;
    let id = 0;
    const tick = () => {
      const next = Math.min(
        duration - 1,
        initial + Math.floor(((performance.now() - start) * 60) / 1000),
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
      pending.current = event.data;
      setFrame(event.data.frame);
      setNonce(event.data.nonce);
    };
    window.addEventListener("message", receive);
    window.parent.postMessage({ kind: "clio-film-boot" }, "*");
    return () => window.removeEventListener("message", receive);
  }, [renderMode]);
  useLayoutEffect(() => {
    if (!pair || !renderMode || !pending.current) return;
    let active = true;
    void (async () => {
      await document.fonts.ready;
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      );
      for (
        let attempt = 0;
        document.querySelector("[data-replay-markdown-pending]");
        attempt++
      ) {
        if (attempt >= 120)
          throw new Error("Native Markdown did not finish painting");
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
      }
      if (inspection)
        for (let attempt = 0; ; attempt++) {
          const controller = document.querySelector(
            '[data-slot="attention-inspection-controller"]',
          );
          const failure = controller?.getAttribute("data-error");
          if (failure) throw new Error(failure);
          if (
            controller?.getAttribute("data-ready") === "true" &&
            controller.getAttribute("data-frame") ===
              String(filmPose?.inspectionFrame ?? frame)
          )
            break;
          if (attempt >= 180)
            throw new Error("Native attention inspection has not painted");
          await new Promise<void>((r) => requestAnimationFrame(() => r()));
        }
      if (!active) return;
      const clock = pairedClock(
        pair,
        inspectionReplayFrame ?? filmPose?.replayFrame ?? frame,
      );
      if (
        clock.menuOpen &&
        document.querySelectorAll('[role="menuitemradio"]').length !== 5
      )
        throw new Error("Full confirmation policy menu has not painted");
      window.parent.postMessage({ kind: "clio-film-ready", frame, nonce }, "*");
    })().catch((e) =>
      window.parent.postMessage(
        { kind: "clio-film-error", message: String(e) },
        "*",
      ),
    );
    return () => {
      active = false;
    };
  }, [
    pair,
    frame,
    nonce,
    renderMode,
    inspection,
    filmPose,
    inspectionReplayFrame,
  ]);
  if (error) return <p role="alert">{error}</p>;
  if (!pair) return <p>Loading recorded OPAL and SPOTTER…</p>;
  return (
    <NativeProviders>
      <SelectionActionsProvider>
        {!renderMode ? (
          <div className="paired-review-controls">
            <button
              onClick={() => {
                setFrame(0);
                setPlaying(true);
              }}
            >
              {cinematic
                ? "Play film"
                : inspection
                  ? "Play inspection"
                  : "Play setup"}
            </button>
            <button onClick={() => setPlaying(!playing)}>
              {playing ? "Pause" : "Play"}
            </button>
            <input
              aria-label="Replay frame"
              type="range"
              min="0"
              max={duration - 1}
              value={frame}
              onChange={(e) => {
                setPlaying(false);
                setFrame(Number(e.target.value));
              }}
            />
            {!inspection ? (
              <>
                <button
                  onClick={() => {
                    setPlaying(false);
                    setFrame(
                      Math.round((timeline!.begin + timeline!.complete) / 2),
                    );
                  }}
                >
                  Thinking
                </button>
                <button
                  onClick={() => {
                    setPlaying(false);
                    setFrame(
                      Math.floor((timeline!.complete + timeline!.holdEnd) / 2),
                    );
                  }}
                >
                  Thinking hold
                </button>
                <button
                  onClick={() => {
                    setPlaying(false);
                    setFrame(duration - 1);
                  }}
                >
                  Full transcript
                </button>
                <select
                  aria-label="Spotter wake"
                  defaultValue=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setPlaying(false);
                    setFrame(frameForSource(pair, Number(e.target.value)));
                  }}
                >
                  <option value="">Inspect synchronization…</option>
                  {pair.wakes.map((wake, index) => (
                    <option key={wake.id} value={wake.at}>
                      Answer {index + 1} → Spotter wake
                    </option>
                  ))}
                </select>
              </>
            ) : null}
            <span>{(frame / 60).toFixed(1)}s</span>
          </div>
        ) : null}
        <SpotterStage
          pair={pair}
          frame={frame}
          setFrame={setFrame}
          playing={playing}
          setPlaying={setPlaying}
          renderMode={renderMode}
          inspection={inspection}
          inspectionFrame={filmPose?.inspectionFrame}
          replayFrameOverride={filmPose?.replayFrame}
          sourceOverride={filmPose?.source}
          cinematic={cinematic}
          caption={filmPose?.caption}
        />
      </SelectionActionsProvider>
    </NativeProviders>
  );
}
