import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  interpolateColors,
} from "remotion";
import {
  ArrowUpRight,
  Box,
  ChevronRight,
  Database,
  FileText,
  Plus,
  Search,
  Sparkles,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import {
  adPointer,
  adPluginPoses,
  adInspection,
  adSelection,
  adMenu,
  adContributionOpacity,
  adState,
  copy,
  profiles,
  type AdModule,
} from "./composable-ad-plan";
import { ease, phase } from "./prompt-morph";
import { AdMeasures, AdPromptInk, useAdLayouts } from "./AdPrompt";
import { AdOpening } from "./AdOpening";
import "./composable-ad.css";

const mix = (a: number, b: number, p: number) => a + (b - a) * p;

/** The native contribution hierarchy belongs to its plugin, including hooks. */
function PluginPiece({
  module,
  expand,
  bodyOpacity = 0,
  frame,
  inspectionAt,
  selectionProgress,
  style = {},
}: {
  module: AdModule;
  expand: number;
  bodyOpacity?: number;
  frame?: number;
  inspectionAt?: number;
  selectionProgress?: number;
  style?: React.CSSProperties;
}) {
  const morph = selectionProgress ?? 1,
    headerHeight = 58 + 18 * morph,
    meta = phase(morph, 0.85, 0.15);
  const rows = [
    {
      label: "Prompt",
      value: module.role ? "Identity + workflow" : "Workflow instructions",
      Icon: FileText,
    },
    ...module.skills.map((value) => ({
      label: "Skills",
      value,
      Icon: Sparkles,
    })),
    ...module.mcpServers.map((value) => ({
      label: "MCP servers",
      value,
      Icon: Database,
    })),
    ...module.tools.map((value) => ({ label: "Tools", value, Icon: Wrench })),
    ...module.hooks.map((value) => ({ label: "Hooks", value, Icon: Zap })),
  ];
  return (
    <div
      className="ad-plugin-frame"
      data-ad-plugin={module.id}
      data-ad-selection-frame={
        selectionProgress !== undefined ? frame : undefined
      }
      style={{
        ...style,
        height: headerHeight + (rows.length * 43 + 15) * expand,
      }}
    >
      <div
        className="ad-plugin"
        style={{
          borderRadius: 8 + 7 * morph,
          borderColor: `rgba(202,221,229,${morph})`,
          clipPath: `inset(0 round ${8 + 7 * morph}px)`,
        }}
      >
        <div
          className="ad-plugin-title"
          style={{
            background: module.color,
            height: headerHeight,
            paddingLeft: 17 + 3 * morph,
            gap: 14 - 2 * morph,
          }}
        >
          <Box size={23 + 2 * morph} style={{ marginTop: 3.5 - 1.5 * morph }} />
          <strong
            data-ad-plugin-name
            style={{
              fontSize: 25 + morph,
              fontWeight: 500 + 50 * morph,
              letterSpacing: -0.7 * morph,
            }}
          >
            {module.name}
          </strong>
          <span
            className="ad-plugin-control"
            style={{ right: 17 + 3 * morph, top: 18.5 - 0.5 * morph }}
          >
            <ChevronRight
              size={19}
              style={{ opacity: 1 - phase(morph, 0, 0.4) }}
            />
            <X
              data-ad-plugin-remove
              size={17}
              style={{ left: 1, top: 1, opacity: phase(morph, 0.6, 0.4) }}
            />
          </span>
          {meta > 0.001 ? (
            <small style={{ opacity: meta }}>
              {module.skills.length} skill
              {module.skills.length === 1 ? "" : "s"}
              {module.mcpServers.length
                ? ` · ${module.mcpServers.length} MCP`
                : ""}{" "}
              · {module.hooks.length} hook{module.hooks.length === 1 ? "" : "s"}
            </small>
          ) : null}
        </div>
        {bodyOpacity > 0.001 && expand > 0.001 ? (
          <div className="ad-plugin-contents">
            {rows.map(({ label, value, Icon }, index) => (
              <div
                key={`${label}:${value}`}
                style={{
                  opacity:
                    frame !== undefined && inspectionAt !== undefined
                      ? adContributionOpacity(frame, inspectionAt, index)
                      : bodyOpacity,
                }}
              >
                <Icon size={21} />
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

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
        <PluginPiece
          module={profiles.manufacturing.modules[0]}
          expand={0}
          frame={frame}
          selectionProgress={selected.morph}
          style={{
            position: "absolute",
            left: selected.x,
            top: selected.y,
            width: selected.width,
            opacity: 1,
            boxShadow: `0 17px 42px rgba(21,56,75,${0.0784 * selected.morph})`,
            zIndex: 12,
          }}
        />
      ) : null}
    </>
  );
}

/** A plugin is inspected, then the same row docks; capabilities are never added alone. */
function Composition({ frame }: { frame: number }) {
  const state = adState(frame),
    p = state.p,
    poses = adPluginPoses(state.from, state.to, p);
  return (
    <>
      {poses.map((pose) => {
        const inspected = pose.added && state.change?.bundle;
        if (inspected) {
          const target = adPluginPoses(state.from, state.to, 1).find(
            (item) => item.name === pose.name,
          )!;
          const actor = adInspection(
            frame,
            state.change!.at,
            target.x,
            state.from.id === "base",
          );
          return (
            <PluginPiece
              key={pose.name}
              module={pose.module}
              expand={actor.expand}
              bodyOpacity={actor.bodyOpacity}
              frame={frame}
              inspectionAt={state.change!.at}
              style={{
                position: "absolute",
                left: actor.x,
                top: actor.y,
                width: actor.width,
                opacity:
                  actor.opacity * (1 - phase(frame, copy.closing.at, 30)),
                zIndex: 8,
              }}
            />
          );
        }
        return (
          <PluginPiece
            key={pose.name}
            module={pose.module}
            expand={0}
            style={{
              position: "absolute",
              left: pose.x,
              top: 820 - (pose.kept ? 0 : 35 * (1 - pose.opacity)),
              width: pose.width,
              opacity: pose.opacity * (1 - phase(frame, copy.closing.at, 30)),
              zIndex: 5,
            }}
          />
        );
      })}
    </>
  );
}

/** A single visual argument: compose a plugin bundle, then reuse it across domains. */
export function ComposableAd({
  auditLayouts = false,
}: {
  auditLayouts?: boolean;
}) {
  const frame = useCurrentFrame(),
    { layouts, opening } = useAdLayouts(auditLayouts),
    state = adState(frame),
    p = state.p,
    t = ease(p);
  const body = phase(frame, copy.staging.promptAt, 70),
    retire = phase(frame, copy.closing.at, 32),
    brandClose = phase(frame, copy.closing.at + 14, 46),
    end = phase(frame, copy.closing.at + 46, 14);
  const inspected = Boolean(state.change?.bundle);
  const focus = inspected
    ? adInspection(frame, state.change!.at, 805, state.from.id === "base").focus
    : !state.change
      ? adSelection(frame).focus
      : 0;
  const height = layouts
    ? mix(layouts[state.from.id].height, layouts[state.to.id].height, t) + 96
    : 316;
  const pointer = adPointer(frame, opening);
  const startLogo = opening
    ? {
        x: 960 - opening.width / 2 + opening.logo.x,
        y: 540 - opening.height / 2 + opening.logo.y,
      }
    : { x: 260, y: 498 };
  const logoTravel = phase(frame, 500, 100);
  return (
    <AbsoluteFill className="ad-film">
      <AdMeasures />
      <AdOpening frame={frame} geometry={opening} />
      <PluginPicker frame={frame} />
      <div
        className="ad-prompt-paper"
        style={{
          left: 340 - 180 * focus,
          top: 465 - height / 2,
          width: 1240,
          height,
          opacity: body * (1 - retire),
          transform: `translateY(${20 * (1 - body)}px) scale(${1 - 0.2 * focus}) rotate(${-1.3 * focus}deg)`,
        }}
      >
        <div className="ad-prompt-content">
          {layouts ? (
            <AdPromptInk
              layouts={layouts}
              from={state.from}
              to={state.to}
              p={p}
            />
          ) : null}
        </div>
        <div
          className="ad-domain-rule"
          style={{
            background: interpolateColors(
              p,
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
      <Composition frame={frame} />
      {frame >= 500 ? (
        <Img
          src={staticFile("clio-mark.svg")}
          className="ad-brand-owl"
          style={{
            left: mix(mix(startLogo.x, 245, logoTravel), 530, brandClose),
            top: mix(mix(startLogo.y, 160, logoTravel), 490, brandClose),
            width: mix(mix(84, 72, logoTravel), 148, brandClose),
            height: mix(mix(84, 72, logoTravel), 148, brandClose),
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
        <small>
          clio.iowarp.ai <ArrowUpRight size={25} />
        </small>
      </div>
      <Img
        className="ad-close-qr"
        src={staticFile("composable/clio-qr-white.svg")}
        style={{ opacity: end }}
      />
    </AbsoluteFill>
  );
}
