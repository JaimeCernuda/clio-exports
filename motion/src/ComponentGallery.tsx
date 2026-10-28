import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import selection from "../data/parallel-reading.json";
import {
  ActivityRow,
  AgentCard,
  Bot,
  ClioUIProvider,
  ConversationMessage,
  Panel,
  SourceText,
  WorkspaceChrome,
} from "./ui";
import { progress } from "./motion";

export type GalleryProps = {
  focus: "overview" | "activity";
  cameraScale: number;
};

/** Internal component workbench using real evidence in two deliberately different layouts. */
export function ComponentGallery({
  focus = "overview",
  cameraScale = 1,
}: GalleryProps) {
  const frame = useCurrentFrame();
  const activity = focus === "activity";
  const selected = selection.agents.find(
    (agent) => agent.id === selection.selectedAgentId,
  )!;
  const tools = selected.tools
    .filter((tool) => tool.tool === "fs_read_file")
    .slice(0, 3);
  return (
    <ClioUIProvider>
      <AbsoluteFill
        className="clio-ui"
        style={{ background: "var(--background)", overflow: "hidden" }}
      >
        <AbsoluteFill
          style={{
            transform: `scale(${cameraScale})`,
            transformOrigin: "960px 540px",
          }}
        >
          <WorkspaceChrome
            sidebarWidth={activity ? 88 : 256}
            agentCount={selection.agents.length}
            title="Component lab"
            brandMarkSrc={staticFile("clio-mark.svg")}
            brandMark={
              <Img
                src={staticFile("clio-mark.svg")}
                style={{ width: 43, height: 43 }}
              />
            }
          >
            <Panel
              title={selected.name}
              leading={<Bot size={22} />}
              sessionId={selected.id}
              style={{
                position: "absolute",
                left: 280,
                top: 145,
                width: activity ? 1020 : 680,
                height: 750,
              }}
            >
              <ConversationMessage
                role="user"
                messageId={selection.prompt.messageId}
                style={{ fontSize: 25 }}
              >
                {selection.prompt.displayText}
              </ConversationMessage>
              <div style={{ margin: "24px 0" }}>
                {tools.map((tool) => (
                  <ActivityRow
                    key={tool.call_id}
                    callId={tool.call_id}
                    label={tool.tool}
                    detail={tool.description}
                    frame={frame}
                  />
                ))}
              </div>
              <ConversationMessage
                role="assistant"
                messageId={selected.terminalMessageId}
              >
                <SourceText
                  partId={selected.excerpt.partId}
                  text={
                    selected.excerpt.headings?.slice(0, 2).join("\n\n") ||
                    selected.excerpt.text
                  }
                  maxLines={4}
                />
              </ConversationMessage>
            </Panel>
            {selection.agents.slice(0, 4).map((agent, index) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                frame={frame}
                ended={agent.stopReason === "end_turn"}
                style={{
                  left: activity ? 1370 : 1040,
                  top:
                    145 +
                    index * 170 +
                    18 * (1 - progress(frame, index * 8, index * 8 + 40)),
                  width: activity ? 450 : 760,
                  height: 132,
                  opacity: progress(frame, index * 8, index * 8 + 40),
                }}
              />
            ))}
            <div
              style={{
                position: "absolute",
                bottom: 50,
                left: 280,
                fontSize: 18,
                color: "var(--muted-foreground)",
              }}
            >
              Component workbench · recorded evidence · layout: {focus}
            </div>
          </WorkspaceChrome>
        </AbsoluteFill>
      </AbsoluteFill>
    </ClioUIProvider>
  );
}
