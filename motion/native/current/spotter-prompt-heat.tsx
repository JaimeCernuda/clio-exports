import { useLayoutEffect, useMemo, useRef } from "react";
import { ContentMarkdown } from "@clio-ui/components/clio/content-markdown";
import {
  findRunInRenderedText,
  projectText,
} from "@clio-ui/lib/attention-text";
import { rangeFromTextOffsets } from "../word-attention/attention-highlight-dom";
import {
  lineHeat,
  wordHeat,
  segmentLevel,
  type AttentionHeatView,
} from "../word-attention/attention-segment-heat";
import {
  HEAT_LEVEL_MIX,
  spotterPromptProjection,
  type HeatRun,
} from "./spotter-appearance";

/** Paint recorded prompt heat without changing the Markdown DOM or its geometry. */
export function PromptHeat({
  source,
  sourceRound,
  runs,
  view,
}: {
  source: string;
  sourceRound: number;
  runs?: readonly HeatRun[];
  view: AttentionHeatView;
}) {
  const host = useRef<HTMLDivElement>(null);
  const projection = useMemo(
    () => spotterPromptProjection(source, sourceRound, runs),
    [source, sourceRound, runs],
  );
  useLayoutEffect(() => {
    if (
      !runs ||
      !host.current ||
      !CSS.highlights ||
      typeof Highlight === "undefined"
    )
      return;
    const names = HEAT_LEVEL_MIX.map(
      (_, level) => `clio-sv3-prompt-${sourceRound}-${level}`,
    );
    const style = document.createElement("style");
    style.dataset.spotterPromptHeat = String(sourceRound);
    style.textContent = names
      .slice(1)
      .map(
        (name, i) =>
          `::highlight(${name}) { background-color: color-mix(in oklch, var(--attention-heat-text) ${HEAT_LEVEL_MIX[i + 1]}%, transparent); text-decoration: underline; text-decoration-color: var(--attention-heat-text); text-decoration-thickness: 2px;${i + 1 >= 6 ? " color: var(--foreground);" : ""} }`,
      )
      .join("\n");
    document.head.append(style);
    const apply = () => {
      const element = host.current;
      if (!element) return;
      const dom = projectText(element.textContent ?? "", { source: false });
      const segments =
        view.unit === "word"
          ? wordHeat(projection.text, projection.runs, "max")
          : view.unit === "line"
            ? lineHeat(projection.text, projection.runs, "max")
            : projection.runs.map(([lo, hi, value]) => ({ lo, hi, value }));
      const levels: Range[][] = names.map(() => []);
      for (const segment of segments) {
        const level = segmentLevel(segment.value, 1);
        if (!level) continue;
        const found = findRunInRenderedText(
          projection.text,
          segment.lo,
          segment.hi,
          dom,
        );
        if (!found) continue;
        const range = rangeFromTextOffsets(element, found.domLo, found.domHi);
        if (range) levels[level].push(range);
      }
      levels.forEach((ranges, level) =>
        CSS.highlights.set(names[level], new Highlight(...ranges)),
      );
      element.dataset.promptHeatRanges = String(levels.flat().length);
      element.dataset.promptHeatMaximum = String(
        Math.max(0, ...segments.map((segment) => segment.value)),
      );
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(host.current, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => {
      observer.disconnect();
      names.forEach((name) => CSS.highlights.delete(name));
      style.remove();
      if (host.current) {
        delete host.current.dataset.promptHeatRanges;
        delete host.current.dataset.promptHeatMaximum;
      }
    };
  }, [projection, sourceRound, runs, view]);
  return (
    <div ref={host} className="sv3-user" data-prompt-round={sourceRound}>
      <ContentMarkdown isAnimating={false}>{projection.text}</ContentMarkdown>
    </div>
  );
}
