import React from "react";
import { Activity, Check, Link, Send, Table2 } from "lucide-react";
import {
  abs,
  Button,
  Caption,
  Chip,
  Cursor,
  mono,
  muted,
  ToolRow,
} from "../../src/kit";
import { clamp, mix, phase } from "../../src/motion";
import { mercator } from "../../src/maps";
import hurricanes from "../../evidence/hurricane.json";
import geography from "../../evidence/atlantic-basemap.json";

export const selectedStorm = hurricanes.filter(
  (r) => r.lon >= -79 && r.lon <= -76 && r.lat >= 25 && r.lat <= 28,
);
const peak = Math.max(...selectedStorm.map((r) => r.wind_kt));
const peakRows = selectedStorm.filter((r) => r.wind_kt === peak);
const project = mercator(940, 490, -77, 27, [21, 33]);
const [bx, by] = project(-79, 28),
  [ex, ey] = project(-76, 25);
const route = hurricanes
  .map((r, i) => `${i ? "L" : "M"}${project(r.lon, r.lat).join(",")}`)
  .join(" ");
const land = geography.features.map((feature) => ({
  name: feature.name,
  path: feature.polygons
    .map((polygon) =>
      polygon
        .map(
          (ring) =>
            ring
              .map(
                ([lon, lat], i) =>
                  `${i ? "L" : "M"}${project(lon, lat).join(",")}`,
              )
              .join(" ") + "Z",
        )
        .join(" "),
    )
    .join(" "),
}));

export function SelectionScene({ t }: { t: number }) {
  const select = phase(t, 6, 1.2),
    ref = phase(t, 11.4, 0.8),
    fly = phase(t, 12.2, 0.8),
    ask = phase(t, 15, 0.8),
    answer = phase(t, 23.4, 0.7),
    work = phase(t, 18.8, 0.45),
    collapse = phase(t, 22.8, 0.6);
  const rows =
    select > 0.99 ? selectedStorm.slice(0, 5) : hurricanes.slice(33, 38);
  return (
    <>
      <div
        style={{
          ...abs(145, 240),
          display: "flex",
          gap: 13,
          alignItems: "center",
          fontSize: 27,
          color: muted,
        }}
      >
        <Activity size={27} />
        Dorian · September 2019
      </div>
      <svg
        data-review="selection-surface"
        width={940}
        height={490}
        style={{
          ...abs(145, 310),
          borderRadius: 20,
          boxShadow: "0 18px 50px #173b4c09",
        }}
      >
        <defs>
          <clipPath id="storm-viewport">
            <rect width={940} height={490} rx={20} />
          </clipPath>
        </defs>
        <g clipPath="url(#storm-viewport)">
          <rect width={940} height={490} fill="#e8f4fa" />
          {[-88, -84, -80, -76, -72, -68].map((lon) => (
            <path
              key={lon}
              d={`M${project(lon, 17).join(",")}L${project(lon, 37).join(",")}`}
              stroke="#cfe4ec"
              fill="none"
            />
          ))}
          {[20, 24, 28, 32, 36].map((lat) => (
            <path
              key={lat}
              d={`M${project(-96, lat).join(",")}L${project(-58, lat).join(",")}`}
              stroke="#cfe4ec"
              fill="none"
            />
          ))}
          {land.map((feature) => (
            <path
              key={feature.name}
              d={feature.path}
              fill="#dde7d6"
              stroke="#a7bba4"
              strokeWidth={1.5}
              fillRule="evenodd"
            />
          ))}
          <path d={route} fill="none" stroke="#769eb4" strokeWidth={3} />
          {hurricanes.map((r) => {
            const chosen = selectedStorm.some(
                (s) => s.observation_id === r.observation_id,
              ),
              [x, y] = project(r.lon, r.lat);
            return (
              <circle
                key={r.observation_id}
                cx={x}
                cy={y}
                r={chosen ? mix(4.5, 7, select) : 4.5}
                fill={chosen && select > 0.1 ? "#237fa8" : "#94b5c7"}
                stroke="#fff"
                strokeWidth={1}
                opacity={chosen ? 1 : mix(1, 0.45, select)}
              />
            );
          })}
          <rect
            x={bx}
            y={by}
            width={(ex - bx) * select}
            height={(ey - by) * select}
            rx={6}
            fill="#318fb121"
            stroke="#237fa8"
            strokeWidth={2}
            opacity={select}
          />
        </g>
      </svg>
      <div
        style={{
          ...abs(145, 310, 940, 490),
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        {(
          [
            [-82, 28, "FLORIDA"],
            [-79.7, 22, "CUBA"],
            [-76.6, 23.7, "THE BAHAMAS"],
            [-69.6, 30, "ATLANTIC"],
          ] as const
        ).map(([lon, lat, name]) => (
          <div
            key={name}
            data-map-label={name}
            style={{
              ...abs(project(lon, lat)[0], project(lon, lat)[1] - 19),
              transform: "translateX(-50%)",
              whiteSpace: "nowrap",
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: 1.5,
              color: "#55747b",
            }}
          >
            {name}
          </div>
        ))}
      </div>
      <div
        style={{
          ...abs(1150, 310, 610),
          fontSize: 24,
          opacity: 1 - phase(t, 10.7, 0.65),
          transform: `translateY(${-phase(t, 10.7, 0.65) * 20}px)`,
        }}
      >
        <div
          style={{
            height: 40,
            display: "flex",
            justifyContent: "space-between",
            color: muted,
          }}
        >
          <span>
            {select > 0.99 ? "12 selected observations" : "Observations"}
          </span>
          <span>Wind / kt</span>
        </div>
        {rows.map((r) => (
          <div
            key={r.observation_id}
            style={{
              height: 58,
              marginBottom: 5,
              padding: "0 14px",
              borderRadius: 9,
              background: select > 0.99 ? "#dcecf8" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>{r.time.slice(5, 16).replace("T", " ")}</span>
            <span style={{ fontFamily: mono }}>{r.wind_kt}</span>
          </div>
        ))}
        <div style={{ marginTop: 24, opacity: select }}>
          <Button selected={t > 9.6} color="#3679aa">
            <Link size={23} />
            Reference this
          </Button>
        </div>
      </div>
      <div
        style={{
          ...abs(mix(1270, 1240, fly), mix(730, 355, fly), mix(340, 550, fly)),
          opacity: ref,
        }}
      >
        <div
          style={{
            position: "relative",
            border: "1.5px solid #b9d0da",
            background: "#edf7fb",
            borderRadius: 20,
            padding: "22px 28px",
            height: mix(104, 200, ask),
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <Chip fill="#d4eaf7" color="#276c94">
            <Table2 size={23} />
            {selectedStorm.length} observations
          </Chip>
          <div
            style={{
              fontSize: 27,
              lineHeight: 1.4,
              marginTop: 21,
              width: 415,
              opacity: ask,
            }}
          >
            {"When did winds peak in the selected region?".slice(
              0,
              Math.floor(clamp((t - 15.2) / 2.2) * 43),
            )}
          </div>
          <div
            data-review="button"
            style={{
              ...abs(480, 132, 48, 48),
              display: "grid",
              placeItems: "center",
              borderRadius: 10,
              background: t > 17.4 ? "#d4eaf7" : "transparent",
              opacity: ask,
            }}
          >
            <Send size={27} color="#276c94" />
          </div>
        </div>
      </div>
      <div style={{ ...abs(1240, 598, 550), opacity: work }}>
        <ToolRow t={t} text="Analyse 12 observations" done={t >= 22.8} />
        <div
          style={{
            height: 150 * (1 - collapse),
            opacity: 1 - collapse,
            overflow: "hidden",
            borderLeft: "1px solid #bcd2da",
            marginLeft: 12,
            paddingLeft: 20,
          }}
        >
          <div style={{ opacity: phase(t, 19.5, 0.35) }}>
            <ToolRow t={t} text="Read selected records" done={t >= 20.8} />
          </div>
          <div style={{ opacity: phase(t, 20.9, 0.35) }}>
            <ToolRow t={t} text="Python: find maximum wind" done={t >= 22.6} />
          </div>
        </div>
      </div>
      <div
        style={{
          ...abs(1240, 700, 550),
          opacity: answer,
          transform: `translateY(${(1 - answer) * 25}px)`,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            fontSize: 22,
            color: muted,
          }}
        >
          <Check size={25} color="#3679aa" />
          From your selected observations
        </div>
        <div style={{ fontSize: 37, marginTop: 18 }}>
          Peak winds: <strong style={{ color: "#3679aa" }}>{peak} kt</strong>
        </div>
        <div
          style={{ fontSize: 25, color: muted, lineHeight: 1.5, marginTop: 13 }}
        >
          September 1 at
          <br />
          {peakRows.map((r) => r.time.slice(11, 16)).join(" and ")} UTC
        </div>
      </div>
      <Caption
        t={t}
        at={7.6}
        until={10.6}
        text="Carry the selected observations into the conversation."
      />
      <Caption
        t={t}
        at={25}
        until={28}
        text="Answers linked to the records you selected."
      />
      <Cursor
        t={t}
        keys={[
          { at: 0, x: 2010, y: 990 },
          { at: 4.5, x: 2010, y: 990 },
          { at: 5.5, x: 145 + bx, y: 310 + by },
          { at: 6, x: 145 + bx, y: 310 + by, press: true },
          { at: 7.2, x: 145 + ex, y: 310 + ey },
          { at: 8.2, x: 1290, y: 717 },
          { at: 10.5, x: 1290, y: 717, press: true },
          { at: 12.6, x: 2010, y: 990 },
          { at: 17.4, x: 2010, y: 990 },
          { at: 18, x: 1744, y: 510 },
          { at: 18.4, x: 1744, y: 510, press: true },
          { at: 19.5, x: 2010, y: 990 },
        ]}
      />
    </>
  );
}
