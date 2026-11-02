import { Img, staticFile } from "remotion";
import { Plus } from "lucide-react";
import {
  adWheel,
  adOpeningCase,
  copy,
  type OpeningGeometry,
} from "./composable-ad-plan";
import { phase } from "./prompt-morph";

/** A and agent remain fixed while whole domain words rotate in one vertical slot. */
export function AdOpening({
  frame,
  measure = false,
  geometry,
}: {
  frame: number;
  measure?: boolean;
  geometry?: OpeningGeometry | null;
}) {
  const brand = phase(frame, copy.staging.brandAt, 58),
    plus = phase(frame, copy.staging.plusAt, 26),
    wheel = adWheel(frame);
  const font = 96 - 20 * brand;
  const brandWidth = geometry?.brand?.width ?? 300,
    sentenceCase = adOpeningCase(frame);
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
        data-ad-brand
        className="ad-opening-brand"
        style={{
          width: measure ? "auto" : brand * brandWidth,
          marginRight: 20 * brand,
          opacity: brand,
        }}
      >
        <div
          className="ad-opening-brand-content"
          style={{
            position: measure ? "relative" : "absolute",
            width: measure ? "auto" : brandWidth,
            transform: measure ? undefined : `scale(${brand})`,
          }}
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
      </div>
      <div
        data-ad-prefix
        className="ad-opening-prefix"
        style={{
          width: measure
            ? "auto"
            : 70 + ((geometry?.prefix?.width ?? 40) - 70) * brand,
          marginRight: 20,
        }}
      >
        {measure ? (
          "a"
        ) : (
          <>
            <span
              className="ad-prefix-letter"
              style={{
                opacity: sentenceCase.upper,
                transform: `translateY(${-8 * (1 - sentenceCase.upper)}px)`,
              }}
            >
              A
            </span>
            <span
              className="ad-prefix-letter"
              style={{
                opacity: sentenceCase.lower,
                transform: `translateY(${8 * (1 - sentenceCase.lower)}px)`,
              }}
            >
              a
            </span>
          </>
        )}
      </div>
      <div
        data-ad-slot
        className="ad-word-slot"
        style={{
          width: measure
            ? "auto"
            : 820 + ((geometry?.slot?.width ?? 460) - 820) * brand,
          marginRight: 20,
        }}
      >
        <div
          className="ad-word-viewport"
          style={{
            filter: `blur(${wheel.blur}px)`,
            position: measure ? "relative" : undefined,
          }}
        >
          {copy.wheel.words.map((word, i) =>
            measure && i !== copy.wheel.words.length - 1 ? null : (
              <div
                key={`${i}-${word}`}
                className="ad-wheel-line"
                style={{
                  position: measure ? "relative" : undefined,
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
            ),
          )}
        </div>
      </div>
      <div
        data-ad-suffix
        className="ad-opening-suffix"
        style={{
          width: measure
            ? "auto"
            : 260 + ((geometry?.suffix?.width ?? 190) - 260) * brand,
          marginRight: 20 * plus,
        }}
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
