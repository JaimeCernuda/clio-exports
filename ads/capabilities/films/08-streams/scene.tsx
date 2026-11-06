import React from "react";
import {
  Activity,
  Check,
  Database,
  Radio,
  Search,
  Terminal,
  Waves,
} from "lucide-react";
import { abs, Caption, Chip, Edge, mono, muted, Panel } from "../../src/kit";
import { linePath, mix, phase } from "../../src/motion";
import { sensorRowCount } from "./timing";
import science from "../../evidence/science.json";

export function StreamsScene({ t }: { t: number }) {
  const opened = phase(t, 7, 0.8),
    chart = phase(t, 12, 1),
    query = phase(t, 17, 0.7) * (1 - phase(t, 23, 0.7)),
    simulation = phase(t, 27, 1);
  const burn = science.burn;
  const count = sensorRowCount(t);
  const window = burn.slice(Math.max(0, count - 18), count);
  const last = window.at(-1),
    values = window.map((r) =>
      Math.log10(Math.max(0.1, r.particle_mean_ug_m3 ?? 0.1)),
    );
  const local = last?.local_label ?? "16:00";
  const completed = t >= 32;
  const simView = phase(t, 28.8, 0.65),
    simValues = science.simulation
      .slice(0, Math.max(2, count - 40))
      .slice(-18)
      .map((r) => r.angle_rad);
  return (
    <>
      <div
        style={{
          ...abs(110, 280, 420),
          transform: `translateY(${-simulation * 30}px)`,
        }}
      >
        <Panel title="Sensor replay" icon={<Radio size={26} />}>
          <div style={{ padding: 28 }}>
            <div style={{ fontSize: 30, fontWeight: 550 }}>
              Burn observations
            </div>
            <div style={{ fontSize: 24, color: muted, marginTop: 12 }}>
              Particles / wind / CO₂
            </div>
            <svg width="350" height="110" style={{ marginTop: 22 }}>
              <path
                d={linePath(
                  (burn.length ? burn : [])
                    .slice(0, count)
                    .map((r) =>
                      Math.log10(Math.max(0.1, r.particle_mean_ug_m3 ?? 0.1)),
                    ),
                  10,
                  12,
                  330,
                  75,
                  -1,
                  4,
                )}
                stroke="#127f89"
                strokeWidth={3}
                fill="none"
              />
            </svg>
            <div style={{ fontFamily: mono, fontSize: 22, color: muted }}>
              {local}
            </div>
          </div>
        </Panel>
      </div>
      <div style={{ ...abs(650, 290 + query * 90, 570), opacity: opened }}>
        <Panel title="Live context" icon={<Database size={27} />}>
          <div style={{ padding: "24px 26px" }}>
            <Chip color="#127f89" fill="#d9f2f0">
              {simView > 0.5 ? "pendulum-simulation" : "burn-observations"}
            </Chip>
            <div
              style={{
                fontSize: 21,
                color: muted,
                display: "flex",
                justifyContent: "space-between",
                margin: "22px 0 12px",
              }}
            >
              <span>{simView > 0.5 ? "Simulation time" : "Local time"}</span>
              <span>
                {simView > 0.5 ? "Angle / radians" : "Particles / µg m⁻³"}
              </span>
            </div>
            {window.slice(-3).map((r, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: mono,
                  fontSize: 23,
                  padding: "16px 0",
                  borderTop: "1px solid #d7e5e9",
                }}
              >
                <span>
                  {simView > 0.5
                    ? `${science.simulation[Math.max(0, Math.min(19, count - 43 + i))].time_s.toFixed(1)} s`
                    : r.local_label}
                </span>
                <span style={{ color: "#127f89" }}>
                  {simView > 0.5
                    ? science.simulation[
                        Math.max(0, Math.min(19, count - 43 + i))
                      ].angle_rad.toFixed(3)
                    : Number(r.particle_mean_ug_m3 ?? 0).toFixed(1)}
                </span>
              </div>
            ))}
            <div style={{ fontSize: 22, color: muted, marginTop: 20 }}>
              A rolling window, ready to query
            </div>
          </div>
        </Panel>
      </div>
      <div style={{ ...abs(1330, 270, 480), opacity: chart }}>
        <Panel title="Live dashboard" icon={<Activity size={26} />}>
          <div style={{ padding: 28 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 24,
              }}
            >
              <span>{simView > 0.5 ? "Pendulum angle" : "Particles"}</span>
              <Chip
                fill={completed ? "#edf0f2" : "#d9f2f0"}
                color="#127f89"
                style={{ fontSize: 18 }}
              >
                {completed ? "Stopped" : "Live"}
              </Chip>
            </div>
            <svg width="420" height="245" style={{ marginTop: 30 }}>
              <path
                d={linePath(values, 15, 30, 390, 175, -1, 4)}
                fill="none"
                stroke="#127f89"
                strokeWidth={4}
                opacity={1 - simView}
              />
              <path
                d={linePath(simValues, 15, 30, 390, 175, -0.12, 0.12)}
                fill="none"
                stroke="#7257bf"
                strokeWidth={4}
                opacity={simView}
              />
              {[0, 1, 2, 3, 4].map((v) => (
                <line
                  key={v}
                  x1={0}
                  x2={420}
                  y1={205 - (v / 5) * 175}
                  y2={205 - (v / 5) * 175}
                  stroke="#dfeaec"
                />
              ))}
              <text x={0} y={235} fill={muted} fontSize={19}>
                {simView > 0.5
                  ? "Simulation time / seconds"
                  : "Recent readings (log scale)"}
              </text>
            </svg>
            <div style={{ fontSize: 35, fontWeight: 600, color: "#127f89" }}>
              {simView > 0.5
                ? simValues.at(-1)!.toFixed(3)
                : Number(last?.particle_mean_ug_m3 ?? 0).toFixed(1)}{" "}
              <span style={{ fontSize: 22, fontWeight: 400 }}>
                {simView > 0.5 ? "radians" : "µg m⁻³"}
              </span>
            </div>
          </div>
        </Panel>
      </div>
      <svg width="1920" height="850" style={abs(0, 140)}>
        <Edge d="M530 300 H650" t={t} at={6.4} color="#127f89" />
        <Edge d="M1220 300 H1330" t={t} at={11.5} color="#127f89" />
        {opened > 0 && (
          <circle
            cx={mix(535, 642, ((t - 7) % 1.7) / 1.7)}
            cy={300}
            r={5}
            fill="#127f89"
            opacity={Number(!completed)}
          />
        )}
        <Edge
          d="M530 500 H600 Q625 500 625 475 V455 H650"
          t={t}
          at={27.5}
          color="#7257bf"
        />
      </svg>
      <div style={{ ...abs(110, 820, 1100), opacity: phase(t, 4, 0.7) }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 15,
            padding: "20px 25px",
            border: "1px solid #cbdde2",
            borderRadius: 16,
            background: "#fff",
          }}
        >
          <Terminal size={27} />
          <div style={{ fontSize: 27 }}>Watch the experiment</div>
          <div style={{ marginLeft: "auto" }}>
            <Chip
              color={completed ? "#66818a" : "#127f89"}
              fill={completed ? "#edf1f3" : "#d9f2f0"}
            >
              {completed ? <Check size={22} /> : <Radio size={22} />}Script{" "}
              {completed ? "completed" : "running"}
            </Chip>
          </div>
        </div>
      </div>
      <div
        style={{
          ...abs(650, 190, 570),
          opacity: query,
          transform: `translateY(${(1 - query) * 20}px)`,
          background: "white",
          border: "1px solid #bcd2da",
          borderRadius: 17,
          padding: 18,
          boxShadow: "0 12px 30px #173b4c12",
        }}
      >
        <div
          style={{
            fontSize: 27,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <Search size={26} />
          What’s happening now?
        </div>
        <div
          style={{
            fontSize: 23,
            color: "#127f89",
            marginTop: 19,
            opacity: phase(t, 19, 0.6),
          }}
        >
          16:16 CDT · 2.80 µg/m³
          <br />
          Watcher continues.
        </div>
      </div>
      <div
        style={{
          ...abs(110, 600, 420),
          opacity: simulation,
          transform: `translateY(${(1 - simulation) * 30}px)`,
        }}
      >
        <div
          style={{
            padding: 23,
            background: "#f0eafa",
            border: "1px solid #bfb0df",
            borderRadius: 16,
            display: "flex",
            gap: 14,
            alignItems: "center",
            fontSize: 25,
          }}
        >
          <Waves color="#7257bf" />
          Pendulum simulation
        </div>
      </div>
      <div
        style={{
          ...abs(1330, 760, 480),
          opacity: phase(t, 32, 0.6),
          background: "#d9f2f0",
          borderRadius: 17,
          padding: "24px",
          fontSize: 25,
          display: "flex",
          gap: 13,
        }}
      >
        <Check size={27} />
        Sensor replay complete
      </div>
      <Caption
        t={t}
        at={9}
        until={13.4}
        text="Tap the signal once. Keep its recent context."
      />
      <Caption
        t={t}
        at={23.3}
        until={27}
        text="One stream. An agent and a dashboard."
      />
      <Caption
        t={t}
        at={29}
        until={32}
        text="Instruments and simulations, connected to the same work."
      />
    </>
  );
}
