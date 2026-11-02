import React, { useEffect, useRef, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";
import {
  profiles,
  adWords,
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
        };
        if (record) {
          console.log(`__CLIO_AD_LAYOUTS__${JSON.stringify(measured)}`);
          console.log(`__CLIO_AD_OPENING__${JSON.stringify(openingGeometry)}`);
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
}: {
  layouts: Record<string, PromptLayout>;
  from: AdProfile;
  to: AdProfile;
  p: number;
}) {
  return (
    <div className="ad-ink">
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
