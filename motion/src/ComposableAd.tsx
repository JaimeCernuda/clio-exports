import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
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
  style = {},
}: {
  module: AdModule;
  expand: number;
  style?: React.CSSProperties;
}) {
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
      className="ad-plugin"
      style={{ ...style, height: 76 + (rows.length * 43 + 15) * expand }}
    >
      <div className="ad-plugin-title" style={{ background: module.color }}>
        <Box size={25} />
        <strong>{module.name}</strong>
        <X size={17} />
        <small>
          {module.skills.length} skill{module.skills.length === 1 ? "" : "s"}
          {module.mcpServers.length
            ? ` · ${module.mcpServers.length} MCP`
            : ""}{" "}
          · {module.hooks.length} hook{module.hooks.length === 1 ? "" : "s"}
        </small>
      </div>
      <div
        className="ad-plugin-contents"
        style={{
          opacity: phase(expand, 0.15, 0.7),
          transform: `translateY(${-8 * (1 - expand)}px)`,
        }}
      >
        {rows.map(({ label, value, Icon }) => (
          <div key={`${label}:${value}`}>
            <Icon size={19} />
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function PluginPicker({ frame }: { frame: number }) {
  const open = phase(frame, copy.staging.menuAt, 18),
    select = phase(frame, copy.staging.selectAt, 62),
    retire = phase(frame, copy.staging.selectAt, 22);
  return (
    <>
      <div
        className="ad-plugin-picker"
        style={{
          opacity: open * (1 - retire),
          transform: `translateY(${15 * (1 - open)}px) scale(${0.96 + 0.04 * open})`,
        }}
      >
        <div className="ad-picker-search">
          <Search size={22} />
          <span>Add plugin</span>
          <Plus size={20} />
        </div>
        {copy.choices.map((name) => (
          <div className="ad-picker-row" key={name}>
            <Box size={23} />
            <strong>{name}</strong>
            <ChevronRight size={19} />
          </div>
        ))}
      </div>
      {frame >= copy.staging.selectAt && frame < copy.staging.dockAt ? (
        <PluginPiece
          module={profiles.manufacturing.modules[0]}
          expand={0}
          style={{
            position: "absolute",
            left: mix(1060, 1300, select),
            top: mix(660, 300, select),
            width: mix(560, 470, select),
            opacity: 1,
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
          const handedOff = state.from.id === "base",
            arrival = handedOff ? 1 : phase(p, 0.08, 0.17);
          const expand = phase(p, 0.02, 0.2) * (1 - phase(p, 0.68, 0.29));
          const travelX = phase(p, 0.62, 0.25),
            travelY = phase(p, 0.76, 0.24);
          return (
            <PluginPiece
              key={pose.name}
              module={pose.module}
              expand={expand}
              style={{
                position: "absolute",
                left: mix(1300 + 280 * (1 - arrival), pose.x, travelX),
                top: mix(300, 820, travelY),
                width: mix(470, 310, travelY),
                opacity: arrival * (1 - phase(frame, copy.closing.at, 30)),
                transform: `rotate(${(1 - travelX) * 2 * (1 - arrival)}deg)`,
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
    ? (state.from.id === "base"
        ? phase(frame, copy.staging.selectAt, 62)
        : phase(p, 0, 0.16)) *
      (1 - phase(p, 0.7, 0.3))
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
      <AdOpening frame={frame} />
      <PluginPicker frame={frame} />
      <div
        className="ad-prompt-paper"
        style={{
          left: 340 - 180 * focus,
          top: 465 - height / 2,
          width: 1240,
          height,
          opacity: body * (1 - retire),
          transform: `translateY(${45 * (1 - body)}px) scale(${1 - 0.2 * focus}) rotate(${-1.3 * focus}deg)`,
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
          style={{ background: state.to.color }}
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
