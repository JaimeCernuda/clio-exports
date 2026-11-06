import React from "react";
import { Check, Play, Workflow } from "lucide-react";
import {
  abs,
  Button,
  Caption,
  Chip,
  Cursor,
  Edge,
  mono,
  muted,
  navy,
  Node,
  Panel,
} from "../../src/kit";
import { mix, phase, pointerAt } from "../../src/motion";
import beam from "../../evidence/beam.json";

export function MethodScene({ t }: { t: number }) {
  const unfold = phase(t, 4.2, 1.1),
    update = phase(t, 21.7, 0.8);
  const items = [
    ["Compare", "Candidate dimensions"],
    ["Simulate", "Cantilever deflection"],
    ["Check", "Deflection ≤ 1.0 mm"],
    ["Review", "Accept or revise"],
  ];
  const payload = pointerAt(t, [
    { at: 10, x: 217, y: 535 },
    { at: 12.5, x: 622, y: 535 },
    { at: 14, x: 1027, y: 535 },
    { at: 16, x: 1432, y: 535 },
    { at: 17.2, x: 1432, y: 535 },
    { at: 18, x: 1432, y: 460 },
    { at: 20, x: 622, y: 460 },
    { at: 20.6, x: 622, y: 535 },
    { at: 22.5, x: 1027, y: 535 },
    { at: 27, x: 1027, y: 535 },
  ]);
  const valueOpacity =
    t < 22.05 ? 1 - phase(t, 21.7, 0.3) : phase(t, 22.05, 0.35);
  const shown = t < 22.05 ? beam.initial[2] : beam.selected;
  return (
    <>
      <Panel
        title="Design review"
        icon={<Workflow size={26} />}
        style={{ ...abs(135, 220, 1650, 660) }}
      >
        <div style={{ ...abs(44, 105), display: "flex", gap: 12 }}>
          <Chip fill="#ffe8cf" color="#a7612c">
            Flow
          </Chip>
          <Chip>
            {t < 10 ? "Ready to run" : t < 23 ? "Running" : "Completed"}
          </Chip>
        </div>
        <svg width="1650" height="540" style={abs(0, 85)}>
          <Edge d="M240 200 H1400" t={t} at={6.2} />
          <Edge
            d="M1435 245 V345 Q1435 375 1405 375 H680 Q650 375 650 345 V245"
            t={t}
            at={17}
            color="#c26d30"
            width={4}
          />
        </svg>
        {items.map(([title, detail], i) => {
          const x = mix(65, 65 + i * 405, unfold),
            y = mix(185 + i * 90, 215, phase(t, 5.4, 0.6));
          const running =
            (t > 10 + i * 1.6 && t < 12 + i * 1.6) ||
            (i === 1 && t >= 20 && t < 21.7) ||
            (i === 2 && t >= 21.7 && t < 23);
          return (
            <Node
              key={title}
              x={x}
              y={y}
              w={mix(660, 305, phase(t, 3.6, 0.6))}
              expanded={phase(t, 6.1, 0.6)}
              title={title}
              detail={detail}
              kind={i === 3 ? "Reviewer" : "Step"}
              state={
                t > 23
                  ? "done"
                  : i === 3 && t > 16
                    ? "revise"
                    : running
                      ? "running"
                      : t > 12 + i * 1.6
                        ? "done"
                        : "waiting"
              }
              color="#c26d30"
              style={{
                opacity: phase(t, 3.3 + i * 0.12),
                transform: `scale(${1 + 0.02 * Math.sin((t - 10 - i * 1.6) * Math.PI) * Number(running)})`,
              }}
            />
          );
        })}
        <div
          style={{
            ...abs(60, 542, 1530),
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontFamily: mono,
              fontSize: 24,
              color: muted,
              opacity: 1 - phase(t, 9.8, 0.4),
            }}
          >
            compare → simulate → check → review
          </div>
          <div
            style={{
              position: "absolute",
              left: payload.x - 60 - 200,
              top: payload.y - 542 - 50,
              width: 400,
              height: 105,
              padding: 17,
              border: "1px solid #edc5a2",
              borderRadius: 18,
              background: "white",
              boxShadow: "0 12px 25px #9b5f2510",
              display: "flex",
              alignItems: "center",
              gap: 16,
              opacity: phase(t, 10.2, 0.5),
            }}
          >
            <svg
              width={120}
              height={70}
              viewBox="0 0 230 70"
              style={{ flexShrink: 0 }}
            >
              <path
                d={`M15 12 Q125 12 220 ${mix(62, 24, update)}`}
                fill="none"
                stroke="#c26d30"
                strokeWidth={12}
                strokeLinecap="round"
              />
              <line
                x1={10}
                x2={10}
                y1={0}
                y2={65}
                stroke={navy}
                strokeWidth={4}
              />
            </svg>
            <div style={{ fontSize: 24, opacity: valueOpacity }}>
              {shown.thickness_mm.toFixed(1)} mm beam
              <br />
              <span
                style={{
                  color: update > 0.5 ? "#237d65" : "#c26d30",
                  fontFamily: mono,
                  fontSize: 23,
                }}
              >
                {shown.deflection_mm.toFixed(3)} mm deflection
              </span>
            </div>
          </div>
          <div style={{ opacity: 1 - phase(t, 10, 0.4) }}>
            <Button color="#c26d30">
              <Play size={21} />
              Run flow
            </Button>
          </div>
          <div style={{ position: "absolute", right: 0, opacity: update }}>
            <Chip color="#237d65" fill="#ddf4e8">
              <Check size={24} />
              Updated design passes
            </Chip>
          </div>
        </div>
      </Panel>
      <Caption
        t={t}
        at={7.7}
        until={15.5}
        text="Your procedure. Executed as connected work."
      />
      <Caption
        t={t}
        at={20.8}
        until={26}
        text="Review changes the next step."
        color="#a7612c"
      />
      <Cursor
        t={t}
        keys={[
          { at: 0, x: 2010, y: 920 },
          { at: 7.8, x: 2010, y: 920 },
          { at: 8.5, x: 1695, y: 793 },
          { at: 9.4, x: 1695, y: 793, press: true },
          { at: 10.2, x: 2010, y: 920 },
        ]}
      />
    </>
  );
}
