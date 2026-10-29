import manifest from "./attention-inspections.json";
import { cursorAt, type CursorKey } from "./cursor-plan";
import type { PairedReplay, PairedSession } from "./paired-replay";

export type AttentionInspectionSpec = {
  sourceSha256: string;
  sessionId: string;
  messageId: string;
  partId: string;
  contentRevision: string;
  start: number;
  end: number;
  text: string;
  source: {
    messageId: string;
    partId: string;
    start: number;
    end: number;
    text: string;
  };
  frames: number;
  selectionStart: number;
  selectionEnd: number;
  click: number;
  scrollStart: number;
  scrollEnd: number;
  sourceLead: number;
  triggerToolId?: string;
  returnStart?: number;
  returnEnd?: number;
  exitAt?: number;
  entryFromExit?: boolean;
  resumeBottom?: boolean;
  approachScroll?: boolean;
};
export type ResolvedAttentionInspection = AttentionInspectionSpec & {
  id: string;
  sourceAt: number;
  answerText: string;
  sourceText: string;
};
export type InspectionPoint = { x: number; y: number };
export type AttentionInspectionAnchors = {
  start: InspectionPoint;
  selectionStart: InspectionPoint;
  selectionEnd: InspectionPoint;
  button: InspectionPoint;
  scroll: InspectionPoint;
  exit?: InspectionPoint;
};

/** Resolve a shot only against its genuine answer, source span, capture and reviewer wake. */
export function resolveAttentionInspection(
  pair: PairedReplay,
  id: string,
): ResolvedAttentionInspection {
  const spec = manifest[id as keyof typeof manifest] as
    | AttentionInspectionSpec
    | undefined;
  if (!spec || spec.sourceSha256 !== pair.source.sha256)
    throw new Error("Attention inspection belongs to another source export");
  const session = pair.sessions.find((s) => s.session.id === spec.sessionId);
  const part = (s: PairedSession | undefined, mid: string, pid: string) =>
    s?.view.messages.find((m) => m.id === mid)?.blocks.find((b) => b.id === pid)
      ?.text;
  const answerText = part(session, spec.messageId, spec.partId),
    sourceText = part(session, spec.source.messageId, spec.source.partId);
  const wake = pair.wakes.find((w) => w.sourceMessageId === spec.messageId);
  const trigger = spec.triggerToolId
    ? pair.sessions.flatMap((s) =>
        s.blocks.filter((timed) =>
          s.view.messages.some((m) =>
            m.blocks.some(
              (b) => b.id === timed.blockId && b.tool_id === spec.triggerToolId,
            ),
          ),
        ),
      )[0]
    : undefined;
  const capture = pair.attention.records.find(
    (r) =>
      r.sessionId === spec.sessionId &&
      r.messageId === spec.messageId &&
      r.partId === spec.partId &&
      r.contentRevision === spec.contentRevision &&
      r.start === spec.start &&
      r.end === spec.end &&
      r.text === spec.text,
  );
  if (
    !answerText ||
    !sourceText ||
    !wake ||
    (spec.triggerToolId && (!trigger || trigger.end < wake.at)) ||
    !capture ||
    Array.from(answerText).slice(spec.start, spec.end).join("") !== spec.text ||
    Array.from(sourceText)
      .slice(spec.source.start, spec.source.end)
      .join("") !== spec.source.text ||
    !capture.response.blocks.some(
      (b) =>
        b.message_id === spec.source.messageId &&
        b.part_id === spec.source.partId &&
        Array.isArray(b.runs) &&
        b.runs.length,
    )
  )
    throw new Error("Attention inspection lacks matching answer/source heat");
  return {
    ...spec,
    id,
    sourceAt: trigger?.end ?? wake.at,
    answerText,
    sourceText,
  };
}

/** One editorial clock; the two source transcripts stay frozen through selection and inspection. */
export function attentionInspectionAt(
  spec: ResolvedAttentionInspection,
  frame: number,
) {
  if (!Number.isInteger(frame) || frame < 0 || frame >= spec.frames)
    throw new Error("Invalid attention inspection frame");
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const d = clamp(
    (frame - spec.selectionStart) / (spec.selectionEnd - spec.selectionStart),
  );
  const drag = d * d * (3 - 2 * d);
  const t = clamp(
    (frame - spec.scrollStart) / (spec.scrollEnd - spec.scrollStart),
  );
  const returning = spec.returnStart !== undefined && frame >= spec.returnStart;
  const r = returning
    ? clamp((frame - spec.returnStart!) / (spec.returnEnd! - spec.returnStart!))
    : 0;
  return {
    source: spec.sourceAt,
    drag,
    scroll: returning ? 1 - r * r * (3 - 2 * r) : t * t * (3 - 2 * t),
    selectionLength: Math.floor((spec.end - spec.start) * drag),
    phase:
      spec.exitAt !== undefined && frame >= spec.exitAt
        ? "resume"
        : spec.returnEnd !== undefined && frame >= spec.returnEnd
          ? "exit"
          : returning
            ? "return"
            : frame < spec.selectionStart
              ? "approach"
              : frame < spec.selectionEnd
                ? "select"
                : frame < spec.click
                  ? "button"
                  : frame < spec.scrollStart
                    ? "heat"
                    : frame < spec.scrollEnd
                      ? "scroll"
                      : "inspect",
  };
}

/** Reuse continuous pointer travel, with the drag and click bound to measured native controls. */
export function attentionInspectionCursor(
  spec: ResolvedAttentionInspection,
  frame: number,
  anchors: AttentionInspectionAnchors,
) {
  const point = (
    at: number,
    p: InspectionPoint,
    extra: Partial<CursorKey> = {},
  ): CursorKey => ({
    at,
    sampleAt: at,
    kind: "button",
    size: 23,
    ...p,
    ...extra,
  });
  const pose = cursorAt(
    [
      point(0, anchors.start),
      point(spec.selectionStart, anchors.selectionStart),
      point(spec.selectionEnd, anchors.selectionEnd, { drag: true }),
      point(spec.click, anchors.button, { pulse: true }),
      point(spec.scrollStart, anchors.scroll),
      ...(spec.returnEnd !== undefined &&
      spec.exitAt !== undefined &&
      anchors.exit
        ? [
            point(spec.returnEnd, anchors.scroll),
            point(spec.exitAt, anchors.exit, { pulse: true }),
            ...(spec.resumeBottom
              ? [point(spec.exitAt + 36, anchors.scroll)]
              : []),
          ]
        : []),
    ],
    frame,
    spec.frames,
  );
  const smooth = (v: number) => {
    const t = Math.max(0, Math.min(1, v));
    return t * t * (3 - 2 * t);
  };
  return {
    ...pose,
    opacity:
      (spec.entryFromExit ? 1 : smooth(frame / 18)) *
      (spec.exitAt !== undefined && !spec.resumeBottom
        ? 1
        : 1 - smooth((frame - spec.frames + 25) / 25)),
  };
}
