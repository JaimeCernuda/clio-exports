import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  messageSchema,
  sessionSchema,
  toolInvocationSchema,
  a2uiSurfaceSchema,
  ndpDatasetSchema,
  artifactSchema,
  type MessageBlock,
} from "@clio/core/v3";
import { ArchiveConversation } from "@clio-ui/lib/session-export/archive-conversation";
import { conversationTurnPresentation } from "@clio-ui/components/clio/conversation-turn-model";
import { TranscriptDisclosureContext } from "@clio-ui/components/clio/transcript-disclosure-context";
import { ClioComposer } from "@clio-ui/components/clio/composer";
import { ClioA2UISurface } from "@clio-ui/components/clio/a2ui-surface";
import { BrandIcon } from "@clio-ui/components/clio/brand-icon";
import { DesktopWorkspaceToolbar } from "@clio-ui/components/clio/desktop-workspace-toolbar";
import type { WorkbenchTab } from "@clio-ui/components/clio/workbench-shared";
import { RecordedWorkbench } from "./recorded-workbench";
import { RecordedChartLayout } from "./recorded-chart-layout";
import {
  buildPresentation,
  presentationAt,
  type FocusBeat,
} from "./presentation-plan";
import { NDPDatasetRow } from "@clio-ui/components/clio/ndp-dataset-row";
import { ClioToolInvocation } from "@clio-ui/components/clio/tool-invocation";
import { RecordedSessionContextBar } from "./recorded-context-bar";
import type { NativeScene } from "./workspace";
import {
  buildReplayPlan,
  replayAt,
  replayText,
  type ReplayEdits,
} from "./replay-plan";
import { ease } from "./film-plan";
import "./conversation-replay.css";
import { MousePointer2Icon } from "lucide-react";
import { useReplayInteraction } from "./replay-interaction";
import { replayMarkdown } from "./replay-markdown";
import {
  layoutKey,
  validateLayout,
  surfaceScrollOffset,
  type ReplayLayoutTrack,
} from "./replay-layout";

const readonly = (): never => {
  throw new Error("The recorded conversation is read-only");
};
const readonlyAsync = async (): Promise<never> => readonly();
// Frozen saved views need not rebuild their chart trees for every typed character.
const RecordedSurface = memo(ClioA2UISurface);

import type { ReplayWorkbench } from "./replay-config";
export type { ReplayWorkbench } from "./replay-config";

function surfaceKind(
  surface: ReturnType<typeof a2uiSurfaceSchema.parse>,
): string {
  const components = surface.messages.flatMap((value) => {
    const update = (
      value as {
        updateComponents?: { components?: Array<{ component?: string }> };
      }
    ).updateComponents;
    return update?.components ?? [];
  });
  if (components.some((value) => value.component === "clio.map.v1"))
    return "map";
  if (components.some((value) => value.component === "clio.chart.v1"))
    return "chart";
  return components.some((value) => value.component === "Image")
    ? "image"
    : "other";
}

/** Grow one actual CLIO conversation; preserve its native activity and text boundaries. */
export function NativeConversationReplay({
  scene,
  frame: presentationFrame,
  frames,
  turns,
  portrait = false,
  edits,
  workbench,
  focuses = [],
  layoutTrack,
}: {
  scene: NativeScene;
  frame: number;
  frames: number;
  turns: number;
  portrait?: boolean;
  edits?: ReplayEdits;
  workbench?: ReplayWorkbench;
  focuses?: readonly FocusBeat[];
  layoutTrack?: ReplayLayoutTrack;
}) {
  const source = useMemo(() => {
    const messages = scene.view.messages.map((value) =>
      messageSchema.parse(value),
    );
    const tools = scene.view.tools.map((value) =>
      toolInvocationSchema.parse(value),
    );
    const surfaces = scene.snapshot.sessions[scene.session.id].map((value) =>
      a2uiSurfaceSchema.parse(value),
    );
    const session = sessionSchema.parse({
      ...scene.session,
      state: scene.session.status,
      provider_id: scene.session.model.provider_id,
      model_id: scene.session.model.model_id,
      agent_id: scene.session.agent.id,
    });
    return {
      messages,
      tools,
      surfaces,
      session,
      artifacts: scene.view.artifacts.map((value) =>
        artifactSchema.parse(value),
      ),
    };
  }, [scene]);
  const plan = useMemo(
    () => buildReplayPlan(source.messages, frames, turns, edits),
    [source, frames, turns, edits],
  );
  const presentation = useMemo(
    () => buildPresentation(plan, focuses),
    [plan, focuses],
  );
  const transport = presentationAt(presentation, presentationFrame);
  const frame = transport.sourceFrame;
  const measuredKey = layoutKey(
    `${scene.session.id}:${scene.source.sha256}`,
    frames,
    turns,
    portrait,
    edits,
  );
  useMemo(() => {
    if (layoutTrack) validateLayout(layoutTrack, measuredKey, frames);
  }, [layoutTrack, measuredKey, frames]);
  const position = replayAt(plan, frame);
  const completed = position.visible.filter(
    (event) => event !== position.event || position.progress === 1,
  );
  const found = workbench?.searchCall
    ? completed.some((event) => event.toolId === workbench.searchCall)
    : position.visible.some(
        (event) => event.surfaceId === workbench?.tabs[0]?.surfaceId,
      );
  const availableTabs =
    workbench?.tabs.filter((tab) =>
      position.visible.some((event) => event.surfaceId === tab.surfaceId),
    ) ?? [];
  const latestTab = availableTabs.at(-1)?.surfaceId;
  const latestSurfaceEvent = plan.events.find(
    (event) => event.surfaceId === latestTab,
  );
  const tabAge = latestSurfaceEvent ? frame - latestSurfaceEvent.start : 1000;
  const activeTab =
    latestTab && tabAge >= 12
      ? latestTab
      : (availableTabs.at(-2)?.surfaceId ?? "resources");
  const paneContentOpacity =
    latestTab && tabAge < 28
      ? tabAge < 12
        ? 1 - ease(tabAge, 0, 12)
        : ease(tabAge, 12, 28)
      : 1;
  const paneVisible = Boolean(workbench && found && !portrait);
  const searchEvent = plan.events.find(
    (event) => event.toolId === workbench?.searchCall,
  );
  const downloadEvent = plan.events.find(
    (event) => event.toolId === workbench?.downloadCall,
  );
  const zoom = portrait ? 1 : transport.zoom;
  const dataset = useMemo(() => {
    if (!workbench?.searchCall) return undefined;
    const result = source.tools.find((tool) => tool.id === workbench.searchCall)
      ?.output as { datasets?: unknown[] } | undefined;
    return result?.datasets
      ?.map((value) => ndpDatasetSchema.parse(value))
      .find((value) => value.id === workbench.datasetId);
  }, [source, workbench]);
  const connected = position.visible.some(
    (event) => event.toolId === workbench?.connectCall,
  );
  const connect = source.tools.find(
    (tool) => tool.id === workbench?.connectCall,
  );
  const selected =
    (
      connect?.input as
        | { configuration?: { resource_ids?: string[] } }
        | undefined
    )?.configuration?.resource_ids ?? [];
  const selectedResources =
    connected || transport.completedActions.includes("resources")
      ? selected
      : transport.focus?.action === "resources"
        ? selected.slice(
            0,
            Math.max(
              0,
              Math.min(
                3,
                Math.floor(
                  (transport.age - (transport.focus?.canvas ? 198 : 130)) / 34,
                ) + 1,
              ),
            ),
          )
        : [];
  const canvasTabs: WorkbenchTab[] = [
    ...(workbench?.searchCall
      ? [
          {
            id: "resources" as const,
            kind: "resources" as const,
            label: "Resources" as const,
          },
        ]
      : []),
    ...availableTabs.map((tab) => {
      const artifact = source.artifacts.find(
        (value) => value.id === tab.artifactId,
      );
      if (!artifact)
        throw new Error(`Missing captured artifact for ${tab.surfaceId}`);
      return {
        id: tab.surfaceId,
        kind: "artifact" as const,
        label: tab.label,
        artifact,
        workspaceId: scene.session.workspace_id,
      };
    }),
  ];
  const projection = useMemo(() => {
    const visible = new Map(
      position.visible.map((event) => [event.blockId, event]),
    );
    const current = position.event;
    const messages = source.messages.flatMap((message) => {
      const blocks = message.blocks.flatMap<MessageBlock>((block) => {
        const event = visible.get(block.id);
        if (!event) return [];
        if (event.role === "user" && event === current && position.progress < 1)
          return [];
        if (block.type === "text") {
          return [
            {
              ...block,
              text: replayMarkdown(replayText(event, frame)),
              streaming: false,
            },
          ];
        }
        return [block];
      });
      return blocks.length ? [{ ...message, blocks }] : [];
    });
    const tools = source.tools.map((tool) =>
      tool.id === current.toolId && position.progress < 1
        ? {
            ...tool,
            state: "running" as const,
            output: undefined,
            presentation: undefined,
            duration_ms: undefined,
            completed_at: undefined,
            started_at: undefined,
          }
        : tool,
    );
    const toolIndex = Object.fromEntries(tools.map((tool) => [tool.id, tool]));
    const choices = new Map<string, boolean>();
    let closingId: string | undefined;
    const previous = plan.events[position.index - 1];
    const closing =
      previous &&
      ["tool", "reasoning"].includes(previous.type) &&
      !["tool", "reasoning"].includes(current.type) &&
      frame - current.start < 36;
    for (const message of messages) {
      if (message.role !== "assistant") continue;
      const presentation = conversationTurnPresentation(message, toolIndex);
      for (const segment of presentation.segments) {
        if (segment.kind !== "iterations") continue;
        const groups: (typeof presentation.iterations)[] = [];
        for (const iteration of segment.iterations) {
          if (iteration.nextThoughts.length || !groups.length)
            groups.push([iteration]);
          else groups[groups.length - 1].push(iteration);
        }
        for (const group of groups) {
          const containsCurrent = group.some(
            (iteration) =>
              iteration.activity.some((entry) => entry.id === current.toolId) ||
              iteration.thinking.some((entry) => entry.id === current.blockId),
          );
          choices.set(
            `activity:${group[0].id}`,
            ["tool", "reasoning"].includes(current.type) && containsCurrent,
          );
          if (
            closing &&
            group.some(
              (iteration) =>
                iteration.activity.some(
                  (entry) => entry.id === previous.toolId,
                ) ||
                iteration.thinking.some(
                  (entry) => entry.id === previous.blockId,
                ),
            )
          ) {
            choices.set(`activity:${group[0].id}`, true);
            closingId = group[0].id;
          }
        }
      }
    }
    const input =
      current.role === "user" && position.progress < 1
        ? (current.text ?? "").slice(
            0,
            Math.floor((current.text?.length ?? 0) * position.progress),
          )
        : "";
    return {
      view: { ...scene.view, messages, tools },
      choices,
      input,
      closingId,
    };
  }, [scene, source, position.index, position.progress]);
  const scroll = useRef<HTMLDivElement>(null);
  const canvasScroll = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const cursor = useReplayInteraction(root, transport, "part_89ec467ab0e8");
  const [resourceOverride, setResourceOverride] = useState<string[] | null>(
    null,
  );
  useLayoutEffect(() => {
    const layout = () => {
      const host = scroll.current;
      if (!host) return;
      const log = host.querySelector<HTMLElement>(".replay-log")!;
      const previousOffset = Number(host.dataset.scrollOffset ?? 0);
      const age = frame - position.event.start;
      for (const icon of host.querySelectorAll<SVGElement>(
        "[data-replay-activity] button[aria-expanded] > svg:last-child",
      )) {
        icon.style.transform = "";
        icon.style.rotate = "";
      }
      for (const body of host.querySelectorAll<HTMLElement>(
        '[data-slot="transcript-activity-timeline"]',
      )) {
        body.style.maxHeight = "";
        body.style.overflow = "";
        body.style.opacity = "";
        body.style.marginTop = "";
      }
      if (projection.closingId) {
        const body = host.querySelector<HTMLElement>(
          `[data-replay-activity="${projection.closingId}"] [data-slot="transcript-activity-timeline"]`,
        );
        if (body) {
          const fraction = 1 - ease(age, 0, 36);
          body.style.maxHeight = `${body.scrollHeight * fraction}px`;
          body.style.overflow = "hidden";
          body.style.opacity = String(fraction);
          body.style.marginTop = `${4 * fraction}px`;
          const icon = body.parentElement?.querySelector<SVGElement>(
            "button[aria-expanded] > svg:last-child",
          );
          if (icon) {
            icon.style.rotate = "0deg";
            icon.style.transform = `rotate(${180 * fraction}deg)`;
          }
        }
      }
      const rows = host.querySelectorAll<HTMLElement>(
        '[data-slot="tool-activity"]',
      );
      const last = rows[rows.length - 1];
      rows.forEach((row) => {
        row.style.maxHeight = "";
        row.style.overflow = "";
        row.style.opacity = "";
      });
      if (last && position.event.type === "tool") {
        last.style.maxHeight = "";
        const height =
          last.getBoundingClientRect().height /
          (host.getBoundingClientRect().width / host.clientWidth);
        const entering = ease(
          age,
          0,
          Math.min(12, position.event.end - position.event.start),
        );
        last.style.maxHeight = `${height * entering}px`;
        last.style.overflow = "hidden";
        last.style.opacity = String(entering);
      }
      const surfaces = host.querySelectorAll<HTMLElement>(
        "[data-a2ui-viewport]",
      );
      const surface = surfaces[surfaces.length - 1];
      surfaces.forEach((element) => {
        element.style.maxHeight = "";
        element.style.opacity = "";
        element.style.overflow = "";
      });
      if (position.event.type === "a2ui" && surface) {
        surface.style.maxHeight = `${surface.scrollHeight * ease(age, 0, 36)}px`;
        surface.style.overflow = "hidden";
        surface.style.opacity = String(ease(age, 0, 20));
      }
      for (const message of host.querySelectorAll<HTMLElement>(
        "[data-message-id]",
      )) {
        message.style.maxHeight = "";
        message.style.opacity = "";
        message.style.overflow = "";
      }
      const userEvent = plan.events.find(
        (event) =>
          event.role === "user" && event.messageId === position.event.messageId,
      );
      if (userEvent) {
        const bubble = host.querySelector<HTMLElement>(
          `#message-${userEvent.messageId}`,
        );
        if (bubble) {
          const fraction = ease(
            frame,
            userEvent.revealEnd,
            userEvent.revealEnd + 24,
          );
          bubble.style.maxHeight = `${bubble.scrollHeight * fraction}px`;
          bubble.style.opacity = String(fraction);
          bubble.style.overflow = "hidden";
        }
      }
      const bottom = Math.max(0, log.offsetHeight - host.clientHeight);
      let offset = bottom;
      if (position.event.type === "a2ui" && surface) {
        const ratio = host.getBoundingClientRect().width / host.clientWidth;
        const top =
          (surface.getBoundingClientRect().top -
            host.getBoundingClientRect().top) /
            ratio +
          previousOffset;
        const start = Math.max(0, Math.min(bottom, top - 30));
        offset =
          start +
          (bottom - start) *
            ease(age, 35, position.event.end - position.event.start - 25);
      }
      // Frame capture must not depend on Chromium's asynchronous scroll layer.
      // The complete native log stays in normal layout; only its viewport moves.
      host.scrollTop = 0;
      host.dataset.targetOffset = String(offset);
      offset = layoutTrack?.scroll[frame] ?? offset;
      host.dataset.scrollOffset = String(offset);
      log.style.transform = `translateY(${-offset}px)`;
      const canvas =
        root.current?.querySelector<HTMLElement>(
          '.replay-canvas [role="tabpanel"][data-state="active"] .replay-canvas-scroll',
        ) ?? canvasScroll.current;
      const canvasContent = canvas?.querySelector<HTMLElement>(
        ".replay-canvas-content",
      );
      if (canvas && canvasContent) {
        const surfaceEvent = plan.events.find(
          (event) => event.surfaceId === activeTab,
        );
        const surfaceAge = surfaceEvent ? frame - surfaceEvent.start : 0;
        const maxOffset = Math.max(
          0,
          canvasContent.offsetHeight - canvas.clientHeight,
        );
        canvas.dataset.scrollTrace = JSON.stringify({
          activeTab,
          sourceFrame: frame,
          surfaceAge,
          maxOffset,
        });
        const nextOffset =
          activeTab === "resources" &&
          downloadEvent &&
          frame >= downloadEvent.start
            ? maxOffset *
              ease(frame, downloadEvent.start, downloadEvent.end + 30)
            : surfaceEvent
              ? surfaceScrollOffset(
                  maxOffset,
                  surfaceEvent.start,
                  surfaceEvent.end,
                  frame,
                )
              : 0;
        // Opening the canvas changes its real layout. Return to the same source
        // viewport only after the inspection; the conversation clock stays held.
        const inspectOffset = Math.min(maxOffset, transport.canvasScroll);
        const shownOffset =
          nextOffset + (inspectOffset - nextOffset) * transport.canvasExpansion;
        canvas.scrollTop = 0;
        canvas.dataset.scrollOffset = String(shownOffset);
        canvasContent.style.transform = `translateY(${-shownOffset}px)`;
      }
    };
    layout();
    window.addEventListener("clio-replay-layout", layout);
    return () => window.removeEventListener("clio-replay-layout", layout);
  }, [frame, projection, presentationFrame, layoutTrack]);
  const menuCursor = Boolean(
    transport.focus?.download &&
      transport.age >= transport.focus.download.open - 24,
  );
  const rootBounds = root.current?.getBoundingClientRect();
  const cursorRatio =
    rootBounds && root.current
      ? rootBounds.width / root.current.offsetWidth
      : 1;
  const cursorGraphic = cursor ? (
    <div
      className="replay-cursor"
      data-cursor-pulse={cursor.pulse}
      style={
        menuCursor
          ? {
              position: "fixed",
              left: (rootBounds?.x ?? 0) + cursor.x * cursorRatio,
              top: (rootBounds?.y ?? 0) + cursor.y * cursorRatio,
              zIndex: 1000,
              visibility:
                new URLSearchParams(location.search).get("cursor") === "record"
                  ? "hidden"
                  : undefined,
              transform: `scale(${cursorRatio})`,
              transformOrigin: "0 0",
            }
          : {
              left: cursor.x,
              top: cursor.y,
              visibility:
                new URLSearchParams(location.search).get("cursor") === "record"
                  ? "hidden"
                  : undefined,
            }
      }
    >
      {cursor.pulse > 0 && (
        <span
          style={{
            opacity: cursor.pulse,
            transform: `translate(-50%,-50%) scale(${1 + (1 - cursor.pulse) * 2})`,
          }}
        />
      )}
      <MousePointer2Icon
        size={21}
        fill="white"
        stroke="#123245"
        strokeWidth={1.5}
      />
    </div>
  ) : null;
  return (
    <div
      className={`replay-window ${portrait ? "replay-portrait" : ""} ${workbench && !portrait ? "replay-with-canvas" : ""}`}
      style={{
        transform: `scale(${zoom})`,
        transformOrigin: transport.focus?.cameraOrigin ?? "100% 0",
      }}
      ref={root}
      data-replay-zoom={zoom}
      data-layout-key={measuredKey}
      data-focus={transport.focus?.action ?? "none"}
      data-source-frame={frame}
      data-focus-age={transport.age}
      data-canvas-expansion={transport.canvasExpansion}
      data-focus-surface={transport.focus?.surfaceId}
      data-expected-dom-target={
        transport.selectedLabels.length
          ? transport.observation?.selector
          : undefined
      }
      data-expected-chart-selection={
        transport.focus?.observations?.some((o) => o.select)
          ? transport.selectedLabels.length
          : undefined
      }
      data-expected-chart-zoom={
        transport.focus?.chartZoom
          ? transport.chartZoom === "selected"
          : undefined
      }
      data-expected-controls={
        transport.controls.length
          ? JSON.stringify(transport.controls)
          : undefined
      }
      data-expected-download={
        transport.focus?.download ? transport.downloadPhase : undefined
      }
      data-surface-kinds={JSON.stringify(
        Object.fromEntries(
          source.surfaces.map((surface) => [surface.id, surfaceKind(surface)]),
        ),
      )}
      data-surface-components={JSON.stringify(
        Object.fromEntries(
          source.surfaces.map((surface) => [
            surface.id,
            surface.messages.flatMap(
              (message) =>
                (
                  message as {
                    updateComponents?: {
                      components?: Array<{ component?: string }>;
                    };
                  }
                ).updateComponents?.components?.map(
                  (component) => component.component,
                ) ?? [],
            ),
          ]),
        ),
      )}
    >
      <div className="replay-header">
        <DesktopWorkspaceToolbar navigation={<BrandIcon className="size-4" />}>
          <RecordedSessionContextBar
            session={source.session}
            agentLabel={scene.session.agent.id}
            onOpenAgent={readonly}
            onExplainComposition={readonly}
            readonlyAction={readonlyAsync}
          />
        </DesktopWorkspaceToolbar>
      </div>
      {workbench && !portrait && (
        <aside
          className="replay-canvas"
          style={{
            width: 540 + 660 * transport.canvasExpansion,
            zIndex: transport.canvasExpansion > 0 ? 40 : undefined,
            opacity: paneVisible
              ? ease(
                  frame,
                  searchEvent?.revealEnd ?? latestSurfaceEvent?.start ?? 0,
                  (searchEvent?.revealEnd ?? latestSurfaceEvent?.start ?? 0) +
                    12,
                )
              : 0,
          }}
        >
          <RecordedWorkbench
            workspaceId={scene.session.workspace_id}
            sessionId={scene.session.id}
            presentation={{
              tabs: canvasTabs,
              activeTabId: activeTab,
              maximized: transport.canvasMaximized,
              content: (
                <div className="replay-canvas-scroll" ref={canvasScroll}>
                  <div
                    className="replay-canvas-content"
                    style={{ opacity: paneContentOpacity }}
                  >
                    <div
                      className="replay-dataset"
                      style={{
                        display: activeTab === "resources" ? "block" : "none",
                      }}
                    >
                      {dataset && (
                        <NDPDatasetRow
                          dataset={dataset}
                          selected={resourceOverride ?? selectedResources}
                          disabled={false}
                          onChange={(id, checked) =>
                            setResourceOverride(
                              checked
                                ? [
                                    ...(resourceOverride ?? selectedResources),
                                    id,
                                  ]
                                : (
                                    resourceOverride ?? selectedResources
                                  ).filter((value) => value !== id),
                            )
                          }
                          defaultOpen
                        />
                      )}
                      {[workbench.connectCall, workbench.downloadCall]
                        .filter((id): id is string => Boolean(id))
                        .filter((id) =>
                          completed.some((event) => event.toolId === id),
                        )
                        .map((id) => (
                          <ClioToolInvocation
                            key={id}
                            tool={source.tools.find((tool) => tool.id === id)}
                            sessionId={scene.session.id}
                            compact
                          />
                        ))}
                    </div>
                    {source.surfaces
                      .filter((surface) =>
                        workbench.tabs.some(
                          (tab) => tab.surfaceId === surface.id,
                        ),
                      )
                      .map((surface) => (
                        <div
                          key={surface.id}
                          className="replay-canvas-surface"
                          data-canvas-surface={surface.id}
                          style={{
                            visibility:
                              activeTab === surface.id ? "visible" : "hidden",
                            position:
                              activeTab === surface.id
                                ? "relative"
                                : "absolute",
                            opacity:
                              position.event.surfaceId === surface.id
                                ? ease(frame - position.event.start, 0, 20)
                                : 1,
                          }}
                        >
                          <RecordedChartLayout
                            heights={Object.fromEntries(
                              Object.entries(
                                transport.focus?.surfaceId === surface.id
                                  ? (transport.focus.chartHeights ?? {})
                                  : {},
                              ).map(([id, size]) => [
                                id,
                                size.from +
                                  (size.to - size.from) *
                                    transport.canvasExpansion,
                              ]),
                            )}
                          >
                            <RecordedSurface surface={surface} readOnly />
                          </RecordedChartLayout>
                        </div>
                      ))}
                  </div>
                </div>
              ),
            }}
          />
        </aside>
      )}
      <div
        className="replay-scroll"
        ref={scroll}
        data-replay-block={position.event.blockId}
        data-replay-progress={position.progress}
        data-expected-offset={layoutTrack?.scroll[frame]}
        data-text-expectations={JSON.stringify(
          position.visible
            .filter(
              (event) => event.type === "text" && event.role === "assistant",
            )
            .map((event) => ({
              id: event.blockId,
              text: replayText(event, frame),
            })),
        )}
        data-replay-surfaces={
          position.visible.filter((event) => event.type === "a2ui").length
        }
      >
        <div className="replay-log">
          <TranscriptDisclosureContext.Provider
            value={{
              sessionId: scene.session.id,
              choices: projection.choices,
              setOpen: readonly,
            }}
          >
            <ArchiveConversation
              sessionId={scene.session.id}
              view={projection.view}
              snapshot={scene.snapshot}
              onOpenArtifact={readonly}
              onOpenFile={readonly}
            />
          </TranscriptDisclosureContext.Provider>
        </div>
      </div>
      <div className="replay-composer">
        <ClioComposer
          value={projection.input}
          onValueChange={readonly}
          onSubmit={readonlyAsync}
          state={source.session.state}
          confirmationPolicy="bypass"
          attachments={false}
          contextReferences={false}
          provider={scene.session.model.provider_id}
          model={scene.session.model.model_id}
          modelOptions={[
            {
              providerId: scene.session.model.provider_id,
              providerName: scene.session.model.provider_id,
              id: scene.session.model.model_id,
              label: scene.session.model.model_id,
              available: true,
            },
          ]}
          variant="docked"
        />
      </div>
      <div className="replay-preload" aria-hidden="true">
        {source.surfaces.map((surface) => (
          <div key={surface.id} data-replay-surface-kind={surfaceKind(surface)}>
            <RecordedSurface surface={surface} readOnly />
          </div>
        ))}
      </div>
      {menuCursor ? createPortal(cursorGraphic, document.body) : cursorGraphic}
    </div>
  );
}
