import React from "react";
import {
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  FileText,
  Folder,
  ListTodo,
  LoaderCircle,
  MessageSquare,
  Plus,
  Search,
  Settings2,
} from "lucide-react";
import { useUILabels } from "./labels";

export type AgentEvidence = {
  id: string;
  name: string;
  agent: string;
  terminalMessageId: string;
  stopReason: string;
  tools: {
    call_id: string;
    tool: string;
    status: string;
    path?: string;
    description?: string;
  }[];
  excerpt: {
    partId: string;
    text: string;
    truncated: boolean;
    headings?: string[];
  };
};

/** CLIO's real brand and workspace navigation, reconstructed as live vector and text layers. */
export function WorkspaceChrome({
  sidebarWidth,
  agentCount,
  children,
  title = "Conversation",
  brandMarkSrc = "/clio-mark.svg",
  brandMark,
}: {
  sidebarWidth: number;
  agentCount: number;
  children: React.ReactNode;
  title?: string;
  brandMarkSrc?: string;
  brandMark?: React.ReactNode;
}) {
  const copy = useUILabels();
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--background)",
        }}
      />
      <header
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 78,
          background: "var(--card)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          padding: "0 30px",
          gap: 13,
          zIndex: 10,
        }}
      >
        {brandMark ?? (
          <img alt="" src={brandMarkSrc} style={{ width: 43, height: 43 }} />
        )}
        <strong style={{ fontSize: 31, letterSpacing: -1 }}>CLIO</strong>
        <div
          style={{
            height: 26,
            width: 1,
            background: "var(--border)",
            margin: "0 20px",
          }}
        />
        <span style={{ fontSize: 22 }}>{copy.workspace}</span>
        <ChevronRight size={20} color="var(--muted-foreground)" />
        <span style={{ fontSize: 22, color: "var(--muted-foreground)" }}>
          {title}
        </span>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 25,
            color: "var(--muted-foreground)",
          }}
        >
          <Search size={24} />
          <Settings2 size={24} />
        </div>
      </header>
      <aside
        style={{
          position: "absolute",
          left: 0,
          top: 78,
          bottom: 0,
          width: sidebarWidth,
          background: "var(--sidebar)",
          borderRight: "1px solid var(--border)",
          overflow: "hidden",
          padding: "30px 20px",
        }}
      >
        {[Plus, MessageSquare, ListTodo, Folder].map((Icon, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              height: 58,
              whiteSpace: "nowrap",
              color: index === 2 ? "var(--info)" : "var(--muted-foreground)",
              fontSize: 18,
            }}
          >
            <Icon size={25} style={{ flexShrink: 0 }} />
            <span
              style={{
                opacity: Math.max(0, (sidebarWidth - 120) / 100),
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {copy.sidebar[index]}
            </span>
            {index === 2 && sidebarWidth > 180 && agentCount > 0 && (
              <span
                className="mono"
                style={{ marginLeft: "auto", fontSize: 16 }}
              >
                {agentCount}
              </span>
            )}
          </div>
        ))}
      </aside>
      {children}
    </>
  );
}

/** A frame-addressable CLIO composer; text and controls remain editable DOM elements. */
export function Composer({
  text,
  pressed,
  style,
  controls = 1,
  caret = 1,
  fontSize = 30,
  messageId,
}: {
  text: string;
  pressed: number;
  style: React.CSSProperties;
  controls?: number;
  caret?: number;
  fontSize?: number;
  messageId?: string;
}) {
  const copy = useUILabels();
  return (
    <div
      data-source-message={messageId}
      style={{
        position: "absolute",
        border: "1px solid var(--composer-border)",
        borderRadius: 22,
        background: "var(--composer)",
        padding: "25px 30px",
        boxShadow: "0 12px 40px #15364f0b",
        ...style,
      }}
    >
      <div
        style={{
          fontSize,
          lineHeight: 1.45,
          maxWidth: "100%",
          whiteSpace: "pre-wrap",
        }}
      >
        {text}
        <span
          style={{
            display: "inline-block",
            height: fontSize,
            width: 2,
            background: "var(--info)",
            verticalAlign: "middle",
            marginLeft: 2,
            opacity: caret,
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 28,
          right: 23,
          bottom: 17,
          display: "flex",
          alignItems: "center",
          gap: 20,
          color: "var(--muted-foreground)",
          opacity: controls,
        }}
      >
        <Plus size={24} />
        <span style={{ fontSize: 18 }}>{copy.standard}</span>
        <ChevronDown size={17} />
        <span style={{ fontSize: 18 }}>{copy.auto}</span>
        <ChevronDown size={17} />
        <div
          style={{
            marginLeft: "auto",
            display: "grid",
            placeItems: "center",
            width: 47,
            height: 47,
            borderRadius: 13,
            background: "var(--foreground)",
            color: "white",
            transform: `scale(${1 - 0.12 * pressed})`,
          }}
        >
          <ArrowUp size={27} />
        </div>
      </div>
    </div>
  );
}

export type AgentStatus = {
  label: string;
  kind: "running" | "ended" | "recorded";
};

/** The production SubAgentDispatch composition adapted for cinematic density and deterministic state. */
export function AgentCard({
  agent,
  frame,
  ended,
  style,
  compact = false,
  status,
}: {
  agent: Pick<AgentEvidence, "id" | "name" | "agent">;
  frame: number;
  ended: boolean;
  style: React.CSSProperties;
  compact?: boolean;
  status?: AgentStatus;
}) {
  const copy = useUILabels();
  const displayStatus = status ?? {
    label: ended ? copy.returned : copy.running,
    kind: ended ? "ended" : "running",
  };
  return (
    <article
      className="panel agent-card"
      data-source-session={agent.id}
      style={{ position: "absolute", ...style }}
    >
      <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
        <CornerDownRight
          size={18}
          color="var(--info)"
          style={{ flexShrink: 0, marginTop: 3 }}
        />
        <Bot
          size={22}
          color="var(--info)"
          style={{ flexShrink: 0, marginTop: 1 }}
        />
        <span
          style={{
            fontSize: compact ? 18 : 21,
            fontWeight: 550,
            lineHeight: 1.25,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {agent.name}
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            borderRadius: 20,
            fontSize: 13,
            padding: "4px 8px",
            background:
              displayStatus.kind === "ended"
                ? "#e6f3ec"
                : displayStatus.kind === "running"
                  ? "#e4f2f7"
                  : "var(--muted)",
            color:
              displayStatus.kind === "ended"
                ? "var(--success)"
                : displayStatus.kind === "running"
                  ? "var(--info)"
                  : "var(--muted-foreground)",
            whiteSpace: "nowrap",
          }}
        >
          {displayStatus.kind === "ended" ? (
            <Check size={14} />
          ) : displayStatus.kind === "running" ? (
            <LoaderCircle
              size={14}
              style={{ transform: `rotate(${frame * 7}deg)` }}
            />
          ) : null}
          {displayStatus.label}
        </span>
      </div>
      {!compact && (
        <div
          style={{
            fontSize: 16,
            color: "var(--muted-foreground)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span className="mono">{agent.agent}</span>
          <span style={{ marginLeft: "auto" }}>{copy.openConversation}</span>
          <ChevronRight size={16} />
        </div>
      )}
    </article>
  );
}

/** A real recorded tool call presented using the production ActivityRow hierarchy. */
export function ActivityRow({
  label,
  detail,
  frame,
  complete = true,
  callId,
  style,
}: {
  label: string;
  detail?: string;
  frame: number;
  complete?: boolean;
  callId?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      data-source-call={callId}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 0",
        fontSize: 22,
        borderBottom: "1px solid var(--border)",
        overflow: "hidden",
        position: "relative",
        isolation: "isolate",
        ...style,
      }}
    >
      {complete ? (
        <Check size={21} color="var(--success)" />
      ) : (
        <LoaderCircle
          size={21}
          color="var(--info)"
          style={{ transform: `rotate(${frame * 7}deg)` }}
        />
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 500 }}>{label}</div>
        {detail && (
          <div
            className="muted"
            style={{
              fontSize: 17,
              marginTop: 4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {detail}
          </div>
        )}
      </div>
      <ChevronRight size={18} color="var(--muted-foreground)" />
    </div>
  );
}

/** Genuine saved Markdown rendered as editorial text, never as a bitmap or executable HTML. */
export function SourceText({
  text,
  maxLines = 7,
  partId,
  style,
}: {
  text: string;
  maxLines?: number;
  partId?: string;
  style?: React.CSSProperties;
}) {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*|`/g, "");
  return (
    <div
      data-source-part={partId}
      style={{
        fontSize: 23,
        lineHeight: 1.55,
        whiteSpace: "pre-wrap",
        display: "-webkit-box",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: maxLines,
        overflow: "hidden",
        ...style,
      }}
    >
      {cleaned}
    </div>
  );
}

export {
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  MessageSquare,
};
