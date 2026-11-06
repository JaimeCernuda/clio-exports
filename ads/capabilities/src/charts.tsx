import React from "react";
import { muted } from "./kit";
export function Axis({
  x,
  y,
  w,
  h,
  max = 100,
  label,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  max?: number;
  label: string;
}) {
  return (
    <g fontSize={22} fill={muted} fontFamily="Inter Variable">
      <text x={x} y={y - 26}>
        {label}
      </text>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line
            x1={x}
            x2={x + w}
            y1={y + h - h * f}
            y2={y + h - h * f}
            stroke="#dce8eb"
          />
          <text x={x - 15} y={y + h - h * f + 7} textAnchor="end">
            {Math.round(max * f)}
          </text>
        </g>
      ))}
    </g>
  );
}
