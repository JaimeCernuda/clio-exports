import { copy } from "../../ad/src/composable-ad-plan";

/** A cyclic, editable word slot; adjoining words continue across the loop join. */
export function KeywordWheel({
  position,
  blur,
  words,
  neighborOpacity = 1,
}: {
  position: number;
  blur: number;
  words: readonly string[];
  neighborOpacity?: number;
}) {
  const center = Math.floor(position);
  return (
    <div className="web-heading">
      <span className="web-prefix">A</span>
      <div className="web-word-slot">
        <div
          className="web-word-viewport"
          style={{ filter: blur > 0 ? "url(#web-wheel-blur)" : undefined }}
        >
          {Array.from({ length: 5 }, (_, i) => center + i - 2).map((index) => {
            const normalized =
                ((index % words.length) + words.length) % words.length,
              word = words[normalized],
              distance = index - position;
            return (
              <div
                className="web-wheel-row"
                key={index}
                style={{
                  transform: `translateY(${distance * 124}px)`,
                  opacity:
                    Math.max(0, 1 - Math.abs(distance) * 0.35) *
                    (index === Math.round(position) ? 1 : neighborOpacity),
                }}
              >
                <span
                  style={{
                    background:
                      word === "composable"
                        ? "#cee6f4"
                        : copy.wheel.colors[
                            normalized % copy.wheel.colors.length
                          ],
                  }}
                >
                  {word}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <span className="web-suffix">agent</span>
      <svg width={0} height={0} aria-hidden="true">
        <defs>
          <filter
            id="web-wheel-blur"
            x="-5%"
            y="-30%"
            width="110%"
            height="160%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation={`0 ${blur}`} />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
