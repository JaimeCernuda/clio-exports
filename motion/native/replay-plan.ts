export interface ReplayBlock {
  id: string;
  type: string;
  text?: string;
  tool_id?: string;
  surface_id?: string;
  channel?: string;
}

export interface ReplayMessage {
  id: string;
  role: string;
  blocks: readonly ReplayBlock[];
}

export interface ReplayEvent {
  messageId: string;
  blockId: string;
  role: string;
  type: string;
  toolId?: string;
  surfaceId?: string;
  text?: string;
  start: number;
  revealEnd: number;
  end: number;
}

export interface ReplayPlan {
  events: readonly ReplayEvent[];
  frames: number;
}

export interface ReplayEdits {
  toolIds?: readonly string[];
  reasoningIds?: readonly string[];
  includeInjections?: boolean;
  omitBlockIds?: readonly string[];
  weightsByBlockId?: Readonly<Record<string, number>>;
  answerParagraphs?: number;
  answerParagraphsByBlockId?: Readonly<Record<string, number>>;
}

/** Reveal a source passage by frame; completed passages retain the complete prefix. */
export function replayText(event: ReplayEvent, frame: number): string {
  const text = event.text ?? "";
  const progress = Math.max(
    0,
    Math.min(1, (frame - event.start) / (event.revealEnd - event.start)),
  );
  return text.slice(0, Math.floor(text.length * progress));
}

/** Schedule genuine ordered blocks, with editorial time independent of source time. */
export function buildReplayPlan(
  messages: readonly ReplayMessage[],
  frames: number,
  turns: number,
  edits: ReplayEdits = {},
): ReplayPlan {
  if (
    !Number.isInteger(frames) ||
    frames < 1 ||
    !Number.isInteger(turns) ||
    turns < 1
  )
    throw new Error("Replay needs positive integer frames and turns");
  const entries: Array<
    Omit<ReplayEvent, "start" | "revealEnd" | "end"> & { weight: number }
  > = [];
  let turn = 0;
  for (const message of messages) {
    if (message.role === "user") turn++;
    if (turn > turns) break;
    for (const block of message.blocks) {
      if (edits.omitBlockIds?.includes(block.id)) continue;
      if (
        block.type === "tool" &&
        edits.toolIds &&
        !edits.toolIds.includes(block.tool_id ?? "")
      )
        continue;
      if (
        block.type === "reasoning" &&
        edits.reasoningIds &&
        !edits.reasoningIds.includes(block.id)
      )
        continue;
      if (block.type === "injection" && edits.includeInjections === false)
        continue;
      if (
        !["text", "reasoning", "tool", "injection", "a2ui"].includes(block.type)
      )
        continue;
      // Final answers retain two contiguous paragraphs; artifact attachments and
      // the ZIP exchange stay outside this editorial selection.
      const paragraphs =
        edits.answerParagraphsByBlockId?.[block.id] ?? edits.answerParagraphs;
      const text =
        block.type === "text" && block.channel === "answer" && paragraphs
          ? (block.text ?? "").split("\n\n").slice(0, paragraphs).join("\n\n")
          : block.text;
      const weight =
        edits.weightsByBlockId?.[block.id] ??
        (message.role === "user"
          ? 145
          : block.type === "text"
            ? Math.max(70, (text?.length ?? 0) / 2.2 + 35)
            : block.type === "a2ui"
              ? 165
              : block.type === "tool"
                ? 40
                : 5);
      if (!Number.isFinite(weight) || weight <= 0)
        throw new Error(`Invalid replay weight for ${block.id}`);
      entries.push({
        messageId: message.id,
        blockId: block.id,
        role: message.role,
        type: block.type,
        toolId: block.tool_id,
        surfaceId: block.surface_id,
        text,
        weight,
      });
    }
  }
  if (!entries.length || frames < entries.length * 3)
    throw new Error("Replay timeline is too short for its source blocks");
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let consumed = 0;
  const events = entries.map(({ weight, ...entry }, index) => {
    const start = Math.round((consumed / total) * frames);
    consumed += weight;
    const end =
      index === entries.length - 1
        ? frames
        : Math.round((consumed / total) * frames);
    const fraction =
      entry.type === "text" ? 0.83 : entry.type === "tool" ? 0.65 : 1;
    return {
      ...entry,
      start,
      revealEnd: start + Math.max(1, Math.floor((end - start) * fraction)),
      end,
    };
  });
  return { events, frames };
}

/** Resolve any frame directly, including backwards seeks and parallel render pages. */
export function replayAt(plan: ReplayPlan, frame: number) {
  if (!Number.isInteger(frame) || frame < 0 || frame >= plan.frames)
    throw new Error("Replay frame outside its timeline");
  const index = plan.events.findIndex(
    (event) => frame >= event.start && frame < event.end,
  );
  const event = plan.events[index];
  const progress = Math.min(
    1,
    (frame - event.start) / (event.revealEnd - event.start),
  );
  return { index, event, progress, visible: plan.events.slice(0, index + 1) };
}
