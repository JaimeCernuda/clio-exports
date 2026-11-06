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
import { sensorRowCount, sourceTimeForRow } from "./timing";
import science from "../../evidence/science.json";
import recordedQuery from "../../evidence/stream-query.json";
const modelStart = Math.max(27.4, sourceTimeForRow(41));

export function StreamsScene({ t }: { t: number }) {
  const opened = phase(t, 7, 0.8),
    chart = phase(t, 12, 1),
    query = phase(t, 17, 0.7) * (1 - phase(t, 23, 0.7)),
    count = sensorRowCount(t);
  const window = science.burn.slice(Math.max(0, count - 18), count),
    last = window.at(-1)!;
  const model = phase(t, modelStart, 1),
    modelView = phase(t, Math.max(28.8, modelStart + 1), 0.65);
  const modelRows = science.transport
      .slice(0, Math.max(0, count - 40))
      .slice(-18),
    latestModel = modelRows.at(-1);
  const completed = t >= 32,
    contextY = 290 + query * 90;
  const values = window.map((r) =>
    Math.log10(Math.max(0.1, r.particle_mean_ug_m3 ?? 0.1)),
  );
  const distances = modelRows.map((r) => r.travelled_km),
    maximum = science.transport.at(-1)!.travelled_km * 1.12;
  return (
    <>
      <div style={abs(110, 260, 420)}>
        <Panel title="Sensor replay" icon={<Radio size={26} />}>
          <div style={{ padding: 28 }}>
            <div style={{ fontSize: 30, fontWeight: 550 }}>
              Burn observations
            </div>
            <div style={{ fontSize: 24, color: muted, marginTop: 12 }}>
              Particles / wind / CO₂
            </div>
            <svg width={350} height={110} style={{ marginTop: 22 }}>
              <path
                d={linePath(
                  science.burn
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
              {last.local_label}
            </div>
          </div>
        </Panel>
      </div>
      <div style={{ ...abs(650, contextY, 570), opacity: opened }}>
        <Panel title="Live context" icon={<Database size={27} />}>
          <div style={{ padding: "20px 26px" }}>
            <Chip color="#127f89" fill="#d9f2f0">
              burn-observations
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
              <span>Local time</span>
              <span>Particles / µg m⁻³</span>
            </div>
            {window.slice(-2).map((r) => (
              <div
                key={r.local_label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: mono,
                  fontSize: 23,
                  padding: "13px 0",
                  borderTop: "1px solid #d7e5e9",
                }}
              >
                <span>{r.local_label}</span>
                <span style={{ color: "#127f89" }}>
                  {Number(r.particle_mean_ug_m3 ?? 0).toFixed(1)}
                </span>
              </div>
            ))}
            <div style={{ fontSize: 22, color: muted, marginTop: 18 }}>
              Wind:{" "}
              <strong style={{ color: "#127f89" }}>
                {Number(last.horizontal_speed_mean).toFixed(2)} m/s
              </strong>
            </div>
            <div
              style={{
                fontSize: 20,
                color: muted,
                marginTop: 14,
                opacity: 1 - model,
              }}
            >
              18 recent rows, ready to query
            </div>
          </div>
        </Panel>
      </div>
      <div style={{ ...abs(676, 715, 518), opacity: model }}>
        <div
          style={{
            borderTop: "1px solid #d7e5e9",
            paddingTop: 15,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 21, color: "#7257bf" }}>burn-transport</span>
          <span style={{ fontFamily: mono, fontSize: 24, color: "#7257bf" }}>
            {latestModel?.travelled_km.toFixed(2) ?? "0.00"} km
          </span>
        </div>
        <div style={{ fontSize: 20, color: muted, marginTop: 10 }}>
          Model output from these wind readings
        </div>
      </div>
      <div style={{ ...abs(1330, 270, 480), opacity: chart }}>
        <Panel title="Live dashboard" icon={<Activity size={26} />}>
          <div style={{ padding: 28 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 24,
              }}
            >
              <span>{modelView > 0.5 ? "Parcel travel" : "Particles"}</span>
              <Chip
                fill={completed ? "#edf0f2" : "#d9f2f0"}
                color="#127f89"
                style={{ fontSize: 18 }}
              >
                {completed ? "Stopped" : "Live"}
              </Chip>
            </div>
            <svg width={420} height={245} style={{ marginTop: 30 }}>
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
              <path
                d={linePath(values, 15, 30, 390, 175, -1, 4)}
                fill="none"
                stroke="#127f89"
                strokeWidth={4}
                opacity={1 - modelView}
              />
              {distances.length >= 2 && (
                <path
                  d={linePath(distances, 15, 30, 390, 175, 0, maximum)}
                  fill="none"
                  stroke="#7257bf"
                  strokeWidth={4}
                  opacity={modelView}
                />
              )}
              <text x={0} y={235} fill={muted} fontSize={19}>
                {modelView > 0.5
                  ? "Model time / minutes"
                  : "Recent readings (log scale)"}
              </text>
            </svg>
            <div
              style={{
                fontSize: 35,
                fontWeight: 600,
                color: modelView > 0.5 ? "#7257bf" : "#127f89",
              }}
            >
              {modelView > 0.5
                ? (latestModel?.travelled_km ?? 0).toFixed(2)
                : Number(last.particle_mean_ug_m3 ?? 0).toFixed(1)}{" "}
              <span style={{ fontSize: 22, fontWeight: 400 }}>
                {modelView > 0.5 ? "km modelled travel" : "µg m⁻³"}
              </span>
            </div>
          </div>
        </Panel>
      </div>
      <svg width={1920} height={1080} style={abs(0, 0)}>
        <Edge
          d={`M530 440 H590 Q615 440 615 ${440 + query * 45} V${440 + query * 90} H650`}
          t={t}
          at={6.4}
          color="#127f89"
        />
        <Edge
          d={`M1220 ${440 + query * 90} H1260 Q1280 ${440 + query * 90} 1280 ${440 + query * 45} V440 H1330`}
          t={t}
          at={11.5}
          color="#127f89"
        />
        {opened > 0 && !completed && (
          <circle
            cx={mix(535, 590, ((t - 7) % 1.7) / 1.7)}
            cy={440}
            r={5}
            fill="#127f89"
          />
        )}
        <g opacity={model}>
          <Edge d="M310 595 V645" t={t} at={27} color="#7257bf" />
          <text x={329} y={625} fontSize={20} fill="#7257bf">
            Wind
          </text>
          <Edge
            d="M530 715 H605 Q625 715 625 735 V760 H650"
            t={t}
            at={28}
            color="#7257bf"
          />
        </g>
      </svg>
      <div
        style={{
          ...abs(110, 645, 420),
          opacity: model,
          transform: `translateY(${(1 - model) * 20}px)`,
        }}
      >
        <div
          style={{
            padding: 23,
            background: "#f0eafa",
            border: "1px solid #bfb0df",
            borderRadius: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 14,
              alignItems: "center",
              fontSize: 25,
            }}
          >
            <Waves color="#7257bf" />
            Wind-driven model
          </div>
          <div style={{ fontSize: 21, color: muted, marginTop: 13 }}>
            Illustrative parcel transport
          </div>
        </div>
      </div>
      <div
        style={{
          ...abs(110, 820, 420),
          opacity: phase(t, 4, 0.7),
          padding: "18px 23px",
          boxSizing: "border-box",
          border: "1px solid #cbdde2",
          borderRadius: 16,
          background: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 13,
            fontSize: 25,
          }}
        >
          <Terminal size={26} />
          Watch the experiment
        </div>
        <div style={{ marginTop: 10 }}>
          <Chip
            color={completed ? muted : "#127f89"}
            fill={completed ? "#edf1f3" : "#d9f2f0"}
            style={{ fontSize: 18, padding: "6px 11px" }}
          >
            {completed ? <Check size={19} /> : <Radio size={19} />}Script{" "}
            {completed ? "completed" : "running"}
          </Chip>
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
          {recordedQuery.latest.local_label.replace("Apr 15 ", "")} ·{" "}
          {Number(recordedQuery.latest.particle_mean_ug_m3).toFixed(2)} µg/m³
          <br />
          Watcher continues.
        </div>
      </div>
      <div
        style={{
          ...abs(1330, 760, 480),
          opacity: phase(t, 32, 0.6),
          background: "#d9f2f0",
          borderRadius: 17,
          padding: 24,
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
        until={32.5}
        text="Use the wind readings to drive a model."
      />
    </>
  );
}
