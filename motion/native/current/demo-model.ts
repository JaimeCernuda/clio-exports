import {
  buildReplayPlan,
  type ReplayEdits,
  type ReplayPlan,
  type ReplayMessage,
} from "../replay-plan";
import { sceneAssetPath, conversationTurns } from "../scene-selection";

export interface DemoBlock extends Record<string, unknown> {
  id: string;
  type: string;
  text?: string;
  tool_id?: string;
  surface_id?: string;
  artifact_id?: string;
}
export interface DemoMessage extends Record<string, unknown> {
  id: string;
  role: string;
  blocks: DemoBlock[];
}
export interface DemoScene {
  schema: string;
  source: { archive: string; sha256: string };
  session: Record<string, unknown> & {
    id: string;
    workspace_id: string;
    title: string;
    status: string;
    model: { provider_id: string; model_id: string };
    agent: { id: string };
    metadata?: Record<string, unknown>;
  };
  view: {
    messages: DemoMessage[];
    tools: Array<Record<string, unknown> & { id: string; state: string }>;
    tasks: unknown[];
    subagents: unknown[];
    artifacts: Array<Record<string, unknown> & { id: string }>;
    surfaces: Array<Record<string, unknown> & { id: string }>;
    interactions?: unknown[];
  };
  snapshot: unknown;
}
export interface DemoSpec {
  schema: "clio.demo.v1";
  id: string;
  sceneFile: string;
  sourceSha256: string;
  sessionId: string;
  title: string;
  frames: number;
  fps: 60;
  turns: number;
  holdFrames: number;
  edits?: ReplayEdits;
  pocket?: Array<{ afterBlock: string; label: string; surfaceId: string }>;
}

/** Advance a preview on one clock and clamp early vsync callbacks and the final hold. */
export function previewFrameAt(
  startFrame: number,
  elapsedMs: number,
  frames: number,
  fps: number,
): number {
  if (
    !Number.isSafeInteger(startFrame) ||
    startFrame < 0 ||
    startFrame >= frames ||
    !Number.isFinite(elapsedMs) ||
    !Number.isSafeInteger(frames) ||
    frames < 1 ||
    !Number.isFinite(fps) ||
    fps <= 0
  )
    throw new Error("Invalid preview clock");
  return Math.min(
    frames - 1,
    startFrame + Math.max(0, Math.floor((elapsedMs * fps) / 1000)),
  );
}

/** Reject mismatched footage and unsafe scene paths before projecting any content. */
export function validateDemo(spec: DemoSpec, scene: DemoScene): void {
  if (
    spec.schema !== "clio.demo.v1" ||
    !/^[a-z0-9][a-z0-9-]*$/.test(spec.id) ||
    !spec.title
  )
    throw new Error("Invalid demo manifest");
  if (
    scene.schema !== "clio.native-scene.v1" ||
    !/^[a-f0-9]{64}$/i.test(scene.source.sha256)
  )
    throw new Error("Invalid native scene or source hash");
  sceneAssetPath(spec.sceneFile);
  if (
    spec.sourceSha256 !== scene.source.sha256 ||
    spec.sessionId !== scene.session.id
  )
    throw new Error("Demo source identity does not match its recorded scene");
  if (
    spec.fps !== 60 ||
    !Number.isInteger(spec.frames) ||
    !Number.isInteger(spec.holdFrames) ||
    spec.holdFrames < 0 ||
    spec.frames <= spec.holdFrames ||
    !Number.isInteger(spec.turns) ||
    spec.turns < 1 ||
    spec.turns > conversationTurns(scene.view.messages).length
  )
    throw new Error("Invalid demo timing");
  const ids = new Set<string>();
  for (const m of scene.view.messages)
    for (const b of m.blocks) {
      if (!b.id || ids.has(b.id))
        throw new Error("Duplicate or missing recorded block identity");
      ids.add(b.id);
    }
  for (const pane of spec.pocket ?? []) {
    if (
      !ids.has(pane.afterBlock) ||
      !scene.view.surfaces.some((s) => s.id === pane.surfaceId)
    )
      throw new Error(
        "Pocket view is not linked to a captured block and surface",
      );
    const block = scene.view.messages
      .flatMap((m) => m.blocks)
      .find((b) => b.id === pane.afterBlock);
    if (block?.surface_id !== pane.surfaceId)
      throw new Error("Pocket anchor generates a different surface");
  }
}

/** Start a new source-bound demo without copying a previous film's IDs or editorial cuts. */
export function createDemoSpec(
  scene: DemoScene,
  sceneFile: string,
  id: string,
  seconds = 120,
  turns = conversationTurns(scene.view.messages).length,
): DemoSpec {
  const selected = scene.view.messages.slice(
    0,
    conversationTurns(scene.view.messages)[turns - 1]?.end,
  );
  const seen = new Set<string>();
  const pocket = selected.flatMap((message) =>
    message.blocks.flatMap((block) => {
      if (!block.surface_id || seen.has(block.surface_id)) return [];
      const surface = scene.view.surfaces.find(
        (value) => value.id === block.surface_id,
      );
      if (!surface) return [];
      seen.add(surface.id);
      return [
        {
          afterBlock: block.id,
          surfaceId: surface.id,
          label: surface.id.replaceAll("-", " "),
        },
      ];
    }),
  );
  const spec: DemoSpec = {
    schema: "clio.demo.v1",
    id,
    title: scene.session.title,
    sceneFile,
    sourceSha256: scene.source.sha256,
    sessionId: scene.session.id,
    frames: Math.round(seconds * 60),
    fps: 60,
    turns,
    holdFrames: 240,
    pocket,
  };
  if (
    !Number.isFinite(seconds) ||
    seconds <= 4 ||
    turns > conversationTurns(scene.view.messages).length
  )
    throw new Error(
      "Choose a duration above four seconds and an existing turn range",
    );
  validateDemo(spec, scene);
  demoPlan(spec, scene);
  return spec;
}

/** Reuse the source-order scheduler; attachments reserve time without becoming fabricated A2UI blocks. */
export function demoPlan(spec: DemoSpec, scene: DemoScene): ReplayPlan {
  validateDemo(spec, scene);
  const blocks = new Map(
    scene.view.messages.flatMap((m) => m.blocks.map((b) => [b.id, b] as const)),
  );
  const end = conversationTurns(scene.view.messages)[spec.turns - 1].end;
  const messages = scene.view.messages.slice(0, end).map((m) => ({
    ...m,
    blocks: m.blocks.map((b) => ({
      ...b,
      type: ["text", "tool", "reasoning", "injection", "a2ui"].includes(b.type)
        ? b.type
        : "a2ui",
    })),
  }));
  const plan = buildReplayPlan(
    messages as ReplayMessage[],
    spec.frames - spec.holdFrames,
    Number.MAX_SAFE_INTEGER,
    spec.edits,
  );
  for (const pane of spec.pocket ?? [])
    if (!plan.events.some((e) => e.blockId === pane.afterBlock))
      throw new Error("Pocket anchor is outside the selected replay");
  return {
    ...plan,
    events: plan.events.map((e) => ({
      ...e,
      type: blocks.get(e.blockId)!.type,
    })),
  };
}

/** Project genuine blocks and tool lifecycles at an absolute frame; original evidence remains immutable. */
export function demoAt(scene: DemoScene, plan: ReplayPlan, frame: number) {
  if (!Number.isInteger(frame) || frame < 0)
    throw new Error("Invalid demo frame");
  const visible = new Map(
    plan.events.filter((e) => e.start <= frame).map((e) => [e.blockId, e]),
  );
  let draft = "";
  const messages = scene.view.messages.flatMap((m) => {
    const blocks = m.blocks.flatMap((b) => {
      const e = visible.get(b.id);
      if (!e) return [];
      const complete = frame >= e.revealEnd;
      const characters = Array.from(e.text ?? "");
      const progress = Math.max(
        0,
        Math.min(1, (frame - e.start) / (e.revealEnd - e.start)),
      );
      const text = characters
        .slice(0, Math.floor(characters.length * progress))
        .join("");
      if (m.role === "user" && !complete) {
        draft = text;
        return [];
      }
      return [
        {
          ...b,
          ...(e.text !== undefined ? { text, streaming: !complete } : {}),
        },
      ];
    });
    if (!blocks.length) return [];
    const complete = plan.events
      .filter((e) => e.messageId === m.id)
      .every((e) => frame >= e.revealEnd);
    return [
      {
        ...m,
        blocks,
        ...(!complete
          ? {
              completed_at: undefined,
              stop_reason: undefined,
              usage: undefined,
            }
          : {}),
      },
    ];
  });
  const toolEvents = new Map(
    [...visible.values()].filter((e) => e.toolId).map((e) => [e.toolId, e]),
  );
  const tools = scene.view.tools.flatMap((t) => {
    const e = toolEvents.get(t.id);
    if (!e) return [];
    return [
      frame >= e.revealEnd
        ? t
        : {
            ...t,
            state: "running",
            output: undefined,
            completed_at: undefined,
            duration_ms: undefined,
            presentation: undefined,
            error: undefined,
          },
    ];
  });
  const surfaceIds = new Set(
    messages.flatMap((m) => m.blocks.map((b) => b.surface_id)),
  );
  const artifactIds = new Set(
    messages.flatMap((m) =>
      m.blocks
        .filter((b) => b.type === "artifact")
        .map((b) => String(b.artifact_id)),
    ),
  );
  return {
    draft,
    view: {
      ...scene.view,
      messages,
      tools,
      surfaces: scene.view.surfaces.filter((s) => surfaceIds.has(s.id)),
      artifacts: scene.view.artifacts.filter((a) => artifactIds.has(a.id)),
    },
  };
}

/** A result enters the pocket only after its recorded generating block has arrived. */
export function demoPocket(spec: DemoSpec, plan: ReplayPlan, frame: number) {
  return (spec.pocket ?? []).filter((p) => {
    const e = plan.events.find((e) => e.blockId === p.afterBlock);
    return e !== undefined && frame >= e.revealEnd;
  });
}

/** Interpolate a captured call's execution time separately from its compressed editorial duration. */
export function recordedNowAt(
  scene: DemoScene,
  plan: ReplayPlan,
  frame: number,
): number {
  const base = Date.parse(
    String(scene.session.created_at ?? scene.view.messages[0]?.created_at),
  );
  if (!Number.isFinite(base))
    throw new Error("Recorded scene has no captured clock anchor");
  let now = base;
  for (const event of plan.events) {
    if (event.start > frame) break;
    const tool = scene.view.tools.find((value) => value.id === event.toolId);
    if (!tool) continue;
    const start = Date.parse(String(tool.started_at));
    const end = Date.parse(String(tool.completed_at));
    if (!Number.isFinite(start)) continue;
    const duration =
      typeof tool.duration_ms === "number" &&
      Number.isFinite(tool.duration_ms) &&
      tool.duration_ms >= 0
        ? tool.duration_ms
        : Number.isFinite(end) && end >= start
          ? end - start
          : undefined;
    const progress = Math.max(
      0,
      Math.min(1, (frame - event.start) / (event.revealEnd - event.start)),
    );
    now = start + (duration === undefined ? 0 : duration * progress);
  }
  return now;
}
