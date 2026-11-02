import { Img, staticFile } from "remotion";
import { Plus } from "lucide-react";
import { adWheel, copy } from "./composable-ad-plan";
import { phase } from "./prompt-morph";

/** A and agent remain fixed while whole domain words rotate in one vertical slot. */
export function AdOpening({
  frame,
  measure = false,
}: {
  frame: number;
  measure?: boolean;
}) {
  const brand = phase(frame, copy.staging.brandAt, 58),
    plus = phase(frame, copy.staging.plusAt, 26),
    wheel = adWheel(frame);
  const font = 96 - 20 * brand;
  return (
    <div
      data-ad-opening={measure ? "measure" : undefined}
      className={`ad-opening ${measure ? "ad-opening-measure" : ""}`}
      style={{
        fontSize: font,
        opacity: measure ? 1 : 1 - phase(frame, 500, 35),
      }}
    >
      <div
        className="ad-opening-brand"
        style={{ width: brand * 360, opacity: brand }}
      >
        <Img
          data-ad-logo
          src={staticFile("clio-mark.svg")}
          style={{
            width: 84,
            height: 84,
            opacity: measure || frame < 500 ? 1 : 0,
          }}
        />
        <strong>CLIO:</strong>
      </div>
      <div
        className="ad-opening-prefix"
        style={{ width: 70 - 26 * brand, marginRight: 20 }}
      >
        {brand < 0.5 ? "A" : "a"}
      </div>
      <div
        className="ad-word-slot"
        style={{ width: 820 - 300 * brand, marginRight: 20 }}
      >
        <div
          className="ad-word-viewport"
          style={{ filter: `blur(${wheel.blur}px)` }}
        >
          {copy.wheel.words.map((word, i) => (
            <div
              key={`${i}-${word}`}
              className="ad-wheel-line"
              style={{
                transform: `translateY(${(i - wheel.position) * 124}px)`,
                opacity:
                  Math.max(0, 1 - Math.abs(i - wheel.position) * 0.35) *
                  (i === copy.wheel.words.length - 1
                    ? 1
                    : 1 - phase(frame, copy.wheel.end, 18)),
              }}
            >
              <span
                style={{
                  background:
                    word === "composable"
                      ? "#cee6f4"
                      : copy.wheel.colors[i % copy.wheel.colors.length],
                }}
              >
                {word}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div
        className="ad-opening-suffix"
        style={{ width: 260 - 50 * brand, marginRight: 20 * plus }}
      >
        agent
      </div>
      <div
        data-ad-plus
        className="ad-opening-plus"
        style={{ width: 80 * plus, opacity: plus }}
      >
        <Plus size={38} />
      </div>
    </div>
  );
}
