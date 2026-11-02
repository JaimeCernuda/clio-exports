import React from "react";
import {
  AbsoluteFill,
  Img,
  spring,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  ArrowUpRight,
  Bot,
  Box,
  Check,
  Database,
  FileText,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import {
  adHeadline,
  adPointer,
  adPluginPoses,
  adState,
  adWheel,
  copy,
  profiles,
  type AdProfile,
} from "./composable-ad-plan";
import { ease, phase } from "./prompt-morph";
import { AdMeasures, AdPromptInk, useAdLayouts } from "./AdPrompt";
import "./composable-ad.css";

const mix = (a: number, b: number, p: number) => a + (b - a) * p;
function pop(frame: number, at: number) {
  return spring({
    frame: Math.max(0, frame - at),
    fps: 60,
    config: { damping: 21, stiffness: 180, mass: 0.75 },
  });
}
type Field = { x: number; y: number; width: number; height: number };

/** The same colored material travels from language to the add control. */
function Hook({ frame, field }: { frame: number; field: Field | null }) {
  const h =
    frame >= 318
      ? { text: "composable", color: "#cee6f4", typing: false }
      : adHeadline(frame);
  const brand = phase(frame, 372, 58),
    peel = phase(frame, 436, 54);
  const reveal =
    frame < 318 ? 1 - phase(frame, 146, 12) : phase(frame, 318, 28);
  return (
    <>
      <div
        className="ad-hook"
        style={{
          left: mix(334, 738, brand),
          top: mix(433, 448, brand),
          fontSize: mix(106, 80, brand),
          opacity: reveal * (1 - phase(frame, copy.staging.menuAt, 20)),
        }}
      >
        <span
          className="ad-hook-A"
          style={{ opacity: 1 - phase(frame, 372, 20) }}
        >
          A
        </span>
        <span
          className="ad-lower-a"
          style={{ width: brand * 49, opacity: brand }}
        >
          a
        </span>
        <span
          className="ad-field"
          style={{ background: peel > 0 ? "transparent" : h.color }}
        >
          <span
            style={{
              filter:
                frame >= 318
                  ? `blur(${18 * (1 - phase(frame, 318, 28))}px)`
                  : undefined,
            }}
          >
            {h.text}
          </span>
          <i
            style={{
              opacity:
                frame < 146 && (h.typing || Math.floor(frame / 15) % 2 === 0)
                  ? 1
                  : 0,
            }}
          />
        </span>
        <span className="ad-hook-agent">agent{brand < 0.5 ? "." : ""}</span>
      </div>
      {peel > 0 && frame < 540 ? (
        <div
          className="ad-color-piece"
          style={{
            left: mix(738 + (field?.x ?? 69), 1548, peel),
            top: mix(448 + (field?.y ?? 0), 449, peel),
            width: mix(field?.width ?? 452, 80, peel),
            height: mix(field?.height ?? 125, 80, peel),
            borderRadius: mix(7, 24, peel),
            background: "#cee6f4",
            opacity: 1 - phase(frame, 520, 20),
            transform: `rotate(${Math.sin(peel * Math.PI) * -5}deg)`,
          }}
        >
          <Plus size={40} style={{ opacity: phase(frame, 465, 23) }} />
        </div>
      ) : null}
    </>
  );
}

function DomainWheel({ frame }: { frame: number }) {
  const wheel = adWheel(frame),
    colors = ["#dbcefa", "#bde9dc", "#cee6f4", "#ffdc9b"];
  return (
    <div
      className="ad-wheel"
      style={{ opacity: wheel.opacity, filter: `blur(${wheel.blur}px)` }}
    >
      {copy.wheel.words.map((word, i) => {
        const dx = (i - wheel.position) * 740,
          distance = Math.min(1, Math.abs(dx) / 1700);
        return (
          <div
            key={`${i}-${word}`}
            className="ad-wheel-word"
            style={{
              background: colors[i % colors.length],
              transform: `translateX(${dx}px) rotateY(${-dx / 70}deg) scale(${1 - 0.12 * distance})`,
              opacity: 1 - 0.55 * distance,
            }}
          >
            {word}
          </div>
        );
      })}
    </div>
  );
}

/** Film-sized adaptation of the native plugin row: box, name, provenance, removal. */
function PluginPiece({
  name,
  color,
  style = {},
  installed = false,
}: {
  name: string;
  color: string;
  style?: React.CSSProperties;
  installed?: boolean;
}) {
  return (
    <div className="ad-capability" style={{ background: color, ...style }}>
      <Box size={24} />
      <strong>{name}</strong>
      {installed ? (
        <X size={16} className="ad-piece-action" />
      ) : (
        <Plus size={17} className="ad-piece-action" />
      )}
    </div>
  );
}

function Choices({ frame, targetY }: { frame: number; targetY: number }) {
  const select = phase(frame, copy.staging.selectAt, 70),
    retire = phase(frame, copy.staging.selectAt - 10, 24);
  return (
    <div className="ad-choices">
      {copy.choices.map((name, index) => {
        const p = pop(frame, copy.staging.optionsAt + index * 2),
          selected = name === "Manufacturing";
        const x = 300 + (index % 4) * 330,
          y = 320 + Math.floor(index / 4) * 110;
        return (
          <PluginPiece
            key={name}
            name={name}
            color={["#bde9dc", "#ffdc9b", "#cee6f4", "#dbcefa"][index % 4]}
            installed={selected && select > 0.5}
            style={{
              position: "absolute",
              zIndex: selected ? 10 : 3,
              left: selected
                ? mix(mix(1548, x, p), 1290, select)
                : mix(1548, x, p) + retire * 200,
              top: selected
                ? mix(mix(449, y, p), targetY, select)
                : mix(449, y, p),
              width: selected ? mix(300, 310, select) : 300,
              height: selected ? mix(84, 60, select) : 84,
              opacity:
                Math.min(1, p) *
                (selected ? (frame < copy.changes[0].at ? 1 : 0) : 1 - retire),
              transform: `rotate(${mix(-10, 0, p) * (1 - select)}deg) scale(${mix(0.18, 1, p)})`,
            }}
          />
        );
      })}
    </div>
  );
}

/** Real composition semantics: old plugins stay while each new plugin docks. */
function PluginSlots({
  frame,
  from,
  to,
  p,
  top,
}: {
  frame: number;
  from: AdProfile;
  to: AdProfile;
  p: number;
  top: number;
}) {
  return (
    <>
      {adPluginPoses(from, to, p).map(({ name, color, width, enter, x }) => {
        return (
          <PluginPiece
            key={name}
            name={name}
            color={color}
            installed
            style={{
              position: "absolute",
              left: x,
              top: top + 26 - 80 * (1 - enter),
              width,
              height: 60,
              opacity:
                phase(frame, copy.staging.promptAt, 58) *
                enter *
                (1 - phase(frame, copy.closing.at, 30)),
              transform: `rotate(${8 * (1 - enter)}deg)`,
            }}
          />
        );
      })}
    </>
  );
}

/** Native Skills and MCP contribution rows, isolated and enlarged for the film. */
function Contributions({
  frame,
  from,
  to,
  p,
  top,
}: {
  frame: number;
  from: AdProfile;
  to: AdProfile;
  p: number;
  top: number;
}) {
  return (
    <div
      className="ad-contributions"
      style={{
        top,
        opacity:
          phase(frame, copy.changes[0].at - 15, 28) *
          (1 - phase(frame, copy.closing.at, 30)),
      }}
    >
      {(["skill", "mcp"] as const).map((kind) => {
        const module = to.modules.find((module) => module.kind === kind);
        const old = from.modules.find((module) => module.kind === kind);
        const enter = module ? (old ? 1 : ease((p - 0.05) / 0.7)) : 0;
        const Icon = kind === "skill" ? Sparkles : Database;
        return (
          <div key={kind} className="ad-contribution-slot">
            <div className="ad-slot-label">
              <Icon size={23} />
              <span>{kind === "skill" ? "Skills" : "MCP servers"}</span>
              <Plus size={19} />
            </div>
            {module ? (
              <div
                className="ad-contribution-row"
                style={{
                  background: module.color,
                  opacity: enter,
                  transform: `translate(${(kind === "skill" ? -270 : 270) * (1 - enter)}px, ${-44 * (1 - enter)}px) rotate(${(kind === "skill" ? -5 : 5) * (1 - enter)}deg)`,
                }}
              >
                <Icon size={26} />
                <div>
                  <small>{kind === "skill" ? "Skills" : "MCP servers"}</small>
                  <strong>{module.name}</strong>
                </div>
                <Check size={20} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Kinetic advertising wrapper around native-derived, additive composition pieces. */
export function ComposableAd({
  auditLayouts = false,
}: {
  auditLayouts?: boolean;
}) {
  const frame = useCurrentFrame(),
    { layouts, hook } = useAdLayouts(auditLayouts),
    state = adState(frame),
    t = ease(state.p);
  const body = phase(frame, copy.staging.promptAt, 58),
    close = phase(frame, copy.closing.at, 60),
    retire = phase(frame, copy.closing.at, 32),
    brandClose = phase(frame, copy.closing.at + 14, 46),
    title = pop(frame, 422);
  const height = layouts
    ? mix(layouts[state.from.id].height, layouts[state.to.id].height, t) + 132
    : 330;
  const top = 510 - height / 2,
    baseTop = layouts ? 510 - (layouts.base.height + 132) / 2 : 345;
  const menu = phase(frame, copy.staging.menuAt, 55),
    dock = phase(frame, copy.staging.promptAt, 58);
  const bx = mix(mix(236, 326, menu), 326, dock),
    by = mix(mix(433, 186, menu), top + 26, dock);
  const font = mix(mix(116, 64, menu), 48, dock),
    end = phase(frame, copy.closing.at + 46, 14),
    pointer = adPointer(frame);
  return (
    <AbsoluteFill className="ad-film">
      <AdMeasures />
      <div style={{ opacity: 1 - close }}>
        <DomainWheel frame={frame} />
        <Hook frame={frame} field={hook} />
        <Choices frame={frame} targetY={baseTop + 26} />
      </div>
      <div
        className="ad-agent-card"
        style={{
          opacity: menu * (1 - dock),
          transform: `translateY(${30 * (1 - menu)}px)`,
        }}
      >
        <p>an autonomous scientific coding and data assistant</p>
        <button>
          <Plus size={18} /> Add plugin
        </button>
      </div>
      <div
        className="ad-paper"
        style={{
          left: 260,
          top,
          width: 1400,
          height,
          opacity: body * (1 - retire),
          transform: `translateY(${80 * (1 - body) - 28 * close}px) rotate(${mix(-2, 0, body) + 3 * close}deg) scale(${mix(0.86, 1, body) - 0.12 * close})`,
        }}
      >
        <div className="ad-paper-rule" />
        <div className="ad-short-label">
          <FileText size={20} /> System prompt
        </div>
        <div className="ad-paper-content">
          {layouts ? (
            <AdPromptInk
              layouts={layouts}
              from={state.from}
              to={state.to}
              p={state.p}
            />
          ) : null}
        </div>
      </div>
      <PluginSlots
        frame={frame}
        from={state.from}
        to={state.to}
        p={state.p}
        top={top}
      />
      <Contributions
        frame={frame}
        from={state.from}
        to={state.to}
        p={state.p}
        top={top + height + 25}
      />
      <div
        className="ad-global-brand"
        style={{
          left: mix(bx, 530, brandClose),
          top: mix(by, 490, brandClose),
          opacity: Math.min(1, title),
          transform: `translateX(${-65 * (1 - title)}px)`,
          fontSize: mix(font, 142, brandClose),
          gap: mix(16, 28, brandClose),
        }}
      >
        <div
          style={{
            width: mix(font + 8, 148, brandClose),
            height: mix(font + 8, 148, brandClose),
            position: "relative",
          }}
        >
          <Img
            src={staticFile("clio-mark.svg")}
            style={{
              width: "100%",
              height: "100%",
              opacity: 1 - dock * (1 - close),
            }}
          />
          <div
            className="ad-native-bot"
            style={{ opacity: dock * (1 - close) }}
          >
            <Bot size={29} />
          </div>
        </div>
        <strong>CLIO</strong>
        <span style={{ opacity: (1 - menu) * (1 - close), marginLeft: -12 }}>
          :
        </span>
        <small
          className="ad-agent-ref"
          style={{ opacity: dock * (1 - retire) }}
        >
          clio/standard
        </small>
      </div>
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
      <div
        className="ad-close-copy"
        style={{ opacity: end, transform: `translateY(${16 * (1 - end)}px)` }}
      >
        <div>
          Build your <span>own.</span>
        </div>
        <small>
          clio.iowarp.ai <ArrowUpRight size={26} />
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
