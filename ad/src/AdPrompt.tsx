import React, { useEffect, useRef, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";
import {
  profiles,
  adWords,
  adEditMarks,
  type AdProfile,
  type OpeningGeometry,
} from "./composable-ad-plan";
import type { PromptLayout } from "./prompt-morph";
import { AdOpening } from "./AdOpening";

function Line({ id, text }: { id: string; text: string }) {
  let n = 0;
  return (
    <div className="ad-line">
      {text.split(/(\s+)/u).map((token, i) =>
        /^\s+$/u.test(token) ? (
          <React.Fragment key={`s${i}`}>{token}</React.Fragment>
        ) : token ? (
          <span key={n} data-ad-word={`${id}:${n++}`} data-ad-block={id}>
            {token}
          </span>
        ) : null,
      )}
    </div>
  );
}
export function AdMeasures() {
  return (
    <div className="ad-measurements" aria-hidden="true">
      <AdOpening frame={480} measure />
      {Object.values(profiles).map((profile) => (
        <div
          key={profile.id}
          data-ad-measure={profile.id}
          className="ad-document"
        >
          {profile.lines.map((line) => (
            <Line key={line.id} id={line.id} text={line.text} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Measure the same fonts and flex lockup used by the film before any frame paints. */
export function useAdLayouts(record = false) {
  const [handle] = useState(() =>
    delayRender("Measure prompt and aligned brand lockup"),
  );
  const [layouts, setLayouts] = useState<Record<string, PromptLayout> | null>(
    null,
  );
  const [opening, setOpening] = useState<OpeningGeometry | null>(null),
    done = useRef(false);
  useEffect(() => {
    let active = true;
    void document.fonts.ready
      .then(() => {
        if (!active) return;
        const measured = Object.fromEntries(
          Object.values(profiles).map((profile) => {
            const root = document.querySelector<HTMLElement>(
              `[data-ad-measure="${profile.id}"]`,
            );
            if (!root) throw new Error(`Missing measured prompt ${profile.id}`);
            const origin = root.getBoundingClientRect();
            const words = Array.from(
              root.querySelectorAll<HTMLElement>("[data-ad-word]"),
            ).map((element) => {
              const r = element.getBoundingClientRect(),
                css = getComputedStyle(element);
              return {
                id: element.dataset.adWord!,
                block: element.dataset.adBlock!,
                text: element.textContent!,
                x: r.x - origin.x,
                y: r.y - origin.y,
                width: r.width,
                height: r.height,
                fontSize: parseFloat(css.fontSize),
                fontWeight: Number(css.fontWeight),
                color: css.color,
                mono: true,
              };
            });
            if (
              !words.length ||
              words.some((word) => word.width <= 0 || word.height <= 0)
            )
              throw new Error("Empty prompt geometry");
            return [
              profile.id,
              {
                words,
                boxes: [],
                height: origin.height,
              } satisfies PromptLayout,
            ];
          }),
        );
        const row = document.querySelector<HTMLElement>(
          '[data-ad-opening="measure"]',
        );
        if (!row) throw new Error("Missing aligned lockup measurement");
        const origin = row.getBoundingClientRect();
        const relative = (selector: string) => {
          const element = row.querySelector<HTMLElement>(selector);
          if (!element) throw new Error(`Missing lockup element ${selector}`);
          const box = element.getBoundingClientRect();
          return {
            x: box.x - origin.x,
            y: box.y - origin.y,
            width: box.width,
            height: box.height,
          };
        };
        const openingGeometry = {
          width: origin.width,
          height: origin.height,
          logo: relative("[data-ad-logo]"),
          plus: relative("[data-ad-plus]"),
          brand: relative("[data-ad-brand]"),
          prefix: relative("[data-ad-prefix]"),
          slot: relative("[data-ad-slot]"),
          suffix: relative("[data-ad-suffix]"),
        };
        if (record) {
          console.log(`__CLIO_AD_LAYOUTS__${JSON.stringify(measured)}`);
          console.log(`__CLIO_AD_OPENING__${JSON.stringify(openingGeometry)}`);
          const paper = document.querySelector<HTMLElement>(
            "[data-ad-paper-frame]",
          );
          if (paper) {
            const r = paper.getBoundingClientRect();
            console.log(
              `__CLIO_AD_PAPER__${JSON.stringify({ frame: Number(paper.dataset.adPaperFrame), x: r.x, y: r.y, width: r.width, height: r.height })}`,
            );
          }
          const capabilities = Array.from(
            document.querySelectorAll<HTMLElement>("[data-ad-capability]"),
          ).map((row) => {
            const card = row.getBoundingClientRect(),
              name = row
                .querySelector<HTMLElement>("[data-ad-capability-name]")!
                .getBoundingClientRect();
            return {
              id: row.dataset.adCapability,
              owner: row.dataset.adOwner,
              width: card.width,
              nameRight: name.right - card.left,
              nameLeft: name.left - card.left,
            };
          });
          console.log(
            `__CLIO_AD_CAPABILITIES__${JSON.stringify(capabilities)}`,
          );
          const pluginGeometry = Array.from(
            document.querySelectorAll<HTMLElement>("[data-ad-plugin]"),
          ).map((element) => {
            const card = element.getBoundingClientRect(),
              name = element
                .querySelector<HTMLElement>("[data-ad-plugin-name]")!
                .getBoundingClientRect(),
              close = element
                .querySelector<SVGElement>("[data-ad-plugin-remove]")!
                .getBoundingClientRect();
            return {
              id: element.dataset.adPlugin,
              width: card.width,
              nameRight: name.right - card.left,
              closeLeft: close.left - card.left,
              closeRight: close.right - card.left,
            };
          });
          console.log(`__CLIO_AD_PLUGINS__${JSON.stringify(pluginGeometry)}`);
          const additions = Array.from(
            document.querySelectorAll<HTMLElement>("[data-ad-add-frame]"),
          ).map((element) => {
            const card = element.getBoundingClientRect(),
              label = element
                .querySelector<HTMLElement>("[data-ad-plugin-name]")!
                .getBoundingClientRect();
            return {
              frame: Number(element.dataset.adAddFrame),
              id: element.dataset.adPlugin,
              x: card.x,
              y: card.y,
              width: card.width,
              height: card.height,
              labelX: label.x,
              labelY: label.y,
              labelWidth: label.width,
              labelHeight: label.height,
            };
          });
          console.log(`__CLIO_AD_ADDITIONS__${JSON.stringify(additions)}`);
          const selected = document.querySelector<HTMLElement>(
            "[data-ad-selection-frame]",
          );
          if (selected) {
            const source = document.querySelector<HTMLElement>(
              '[data-ad-picker-choice="Manufacturing"]',
            );
            if (!source)
              throw new Error("Missing menu source for selection handoff");
            const box = (element: Element) => {
              const r = element.getBoundingClientRect();
              return { x: r.x, y: r.y, width: r.width, height: r.height };
            };
            const geometry = {
              frame: Number(selected.dataset.adSelectionFrame),
              source: box(source),
              piece: box(selected),
              sourceName: box(source.querySelector("[data-ad-choice-name]")!),
              pieceName: box(selected.querySelector("[data-ad-plugin-name]")!),
            };
            console.log(`__CLIO_AD_SELECTION__${JSON.stringify(geometry)}`);
          }
        }
        setLayouts(measured);
        setOpening(openingGeometry);
        if (!done.current) {
          done.current = true;
          continueRender(handle);
        }
      })
      .catch(cancelRender);
    return () => {
      active = false;
    };
  }, [handle, record]);
  return { layouts, opening };
}

/** One uniform prompt face, with fragment-scoped edits and no inspector metadata. */
export function AdPromptInk({
  layouts,
  from,
  to,
  p,
  frame,
}: {
  layouts: Record<string, PromptLayout>;
  from: AdProfile;
  to: AdProfile;
  p: number;
  frame: number;
}) {
  return (
    <div className="ad-ink">
      {adEditMarks(layouts[from.id], layouts[to.id], frame).map(
        (mark, index) => (
          <div
            key={`edit-${index}`}
            data-ad-edit={mark.removed ? "removed" : "added"}
            style={{
              position: "absolute",
              left: mark.x - 4,
              top: mark.y - 1,
              width: mark.width + 8,
              height: mark.height + 2,
              background: mark.color,
              borderRadius: 4,
              opacity: mark.opacity,
              borderBottom: mark.removed ? "2px solid #ad645b" : undefined,
            }}
          />
        ),
      )}
      {adWords(layouts[from.id], layouts[to.id], p).map((word) =>
        word.opacity > 0.0001 && word.clipBottom < word.height ? (
          <span
            key={word.id}
            style={{
              position: "absolute",
              left: word.x,
              top: word.y,
              fontSize: word.fontSize,
              fontWeight: word.fontWeight,
              lineHeight: `${word.height}px`,
              color: word.color,
              opacity: word.opacity,
              whiteSpace: "pre",
              letterSpacing: "-0.3px",
              clipPath:
                word.clipBottom > 0
                  ? `inset(0 0 ${word.clipBottom}px 0)`
                  : undefined,
            }}
          >
            {word.text}
          </span>
        ) : null,
      )}
    </div>
  );
}
