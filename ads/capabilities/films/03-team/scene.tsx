import React, { type ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  Check,
  GitBranch,
  LoaderCircle,
  Workflow,
  X,
} from "lucide-react";
import {
  abs,
  border,
  Caption,
  Chip,
  Cursor,
  Enter,
  muted,
  ToolRow,
  WebsitePresentation,
} from "../../src/kit";
import { linePath, mix, phase } from "../../src/motion";
import science from "../../evidence/science.json";
import result from "../../evidence/workflow.json";

const green = "#218a7b";
const colors = ["#b9732e", "#735db7", "#287da7"];
const signals = [
  science.burn.map((r) =>
    Math.log10(Math.max(0.1, r.particle_mean_ug_m3 ?? 0.1)),
  ),
  science.burn.map((r) => r.CO2MFd_mean ?? 0),
  science.burn.map((r) => r.horizontal_speed_mean ?? 0),
];

/** One persistent graph node: state changes do not replace the graph's layout. */
function Work({
  t,
  at,
  start,
  end,
  x,
  y,
  w,
  h,
  title,
  kind = "Flow",
  color = green,
  children,
  open = false,
}: {
  t: number;
  at: number;
  start: number;
  end: number;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  kind?: string;
  color?: string;
  children: ReactNode;
  open?: boolean;
}) {
  const done = t >= end,
    running = t >= start && !done;
  return (
    <div
      data-review={open ? "button" : "node"}
      style={{
        ...abs(x, y, w, h),
        opacity: phase(t, at, 0.55),
        transform: `translateY(${(1 - phase(t, at, 0.55)) * 16}px)`,
        border: `1.5px solid ${running || done ? color : border}`,
        borderRadius: 18,
        background: running ? `${color}08` : "#fff",
        padding: "17px 20px",
        boxSizing: "border-box",
        boxShadow: running ? `0 0 0 4px ${color}09` : "0 8px 24px #173b4c05",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 17,
          color: muted,
        }}
      >
        {kind === "Decision" ? (
          <GitBranch size={18} />
        ) : kind === "Subagent" ? (
          <Activity size={18} />
        ) : (
          <Workflow size={18} />
        )}
        {kind}
        <span style={{ marginLeft: "auto", color }}>
          {done ? (
            <Check size={20} />
          ) : running ? (
            <LoaderCircle
              size={20}
              style={{ transform: `rotate(${t * 220}deg)` }}
            />
          ) : null}
        </span>
        {open && <ArrowUpRight size={19} />}
      </div>
      <div
        style={{
          fontSize: 25,
          fontWeight: 620,
          letterSpacing: -0.7,
          marginTop: 9,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

/** Draw a dependency, then carry a result along its existing path. */
function Link({
  d,
  t,
  at,
  travel,
  color = green,
}: {
  d: string;
  t: number;
  at: number;
  travel?: number;
  color?: string;
}) {
  const p = phase(t, at, 0.7),
    pulse = travel === undefined ? 0 : phase(t, travel, 0.8);
  return (
    <>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeOpacity={0.36}
        strokeWidth={2.5}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - p}
      />
      {pulse > 0 && pulse < 1 && (
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={6}
          pathLength={1}
          strokeDasharray=".045 .955"
          strokeDashoffset={-pulse * 0.955}
          strokeLinecap="round"
        />
      )}
    </>
  );
}

export function TeamScene({ t }: { t: number }) {
  const website = React.useContext(WebsitePresentation);
  const inspect = phase(t, 10, 0.8) * (1 - phase(t, 16, 0.8));
  const scale = mix(1, 0.63, inspect);
  const peaks = ["16:41", "16:43", "60 valid minutes"];
  return (
    <>
      <Enter
        t={t}
        at={3.15}
        style={{
          ...abs(100, 195),
          display: "flex",
          gap: 20,
          alignItems: "center",
        }}
      >
        <Chip color={green} fill="#d8f2e9">
          Research question
        </Chip>
        <span style={{ fontSize: 32 }}>What changed during the burn?</span>
      </Enter>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformOrigin: "0 0",
          transform: `translate(${inspect * 18}px,${inspect * 180}px) scale(${scale})`,
        }}
      >
        <svg width={1920} height={1080} style={abs(0, 0)}>
          <Link
            d="M280 541 H318 Q335 541 335 524 V377 Q335 360 352 360 H360"
            t={t}
            at={4.6}
            travel={5.1}
          />
          <Link
            d="M280 541 H318 Q335 541 335 558 V733 Q335 750 352 750 H360"
            t={t}
            at={4.75}
            travel={5.25}
          />
          <Link
            d="M595 360 H628 Q645 360 645 377 V750 H595"
            t={t}
            at={6.6}
            travel={7}
          />
          {[375, 590, 805].map((y, i) => (
            <Link
              key={`in${i}`}
              d={`M645 590 V${y} H700`}
              t={t}
              at={7.05 + i * 0.12}
              travel={7.5 + i * 0.12}
              color={colors[i]}
            />
          ))}
          {[375, 590, 805].map((y, i) => (
            <Link
              key={`out${i}`}
              d={`M970 ${y} H1012 Q1030 ${y} 1030 ${y + (y < 580 ? 18 : -18)} V580 H1090`}
              t={t}
              at={17.35 + i * 0.3}
              travel={17.4 + i * 0.3}
              color={colors[i]}
            />
          ))}
          <Link d="M1215 510 V430" t={t} at={20.3} travel={20.35} />
          <Link
            d="M1340 355 H1490"
            t={t}
            at={21.3}
            travel={21.5}
            color="#b9732e"
          />
          <Link d="M1650 445 V535" t={t} at={27.4} travel={27.8} />
        </svg>
        <Work
          t={t}
          at={3.7}
          start={3.9}
          end={4.9}
          x={80}
          y={475}
          w={200}
          h={132}
          title="Read data"
        >
          <div style={{ fontSize: 19, color: muted, marginTop: 12 }}>
            60 minutes
          </div>
        </Work>
        <Work
          t={t}
          at={5.05}
          start={5.4}
          end={6.7}
          x={360}
          y={290}
          w={235}
          h={140}
          title="Check coverage"
        >
          <div style={{ fontSize: 20, color: muted, marginTop: 12 }}>
            3 channels + flags
          </div>
        </Work>
        <Work
          t={t}
          at={5.2}
          start={5.4}
          end={6.7}
          x={360}
          y={680}
          w={235}
          h={140}
          title="Align minutes"
        >
          <div style={{ fontSize: 18, color: muted, marginTop: 12 }}>
            One shared time axis
          </div>
        </Work>
        {["Particles", "CO₂", "Wind / quality"].map((title, i) => {
          const finish = 17.3 + i * 0.3,
            rowCount = Math.max(2, Math.ceil(60 * phase(t, 8, 8)));
          return (
            <Work
              key={title}
              t={t}
              at={7.4 + i * 0.12}
              start={7.8}
              end={finish}
              x={700}
              y={295 + i * 215}
              w={270}
              h={178}
              title={title}
              kind="Subagent"
              color={colors[i]}
              open={i === 0}
            >
              <svg width={225} height={55} style={{ marginTop: 8 }}>
                <path
                  d={linePath(
                    signals[i].slice(0, rowCount),
                    4,
                    4,
                    (217 * (rowCount - 1)) / 59,
                    43,
                    Math.min(...signals[i]),
                    Math.max(...signals[i]) + 1e-6,
                  )}
                  fill="none"
                  stroke={colors[i]}
                  strokeWidth={2.5}
                />
              </svg>
              <div
                style={{
                  fontSize: 18,
                  color: colors[i],
                  opacity: phase(t, finish, 0.45),
                }}
              >
                {peaks[i]}
              </div>
            </Work>
          );
        })}
        <Work
          t={t}
          at={18.85}
          start={19}
          end={20.3}
          x={1090}
          y={510}
          w={250}
          h={140}
          title="Compare signals"
        >
          <div style={{ fontSize: 21, color: muted, marginTop: 12 }}>
            Join all 3 results
          </div>
        </Work>
        <Work
          t={t}
          at={20.5}
          start={21.15}
          end={21.5}
          x={1090}
          y={280}
          w={250}
          h={150}
          title="Peaks >1 min apart?"
          kind="Decision"
          color="#b9732e"
        >
          <div
            style={{
              fontSize: 22,
              marginTop: 12,
              opacity: phase(t, 21.4, 0.5),
              color: "#b9732e",
            }}
          >
            Yes — {result.comparison.separation_minutes} minutes
          </div>
        </Work>
        <Work
          t={t}
          at={21.85}
          start={22.35}
          end={27.4}
          x={1490}
          y={280}
          w={320}
          h={165}
          title="Review timing"
          kind="Subagent"
          color="#b9732e"
        >
          <div
            style={{
              fontSize: 21,
              color: muted,
              lineHeight: 1.45,
              marginTop: 12,
            }}
          >
            Compare paired minutes
            <br />
            and extreme observations
          </div>
        </Work>
        <Work
          t={t}
          at={28.15}
          start={28.4}
          end={30.1}
          x={1490}
          y={535}
          w={320}
          h={252}
          title="Combined finding"
        >
          <div style={{ opacity: phase(t, 29, 0.6), marginTop: 12 }}>
            <div style={{ fontSize: 31, fontWeight: 650, color: green }}>
              {result.followup.top_ten_overlap} of 10
            </div>
            <div style={{ fontSize: 21, lineHeight: 1.4, marginTop: 5 }}>
              highest particle and CO₂ minutes overlap.
            </div>
            <div style={{ fontSize: 19, color: muted, marginTop: 12 }}>
              Different signals, jointly tested.
            </div>
          </div>
        </Work>
        <div
          style={{
            ...abs(1090, 850, 700),
            fontSize: 23,
            color: muted,
            opacity: website ? 0 : phase(t, 30.4, 0.6),
          }}
        >
          The evidence triggers the next step.
        </div>
      </div>
      {inspect > 0 && (
        <div
          style={{
            ...abs(mix(1890, 1230, inspect), 245, 580, 615),
            opacity: inspect,
            background: "#fff",
            border: `1.5px solid ${border}`,
            borderRadius: 22,
            boxShadow: "0 20px 60px #173b4c0c",
            padding: 28,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              fontSize: 25,
              fontWeight: 650,
            }}
          >
            <Activity size={25} color={colors[0]} />
            Inside Particles
            <div
              data-review="button"
              style={{
                ...abs(510, 15, 48, 48),
                display: "grid",
                placeItems: "center",
                borderRadius: 10,
                background: t > 15.4 ? "#edf3f6" : "transparent",
              }}
            >
              <X size={23} />
            </div>
          </div>
          <div style={{ fontSize: 20, color: muted, margin: "12px 0 15px" }}>
            A subagent runs its own flow.
          </div>
          <ToolRow t={t} done text="Read aligned observations" />
          <ToolRow t={t} done text="Locate the particle peak" />
          <div
            style={{
              padding: "14px 18px",
              background: "#fcf0e1",
              borderRadius: 12,
              margin: "5px 0 12px",
              fontSize: 26,
              color: colors[0],
            }}
          >
            3,538.36 µg/m³ <span style={{ fontSize: 21 }}>at 16:41</span>
          </div>
          <ToolRow t={t} text="Estimate uncertainty" sub="500k draws" />
          <ToolRow t={t} ready text="Save the result" />
          <div
            style={{
              fontSize: 21,
              color: muted,
              lineHeight: 1.5,
              marginTop: 18,
            }}
          >
            CO₂ and wind keep running
            <br />
            in the parent workflow.
          </div>
        </div>
      )}
      <Caption
        t={t}
        at={7.7}
        until={9.4}
        text="Parallel work. Shared dependencies."
      />
      <Caption
        t={t}
        at={22.4}
        until={26.6}
        text="A timing mismatch starts a deeper comparison."
      />
      <Caption
        t={t}
        at={31.1}
        until={34.1}
        text="Coordinate the whole investigation."
      />
      <Cursor
        t={t}
        keys={[
          { at: 0, x: 2010, y: 160 },
          { at: 9, x: 2010, y: 160 },
          { at: 9.55, x: 906, y: 322 },
          { at: 9.7, x: 906, y: 322, press: true },
          { at: 10.7, x: 2010, y: 160 },
          { at: 14.8, x: 2010, y: 160 },
          { at: 15.45, x: 1763, y: 284 },
          { at: 15.6, x: 1763, y: 284, press: true },
          { at: 16.5, x: 2010, y: 160 },
        ]}
      />
    </>
  );
}
