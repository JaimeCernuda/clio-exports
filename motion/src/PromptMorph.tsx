import React, { useEffect, useRef, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  byId,
  fragmentText,
  snapshots,
  unwrap,
  type PromptSnapshot,
} from "./composable-plan";
import { morphBoxes, morphWords, type PromptLayout } from "./prompt-morph";

declare global {
  interface Window {
    __CLIO_PROMPT_LAYOUTS__?: Record<string, PromptLayout>;
  }
}

function Words({ text, block }: { text: string; block: string }) {
  let word = 0;
  return (
    <>
      {text.split(/(\s+)/u).map((part, index) =>
        /^\s+$/u.test(part) ? (
          <React.Fragment key={`space:${index}`}>{part}</React.Fragment>
        ) : part ? (
          <span
            key={word}
            data-morph-block={block}
            data-morph-word={`${block}:${word++}`}
          >
            {part}
          </span>
        ) : null,
      )}
    </>
  );
}

/** Native fragment hierarchy, with editable word spans instead of a bitmap. */
export function PromptDocument({ snapshot }: { snapshot: PromptSnapshot }) {
  const identity = snapshot.prompt.sections[0].fragments[0];
  const capability = fragmentText(snapshot, "slurm.capabilities");
  return (
    <div className="cm-prompt-document">
      <h3>
        <Words text="Identity" block="identity:heading" />
      </h3>
      <article data-morph-box="identity:card">
        <div className="cm-fragment-header">
          <ChevronDown size={18} />
          <span className="cm-source" data-morph-box="identity:owner">
            <Words text={`Agent ${snapshot.agent.id}`} block="identity:owner" />
          </span>
          <span className="cm-fragment-id">
            <Words text={identity.id} block="identity:id" />
          </span>
        </div>
        <div className="cm-fragment-text">
          <Words text={unwrap(identity.text)} block="identity:body" />
        </div>
      </article>
      <h3 className="cm-folded-section">
        <Words text="Operating guidelines" block="guidelines:heading" />
      </h3>
      <h3 className="cm-folded-section">
        <Words text="Rendering" block="rendering:heading" />
      </h3>
      <h3>
        <Words text="Capabilities" block="capabilities:heading" />
      </h3>
      {["workspace", "shell"].map((plugin) => (
        <article key={plugin} data-morph-box={`${plugin}:card`}>
          <div className="cm-fragment-header cm-collapsed">
            <ChevronRight size={18} />
            <span className="cm-source" data-morph-box={`${plugin}:owner`}>
              <Words text={plugin} block={`${plugin}:owner`} />
            </span>
            <span className="cm-fragment-id">
              <Words
                text={
                  plugin === "workspace"
                    ? "workspace.grounding"
                    : "shell.runtime"
                }
                block={`${plugin}:id`}
              />
            </span>
          </div>
        </article>
      ))}
      {capability ? (
        <article data-morph-box="slurm:card" className="cm-added-fragment">
          <div className="cm-fragment-header">
            <ChevronDown size={18} />
            <span className="cm-source" data-morph-box="slurm:owner">
              <Words text="slurm" block="slurm:owner" />
            </span>
            <span className="cm-fragment-id">
              <Words text="slurm.capabilities" block="slurm:id" />
            </span>
          </div>
          <div className="cm-fragment-text">
            <Words text={capability} block="slurm:body" />
          </div>
        </article>
      ) : null}
      <h3 className="cm-folded-section">
        <Words text="Domain" block="domain:heading" />
      </h3>
    </div>
  );
}

function measure(root: HTMLElement): PromptLayout {
  const base = root.getBoundingClientRect();
  const words = Array.from(
    root.querySelectorAll<HTMLElement>("[data-morph-word]"),
  ).map((element) => {
    const bounds = element.getBoundingClientRect();
    const css = getComputedStyle(element);
    return {
      id: element.dataset.morphWord!,
      block: element.dataset.morphBlock!,
      text: element.textContent!,
      x: bounds.x - base.x,
      y: bounds.y - base.y,
      width: bounds.width,
      height: bounds.height,
      fontSize: parseFloat(css.fontSize),
      fontWeight: Number(css.fontWeight),
      color: css.color,
      mono: css.fontFamily.includes("Mono"),
    };
  });
  if (
    !words.length ||
    words.some((word) => word.width <= 0 || word.height <= 0)
  )
    throw new Error("A prompt word has no measurable geometry");
  const boxes = Array.from(
    root.querySelectorAll<HTMLElement>("[data-morph-box]"),
  ).map((element) => {
    const bounds = element.getBoundingClientRect(),
      css = getComputedStyle(element);
    return {
      id: element.dataset.morphBox!,
      x: bounds.x - base.x,
      y: bounds.y - base.y,
      width: bounds.width,
      height: bounds.height,
      background: css.backgroundColor,
      border:
        css.borderTopWidth === "0px"
          ? "none"
          : `${css.borderTopWidth} solid ${css.borderTopColor}`,
      radius: parseFloat(css.borderTopLeftRadius),
    };
  });
  return { words, boxes, height: base.height };
}

/** Load fonts and measure every destination once, before any frame is captured. */
export function usePromptLayouts(
  record = false,
): Record<string, PromptLayout> | null {
  const [handle] = useState(() =>
    delayRender("Measure real prompt word layouts", {
      timeoutInMilliseconds: 60000,
    }),
  );
  const [layouts, setLayouts] = useState<Record<string, PromptLayout> | null>(
    null,
  );
  const finished = useRef(false);
  useEffect(() => {
    let cancelled = false;
    void document.fonts.ready
      .then(() => {
        if (cancelled) return;
        const result = Object.fromEntries(
          snapshots.map((snapshot) => {
            const root = document.querySelector<HTMLElement>(
              `[data-prompt-measure="${snapshot.id}"]`,
            );
            if (!root)
              throw new Error(`Missing measurement root ${snapshot.id}`);
            return [snapshot.id, measure(root)];
          }),
        );
        window.__CLIO_PROMPT_LAYOUTS__ = result;
        if (record)
          console.log(`__CLIO_PROMPT_LAYOUTS__${JSON.stringify(result)}`);
        setLayouts(result);
        if (!finished.current) {
          finished.current = true;
          continueRender(handle);
        }
      })
      .catch((error) => cancelRender(error));
    return () => {
      cancelled = true;
    };
  }, [handle, record]);
  return layouts;
}

export function PromptMeasurements() {
  return (
    <div aria-hidden="true" className="cm-measurements">
      {snapshots.map((snapshot) => (
        <div key={snapshot.id} data-prompt-measure={snapshot.id}>
          <PromptDocument snapshot={snapshot} />
        </div>
      ))}
    </div>
  );
}

/** Pure frame-driven word motion, shared by the film and browser review page. */
export function PromptMorph({
  layouts,
  from,
  to,
  progress,
}: {
  layouts: Record<string, PromptLayout>;
  from: string;
  to: string;
  progress: number;
}) {
  const before = layouts[from],
    after = layouts[to];
  if (!before || !after || !byId[from] || !byId[to])
    throw new Error("Unknown prompt state");
  const words = morphWords(before, after, progress),
    boxes = morphBoxes(before, after, progress);
  return (
    <div
      className="cm-morph"
      data-from={from}
      data-to={to}
      data-progress={progress}
    >
      {boxes.map((box) => (
        <div
          key={box.id}
          data-animated-box={box.id}
          style={{
            position: "absolute",
            left: box.x,
            top: box.y,
            width: box.width,
            height: Math.max(0, box.height),
            background: box.background,
            border: box.border,
            borderRadius: box.radius,
            opacity: box.opacity,
          }}
        />
      ))}
      {boxes
        .filter((box) => box.id.endsWith(":card"))
        .map((box) => {
          const Icon =
            box.id === "workspace:card" || box.id === "shell:card"
              ? ChevronRight
              : ChevronDown;
          return (
            <Icon
              key={`${box.id}:icon`}
              size={17}
              style={{
                position: "absolute",
                left: box.x + 14,
                top: box.y + 10,
                opacity: box.opacity,
                color: "#5b7887",
              }}
            />
          );
        })}
      {words.map((word) => {
        const card = boxes.find(
          (box) => box.id === `${word.block.split(":")[0]}:card`,
        );
        const clipped = card
          ? Math.max(0, word.y + word.height - (card.y + card.height))
          : 0;
        return word.opacity > 0.0001 && clipped < word.height ? (
          <span
            key={word.id}
            data-animated-word={word.id}
            data-motion={word.motion}
            style={{
              position: "absolute",
              left: word.x,
              top: word.y,
              whiteSpace: "pre",
              color: word.color,
              opacity: word.opacity,
              fontSize: word.fontSize,
              fontWeight: word.fontWeight,
              lineHeight: `${word.height}px`,
              fontFamily: word.mono
                ? "JetBrains Mono Variable"
                : "Inter Variable",
              borderRadius: 3,
              clipPath: clipped > 0 ? `inset(0 0 ${clipped}px 0)` : undefined,
              background: `rgba(20,153,173,${word.highlight})`,
            }}
          >
            {word.text}
          </span>
        ) : null;
      })}
    </div>
  );
}
