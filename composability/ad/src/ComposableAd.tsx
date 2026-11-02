import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  interpolateColors,
} from "remotion";
import { Box, ChevronRight, Plus, Search } from "lucide-react";
import {
  adPointer,
  adBrandPose,
  adPromptOpacity,
  adSelection,
  adMenu,
  adState,
  copy,
  paper,
  profiles,
} from "./composable-ad-plan";
import { phase } from "./prompt-morph";
import { AdMeasures, AdPromptInk, useAdLayouts } from "./AdPrompt";
import { AdOpening } from "./AdOpening";
import { AdCapabilities, PluginNode } from "./AdCapabilities";
import { AdPluginChooser } from "./AdPluginChooser";
import "./composable-ad.css";

function PluginPicker({ frame }: { frame: number }) {
  const open = phase(frame, copy.staging.menuAt, 18),
    selected = adSelection(frame),
    menu = adMenu(frame);
  return (
    <>
      <div
        className="ad-plugin-picker"
        style={{
          opacity: menu.opacity,
          transform: `translateY(${15 * (1 - open)}px) scale(${0.96 + 0.04 * open})`,
        }}
      >
        <div className="ad-picker-search">
          <Search size={22} />
          <span>Add plugin</span>
          <Plus size={20} />
        </div>
        {copy.choices.map((name) => (
          <div
            className="ad-picker-row"
            data-ad-picker-choice={name}
            key={name}
            style={
              name === "Manufacturing"
                ? {
                    background: `rgba(255,220,155,${menu.hover})`,
                    opacity: menu.sourceOpacity,
                  }
                : undefined
            }
          >
            <Box size={23} />
            <strong data-ad-choice-name>{name}</strong>
            <ChevronRight size={19} />
          </div>
        ))}
      </div>
      {frame >= copy.staging.selectAt && frame < copy.staging.dockAt ? (
        <PluginNode
          module={profiles.manufacturing.modules[0]}
          frame={frame}
          morph={selected.morph}
          selected
          style={{
            position: "absolute",
            left: selected.x,
            top: selected.y,
            width: selected.width,
            opacity: 1,
            zIndex: 12,
          }}
        />
      ) : null}
    </>
  );
}

/** One fixed prompt and a persistent tree show composition without repeated zooms. */
export function ComposableAd({
  auditLayouts = false,
}: {
  auditLayouts?: boolean;
}) {
  const frame = useCurrentFrame(),
    { layouts, opening } = useAdLayouts(auditLayouts),
    state = adState(frame),
    end = phase(frame, copy.closing.at + 46, 14),
    pointer = adPointer(frame, opening),
    logo = opening ? adBrandPose(frame, opening) : null;
  return (
    <AbsoluteFill className="ad-film">
      <AdMeasures />
      <AdOpening frame={frame} geometry={opening} />
      <PluginPicker frame={frame} />
      <div
        className="ad-prompt-paper"
        data-ad-paper-frame={frame}
        style={{
          left: paper.x,
          top: paper.y,
          width: paper.width,
          height: paper.height,
          opacity: adPromptOpacity(frame),
          transform: `scale(${paper.scale})`,
        }}
      >
        <div className="ad-prompt-content">
          {layouts ? (
            <AdPromptInk
              layouts={layouts}
              from={state.from}
              to={state.to}
              p={state.p}
              frame={frame}
            />
          ) : null}
        </div>
        <div
          className="ad-domain-rule"
          style={{
            background: interpolateColors(
              state.p,
              [0, 0.18, 0.47, 1],
              [
                state.from.color,
                state.from.color,
                state.to.color,
                state.to.color,
              ],
            ),
          }}
        />
      </div>
      <AdCapabilities frame={frame} />
      <AdPluginChooser frame={frame} />
      {frame >= copy.staging.menuAt + 10 && logo ? (
        <Img
          src={staticFile("clio-mark.svg")}
          className="ad-brand-owl"
          style={{
            left: logo.x,
            top: logo.y,
            width: logo.width,
            height: logo.height,
          }}
        />
      ) : null}
      <svg
        className="ad-cursor"
        width={34}
        height={43}
        viewBox="0 0 34 43"
        style={{
          left: pointer.x,
          top: pointer.y,
          opacity: pointer.opacity,
          transform: `scale(${1 - 0.1 * pointer.press})`,
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
      <div className="ad-close-wordmark" style={{ opacity: end }}>
        CLIO
      </div>
      <div
        className="ad-close-copy"
        style={{ opacity: end, transform: `translateY(${12 * (1 - end)}px)` }}
      >
        <div>
          Build your <span>own.</span>
        </div>
        <small data-ad-url>clio.iowarp.ai</small>
      </div>
      <Img
        className="ad-close-qr"
        data-ad-close-qr
        src={staticFile("composable/clio-qr-white.svg")}
        style={{ opacity: end }}
      />
      <div
        className="ad-close-credit"
        data-ad-credit
        style={{ opacity: end, transform: `translateY(${12 * (1 - end)}px)` }}
      >
        <Img
          data-ad-credit-logo
          src={staticFile("grc-logo.png")}
          alt="Gnosis Research Center"
        />
        <div>
          <div data-ad-credit-system>{copy.closing.credit.system}</div>
          <div data-ad-credit-byline>{copy.closing.credit.byline}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
