import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import copy from "../story/spotter-intro.json";
import {
  introEase,
  introRoutes,
  routePoint,
  reverseRoute,
  spotterIntroFrame,
  type Curve,
} from "./spotter-intro-plan";
import { NativeProductFilm } from "./NativeProductFilm";

const ink = "#0a2d55",
  muted = "#527282",
  teal = "#1499ad",
  threat = "#b76655";
const path = (c: Curve) =>
  `M ${c[0].join(" ")} C ${c
    .slice(1)
    .map((p) => p.join(" "))
    .join(", ")}`;

function Route({
  curve,
  progress,
  color = teal,
}: {
  curve: Curve;
  progress: number;
  color?: string;
}) {
  return (
    <g opacity={Math.min(1, progress * 4)}>
      <path d={path(curve)} stroke="#cfdee2" strokeWidth={2} fill="none" />
      <path
        d={path(curve)}
        stroke={color}
        strokeWidth={3}
        fill="none"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - progress}
      />
      {progress > 0.99 ? (
        <path
          d="M -10 -5 L 0 0 L -10 5"
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          transform={`translate(${curve[3].join(" ")}) rotate(${(Math.atan2(curve[3][1] - curve[2][1], curve[3][0] - curve[2][0]) * 180) / Math.PI})`}
        />
      ) : null}
    </g>
  );
}

function Packet({
  curve,
  progress,
  color = teal,
}: {
  curve: Curve;
  progress: number;
  color?: string;
}) {
  if (progress <= 0 || progress >= 1) return null;
  const [x, y] = routePoint(curve, progress);
  return (
    <circle cx={x} cy={y} r={7} fill={color} stroke="#f5f5f1" strokeWidth={3} />
  );
}

/** Lead with the full SPOTTER mark; supporting project logos remain unboxed. */
export function SpotterIntro({
  question = copy.question,
}: {
  question?: string;
}) {
  const frame = useCurrentFrame(),
    { width } = useVideoConfig(),
    pose = spotterIntroFrame(frame);
  const settle = introEase(frame, 70, 150);
  const node: React.CSSProperties = {
    position: "absolute",
    top: 285,
    width: 330,
    height: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
  const role: React.CSSProperties = {
    position: "absolute",
    top: 510,
    width: 330,
    textAlign: "center",
    fontSize: 23,
    color: muted,
  };
  return (
    <AbsoluteFill
      style={{
        background: "#f5f5f1",
        color: ink,
        fontFamily: "Inter Variable, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 1920,
          height: 1080,
          background: "#f5f5f1",
          transform: `scale(${width / 1920})`,
          transformOrigin: "0 0",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 145,
            top: 80,
            right: 100,
            fontSize: 65,
            fontWeight: 550,
            letterSpacing: "-.045em",
            lineHeight: 1.1,
            whiteSpace: "pre-line",
            opacity: pose.question,
            transform: `translateY(${12 * (1 - pose.question)}px)`,
          }}
        >
          {question}
        </div>
        <svg
          width={1920}
          height={1080}
          style={{ position: "absolute", inset: 0 }}
          aria-label="SPOTTER AI traces activity and provenance from an OPAL workflow using CLIO and Flowcept"
        >
          {(Object.keys(introRoutes) as Array<keyof typeof introRoutes>).map(
            (key) => (
              <Route
                key={key}
                curve={introRoutes[key]}
                progress={pose.routes[key]}
                color={key === "data" || key === "observe" ? threat : teal}
              />
            ),
          )}
          <Packet
            curve={introRoutes.data}
            progress={introEase(frame, 180, 215)}
            color={threat}
          />
          <Packet
            curve={introRoutes.record}
            progress={introEase(frame, 240, 275)}
          />
          <Packet
            curve={introRoutes.observe}
            progress={introEase(frame, 280, 320)}
            color={threat}
          />
          <Packet
            curve={introRoutes.provenance}
            progress={introEase(frame, 315, 355)}
          />
          <Packet
            curve={introRoutes.observe}
            progress={pose.returnToAgent}
            color={threat}
          />
          <Packet
            curve={reverseRoute(introRoutes.data)}
            progress={pose.returnToData}
            color={threat}
          />
          <path
            d={path(reverseRoute(introRoutes.data))}
            fill="none"
            stroke={threat}
            strokeWidth={3}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - pose.returnToData}
            opacity={pose.trace}
          />
          <circle
            cx={introRoutes.data[0][0]}
            cy={introRoutes.data[0][1]}
            r={6}
            fill={threat}
            opacity={pose.origin}
          />
        </svg>
        <div
          style={{
            ...node,
            left: 175,
            opacity: pose.opal,
            transform: `translateY(${10 * (1 - pose.opal)}px)`,
          }}
        >
          <Img
            alt="OPAL"
            src={staticFile(copy.assets.opal)}
            style={{ height: 170, width: 170, objectFit: "contain" }}
          />
        </div>
        <div
          style={{
            ...node,
            left: 795,
            gap: 15,
            flexDirection: "column",
            opacity: pose.clio,
            transform: `translateY(${10 * (1 - pose.clio)}px)`,
            fontSize: 34,
            fontWeight: 600,
            letterSpacing: "-.035em",
          }}
        >
          <Img
            alt="CLIO"
            src={staticFile(copy.assets.clio)}
            style={{ width: 120, height: 120 }}
          />
          CLIO
        </div>
        <div
          style={{
            ...node,
            left: 1405,
            opacity: pose.flowcept,
            transform: `translateY(${10 * (1 - pose.flowcept)}px)`,
          }}
        >
          <Img
            alt="Flowcept"
            src={staticFile(copy.assets.flowcept)}
            style={{ height: 170, width: 210, objectFit: "contain" }}
          />
        </div>
        <div style={{ ...role, left: 175, opacity: pose.opal }}>
          {copy.roles.opal}
        </div>
        <div style={{ ...role, left: 795, opacity: pose.clio }}>
          {copy.roles.clio}
        </div>
        <div style={{ ...role, left: 1405, opacity: pose.flowcept }}>
          {copy.roles.flowcept}
        </div>
        <Img
          alt="SPOTTER-AI"
          src={staticFile(copy.assets.spotter)}
          style={{
            position: "absolute",
            left: 460 + 110 * settle,
            top: 270 + 290 * settle,
            width: 1000 - 220 * settle,
            height: 546 - 120 * settle,
            objectFit: "contain",
            opacity: pose.guardian,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 720,
            top: 1007,
            width: 480,
            display: "flex",
            justifyContent: "center",
            gap: 35,
            fontSize: 27,
            color: muted,
          }}
        >
          {copy.steps.map((step, index) => (
            <span
              key={step}
              style={{ opacity: [pose.track, pose.detect, pose.trace][index] }}
            >
              {step}
            </span>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** Review the opening's dissolve into the native SPOTTER setup and synchronized comparison. */
export function SpotterOpeningProof() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#f5f5f1" }}>
      <Sequence durationInFrames={480}>
        <SpotterIntro />
      </Sequence>
      <Sequence from={450} durationInFrames={720}>
        <AbsoluteFill style={{ opacity: introEase(frame, 450, 480) }}>
          <NativeProductFilm mode="spotter" />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
}
