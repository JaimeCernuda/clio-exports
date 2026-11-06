import React from "react";
import { Activity, Layers } from "lucide-react";
import {
  abs,
  Caption,
  Chip,
  Cursor,
  Edge,
  Enter,
  muted,
  Panel,
  ToolRow,
} from "../../src/kit";
import { linePath, mix, phase } from "../../src/motion";
import science from "../../evidence/science.json";

export function TeamScene({ t }: { t: number }) {
  const inspect = phase(t, 14.6, 0.7) * (1 - phase(t, 19.2, 0.7)),
    merge = phase(t, 22, 1);
  const peerCompact = phase(t, 12.9, 0.45) * (1 - phase(t, 21.1, 0.45));
  const peerSpread = phase(t, 13.4, 0.6) * (1 - phase(t, 20.5, 0.6));
  const peerDock = phase(t, 14, 0.6) * (1 - phase(t, 19.9, 0.6));
  const labels = ["Particles", "CO₂", "Wind / quality"],
    cols = ["#c27a38", "#735db7", "#287da7"];
  const burn = science.burn;
  const signals = [
    burn.map((r) => Math.log10(Math.max(0.1, r.particle_mean_ug_m3 ?? 0.1))),
    burn.map((r) => r.CO2MFd_mean ?? 0),
    burn.map((r) => r.horizontal_speed_mean ?? 0),
  ];
  return (
    <>
      <Enter
        t={t}
        at={3.4}
        style={{ ...abs(345, 200, 1230), textAlign: "center" }}
      >
        <Chip fill="#d8f2e9" color="#218a7b">
          Research question
        </Chip>
        <div style={{ fontSize: 37, marginTop: 19 }}>
          What changed during the burn?
        </div>
      </Enter>
      <svg
        width="1920"
        height="800"
        style={{
          ...abs(0, 180),
          opacity: 1 - phase(t, 12.9, 0.45) * (1 - phase(t, 21.55, 0.45)),
        }}
      >
        {labels.map((_, i) => (
          <Edge
            key={i}
            d={`M960 120 V165 Q960 190 ${420 + i * 540} 190 V230`}
            t={t}
            at={5 + i * 0.3}
            color={cols[i]}
          />
        ))}
      </svg>
      {labels.map((label, i) => {
        const x = mix(
            155 + i * 540,
            i === 0 ? 170 : 1350,
            i === 0 ? inspect : peerDock,
          ),
          y = mix(
            430,
            i === 0 ? 355 : 290 + (i - 1) * 360,
            i === 0 ? inspect : peerSpread,
          ),
          w = mix(490, i === 0 ? 1080 : 410, i === 0 ? inspect : peerCompact);
        const finish = 18 + i * 1.2;
        return (
          <div
            key={label}
            style={{
              ...abs(x, y, w),
              opacity: 1 - phase(t, 21.7, 0.4),
              transform: `translateY(${(1 - phase(t, 5.5 + i * 0.25)) * 45}px)`,
            }}
          >
            <Panel
              title={label}
              openable
              active={i === 0 && t > 11.8 && t < 13}
              icon={<Activity size={26} color={cols[i]} />}
              style={{
                height:
                  i === 0 ? mix(350, 510, inspect) : mix(350, 190, peerCompact),
                borderColor: inspect && i === 0 ? cols[i] : undefined,
              }}
            >
              <div style={{ padding: "15px 27px" }}>
                <ToolRow
                  t={t}
                  text={
                    t < finish ? "Reviewing observations" : "Analysis complete"
                  }
                  done={t >= finish}
                />
                {i === 0 && inspect > 0.01 ? (
                  <div style={{ opacity: inspect }}>
                    <ToolRow t={t} done text="Read minute-level records" />
                    <ToolRow
                      t={t}
                      done={t > 15.5}
                      text="Calculate uncertainty"
                    />
                    <div
                      style={{ fontSize: 25, marginTop: 22, lineHeight: 1.5 }}
                    >
                      A sharp burst appears within the hour.
                      <br />
                      <span style={{ color: muted }}>
                        Compare it with the other signals.
                      </span>
                    </div>
                  </div>
                ) : null}
                <svg
                  width={Math.max(1, w - 60)}
                  height={170 * (1 - peerCompact * Number(i > 0))}
                  style={{ opacity: i > 0 ? 1 - peerCompact : 1 }}
                >
                  <path
                    d={linePath(
                      signals[i],
                      15,
                      15,
                      w - 95,
                      130,
                      Math.min(...signals[i]),
                      Math.max(...signals[i]) + 1e-6,
                    )}
                    stroke={cols[i]}
                    strokeWidth={3.5}
                    fill="none"
                  />
                </svg>
              </div>
            </Panel>
          </div>
        );
      })}
      <div
        style={{
          ...abs(220, 410, 1480),
          opacity: phase(t, 22.15, 0.7),
          transform: `translateY(${(1 - merge) * 60}px)`,
        }}
      >
        <Panel title="Combined findings" icon={<Layers size={25} />}>
          <div style={{ display: "flex", gap: 35, padding: 45 }}>
            {labels.map((l, i) => (
              <div key={l} style={{ flex: 1 }}>
                <div style={{ fontSize: 27, color: cols[i], fontWeight: 600 }}>
                  {l}
                </div>
                <svg width="405" height="180">
                  <path
                    d={linePath(
                      signals[i],
                      15,
                      20,
                      370,
                      130,
                      Math.min(...signals[i]),
                      Math.max(...signals[i]) + 1e-6,
                    )}
                    stroke={cols[i]}
                    strokeWidth={4}
                    fill="none"
                  />
                </svg>
              </div>
            ))}
          </div>
          <div style={{ padding: "0 45px 40px", fontSize: 32 }}>
            Different signals. One investigation.
          </div>
        </Panel>
      </div>
      <Caption
        t={t}
        at={8}
        until={12.5}
        text="Specialists work together, with distinct assignments."
      />
      <Cursor
        t={t}
        keys={[
          { at: 0, x: 2010, y: 990 },
          { at: 11, x: 2010, y: 990 },
          { at: 12.2, x: 545, y: 465 },
          { at: 12.7, x: 545, y: 465, press: true },
          { at: 14.1, x: 2010, y: 990 },
        ]}
      />
    </>
  );
}
