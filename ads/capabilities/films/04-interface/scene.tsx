import React from "react";
import { Check, Download, FileSpreadsheet } from "lucide-react";
import {
  abs,
  Button,
  Caption,
  Cursor,
  mono,
  muted,
  Panel,
} from "../../src/kit";
import { linePath, mix, phase } from "../../src/motion";
import science from "../../evidence/science.json";
import { Axis } from "../../src/charts";

export function InterfaceScene({ t }: { t: number }) {
  const baseline = phase(t, 10.25, 0.8),
    download = phase(t, 22, 0.5);
  const matched = science.snowfall.filter((r) => r.cohort === "matched17"),
    available = science.snowfall.filter((r) => r.cohort === "available");
  const cols = matched.map((r, i) => ({
    ...r,
    mean: mix(r.mean_in, available[i].mean_in, baseline),
    q25_in: mix(r.q25_in, available[i].q25_in, baseline),
    q75_in: mix(r.q75_in, available[i].q75_in, baseline),
    min_in: mix(r.min_in, available[i].min_in, baseline),
    max_in: mix(r.max_in, available[i].max_in, baseline),
  }));
  const selected = t >= 16;
  const removal = cols.map(
    (_, i) =>
      (({ 0: 15.8, 1: 16.2, 2: 16.6, 6: 17 }) as Record<number, number>)[i],
  );
  const weights = removal.map((at) =>
    at === undefined ? 0 : phase(t, at, 0.35),
  );
  return (
    <>
      <Panel
        title="Monthly snowfall comparison"
        chrome
        icon={<FileSpreadsheet size={26} />}
        style={{ ...abs(145, 215, 1630, 680) }}
      >
        <div style={{ ...abs(40, 95), display: "flex", gap: 14 }}>
          <Button selected={!baseline} color="#247eaf">
            Same 17 complete winters
          </Button>
          <Button selected={baseline > 0.5} color="#247eaf">
            All complete months
          </Button>
        </div>
        <div style={{ ...abs(40, 171), display: "flex", gap: 12 }}>
          {cols.map((r, i) => (
            <Button
              key={r.month}
              selected={weights[i] < 0.5}
              color="#247eaf"
              style={{
                width: 91,
                justifyContent: "center",
                padding: "10px 0",
                opacity: mix(1, 0.45, weights[i]),
              }}
            >
              {r.month}
            </Button>
          ))}
        </div>
        <div style={{ ...abs(1390, 95) }}>
          <Button color="#247eaf" selected={t > 21.7}>
            <Download size={24} />
            Export
          </Button>
        </div>
        <svg width="1120" height="380" style={abs(45, 260)}>
          <Axis
            x={85}
            y={40}
            w={900}
            h={245}
            max={250}
            label="Monthly snowfall / inches"
          />
          {cols.map((r, i) => {
            const x = 100 + i * 145;
            return (
              <g key={r.month} opacity={mix(1, 0.15, weights[i])}>
                <line
                  x1={x}
                  x2={x}
                  y1={285 - (r.min_in / 250) * 245}
                  y2={285 - (r.max_in / 250) * 245}
                  stroke="#c6d0d5"
                  strokeWidth={2}
                />
                <rect
                  x={x - 19}
                  y={285 - (r.q75_in / 250) * 245}
                  width={38}
                  height={((r.q75_in - r.q25_in) / 250) * 245}
                  fill="#bfd3e3"
                />
                <text
                  x={x}
                  y={330}
                  textAnchor="middle"
                  fill={muted}
                  fontSize={24}
                >
                  {r.month}
                </text>
              </g>
            );
          })}
          <path
            d={linePath(
              cols.map((r) => r.mean),
              100,
              40,
              870,
              245,
              0,
              250,
            )}
            stroke="#c99b46"
            strokeDasharray="8 6"
            strokeWidth={3}
            fill="none"
          />
          <path
            d={linePath(
              cols.map((r) => r.target_in),
              100,
              40,
              870,
              245,
              0,
              250,
            )}
            stroke="#218f9c"
            strokeWidth={4}
            fill="none"
          />
          {cols.map((r, i) => (
            <circle
              key={i}
              cx={100 + i * 145}
              cy={285 - (r.target_in / 250) * 245}
              r={7}
              fill="#218f9c"
            />
          ))}
          <g fill={muted} fontSize={21}>
            <text x={90} y={375}>
              Teal: 2023–24
            </text>
            <text x={350} y={375}>
              Gold: historical mean
            </text>
          </g>
        </svg>
        <div style={{ ...abs(1180, 285, 395), fontSize: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              color: muted,
              paddingBottom: 18,
              borderBottom: "1px solid #cbdde2",
            }}
          >
            <span>Month</span>
            <span>Δ vs mean / in</span>
          </div>
          {cols.map((r, i) => (
            <div
              key={r.month}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: `${mix(10, 0, weights[i])}px 0`,
                height: mix(49, 0, weights[i]),
                overflow: "hidden",
                opacity: 1 - weights[i],
                borderBottom: "1px solid #dce8eb",
                background:
                  selected && i >= 3 && i <= 5 ? "#e4f2f7" : undefined,
              }}
            >
              <span>{r.month}</span>
              <span style={{ fontFamily: mono }}>
                {(r.target_in - r.mean >= 0 ? "+" : "") +
                  (r.target_in - r.mean).toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </Panel>
      <div
        style={{
          ...abs(1325, 820, 450),
          opacity: download,
          background: "#ddf4e8",
          borderRadius: 13,
          padding: 20,
          fontSize: 22,
          display: "flex",
          gap: 12,
        }}
      >
        <Check size={25} />
        Comparison exported
      </div>
      <Caption
        t={t}
        at={5}
        until={9}
        text="Ask a question. Get something you can explore."
      />
      <Caption
        t={t}
        at={17.8}
        until={21.3}
        text="Change the controls. See the data respond."
      />
      <Cursor
        t={t}
        keys={[
          { at: 0, x: 2010, y: 990 },
          { at: 8.4, x: 2010, y: 990 },
          { at: 9.4, x: 785, y: 340 },
          { at: 10.2, x: 785, y: 340, press: true },
          { at: 11, x: 850, y: 400 },
          { at: 11.8, x: 2010, y: 990 },
          { at: 14, x: 2010, y: 990 },
          { at: 15.1, x: 220, y: 410 },
          { at: 15.8, x: 220, y: 410, press: true },
          { at: 16.2, x: 325, y: 410, press: true },
          { at: 16.6, x: 430, y: 410, press: true },
          { at: 17, x: 840, y: 410, press: true },
          { at: 18, x: 1020, y: 600 },
          { at: 18.8, x: 2010, y: 990 },
          { at: 20.7, x: 2010, y: 990 },
          { at: 21.3, x: 1620, y: 340 },
          { at: 21.9, x: 1620, y: 340, press: true },
          { at: 23.5, x: 2010, y: 990 },
        ]}
      />
    </>
  );
}
