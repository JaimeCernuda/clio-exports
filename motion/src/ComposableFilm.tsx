import { pointerAt } from "./composable-pointer";
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import {
  ArrowUpRight,
  Bot,
  Check,
  ChevronDown,
  Expand,
  FileText,
  Layers,
  Plus,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  byId,
  transformationAt,
  transformations,
  type PromptSnapshot,
} from "./composable-plan";
import { ease, phase } from "./prompt-morph";
import {
  PromptMeasurements,
  PromptMorph,
  usePromptLayouts,
} from "./PromptMorph";
import "./composable.css";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const snapshotLabel: Record<string, string> = {
  clio: "A composable agent.",
  "clio-slurm": "Your tools.",
  factorio: "Your field.",
  "factorio-ndp": "Your connections.",
  earthscope: "Earth science.",
  opal: "Plant science.",
  "clio-data": "Scientific data.",
};

function PluginList({
  from,
  to,
  progress,
}: {
  from: PromptSnapshot;
  to: PromptSnapshot;
  progress: number;
}) {
  const t = ease(progress);
  const plugins = [...new Set([...from.plugins, ...to.plugins])];
  const moving = from.plugins
    .filter(
      (plugin) =>
        to.plugins.includes(plugin) &&
        from.plugins.indexOf(plugin) !== to.plugins.indexOf(plugin),
    )
    .map((plugin) => {
      const a = from.plugins.indexOf(plugin),
        b = to.plugins.indexOf(plugin);
      return {
        x: lerp((a % 2) * 245, (b % 2) * 245, t),
        y: lerp(Math.floor(a / 2) * 47, Math.floor(b / 2) * 47, t),
      };
    });
  return (
    <div className="cm-plugin-grid">
      {plugins.map((plugin) => {
        const before = from.plugins.indexOf(plugin),
          after = to.plugins.indexOf(plugin);
        const a = before < 0 ? after : before,
          b = after < 0 ? before : after;
        const destination = { x: (b % 2) * 245, y: Math.floor(b / 2) * 47 };
        const clearance = Math.min(
          1,
          ...moving
            .filter((point) => Math.abs(point.x - destination.x) < 230)
            .map((point) => ease((Math.abs(point.y - destination.y) - 38) / 9)),
        );
        return (
          <div
            key={plugin}
            style={{
              position: "absolute",
              left: lerp((a % 2) * 245, (b % 2) * 245, t),
              top: lerp(Math.floor(a / 2) * 47, Math.floor(b / 2) * 47, t),
              width: 235,
              opacity:
                before < 0
                  ? ease((progress - 0.3) / 0.65) * clearance
                  : after < 0
                    ? 1 - ease(progress / 0.35)
                    : 1,
            }}
            className={`cm-plugin-chip ${plugin === "slurm" || plugin === "ndp" ? "cm-plugin-accent" : ""}`}
          >
            <Layers size={17} />
            <span>{plugin}</span>
            <Check size={14} />
          </div>
        );
      })}
    </div>
  );
}

function Pointer({ frame }: { frame: number }) {
  const p = pointerAt(frame);
  return (
    <svg
      className="cm-pointer"
      width={34}
      height={43}
      viewBox="0 0 34 43"
      style={{
        left: p.x,
        top: p.y,
        opacity: p.opacity,
        transform: `scale(${1 - 0.1 * p.pressed})`,
      }}
    >
      <path
        d="M4 3 L5 33 L13 25 L19 39 L25 36 L19 23 L30 22 Z"
        fill="#fff"
        stroke="#173746"
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Editable, source-bound configuration film. All motion follows the render frame. */
export function ComposableFilm({
  frameOverride,
  auditLayouts = false,
}: {
  frameOverride?: number;
  auditLayouts?: boolean;
}) {
  const remotionFrame = useCurrentFrame(),
    frame = frameOverride ?? remotionFrame;
  const layouts = usePromptLayouts(auditLayouts);
  const state = transformationAt(frame),
    t = ease(state.progress);
  const selected = state.progress < 0.45 ? state.from : state.to;
  const opening = phase(frame, 119, 64),
    promptOpen = phase(frame, 202, 22);
  const outro = phase(frame, 1452, 42);
  const x = lerp(704, 100, opening);
  const menu = transformations.find(
    (change) =>
      change.action !== "montage" &&
      frame >= change.menuAt &&
      frame < change.at,
  );
  const menuIsSwitch = menu?.action === "switch";
  const menuOpen = menu
    ? phase(frame, menu.menuAt, 12) * (1 - phase(frame, menu.click + 4, 10))
    : 0;
  const revealSkill = phase(frame, 544, 24) * (1 - phase(frame, 1190, 22));
  return (
    <AbsoluteFill className="cm-film">
      <PromptMeasurements />
      <div className="cm-editorial-title" style={{ opacity: 1 - outro }}>
        {[state.from, state.to]
          .filter(
            (snapshot, index) =>
              index === 1 ||
              snapshotLabel[snapshot.id] !== snapshotLabel[state.to.id],
          )
          .map((snapshot) => {
            const index = snapshot.id === state.to.id ? 1 : 0;
            const same =
              snapshotLabel[state.from.id] === snapshotLabel[state.to.id];
            return (
              <div
                key={index}
                style={{
                  position: "absolute",
                  transform: `translateY(${same ? 0 : index ? 60 * (1 - t) : -60 * t}px)`,
                }}
              >
                {snapshotLabel[snapshot.id]}
              </div>
            );
          })}
      </div>
      <div
        className="cm-workspace"
        style={{
          opacity: 1 - outro,
          transform: `translateY(${-18 * outro}px) scale(${1 - 0.025 * outro})`,
        }}
      >
        <header className="cm-window-header">
          <Img src={staticFile("clio-mark.svg")} className="cm-window-logo" />
          <span>New session</span>
          <span className="cm-divider">/</span>
          <span className="cm-agent-button">
            {selected.agent.name}
            <ChevronDown size={14} />
          </span>
          <Plus size={19} />
          <span className="cm-header-right">
            <ShieldCheck size={19} />
            <span>Ask first</span>
          </span>
        </header>
        <div className="cm-agent-overview" style={{ left: x - 60 }}>
          <div className="cm-agent-heading">
            <Bot size={30} />
            <div className="cm-name-mask">
              {[state.from, state.to]
                .filter(
                  (snapshot, index) =>
                    index === 1 || snapshot.agent.name !== state.to.agent.name,
                )
                .map((snapshot) => {
                  const index = snapshot.id === state.to.id ? 1 : 0;
                  const same = state.from.agent.name === state.to.agent.name;
                  return (
                    <span
                      key={index}
                      style={{
                        transform: `translateY(${same ? 0 : index ? 58 * (1 - t) : -58 * t}px)`,
                      }}
                    >
                      {snapshot.agent.name}
                    </span>
                  );
                })}
            </div>
          </div>
          <div className="cm-agent-role">
            {[state.from, state.to]
              .filter(
                (snapshot, index) =>
                  index === 1 || snapshot.agent.role !== state.to.agent.role,
              )
              .map((snapshot) => {
                const index = snapshot.id === state.to.id ? 1 : 0;
                const same = state.from.agent.role === state.to.agent.role;
                return (
                  <p
                    key={index}
                    style={{
                      opacity: same
                        ? 1
                        : index
                          ? ease((state.progress - 0.36) / 0.58)
                          : 1 - ease(state.progress / 0.38),
                    }}
                  >
                    {snapshot.agent.role}
                  </p>
                );
              })}
          </div>
          <div className="cm-actions">
            <div>
              <Plus size={17} />
              Add plugin
            </div>
            <div>
              <Bot size={17} />
              Switch agent
            </div>
          </div>
          <h3 className="cm-plugins-label">Plugins</h3>
          <div className="cm-plugin-layers">
            <PluginList
              from={state.from}
              to={state.to}
              progress={state.progress}
            />
          </div>
        </div>
        <aside
          className="cm-drawer"
          style={{ transform: `translateX(${(1 - opening) * 1220}px)` }}
        >
          <div className="cm-drawer-header">
            <Bot size={20} />
            <strong>Agent</strong>
            <span className="cm-drawer-icons">
              <Plus size={20} />
              <Expand size={19} />
              <X size={18} />
            </span>
          </div>
          <div className="cm-drawer-tabs">
            <span>Plugins</span>
            <span className="cm-tab-active">
              <FileText size={17} />
              Prompt
            </span>
          </div>
          <div className="cm-prompt-tools">
            <div>
              <Search size={17} />
              <span>Search the prompt</span>
            </div>
            <span>Collapse all</span>
          </div>
          <div className="cm-prompt-viewport" style={{ opacity: promptOpen }}>
            {layouts ? (
              <PromptMorph
                layouts={layouts}
                from={state.from.id}
                to={state.to.id}
                progress={state.progress}
              />
            ) : null}
          </div>
        </aside>
      </div>
      <div
        className="cm-contribution"
        style={{
          opacity: revealSkill * (1 - outro),
          transform: `translateY(${8 * (1 - revealSkill)}px)`,
        }}
      >
        <Check size={18} />
        <span>{selected.id === "factorio-ndp" ? "MCP" : "Skill"}</span>
        <strong>
          {selected.id === "factorio-ndp" ? "ndp" : "hpc-batch-jobs"}
        </strong>
      </div>
      {menu ? (
        <div
          className="cm-native-menu"
          style={{
            left: menuIsSwitch ? 270 : 100,
            top: 464,
            opacity: menuOpen * (1 - outro),
            transform: `translateY(${5 * (1 - menuOpen)}px)`,
          }}
        >
          <div className="cm-menu-search">
            <Search size={17} />
            {(menuIsSwitch ? menu.label : menu.label.toLowerCase()).slice(
              0,
              Math.max(0, Math.floor((frame - menu.menuAt - 16) / 3)),
            )}
          </div>
          <div className="cm-menu-category">
            {menuIsSwitch ? "Installed agents" : "Available plugins"}
          </div>
          <div className="cm-menu-item cm-menu-selected">
            {menuIsSwitch ? <Bot size={19} /> : <Plus size={19} />}
            <strong>
              {menu.label === "Slurm"
                ? "slurm"
                : menu.label === "NDP"
                  ? "ndp"
                  : menu.label}
            </strong>
          </div>
          <div className="cm-menu-detail">
            {menuIsSwitch
              ? "Manufacturing and materials science"
              : menu.label === "Slurm"
                ? "Slurm batch jobs · hpc-batch-jobs"
                : "National Data Platform · MCP server"}
          </div>
          {menuIsSwitch ? (
            <>
              <div className="cm-menu-item">
                <Bot size={19} />
                EarthScope
              </div>
              <div className="cm-menu-item">
                <Bot size={19} />
                OPAL
              </div>
            </>
          ) : null}
        </div>
      ) : null}
      <Pointer frame={frame} />
      <div
        className="cm-outro"
        style={{
          opacity: outro,
          transform: `translateY(${16 * (1 - outro)}px)`,
        }}
      >
        <div className="cm-outro-copy">
          <div>Build your own.</div>
          <div className="cm-wordmark">
            <Img src={staticFile("clio-mark.svg")} />
            <strong>CLIO</strong>
          </div>
          <span>
            clio.iowarp.ai
            <ArrowUpRight size={25} />
          </span>
        </div>
        <Img className="cm-qr" src={staticFile("composable/clio-qr.svg")} />
      </div>
    </AbsoluteFill>
  );
}
