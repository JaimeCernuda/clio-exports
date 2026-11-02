import React, { useEffect, useRef, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";
import { profiles, adWords, copy, type AdProfile } from "./composable-ad-plan";
import { morphBoxes, type PromptLayout } from "./prompt-morph";
import { ChevronDown } from "lucide-react";

declare global {
  interface Window {
    __CLIO_AD_LAYOUTS__?: Record<string, PromptLayout>;
  }
}

function Line({ id, text }: { id: string; text: string }) {
  let n = 0;
  const heading = id.endsWith(":heading");
  const owner = copy.modules.find((module) =>
    module.lines.some((line) => line.id === id),
  );
  return (
    <div
      className={`ad-line ${id === "role" ? "ad-line-role" : ""} ${heading ? "ad-line-heading" : ""}`}
      data-ad-box={heading ? id : undefined}
      style={
        heading ? { background: `${owner?.color ?? "#e8f0f3"}70` } : undefined
      }
    >
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
      <div
        data-ad-hook
        className="ad-hook"
        style={{ left: 0, top: 0, fontSize: 80 }}
      >
        <span className="ad-lower-a" style={{ width: 49 }}>
          a
        </span>
        <span data-ad-field className="ad-field">
          composable
        </span>
        <span className="ad-hook-agent">agent</span>
      </div>
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

export function useAdLayouts(record = false) {
  const [handle] = useState(() =>
    delayRender("Measure advertisement typography"),
  );
  const [layouts, setLayouts] = useState<Record<string, PromptLayout> | null>(
      null,
    ),
    done = useRef(false);
  const [hook, setHook] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
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
            if (!root)
              throw new Error(`Missing measured profile ${profile.id}`);
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
                mono: false,
              };
            });
            if (
              !words.length ||
              words.some((word) => word.width <= 0 || word.height <= 0)
            )
              throw new Error("Empty advertising text geometry");
            return [
              profile.id,
              {
                words,
                boxes: Array.from(
                  root.querySelectorAll<HTMLElement>("[data-ad-box]"),
                ).map((element) => {
                  const box = element.getBoundingClientRect();
                  return {
                    id: element.dataset.adBox!,
                    x: box.x - origin.x,
                    y: box.y - origin.y + 8,
                    width: box.width,
                    height: box.height - 8,
                    background: getComputedStyle(element).backgroundColor,
                    border: "transparent",
                    radius: 6,
                  };
                }),
                height: origin.height,
              } satisfies PromptLayout,
            ];
          }),
        );
        window.__CLIO_AD_LAYOUTS__ = measured;
        if (record)
          console.log(`__CLIO_AD_LAYOUTS__${JSON.stringify(measured)}`);
        const hookRoot = document.querySelector<HTMLElement>("[data-ad-hook]");
        const hookField =
          document.querySelector<HTMLElement>("[data-ad-field]");
        if (!hookRoot || !hookField)
          throw new Error("Missing hook typography measurement");
        const origin = hookRoot.getBoundingClientRect(),
          field = hookField.getBoundingClientRect();
        setHook({
          x: field.x - origin.x,
          y: field.y - origin.y,
          width: field.width,
          height: field.height,
        });
        setLayouts(measured);
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
  return { layouts, hook };
}

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
      {morphBoxes(layouts[from.id], layouts[to.id], p).map((box) => (
        <div
          key={box.id}
          style={{
            position: "absolute",
            left: box.x,
            top: box.y,
            width: box.width,
            height: box.height,
            borderRadius: box.radius,
            background: box.background,
            opacity: box.opacity,
            overflow: "hidden",
          }}
        >
          <ChevronDown
            size={18}
            style={{ position: "absolute", left: 10, top: 8 }}
          />
        </div>
      ))}
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
              letterSpacing: "-0.35px",
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
