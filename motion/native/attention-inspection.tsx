import { RecordedPointer } from "./recorded-pointer";
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { useAttentionMode } from "@clio-ui/hooks/use-attention-mode";
import {
  findPartElement,
  rangeFromTextOffsets,
} from "@clio-ui/lib/attention-highlight-dom";
import {
  findRunInRenderedText,
  projectText,
} from "@clio-ui/lib/attention-text";
import { transcriptSelection } from "@clio-ui/lib/selection-actions";
import {
  attentionInspectionAt,
  attentionInspectionCursor,
  type AttentionInspectionAnchors,
  type ResolvedAttentionInspection,
} from "./attention-inspection-plan";

type Geometry = {
  key: string;
  scrollTop: number;
  entryScrollTop: number;
  anchors: AttentionInspectionAnchors;
};
type Pose = ReturnType<typeof attentionInspectionCursor>;

/** Map source code points to a real native DOM range; refuse partial or guessed projections. */
function sourceRange(
  host: HTMLElement,
  messageId: string,
  partId: string,
  source: string,
  start: number,
  end: number,
): Range | undefined {
  const element = findPartElement(host, messageId, partId, "text");
  if (!element) return;
  const found = findRunInRenderedText(
    source,
    start,
    end,
    projectText(element.textContent ?? "", { source: false }),
  );
  return found
    ? rangeFromTextOffsets(element, found.domLo, found.domHi)
    : undefined;
}

function point(range: Range, end: boolean) {
  const caret = range.cloneRange();
  caret.collapse(!end);
  const rect = caret.getBoundingClientRect();
  return { x: rect.left, y: rect.top + rect.height * 0.6 };
}

/** Perform the native select/action/scroll sequence against one frozen transcript projection. */
export function RecordedAttentionInspection({
  spec,
  frame,
  scroll,
  attention,
}: {
  spec: ResolvedAttentionInspection;
  frame: number;
  scroll: RefObject<HTMLDivElement | null>;
  attention: ReturnType<typeof useAttentionMode>;
}) {
  const marker = useRef<HTMLDivElement>(null);
  const geometry = useRef<Geometry | undefined>(undefined);
  const fired = useRef(false);
  const [pose, setPose] = useState<Pose>();
  const [error, setError] = useState("");
  const step = attentionInspectionAt(spec, frame);
  useLayoutEffect(() => {
    const control = marker.current;
    if (!control) return;
    control.dataset.ready = "false";
    setError("");
    delete control.dataset.error;
    let active = true,
      id = 0,
      attempts = 0;
    const schedule = () => {
      id = requestAnimationFrame(tick);
    };
    const tick = () => {
      if (!active) return;
      try {
        const host = scroll.current;
        if (!host || !attention.availability?.enabled) {
          schedule();
          return;
        }
        if (++attempts > 180)
          throw new Error("Native attention interaction did not settle");
        const key = `${spec.id}:${host.clientWidth}:${innerWidth}:${innerHeight}`;
        if (geometry.current?.key !== key) {
          geometry.current = undefined;
          fired.current = false;
        }
        if (
          (frame < spec.click || !geometry.current) &&
          attention.state.status !== "idle"
        ) {
          attention.dismiss();
          fired.current = false;
          schedule();
          return;
        }
        const full = sourceRange(
          host,
          spec.messageId,
          spec.partId,
          spec.answerText,
          spec.start,
          spec.end,
        );
        if (!full) {
          schedule();
          return;
        }
        const selection = window.getSelection();
        if (!selection) throw new Error("Native text selection is unavailable");
        const select = (range?: Range) => {
          if (!range && selection.rangeCount === 0) return;
          if (range && selection.rangeCount === 1) {
            const current = selection.getRangeAt(0);
            if (
              current.startContainer === range.startContainer &&
              current.startOffset === range.startOffset &&
              current.endContainer === range.endContainer &&
              current.endOffset === range.endOffset
            )
              return;
          }
          selection.removeAllRanges();
          if (range) selection.addRange(range);
          document.dispatchEvent(new Event("selectionchange"));
        };
        const button = () =>
          Array.from(
            document.querySelectorAll<HTMLButtonElement>(
              '[data-slot="selection-actions"] button',
            ),
          ).find((b) => b.textContent?.trim() === "Understand attention");
        if (!geometry.current) {
          const before = host.scrollTop;
          host.scrollTop = spec.triggerToolId
            ? host.scrollTop +
              full.getBoundingClientRect().top -
              host.getBoundingClientRect().top -
              70
            : host.scrollHeight - host.clientHeight;
          if (Math.abs(before - host.scrollTop) > 0.5) {
            schedule();
            return;
          }
          const action = button();
          if (!action) {
            select(full);
            schedule();
            return;
          }
          const target = transcriptSelection(selection);
          if (
            target?.kind !== "agent-answer-text" ||
            target.reference?.selection.kind !== "text" ||
            target.reference.selection.start !== spec.start ||
            target.reference.selection.end !== spec.end ||
            target.text !== spec.text ||
            target.contentRevision !== spec.contentRevision
          )
            throw new Error(
              "Native selection differs from its captured attention request",
            );
          const a = point(full, false),
            b = point(full, true),
            rect = action.getBoundingClientRect(),
            viewport = host.getBoundingClientRect();
          const pane = host
            .closest(".paired-transcript")!
            .getBoundingClientRect();
          const exit = { x: pane.right - 36, y: pane.top + 20 };
          geometry.current = {
            key,
            scrollTop: host.scrollTop,
            entryScrollTop: spec.approachScroll
              ? host.scrollHeight - host.clientHeight
              : host.scrollTop,
            anchors: {
              start: spec.entryFromExit
                ? exit
                : spec.approachScroll
                  ? { x: viewport.right - 48, y: viewport.bottom - 100 }
                  : {
                      x: b.x + 60,
                      y: Math.min(viewport.bottom - 24, b.y + 65),
                    },
              selectionStart: a,
              selectionEnd: b,
              button: {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
              },
              scroll: { x: viewport.right - 48, y: viewport.bottom - 100 },
              exit,
            },
          };
        }
        const measured = geometry.current;
        let nextPose = attentionInspectionCursor(spec, frame, measured.anchors);
        if (spec.exitAt !== undefined && frame >= spec.exitAt) {
          if (attention.state.status !== "idle") {
            const exit = document.querySelector<HTMLButtonElement>(
              '[aria-label="Exit attention mode"]',
            );
            if (!exit) {
              schedule();
              return;
            }
            exit.click();
            select();
            schedule();
            return;
          }
          const t = spec.resumeBottom
            ? Math.max(
                0,
                Math.min(
                  1,
                  (frame - spec.exitAt - 24) / (spec.frames - spec.exitAt - 25),
                ),
              )
            : 0;
          host.scrollTop =
            measured.scrollTop +
            (host.scrollHeight - host.clientHeight - measured.scrollTop) *
              t *
              t *
              (3 - 2 * t);
        } else if (frame < spec.click) {
          const t = Math.min(1, frame / spec.selectionStart);
          host.scrollTop =
            measured.entryScrollTop +
            (measured.scrollTop - measured.entryScrollTop) *
              t *
              t *
              (3 - 2 * t);
          const length = step.selectionLength;
          const partial = length
            ? sourceRange(
                host,
                spec.messageId,
                spec.partId,
                spec.answerText,
                spec.start,
                spec.start + length,
              )
            : undefined;
          if (length && !partial)
            throw new Error("Native selection prefix is unavailable");
          select(partial);
          if (step.phase === "select") {
            const lo = partial
              ? point(partial, true)
              : measured.anchors.selectionStart;
            const next = sourceRange(
              host,
              spec.messageId,
              spec.partId,
              spec.answerText,
              spec.start,
              Math.min(spec.end, spec.start + length + 1),
            );
            const hi = next ? point(next, true) : lo;
            const fraction = (spec.end - spec.start) * step.drag - length;
            nextPose = {
              ...nextPose,
              x: lo.x + (hi.x - lo.x) * fraction,
              y: lo.y + (hi.y - lo.y) * fraction,
            };
          }
          if (length && !button()) {
            schedule();
            return;
          }
          if (!length && button()) {
            schedule();
            return;
          }
        } else if (
          attention.state.status === "idle" ||
          (attention.state.status === "shown" &&
            attention.state.selection.reference?.selection.kind === "text" &&
            (attention.state.selection.reference.selection.start !==
              spec.start ||
              attention.state.selection.reference.selection.end !== spec.end))
        ) {
          select(full);
          const action = button();
          if (!action) {
            schedule();
            return;
          }
          if (!fired.current) {
            fired.current = true;
            action.click();
          }
          schedule();
          return;
        } else if (attention.state.status === "loading") {
          schedule();
          return;
        } else if (attention.state.status === "unavailable")
          throw new Error(attention.state.message);
        else {
          const target = sourceRange(
            host,
            spec.source.messageId,
            spec.source.partId,
            spec.sourceText,
            spec.source.start,
            spec.source.end,
          );
          if (!target)
            throw new Error("The highlighted source span is not rendered");
          const viewport = host.getBoundingClientRect(),
            rect = target.getBoundingClientRect();
          const exit = document
            .querySelector<HTMLButtonElement>(
              '[aria-label="Exit attention mode"]',
            )
            ?.getBoundingClientRect();
          if (exit) {
            measured.anchors.exit = {
              x: exit.left + exit.width / 2,
              y: exit.top + exit.height / 2,
            };
            nextPose = attentionInspectionCursor(spec, frame, measured.anchors);
          }
          const end = Math.max(
            0,
            Math.min(
              host.scrollHeight - host.clientHeight,
              host.scrollTop + rect.top - viewport.top - spec.sourceLead,
            ),
          );
          host.scrollTop =
            measured.scrollTop + (end - measured.scrollTop) * step.scroll;
          if (
            typeof CSS.highlights === "undefined" ||
            !Array.from(CSS.highlights.entries()).some(
              ([name, value]) =>
                name.startsWith("clio-attn-heat-") && value.size > 0,
            )
          ) {
            schedule();
            return;
          }
        }
        setPose(nextPose);
        control.dataset.scrollTop = String(host.scrollTop);
        id = requestAnimationFrame(() => {
          if (active) control.dataset.ready = "true";
        });
      } catch (error) {
        control.dataset.error = String(error);
        setError(String(error));
      }
    };
    void document.fonts.ready.then(() => {
      if (active) schedule();
    });
    return () => {
      active = false;
      cancelAnimationFrame(id);
    };
  }, [frame, spec, scroll, attention.state, attention.availability]);
  return (
    <>
      {error ? <p role="alert">{error}</p> : null}
      <div
        ref={marker}
        data-slot="attention-inspection-controller"
        data-frame={frame}
        data-phase={step.phase}
        hidden
      />
      <RecordedPointer pose={pose} />
    </>
  );
}
