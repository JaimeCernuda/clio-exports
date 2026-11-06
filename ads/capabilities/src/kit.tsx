import React, { type CSSProperties, type ReactNode } from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileText,
  LoaderCircle,
  Maximize2,
  Plus,
  Workflow,
  Wrench,
} from "lucide-react";
import type { Film } from "./registry";
import { mix, phase, pointerAt, type PointerKey } from "./motion";
export const navy = "#173b4c",
  muted = "#66818a",
  border = "#cbdde2";
export const mono = '"JetBrains Mono Variable",monospace';
export const abs = (
  x: number,
  y: number,
  w?: number,
  h?: number,
): CSSProperties => ({
  position: "absolute",
  left: x,
  top: y,
  width: w,
  height: h,
});
export function Enter({
  t,
  at = 0,
  children,
  style = {},
  from = 36,
}: {
  t: number;
  at?: number;
  children: ReactNode;
  style?: CSSProperties;
  from?: number;
}) {
  const p = phase(t, at, 0.65);
  return (
    <div
      style={{
        opacity: p,
        transform: `translateY(${(1 - p) * from}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
export function Mark({ size = 40 }: { size?: number }) {
  return (
    <Img
      src={staticFile("clio-mark.svg")}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
export function Stage({
  film,
  t,
  children,
}: {
  film: Film;
  t: number;
  children: ReactNode;
}) {
  const p = phase(t, 2.3, 1),
    close = phase(t, film.seconds - 5.8, 0.8);
  return (
    <AbsoluteFill
      style={{
        background: "#fbfdfd",
        color: navy,
        fontFamily: '"Inter Variable",sans-serif',
        overflow: "hidden",
      }}
    >
      <div
        style={{
          ...abs(1300, -240, 900, 900),
          borderRadius: "50%",
          background: `radial-gradient(circle,${film.light}77,transparent 65%)`,
          opacity: 0.6,
        }}
      />
      <div
        style={{
          ...abs(100, mix(290, 55, p)),
          opacity: 1 - close,
          transformOrigin: "left top",
        }}
      >
        <div
          style={{
            fontSize: 21,
            fontWeight: 650,
            letterSpacing: 3,
            color: film.color,
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          {film.domain}
        </div>
        <div
          data-review="headline"
          style={{
            fontSize: mix(film.title.length > 33 ? 88 : 104, 42, p),
            letterSpacing: mix(-3, -1, p),
            lineHeight: 1.08,
            fontWeight: 650,
            width: 1700,
            whiteSpace: "pre-line",
            display: "flex",
            flexWrap: "wrap",
            gap: "0 .23em",
          }}
        >
          {film.title.split(" ").map((word, i, words) => (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity: phase(t, i * 0.075, 0.4),
                transform: `translateY(${(1 - phase(t, i * 0.075, 0.5)) * 45}px)`,
                color: i === words.length - 1 ? film.color : navy,
                background:
                  i === words.length - 1
                    ? `linear-gradient(transparent 65%,${film.light} 0)`
                    : "none",
              }}
            >
              {word}
            </span>
          ))}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: phase(t, 3.15, 0.7) * (1 - close),
          transform: `translateY(${mix(65, 0, phase(t, 3.15, 0.7))}px) scale(${mix(0.975, 1, phase(t, 3.15, 0.7))})`,
        }}
      >
        {children}
      </div>
      <div
        style={{
          ...abs(1720, 62),
          display: "flex",
          gap: 12,
          alignItems: "center",
          opacity: p * (1 - close),
          fontWeight: 750,
          fontSize: 30,
        }}
      >
        <Mark size={42} />
        CLIO
      </div>
      <Close film={film} t={t} />
    </AbsoluteFill>
  );
}
function Close({ film, t }: { film: Film; t: number }) {
  const p = phase(t, film.seconds - 5.8, 0.8);
  if (p <= 0) return null;
  return (
    <AbsoluteFill
      style={{
        opacity: p,
        background: "#fbfdfd",
        alignItems: "center",
        justifyContent: "center",
        transform: `translateY(${(1 - p) * 20}px)`,
        zIndex: 8000,
      }}
    >
      <div
        data-review="close"
        style={{
          width: 1340,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 104,
              fontWeight: 650,
              letterSpacing: -5,
              marginBottom: 44,
            }}
          >
            Build with us.
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 25,
              fontSize: 90,
              fontWeight: 750,
              letterSpacing: -4,
            }}
          >
            <Mark size={118} />
            CLIO
          </div>
          <div style={{ fontSize: 38, marginTop: 38, color: film.color }}>
            clio.iowarp.ai
          </div>
        </div>
        <div
          style={{
            padding: 30,
            background: "white",
            border: `1px solid ${border}`,
            borderRadius: 28,
          }}
        >
          <Img src={staticFile("qr.svg")} style={{ width: 260, height: 260 }} />
        </div>
      </div>
      <div
        style={{
          ...abs(290, 905),
          display: "flex",
          alignItems: "center",
          gap: 20,
          color: muted,
          fontSize: 22,
          lineHeight: 1.4,
        }}
      >
        <Img
          src={staticFile("grc-logo.png")}
          style={{ width: 65, height: 65, objectFit: "contain" }}
        />
        <div>
          An IOWarp system
          <br />
          by the Gnosis Research Center
        </div>
      </div>
    </AbsoluteFill>
  );
}
export function Panel({
  title,
  icon,
  children,
  style = {},
  actions = false,
  chrome = false,
  openable = false,
  active = false,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
  actions?: boolean;
  chrome?: boolean;
  openable?: boolean;
  active?: boolean;
}) {
  return (
    <div
      data-review="panel"
      style={{
        background: chrome ? "#f5fbfd" : "transparent",
        border: chrome ? `1.5px solid ${border}` : "none",
        borderRadius: chrome ? 24 : 0,
        boxShadow: chrome ? "0 24px 65px #173b4c0c" : "none",
        overflow: chrome ? "hidden" : "visible",
        ...style,
      }}
    >
      <div
        data-review={openable ? "button" : undefined}
        style={{
          height: 68,
          display: "flex",
          alignItems: "center",
          gap: 13,
          padding: "0 26px",
          borderBottom: chrome ? `1px solid ${border}` : "none",
          color: chrome ? navy : muted,
          fontSize: 25,
          fontWeight: 550,
          borderRadius: 12,
          background: active ? "#e5f2f6" : undefined,
        }}
      >
        {icon ?? <FileText size={25} />}
        <span>{title}</span>
        {openable && (
          <ArrowUpRight
            size={23}
            style={{ marginLeft: "auto", marginRight: 22 }}
          />
        )}
        {chrome && actions && (
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 20,
              color: muted,
            }}
          >
            <Plus size={24} />
            <Maximize2 size={23} />
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
export function Chip({
  children,
  color = navy,
  fill = "#e9f1f4",
  style = {},
}: {
  children: ReactNode;
  color?: string;
  fill?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 15px",
        fontSize: 23,
        borderRadius: 11,
        background: fill,
        color,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
export function Button({
  children,
  selected = false,
  color = "#247eaf",
  style = {},
}: {
  children: ReactNode;
  selected?: boolean;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      data-review="button"
      style={{
        border: `1.5px solid ${selected ? color : border}`,
        borderRadius: 12,
        padding: "12px 22px",
        background: selected ? `${color}15` : "#fff",
        fontSize: 25,
        fontWeight: selected ? 650 : 450,
        boxShadow: selected ? `0 0 0 3px ${color}12` : undefined,
        display: "inline-flex",
        gap: 10,
        alignItems: "center",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
export function ToolRow({
  text,
  done = false,
  ready = false,
  t,
  sub,
  style = {},
}: {
  text: string;
  done?: boolean;
  ready?: boolean;
  t: number;
  sub?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        padding: "16px 0",
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontSize: 25,
        ...style,
      }}
    >
      {ready ? (
        <Wrench size={24} color={muted} />
      ) : done ? (
        <Check size={24} color="#248a72" />
      ) : (
        <LoaderCircle
          size={24}
          color="#219aa7"
          style={{ transform: `rotate(${t * 220}deg)` }}
        />
      )}
      <span>{text}</span>
      {sub && (
        <span
          style={{
            fontFamily: mono,
            color: muted,
            fontSize: 20,
            marginLeft: "auto",
          }}
        >
          {sub}
        </span>
      )}
    </div>
  );
}
export function Cursor({ t, keys }: { t: number; keys: PointerKey[] }) {
  const p = pointerAt(t, keys);
  return (
    <div
      data-review="cursor"
      style={{
        ...abs(p.x, p.y, 42, 55),
        zIndex: 9000,
        transform: `scale(${1 - p.press * 0.12})`,
        transformOrigin: "2px 2px",
        pointerEvents: "none",
        filter: "drop-shadow(0 2px 2px #173b4c30)",
      }}
    >
      <svg width="42" height="55" viewBox="0 0 42 55">
        <path
          d="M3 2 L4 40 L14 31 L23 49 L30 45 L21 28 L35 27 Z"
          fill="white"
          stroke={navy}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>
      {p.press > 0 && (
        <div
          style={{
            ...abs(-14, -14, 35, 35),
            border: "2px solid #24b6c6",
            borderRadius: "50%",
            opacity: p.press,
          }}
        />
      )}
    </div>
  );
}
export function Edge({
  d,
  t,
  at = 0,
  color = "#88adb6",
  width = 3,
}: {
  d: string;
  t: number;
  at?: number;
  color?: string;
  width?: number;
}) {
  const p = phase(t, at, 0.8);
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - p}
      strokeLinecap="round"
    />
  );
}
export function Node({
  x,
  y,
  w = 310,
  title,
  detail,
  kind = "Step",
  state = "waiting",
  color = "#247eaf",
  style = {},
  expanded = 1,
}: {
  x: number;
  y: number;
  w?: number;
  title: string;
  detail: string;
  kind?: string;
  state?: "waiting" | "running" | "done" | "revise" | "refuted";
  color?: string;
  style?: CSSProperties;
  expanded?: number;
}) {
  const frame = useCurrentFrame();
  return (
    <div
      data-review="node"
      style={{
        ...abs(x, y, w),
        background: `rgba(255,255,255,${expanded})`,
        border: `1.5px solid ${state === "waiting" ? border : color}${Math.round(
          expanded * 255,
        )
          .toString(16)
          .padStart(2, "0")}`,
        borderRadius: 18,
        padding: `${mix(10, 21, expanded)}px 23px`,
        overflow: "hidden",
        boxShadow:
          expanded > 0.99
            ? state === "running"
              ? `0 0 0 5px ${color}0b`
              : "0 8px 20px #173b4c07"
            : "none",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 18,
          color: muted,
          marginBottom: 13 * expanded,
          height: 24 * expanded,
          opacity: expanded,
          overflow: "hidden",
        }}
      >
        <Workflow size={19} />
        {kind}
        <span style={{ marginLeft: "auto", color }}>
          {state === "done" ? (
            <Check size={21} />
          ) : state === "running" ? (
            <LoaderCircle
              size={21}
              style={{ transform: `rotate(${frame * 3}deg)` }}
            />
          ) : state === "refuted" ? (
            "Refuted"
          ) : state === "revise" ? (
            "Revise"
          ) : (
            ""
          )}
        </span>
      </div>
      <div
        style={{
          fontSize: mix(36, 30, expanded),
          fontWeight: 600,
          letterSpacing: -0.8,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 22,
          lineHeight: 1.45,
          color: muted,
          marginTop: 10 * expanded,
          maxHeight: 90 * expanded,
          opacity: expanded,
          overflow: "hidden",
        }}
      >
        {detail}
      </div>
    </div>
  );
}
export function Toolbar() {
  return (
    <div style={{ display: "flex", gap: 20, color: muted }}>
      <Copy size={23} />
      <Download size={23} />
      <ChevronDown size={23} />
    </div>
  );
}
export function Caption({
  t,
  at,
  until,
  text,
  color = navy,
}: {
  t: number;
  at: number;
  until: number;
  text: string;
  color?: string;
}) {
  const p = phase(t, at, 0.55) * (1 - phase(t, until, 0.4));
  return (
    <div
      style={{
        ...abs(100, 945, 1720),
        fontSize: 36,
        fontWeight: 500,
        letterSpacing: -1,
        textAlign: "center",
        opacity: p,
        color,
        transform: `translateY(${(1 - p) * 12}px)`,
      }}
    >
      {text}
    </div>
  );
}
export function ArrowLabel({ text }: { text: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        color: muted,
        fontSize: 22,
      }}
    >
      {text}
      <ArrowUpRight size={24} />
    </div>
  );
}
