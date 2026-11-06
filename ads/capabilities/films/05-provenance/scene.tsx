import React from "react";
import {
  ArrowRight,
  Check,
  Database,
  Layers,
  Link,
  Search,
} from "lucide-react";
import {
  abs,
  Button,
  Caption,
  Chip,
  Cursor,
  Enter,
  mono,
  muted,
  Panel,
} from "../../src/kit";
import { mix, phase } from "../../src/motion";
import science from "../../evidence/science.json";
import { fitOutline, simplifyPolyline } from "../../src/maps";

const lakePaths = new Map<string, string>();

function Lake({
  w = 400,
  h = 520,
  fill = "#83bbd0",
  outline = 0,
}: {
  w?: number;
  h?: number;
  fill?: string;
  outline?: number;
}) {
  const key = `${w}:${h}`;
  if (!lakePaths.has(key)) {
    const displayed = simplifyPolyline(
      fitOutline(science.boundary.polygon, w, h),
      0.4,
    );
    lakePaths.set(
      key,
      displayed
        .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`)
        .join(" ") + "Z",
    );
  }
  const d = lakePaths.get(key)!;
  return (
    <svg width={w} height={h}>
      <defs>
        <pattern
          id="lakegrid"
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <path d="M16 0H0V16" fill="none" stroke="white" strokeWidth=".5" />
        </pattern>
      </defs>
      <path
        d={d}
        fill={fill}
        fillOpacity={1 - outline}
        stroke="#327c75"
        strokeWidth={2}
      />
      <path d={d} fill="url(#lakegrid)" opacity={1 - outline} />
    </svg>
  );
}

export function ProvenanceScene({ t }: { t: number }) {
  const step = t < 9 ? 0 : t < 13 ? 1 : t < 17 ? 2 : t < 21.8 ? 3 : 0;
  const trace = phase(t, 5.7, 0.8),
    back = phase(t, 21.8, 1);
  return (
    <>
      <div
        style={{
          ...abs(180, 220, 1560),
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        {["Result", "Measurement", "Boundary", "Source"].map((s, i) => (
          <React.Fragment key={s}>
            <div
              data-review="button"
              style={{
                padding: "13px 22px",
                borderRadius: 13,
                background: step === i ? "#d9efeb" : "#f0f5f6",
                color: step === i ? "#22665e" : muted,
                fontSize: 25,
                opacity: i === 0 ? 1 : phase(t, 5.7 + i * 0.4),
              }}
            >
              {s}
            </div>
            {i < 3 && (
              <ArrowRight
                size={26}
                color="#97b5bb"
                style={{ opacity: trace }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
      <Panel
        title={
          step === 2
            ? "measured_boundary.geojson"
            : step === 3 && t < 22
              ? "Source record"
              : "Mapped boundary measurement"
        }
        icon={step === 3 ? <Database size={26} /> : <Layers size={26} />}
        style={{ ...abs(180, 320, 1560, 555) }}
      >
        <div
          style={{
            ...abs(45, 80),
            transform: `translateX(${mix(0, 120, phase(t, 9, 1) * (1 - back))}px)`,
          }}
        >
          <Lake
            w={370}
            h={450}
            outline={phase(t, 13, 0.4) * (1 - phase(t, 17, 0.4))}
          />
        </div>
        <div style={{ ...abs(555, 115, 900) }}>
          <div style={{ opacity: step === 3 && t < 22 ? 0 : 1 }}>
            <div
              style={{
                fontSize: 84,
                fontWeight: 600,
                letterSpacing: -4,
                color: "#22665e",
              }}
            >
              497.7 <span style={{ fontSize: 50 }}>km²</span>
            </div>
            <div style={{ fontSize: 27, color: muted, marginTop: 14 }}>
              Area enclosed by the mapped boundary
            </div>
          </div>
          {step === 0 && t < 9 && (
            <div style={{ marginTop: 45 }}>
              <Button color="#327c75">
                <Search size={25} />
                Inspect evidence
              </Button>
            </div>
          )}
          {step === 1 && (
            <Enter t={t} at={9}>
              <div style={{ fontSize: 28, lineHeight: 1.8, marginTop: 30 }}>
                <span style={{ color: "#327c75" }}>WGS84 geometry</span>
                <br />
                Equal-area projection
                <br />
                <strong>Cross-check on the ellipsoid</strong>
              </div>
            </Enter>
          )}
          {step === 2 && (
            <Enter t={t} at={13}>
              <div
                style={{
                  fontSize: 26,
                  lineHeight: 1.8,
                  marginTop: 20,
                  fontFamily: mono,
                }}
              >
                measured_boundary.geojson
                <br />
                <span style={{ color: muted }}>Polygon · WGS84</span>
                <br />
                <Chip color="#327c75" fill="#d9efeb">
                  Original boundary retained
                </Chip>
              </div>
            </Enter>
          )}
          {step === 3 && t < 22 && (
            <Enter t={t} at={17} style={{ position: "absolute", top: 0 }}>
              <Chip color="#327c75" fill="#d9efeb">
                <Database size={23} />
                NDP
              </Chip>
              <div style={{ fontSize: 44, fontWeight: 550, marginTop: 30 }}>
                Lake Tahoe boundary
              </div>
              <div
                style={{
                  fontSize: 28,
                  lineHeight: 1.6,
                  color: muted,
                  marginTop: 20,
                }}
              >
                Tahoe Regional Planning Agency
                <br />
                Geometry and originating record
              </div>
            </Enter>
          )}
          {t >= 22 && (
            <Enter t={t} at={22}>
              <div style={{ display: "flex", gap: 15, marginTop: 40 }}>
                <Chip>
                  <Link size={23} />
                  Source linked
                </Chip>
                <Chip>
                  <Check size={23} />
                  Calculation checked
                </Chip>
              </div>
            </Enter>
          )}
        </div>
      </Panel>
      <Caption
        t={t}
        at={6}
        until={10}
        text="Follow the result back to its evidence."
      />
      <Caption
        t={t}
        at={21.8}
        until={24.5}
        text="A result you can inspect, all the way back."
      />
      <Cursor
        t={t}
        keys={[
          { at: 0, x: 2010, y: 990 },
          { at: 4.5, x: 2010, y: 990 },
          { at: 5.1, x: 925, y: 646 },
          { at: 5.7, x: 925, y: 646, press: true },
          { at: 5.9, x: 925, y: 646 },
          { at: 6.65, x: 925, y: -75 },
          { at: 7.6, x: 500, y: -75 },
          { at: 8.4, x: 500, y: 248 },
          { at: 8.7, x: 500, y: 248, press: true },
          { at: 8.9, x: 500, y: 248 },
          { at: 9.5, x: 500, y: -75 },
          { at: 11.7, x: 700, y: -75 },
          { at: 12.5, x: 700, y: 248 },
          { at: 12.8, x: 700, y: 248, press: true },
          { at: 13, x: 700, y: 248 },
          { at: 13.6, x: 700, y: -75 },
          { at: 15.7, x: 890, y: -75 },
          { at: 16.5, x: 890, y: 248 },
          { at: 16.8, x: 890, y: 248, press: true },
          { at: 17, x: 890, y: 248 },
          { at: 17.7, x: 890, y: -75 },
          { at: 20.6, x: 255, y: -75 },
          { at: 21.4, x: 255, y: 248 },
          { at: 21.7, x: 255, y: 248, press: true },
          { at: 21.9, x: 255, y: 248 },
          { at: 22.6, x: 255, y: -75 },
        ]}
      />
    </>
  );
}
