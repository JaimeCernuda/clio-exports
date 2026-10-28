import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  a2uiSurfaceSchema,
  messageSchema,
  ndpDatasetSchema,
  sessionSchema,
  toolInvocationSchema,
  type A2UISurface,
  type ToolPresentationBlock,
} from "@clio/core/v3";
import { BrandIcon } from "@clio-ui/components/clio/brand-icon";
import { ClioComposer } from "@clio-ui/components/clio/composer";
import { ClioToolInvocation } from "@clio-ui/components/clio/tool-invocation";
import { ToolTerminalResult } from "@clio-ui/components/clio/tool-terminal-result";
import { ToolResultPresentation } from "@clio-ui/components/clio/tool-result-presentation";
import { NDPDatasetRow } from "@clio-ui/components/clio/ndp-dataset-row";
import { ClioA2UISurface } from "@clio-ui/components/clio/a2ui-surface";
import { TranscriptDisclosureContext } from "@clio-ui/components/clio/transcript-disclosure-context";
import { ArchiveConversation } from "@clio-ui/lib/session-export/archive-conversation";
import { DesktopWorkspaceToolbar } from "@clio-ui/components/clio/desktop-workspace-toolbar";
import { Button } from "@clio-ui/components/ui/button";
import {
  BotIcon,
  FolderGit2Icon,
  PanelLeftIcon,
  SearchIcon,
} from "lucide-react";
import { RecordedSessionContextBar } from "./recorded-context-bar";
import type { NativeScene } from "./workspace";
import {
  ease,
  filmInput,
  filmPose,
  filmStage,
  sourceExcerpt,
} from "./film-plan";
import story from "./film-story.json";

const readonly = (): never => {
  throw new Error("Recorded film controls are read-only");
};
const readonlyAsync = async (): Promise<never> => readonly();
type Message = ReturnType<typeof messageSchema.parse>;
type Fragment = {
  message: string;
  part: string;
  from?: string;
  until?: string;
};

function taskDescription(input: unknown): string {
  if (!input || typeof input !== "object") return "";
  const value = (input as Record<string, unknown>)._clio_task_description;
  return typeof value === "string" ? value : "";
}

/** Select the native chart, preserving every recorded row and encoding. */
function chartOnly(surface: A2UISurface): A2UISurface {
  const copy = structuredClone(surface);
  for (const message of copy.messages as Array<Record<string, unknown>>) {
    const update = message.updateComponents as
      | { components?: Array<Record<string, unknown>> }
      | undefined;
    for (const component of update?.components ?? []) {
      if (component.id === "root") component.children = ["length"];
      if (component.id === "length") {
        component.height = 340;
        (component.spec as Record<string, unknown>).height = 340;
      }
    }
  }
  return copy;
}

/** Source-bound transcript, native tool results and generated views form one investigation. */
export function NativeNarrativeMovie({
  scene,
  frame,
  portrait = false,
  fragmentOverrides,
}: {
  scene: NativeScene;
  frame: number;
  portrait?: boolean;
  fragmentOverrides?: Readonly<
    Record<string, { from?: string; until?: string }>
  >;
}) {
  const stage = filmStage(frame),
    pose = filmPose(frame),
    age = frame - stage.start;
  const evidence = useMemo(() => {
    const messages = scene.view.messages.map((value) =>
      messageSchema.parse(value),
    );
    const tools = new Map(
      scene.view.tools.map((value) => {
        const tool = toolInvocationSchema.parse(value);
        return [tool.id, tool];
      }),
    );
    const surfaces = new Map(
      scene.snapshot.sessions[scene.session.id].map((value) => {
        const surface = a2uiSurfaceSchema.parse(value);
        return [surface.id, surface];
      }),
    );
    const fragments = new Map<string, Message>();
    for (const [key, selection] of Object.entries(story.fragments) as Array<
      [string, Fragment]
    >) {
      const message = messages.find((value) => value.id === selection.message);
      const block = message?.blocks.find(
        (value) => value.id === selection.part,
      );
      if (
        !message ||
        !block ||
        (block.type !== "text" && block.type !== "reasoning")
      )
        throw new Error(`Missing source passage ${key}`);
      const excerpt = { ...selection, ...fragmentOverrides?.[key] };
      fragments.set(key, {
        ...message,
        blocks: [
          {
            ...block,
            text: sourceExcerpt(block.text, excerpt.from, excerpt.until),
          },
        ],
      });
    }
    const area = fragments.get("area")!;
    fragments.set("areaBrief", {
      ...area,
      blocks: area.blocks.map((block) =>
        block.type === "text"
          ? { ...block, text: block.text.split("\n\n")[0] }
          : block,
      ),
    });
    const questions = story.questionIds.map((id) => {
      const message = messages.find((value) => value.id === id);
      if (!message) throw new Error(`Missing question ${id}`);
      return message;
    });
    const views = new Map<string, NativeScene["view"]>();
    for (const [key, message] of [
      ...fragments.entries(),
      ...questions.map(
        (message, index) => [`question${index}`, message] as const,
      ),
    ])
      views.set(key, { ...scene.view, messages: [message] });
    const choices = new Map<string, boolean>();
    for (const message of fragments.values())
      for (const block of message.blocks)
        if (block.type === "reasoning")
          choices.set(
            `thinking:${scene.session.id}:${message.id}:${block.id}:text`,
            true,
          );
    const datasetOutput = tools.get("call_ab09646f162e")!.output as {
      datasets: unknown[];
    };
    const dataset = datasetOutput.datasets
      .map((value) => ndpDatasetSchema.parse(value))
      .find((value) => value.id === story.datasetId);
    if (!dataset) throw new Error("The selected NDP dataset was not recorded");
    return { tools, surfaces, views, choices, questions, dataset };
  }, [scene, fragmentOverrides]);
  const session = useMemo(
    () =>
      sessionSchema.parse({
        ...scene.session,
        state: scene.session.status,
        provider_id: scene.session.model.provider_id,
        model_id: scene.session.model.model_id,
        agent_id: scene.session.agent.id,
      }),
    [scene],
  );
  const chart = useMemo(
    () => chartOnly(evidence.surfaces.get(story.chartSurfaceId)!),
    [evidence],
  );
  const [viewport, setViewport] = useState({
    width: innerWidth,
    height: innerHeight,
  });
  useEffect(() => {
    const resize = () =>
      setViewport({ width: innerWidth, height: innerHeight });
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const logicalWidth = portrait ? 720 : 1280;
  const logicalHeight = portrait ? 1280 : 720;
  const scale = Math.min(
    viewport.width / logicalWidth,
    viewport.height / logicalHeight,
  );
  const message = (key: string) => (
    <ArchiveConversation
      sessionId={scene.session.id}
      view={evidence.views.get(key)!}
      snapshot={scene.snapshot}
      onOpenArtifact={readonly}
      onOpenFile={readonly}
    />
  );
  const tool = (id: string) => {
    const record = evidence.tools.get(id);
    if (!record) throw new Error(`Missing recorded action ${id}`);
    return (
      <div data-source-call={id}>
        <ClioToolInvocation
          tool={record}
          compact
          sessionId={scene.session.id}
        />
      </div>
    );
  };
  const terminal = (
    id: string,
    from?: string,
    until?: string,
    extraFrom?: string,
    extraUntil?: string,
  ) => {
    const record = evidence.tools.get(id)!;
    const original = record.presentation?.blocks.find(
      (block) => block.type === "terminal",
    );
    if (!original) throw new Error(`No recorded terminal output ${id}`);
    const block: ToolPresentationBlock = {
      ...original,
      text: sourceExcerpt(original.text ?? "", from, until),
      command: "",
      detail: "",
    };
    return (
      <div className="narrative-terminal" data-source-call={id}>
        <p className="narrative-action">
          {taskDescription(record.input) || record.title}
        </p>
        {tool(id)}
        <div
          style={{
            clipPath: `inset(0 0 ${(1 - ease(age, 40, 130)) * 100}% 0)`,
          }}
        >
          <ToolTerminalResult
            block={block}
            saved={
              extraFrom
                ? [
                    {
                      ...block,
                      id: `${block.id}-measurement-excerpt`,
                      text: sourceExcerpt(
                        original.text ?? "",
                        extraFrom,
                        extraUntil,
                      ),
                    },
                  ]
                : []
            }
            lines={28}
            running={false}
          />
        </div>
      </div>
    );
  };
  const stack = (...children: ReactNode[]) => (
    <div className="narrative-stack">
      {children.map((child, index) => (
        <div key={index}>{child}</div>
      ))}
    </div>
  );
  const sender = (
    <div className="film-sender">
      <BotIcon size={14} />
      CLIO
    </div>
  );
  const texts = evidence.questions.map((question) =>
    question.blocks
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n"),
  );
  let body: ReactNode = null;
  let right: ReactNode = null;
  switch (stage.id) {
    case "discover":
      body = stack(
        portrait ? null : message("question0"),
        sender,
        tool("call_ab09646f162e"),
        tool("call_b289879bb9dc"),
      );
      right = (
        <div className="narrative-dataset" data-source-call="call_ab09646f162e">
          <NDPDatasetRow
            dataset={evidence.dataset}
            selected={evidence.dataset.resources
              .filter((resource) =>
                ["GeoJSON", "Esri REST", "HTML"].includes(resource.format),
              )
              .map((resource) => resource.id)}
            disabled
            onChange={readonly}
            defaultOpen
          />
        </div>
      );
      break;
    case "plan":
      body = message("plan");
      right = (
        <div className="narrative-dataset">
          <NDPDatasetRow
            dataset={evidence.dataset}
            selected={evidence.dataset.resources
              .filter((resource) =>
                ["GeoJSON", "Esri REST", "HTML"].includes(resource.format),
              )
              .map((resource) => resource.id)}
            disabled
            onChange={readonly}
            defaultOpen
          />
        </div>
      );
      break;
    case "inspect":
      body = message("inspect");
      right = terminal("call_9318527a9744", "<dataIdInfo>", "</metadata>");
      break;
    case "measure":
      body = message("plan");
      right = terminal(
        "call_602d42cce5a7",
        '  "feature_count":',
        '  "bounds_lonlat":',
        '  "equal_area_m2":',
        '  "native_utm10_m2":',
      );
      break;
    case "map":
      body = stack(
        message("areaBrief"),
        tool("call_a2327bf600cb"),
        <ToolResultPresentation
          tool={evidence.tools.get("call_a2327bf600cb")!}
        />,
      );
      break;
    case "area":
      body = message("area");
      break;
    case "shore-plan":
      body = stack(
        message("question1"),
        message("shorePlan"),
        tool("call_d484952b7674"),
      );
      break;
    case "shore-compute":
      body = message("shoreReason");
      right = terminal("call_59e8aba094b6", "   0 m |", "\nedge quantiles");
      break;
    case "chart":
      body = stack(
        sender,
        tool("call_8ec17c20ee0b"),
        <p className="narrative-action">
          {taskDescription(evidence.tools.get("call_8ec17c20ee0b")!.input)}
        </p>,
        tool("call_afddda4755fa"),
        <ToolResultPresentation
          tool={evidence.tools.get("call_afddda4755fa")!}
        />,
      );
      break;
    case "interpret":
      body = message("interpret");
      break;
    case "finish":
      body = message("finish");
      break;
  }
  return (
    <TranscriptDisclosureContext.Provider
      value={{
        sessionId: scene.session.id,
        choices: evidence.choices,
        setOpen: readonly,
      }}
    >
      <div className="film-viewport">
        <div
          className="film-design"
          style={{
            transform: `scale(${scale})`,
            left: (viewport.width - logicalWidth * scale) / 2,
            top: (viewport.height - logicalHeight * scale) / 2,
          }}
        >
          <div className="film-caption" style={{ opacity: pose.stageOpacity }}>
            {stage.caption}
          </div>
          <div className="film-brand">
            <BrandIcon className="size-5" />
            <span>CLIO</span>
          </div>
          <div className="film-window">
            <aside className="film-rail">
              <BrandIcon className="size-5" />
              <SearchIcon size={16} />
              <FolderGit2Icon size={16} />
            </aside>
            <div className="film-header">
              <DesktopWorkspaceToolbar
                navigation={
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Toggle sidebar"
                  >
                    <PanelLeftIcon />
                  </Button>
                }
              >
                <RecordedSessionContextBar
                  session={session}
                  agentLabel={scene.session.agent.id}
                  onOpenAgent={readonly}
                  onExplainComposition={readonly}
                  readonlyAction={readonlyAsync}
                />
              </DesktopWorkspaceToolbar>
            </div>
            <div
              className="narrative-body"
              data-film-stage={stage.id}
              style={{
                top: pose.bodyY,
                width: pose.bodyWidth,
                opacity: pose.stageOpacity,
              }}
            >
              {body}
            </div>
            <div
              className="narrative-right"
              style={{
                opacity: pose.stageOpacity,
                transform: `translateY(${(1 - ease(age, 0, 24)) * 12}px)`,
              }}
            >
              {right}
            </div>
            <div
              className="film-map film-widget"
              data-film-map
              style={{
                left: pose.mapX,
                top: pose.mapY,
                transform: `scale(${pose.mapScale})`,
                opacity: pose.mapOpacity,
              }}
            >
              <ClioA2UISurface
                surface={evidence.surfaces.get(story.mapSurfaceId)!}
                readOnly
              />
            </div>
            <div
              className="film-chart film-widget"
              data-film-chart
              style={{
                left: pose.chartX,
                top: pose.chartY,
                transform: `scale(${pose.chartScale})`,
                opacity: pose.chartOpacity,
              }}
            >
              <ClioA2UISurface surface={chart} readOnly />
            </div>
            <div
              className="narrative-figure"
              data-film-figure
              style={{ opacity: pose.methodOpacity }}
            >
              <ClioA2UISurface
                surface={evidence.surfaces.get("tahoe-area-method-figure")!}
                readOnly
              />
            </div>
            <div
              className="narrative-figure"
              data-film-figure
              style={{ opacity: pose.detailOpacity }}
            >
              <ClioA2UISurface
                surface={
                  evidence.surfaces.get("tahoe-shoreline-detail-figure")!
                }
                readOnly
              />
            </div>
            <div
              className="narrative-sent"
              style={{ opacity: pose.questionOpacity }}
            >
              {message(stage.id === "follow" ? "question1" : "question0")}
            </div>
            <div
              className="film-composer"
              style={{
                top: stage.id === "follow" ? 460 : 340,
                opacity: pose.composerOpacity,
              }}
            >
              <ClioComposer
                value={filmInput(frame, texts[0], texts[1])}
                onValueChange={readonly}
                onSubmit={readonlyAsync}
                state={session.state}
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
          </div>
          <div className="film-end" style={{ opacity: pose.endOpacity }}>
            <strong>CLIO</strong>
            <span>clio.iowarp.ai</span>
          </div>
        </div>
      </div>
    </TranscriptDisclosureContext.Provider>
  );
}
