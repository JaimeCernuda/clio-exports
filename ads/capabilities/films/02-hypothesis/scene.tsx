import React from "react";
import { FlaskConical, GitBranch } from "lucide-react";
import {
  abs,
  Caption,
  Chip,
  Edge,
  muted,
  navy,
  Node,
  Panel,
} from "../../src/kit";
import { mix, phase } from "../../src/motion";
import science from "../../evidence/science.json";

export function HypothesisScene({ t }: { t: number }) {
  const graph = phase(t, 16.2, 1),
    angle = mix(12, 60, phase(t, 8, 4)),
    data = science.pendulum;
  const plotScale = mix(1, 0.77, graph),
    plotX = mix(190, 100, graph);
  const actual = data.filter((r) => r.angle <= angle);
  const length = actual
    .map(
      (r, i) =>
        `${i ? "L" : "M"}${100 + (r.angle / 90) * 780},${330 - ((r.period - 1.95) / 0.55) * 260}`,
    )
    .join(" ");
  return (
    <>
      <div
        style={{
          ...abs(plotX, 245, 1040, 615),
          transform: `scale(${plotScale})`,
          transformOrigin: "left center",
        }}
      >
        <Panel
          title="Pendulum simulation"
          icon={<FlaskConical size={27} />}
          style={{ height: 615 }}
        >
          <div style={{ padding: "25px 36px", fontSize: 28 }}>
            Does amplitude change the period?
          </div>
          <svg width="1020" height="415">
            <text x={100} y={34} fill={muted} fontSize={23}>
              Period / seconds
            </text>
            {[2.0, 2.2, 2.4].map((v) => (
              <g key={v}>
                <line
                  x1={100}
                  x2={880}
                  y1={330 - ((v - 1.95) / 0.55) * 260}
                  y2={330 - ((v - 1.95) / 0.55) * 260}
                  stroke="#dce8eb"
                />
                <text
                  x={80}
                  y={337 - ((v - 1.95) / 0.55) * 260}
                  fill={muted}
                  fontSize={23}
                  textAnchor="end"
                >
                  {v.toFixed(1)}
                </text>
              </g>
            ))}
            <path
              d={`M100 ${330 - ((data[0].prediction - 1.95) / 0.55) * 260} H880`}
              stroke="#bb9b61"
              strokeWidth={4}
              strokeDasharray="10 8"
            />
            <path d={length} stroke="#7257bf" strokeWidth={5} fill="none" />
            {[0, 30, 60, 90].map((a) => (
              <text
                key={a}
                x={100 + (a / 90) * 780}
                y={375}
                fontSize={23}
                fill={muted}
                textAnchor="middle"
              >
                {a}°
              </text>
            ))}
          </svg>
          <div
            style={{
              display: "flex",
              gap: 26,
              padding: "0 35px",
              fontSize: 24,
              color: muted,
            }}
          >
            <span style={{ color: "#b18d4e" }}>— Small-angle prediction</span>
            <span style={{ color: "#7257bf" }}>— Nonlinear model</span>
          </div>
        </Panel>
      </div>
      <div
        style={{
          ...abs(1270, 280),
          opacity: 1 - graph,
          transform: `translateY(${(1 - phase(t, 4)) * 40}px)`,
        }}
      >
        <svg width="480" height="365">
          <line
            x1="240"
            y1="10"
            x2={
              240 + 240 * Math.sin((Math.sin(t * 2.8) * angle * Math.PI) / 180)
            }
            y2={
              20 + 240 * Math.cos((Math.sin(t * 2.8) * angle * Math.PI) / 180)
            }
            stroke={navy}
            strokeWidth={5}
          />
          <circle
            cx={
              240 + 240 * Math.sin((Math.sin(t * 2.8) * angle * Math.PI) / 180)
            }
            cy={
              20 + 240 * Math.cos((Math.sin(t * 2.8) * angle * Math.PI) / 180)
            }
            r="26"
            fill="#7257bf"
          />
          <line
            x1="240"
            y1="0"
            x2="240"
            y2="295"
            stroke="#bdd0d7"
            strokeDasharray="5 8"
          />
        </svg>
        <div style={{ fontSize: 60, fontWeight: 600, textAlign: "center" }}>
          {Math.round(angle)}°
        </div>
        <div style={{ fontSize: 24, color: muted, textAlign: "center" }}>
          Release angle
        </div>
      </div>
      <div
        style={{
          ...abs(960, 235, 850, 670),
          opacity: graph,
          transform: `translateX(${(1 - graph) * 100}px)`,
        }}
      >
        <div
          style={{
            fontSize: 27,
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 25,
          }}
        >
          <GitBranch size={27} />
          Science log{" "}
          <Chip color="#7257bf" fill="#e9e0ff">
            Graph
          </Chip>
        </div>
        <svg width="850" height="580" style={abs(0, 60)}>
          <Edge d="M205 125 V180 H215 V240" t={t} at={17} />
          <Edge d="M215 330 H570 V350" t={t} at={20} />
          <Edge d="M612 416 V480" t={t} at={23} />
        </svg>
        <Node
          x={20}
          y={80}
          w={360}
          title="Amplitude won’t matter"
          detail={t >= 22 ? "Refuted at large angles" : "Hypothesis to test"}
          kind="Hypothesis"
          state={t >= 22 ? "refuted" : "waiting"}
          color="#9a78be"
        />
        <Node
          x={20}
          y={285}
          w={360}
          title="Sweep release angles"
          detail="Numerical experiment"
          kind="Experiment"
          state="done"
          color="#7257bf"
          style={{ opacity: phase(t, 18, 0.6) }}
        />
        <Node
          x={430}
          y={285}
          w={365}
          title="7.32% longer at 60°"
          detail="Compared with small-angle prediction"
          kind="Observation"
          state="done"
          color="#c26d30"
          style={{ opacity: phase(t, 21, 0.6) }}
        />
        <div
          style={{
            ...abs(28, 540, 760),
            opacity: phase(t, 24, 0.6),
            padding: 22,
            borderRadius: 15,
            background: "#e9e0ff",
            fontSize: 27,
            lineHeight: 1.4,
          }}
        >
          Revise the claim:
          <br />
          <strong>Amplitude matters beyond small angles.</strong>
        </div>
      </div>
      <Caption
        t={t}
        at={11.4}
        until={16}
        text="A useful agent tests the assumption."
      />
      <Caption
        t={t}
        at={25.3}
        until={28}
        text="Keep the evidence. Follow the next question."
      />
    </>
  );
}
