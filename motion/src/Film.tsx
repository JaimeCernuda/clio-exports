import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import selection from "../data/parallel-reading.json";
import copy from "./copy.json";
import shot from "./shot.json";
import { mix, progress } from "./motion";
import {
  ActivityRow,
  AgentCard,
  Bot,
  ChevronDown,
  Composer,
  FileText,
  SourceText,
  WorkspaceChrome,
  ClioUIProvider,
  type AgentEvidence,
} from "./ui";

const agents = selection.agents as AgentEvidence[];
const selected = agents.find(
  (agent) => agent.id === selection.selectedAgentId,
)!;
const { columns, cardWidth, cardHeight } = shot.layout;
export type FilmProps = {
  cameraScale: number;
  cameraX: number;
  cameraY: number;
};

/** A single continuous product shot: compose, delegate, inspect, and return to the parent. */
export function ClioProof({
  cameraScale = 1,
  cameraX = 960,
  cameraY = 540,
}: FilmProps) {
  const frame = useCurrentFrame();
  const sent = progress(frame, ...(shot.cues.send as [number, number]));
  const parallel = progress(frame, ...(shot.cues.parallel as [number, number]));
  const inspect = progress(frame, ...(shot.cues.inspect as [number, number]));
  const gridExit = progress(frame, ...(shot.cues.gridExit as [number, number]));
  const rootExit = progress(frame, ...(shot.cues.rootExit as [number, number]));
  const resultEnter = progress(
    frame,
    ...(shot.cues.result as [number, number]),
  );
  const returned = progress(frame, ...(shot.cues.return as [number, number]));
  const sidebar = mix(
    shot.layout.sidebarOpen,
    shot.layout.sidebarClosed,
    parallel,
  );
  const prompt = selection.prompt.displayText;
  const typed = prompt.slice(
    0,
    Math.floor(mix(0, prompt.length, Math.min(1, frame / shot.cues.typingEnd))),
  );
  const selectedTools = selected.tools
    .filter((tool) => tool.tool === "fs_read_file")
    .slice(0, 5);
  const contextLeft = mix(320, 240, parallel);
  const rootWidth = mix(1150, 520, parallel);
  const rootX = mix(430, contextLeft, sent);
  const rootY = mix(428, 145, sent);
  const rootH = mix(205, 158, sent) + 22 * parallel;
  return (
    <ClioUIProvider labels={copy}>
      <AbsoluteFill
        className="clio-ui"
        style={{
          fontFamily: "Inter Variable, sans-serif",
          color: "var(--foreground)",
          overflow: "hidden",
          background: "var(--background)",
        }}
      >
        <AbsoluteFill
          style={{
            transform: `scale(${cameraScale})`,
            transformOrigin: `${cameraX}px ${cameraY}px`,
          }}
        >
          <WorkspaceChrome
            title={copy.response}
            brandMarkSrc={staticFile("clio-mark.svg")}
            brandMark={
              <Img
                src={staticFile("clio-mark.svg")}
                style={{ width: 43, height: 43 }}
              />
            }
            sidebarWidth={sidebar}
            agentCount={
              agents.filter((_, index) => frame >= 195 + index * 5).length
            }
          >
            <div
              style={{
                position: "absolute",
                left: 480,
                top: 275,
                fontSize: 49,
                fontWeight: 500,
                letterSpacing: -1.8,
                opacity: 1 - progress(frame, 112, 124),
              }}
            >
              {copy.greeting}
            </div>
            <Composer
              text={typed}
              pressed={Math.sin(progress(frame, 116, 128) * Math.PI)}
              controls={1 - progress(frame, 128, 146)}
              caret={1 - progress(frame, 116, 126)}
              fontSize={mix(30, 28, sent)}
              messageId={selection.prompt.messageId}
              style={{
                left: rootX,
                top: rootY - 60 * returned,
                width: mix(1060, rootWidth, sent),
                height: rootH,
                opacity: 1 - rootExit,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: contextLeft,
                top: 345,
                width: rootWidth,
                overflow: "hidden",
                isolation: "isolate",
                opacity: progress(frame, 172, 200) * (1 - rootExit),
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 23,
                  fontWeight: 550,
                  marginBottom: 20,
                }}
              >
                <Bot size={25} color="var(--info)" />
                CLIO
              </div>
              <div style={{ fontSize: 25, lineHeight: 1.5, marginBottom: 22 }}>
                I'll start by locating the design/ folder.
              </div>
              <div style={{ visibility: frame >= 186 ? "visible" : "hidden" }}>
                <ActivityRow
                  label={copy.listDirectory}
                  detail="design/"
                  frame={frame}
                />
              </div>
              <div style={{ visibility: frame >= 208 ? "visible" : "hidden" }}>
                <ActivityRow
                  label={copy.delegate}
                  detail={`${agents.length} explore agents`}
                  frame={frame}
                  complete={frame > 560}
                />
              </div>
              <div
                style={{
                  marginTop: 22,
                  fontSize: 19,
                  color: "var(--muted-foreground)",
                  opacity: parallel,
                }}
              >
                {copy.parallelContext}
              </div>
            </div>
            <svg
              width="1920"
              height="1080"
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                opacity: parallel * (1 - gridExit) * 0.35,
              }}
            >
              {agents.map((agent, index) => {
                const col = index % columns,
                  row = Math.floor(index / columns);
                return (
                  <path
                    key={agent.id}
                    d={`M760 590 C805 590 805 ${230 + row * shot.layout.rowPitch} ${shot.layout.gridLeft + col * shot.layout.columnPitch} ${230 + row * shot.layout.rowPitch}`}
                    stroke="var(--primary)"
                    fill="none"
                    strokeWidth="1.7"
                    pathLength={1}
                    strokeDasharray="1 1"
                    strokeDashoffset={
                      1 - progress(frame, 180 + index * 5, 230 + index * 5)
                    }
                  />
                );
              })}
            </svg>
            {agents.map((agent, index) => {
              const appear = progress(frame, 195 + index * 5, 226 + index * 5);
              const col = index % columns,
                row = Math.floor(index / columns);
              const gridX =
                  shot.layout.gridLeft + col * shot.layout.columnPitch,
                gridY = shot.layout.gridTop + row * shot.layout.rowPitch;
              const opacity = appear * (1 - gridExit);
              return (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  frame={frame}
                  ended={frame > 555 + index * 4}
                  style={{
                    left: mix(780, gridX, appear),
                    top: gridY + 30 * (1 - appear),
                    width: cardWidth,
                    height: cardHeight,
                    opacity,
                    transform: `scale(${mix(0.96, 1, appear)})`,
                  }}
                />
              );
            })}
            <section
              className="panel"
              data-source-session={selected.id}
              style={{
                position: "absolute",
                left: mix(mix(850, 820, inspect), 1150, returned),
                top: mix(308, 133, inspect),
                width: mix(mix(460, 1030, inspect), 700, returned),
                height: mix(122, 820, inspect),
                overflow: "hidden",
                opacity: inspect,
                transform: `translateY(${30 * (1 - inspect)}px)`,
                boxShadow: "0 18px 70px #143b5d10",
              }}
            >
              <div
                style={{
                  padding: "24px 27px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 20,
                  color: "var(--muted-foreground)",
                }}
              >
                <Bot size={22} color="var(--info)" />
                {copy.selected}
                <ChevronDown size={19} style={{ marginLeft: "auto" }} />
              </div>
              <div style={{ padding: "26px 30px" }}>
                <h2
                  style={{
                    fontSize: 31,
                    letterSpacing: -0.8,
                    margin: "0 0 8px",
                  }}
                >
                  {selected.name}
                </h2>
                <div
                  className="mono muted"
                  style={{ fontSize: 16, marginBottom: 25 }}
                >
                  {selected.agent}
                </div>
                {selectedTools.map((tool, index) => (
                  <div
                    key={tool.call_id}
                    data-source-call={tool.call_id}
                    style={{
                      visibility:
                        frame >= 406 + index * 12 ? "visible" : "hidden",
                      transform: `translateY(${12 * (1 - progress(frame, 406 + index * 12, 430 + index * 12))}px)`,
                    }}
                  >
                    <ActivityRow
                      label={copy.readFile}
                      detail={
                        tool.path?.split("/").at(-1) ||
                        tool.description ||
                        tool.tool
                      }
                      frame={frame}
                    />
                  </div>
                ))}
                <div
                  data-source-part={selected.excerpt.partId}
                  style={{
                    opacity: progress(frame, 490, 530),
                    marginTop: 24,
                    padding: "20px",
                    borderRadius: 9,
                    background: "var(--muted)",
                  }}
                >
                  <div
                    className="muted"
                    style={{
                      fontSize: 14,
                      letterSpacing: 1.8,
                      marginBottom: 12,
                    }}
                  >
                    {copy.recordedResponse.toUpperCase()}
                  </div>
                  <SourceText
                    text={
                      selected.excerpt.headings?.slice(0, 2).join("\n\n") ||
                      selected.excerpt.text
                    }
                    maxLines={returned > 0.5 ? 3 : 4}
                  />
                </div>
              </div>
            </section>
            <section
              data-source-message={selection.result.messageId}
              style={{
                position: "absolute",
                left: 240,
                top: 155,
                width: 830,
                opacity: resultEnter,
                transform: `translateY(${30 * (1 - resultEnter)}px)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 23,
                  marginBottom: 25,
                }}
              >
                <Bot size={27} color="var(--info)" />
                CLIO
              </div>
              <h1
                style={{
                  fontSize: 44,
                  letterSpacing: -1.4,
                  fontWeight: 550,
                  margin: "0 0 22px",
                }}
              >
                Reading guide to{" "}
                <span
                  className="mono"
                  style={{ color: "var(--info)", fontSize: 38 }}
                >
                  design/
                </span>
              </h1>
              <div
                className="panel"
                style={{
                  padding: "24px 28px",
                  display: "flex",
                  alignItems: "center",
                  gap: 15,
                  fontSize: 22,
                  marginBottom: 28,
                }}
              >
                <FileText size={26} color="var(--info)" />
                <span>{agents.length} child conversations</span>
                <span
                  className="muted"
                  style={{ marginLeft: "auto", fontSize: 18 }}
                >
                  {copy.inspectWork}
                </span>
              </div>
              <div
                className="muted"
                style={{ fontSize: 17, margin: "32px 0 14px" }}
              >
                {copy.resultOutline}
              </div>
              {selection.result.headings?.slice(1, 7).map((heading, index) => (
                <div
                  key={heading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 13,
                    padding: "19px 0",
                    borderBottom: "1px solid var(--border)",
                    fontSize: 22,
                    visibility: frame >= 610 + index * 6 ? "visible" : "hidden",
                  }}
                >
                  <ChevronDown size={18} color="var(--info)" />
                  {heading.replace(/`/g, "")}
                </div>
              ))}
            </section>
            <div
              style={{
                position: "absolute",
                left: mix(300, 240, parallel),
                bottom: 57,
                right: 65,
                height: 67,
                borderRadius: 16,
                border: "1px solid var(--composer-border)",
                background: "var(--composer)",
                display: "flex",
                alignItems: "center",
                padding: "0 25px",
                fontSize: 21,
                color: "var(--muted-foreground)",
                opacity: progress(frame, 168, 200) * (1 - returned * 0.8),
              }}
            >
              {copy.followup}
              <span style={{ marginLeft: "auto", color: "var(--info)" }}>
                ↑
              </span>
            </div>
            <div
              style={{
                position: "absolute",
                left: sidebar + 30,
                bottom: 15,
                fontSize: 14,
                color: "var(--muted-foreground)",
              }}
            >
              {copy.disclosure}
            </div>
            <div
              style={{
                position: "absolute",
                right: 40,
                bottom: 15,
                fontSize: 14,
                color: "var(--muted-foreground)",
              }}
            >
              Source: {selection.rootSessionId}
            </div>
          </WorkspaceChrome>
        </AbsoluteFill>
      </AbsoluteFill>
    </ClioUIProvider>
  );
}
