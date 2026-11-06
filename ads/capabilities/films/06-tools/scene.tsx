import React from "react";
import {
  Database,
  FileCode2,
  FileSpreadsheet,
  Link,
  Microscope,
  Table2,
} from "lucide-react";
import {
  abs,
  Caption,
  Chip,
  Edge,
  mono,
  muted,
  navy,
  Panel,
  ToolRow,
} from "../../src/kit";
import { mix, phase } from "../../src/motion";
import genomics from "../../evidence/genomics.json";

export function ToolsScene({ t }: { t: number }) {
  const run = phase(t, 10, 0.9),
    result = phase(t, 20, 1),
    fold = phase(t, 17, 1),
    pink = "#ad4e86";
  const lines = [
    'parts = ["shape", "indptr", "data"]',
    "for name in parts:",
    "    await tools.read_count_component(",
    "        component=name)",
    "await tools.read_dataset_record()",
  ];
  return (
    <>
      <div
        style={{
          ...abs(mix(160, 110, run), 280, 480),
          opacity: 1 - phase(t, 19.1, 0.5),
          transform: `translateY(${(1 - phase(t, 3.5)) * 50}px)`,
        }}
      >
        <Panel title="Your sources" icon={<Database size={25} />}>
          <div style={{ padding: 30 }}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 550,
                display: "flex",
                alignItems: "center",
                gap: 13,
              }}
            >
              <FileSpreadsheet color={pink} />
              Gene counts
            </div>
            <div
              style={{
                fontFamily: mono,
                fontSize: 21,
                color: muted,
                margin: "15px 0 35px",
              }}
            >
              HDF5 · sparse matrix
            </div>
            <div
              style={{
                fontSize: 27,
                display: "flex",
                alignItems: "center",
                gap: 13,
              }}
            >
              <Link color={pink} />
              Dataset record
            </div>
            <div style={{ fontSize: 23, color: muted, marginTop: 13 }}>
              Source metadata
            </div>
          </div>
        </Panel>
      </div>
      <div
        style={{
          ...abs(1310, 280, 450),
          opacity: 1 - phase(t, 19.1, 0.5),
          transform: `translateY(${(1 - phase(t, 5)) * 50}px)`,
        }}
      >
        <Panel title="Your tools" icon={<Microscope size={25} />}>
          <div style={{ padding: 30 }}>
            {["Read HDF5", "Inspect schema", "Analyze counts"].map((s, i) => (
              <ToolRow key={s} t={t} text={s} done={t > 13 + i * 1.3} />
            ))}
          </div>
        </Panel>
      </div>
      <svg
        width="1920"
        height="850"
        style={{ ...abs(0, 140), opacity: 1 - phase(t, 19.1, 0.5) }}
      >
        <Edge d="M590 350 H690" t={t} at={8} color={pink} />
        <Edge d="M1310 350 H1230" t={t} at={8.6} color={pink} />
      </svg>
      <div
        style={{
          ...abs(
            mix(690, 360, result),
            mix(270, 245, result),
            mix(540, 1200, result),
          ),
          opacity: phase(t, 8, 0.7),
        }}
      >
        <Panel
          title={result > 0.5 ? "Gene-count quality summary" : "Python script"}
          icon={result > 0.5 ? <Table2 size={26} /> : <FileCode2 size={26} />}
        >
          <div
            style={{
              height: mix(470, 555, result),
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "30px 27px",
                opacity: 1 - phase(t, 19.1, 0.5),
                transform: `translateY(${-fold * 50}px)`,
              }}
            >
              {lines.map((line, i) => (
                <div
                  key={line}
                  style={{
                    fontFamily: mono,
                    fontSize: 20,
                    lineHeight: 2.8,
                    whiteSpace: "pre",
                    color: i === 3 ? pink : navy,
                    opacity: phase(t, 9 + i * 0.8, 0.4),
                  }}
                >
                  {line}
                </div>
              ))}
              <div style={{ marginTop: 20 }}>
                <ToolRow
                  t={t}
                  done={t > 18}
                  text={t > 18 ? "Analysis complete" : "Running"}
                  sub="5 operations"
                />
              </div>
            </div>
            <div
              style={{
                position: "absolute",
                inset: 0,
                padding: 40,
                opacity: result,
              }}
            >
              <div style={{ display: "flex", gap: 90 }}>
                <div>
                  <div style={{ fontSize: 60, fontWeight: 650, color: pink }}>
                    {genomics.cells.toLocaleString("en-US")}
                  </div>
                  <div style={{ fontSize: 25, color: muted }}>cells</div>
                </div>
                <div>
                  <div style={{ fontSize: 60, fontWeight: 650, color: pink }}>
                    {genomics.median_counts.toLocaleString("en-US")}
                  </div>
                  <div style={{ fontSize: 25, color: muted }}>
                    median counts / cell
                  </div>
                </div>
              </div>
              <svg width="1100" height="300" style={{ marginTop: 30 }}>
                <text x="0" y="28" fill={muted} fontSize="23">
                  Distribution of per-cell counts
                </text>
                {genomics.histogram.map((v, i) => (
                  <rect
                    key={i}
                    x={i * 42 + 15}
                    y={260 - (v / Math.max(...genomics.histogram)) * 195}
                    width={30}
                    height={(v / Math.max(...genomics.histogram)) * 195}
                    rx={5}
                    fill={pink}
                    opacity={0.55 + i * 0.015}
                  />
                ))}
                <text x="15" y="283" fill={muted} fontSize="20">
                  Lower counts
                </text>
                <text x="870" y="283" fill={muted} fontSize="20">
                  Higher counts
                </text>
              </svg>
              <div style={{ display: "flex", gap: 15, marginTop: 20 }}>
                <Chip fill="#f8ddeb" color={pink}>
                  <Link size={21} />
                  Gene-count file
                </Chip>
                <Chip>
                  <Link size={21} />
                  Dataset metadata
                </Chip>
              </div>
            </div>
          </div>
        </Panel>
      </div>
      <Caption
        t={t}
        at={5.8}
        until={9}
        text="Bring the sources and tools your work needs."
      />
      <Caption
        t={t}
        at={13}
        until={18.2}
        text="One program handles the reads, checks and calculation."
      />
      <Caption
        t={t}
        at={22}
        until={26}
        text="Keep the useful result—and where it came from."
      />
    </>
  );
}
