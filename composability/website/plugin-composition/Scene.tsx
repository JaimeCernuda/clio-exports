import { AbsoluteFill, useCurrentFrame } from "remotion";
import { adState, paper } from "../../ad/src/composable-ad-plan";
import { AdPluginChooser } from "../../ad/src/AdPluginChooser";
import { AdCapabilities } from "../../ad/src/AdCapabilities";
import { AdMeasures, AdPromptInk, useAdLayouts } from "../../ad/src/AdPrompt";
import { sourceFrame, opacity, offer, control, pointer } from "./plan";

/** Native-derived prompt and plugin pieces, framed for the page without ad bookends. */
export function PluginComposition() {
  const frame = useCurrentFrame(),
    source = sourceFrame(frame),
    state = adState(source),
    cursor = pointer(frame),
    { layouts } = useAdLayouts();
  return (
    <AbsoluteFill className="website-film">
      <AdMeasures />
      <div
        className="web-composition-world"
        style={{ opacity: opacity(frame) }}
      >
        <div
          className="ad-prompt-paper"
          style={{
            left: paper.x,
            top: paper.y,
            width: paper.width,
            height: paper.height,
            transform: `scale(${paper.scale})`,
          }}
        >
          <div className="ad-prompt-content">
            {layouts ? (
              <AdPromptInk layouts={layouts} {...state} frame={source} />
            ) : null}
          </div>
          <div
            className="ad-domain-rule"
            style={{ background: state.to.color }}
          />
        </div>
        <AdCapabilities
          frame={source}
          offerOverride={offer(frame)}
          controlFor={(id) => control(frame, id)}
        />
        <AdPluginChooser frame={source} includeBase />
        <svg
          className="ad-cursor"
          width={34}
          height={43}
          viewBox="0 0 34 43"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: `scale(${1 - 0.1 * cursor.press})`,
          }}
        >
          <path
            d="M4 3 L5 33 L13 25 L19 39 L25 36 L19 23 L30 22 Z"
            fill="white"
            stroke="#15384b"
            strokeWidth={2.2}
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </AbsoluteFill>
  );
}
