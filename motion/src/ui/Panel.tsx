import React from "react";
import { Bot } from "lucide-react";

export type PanelProps = {
  children: React.ReactNode;
  title?: React.ReactNode;
  leading?: React.ReactNode;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
  sessionId?: string;
  messageId?: string;
};

/** A CLIO surface with independent bounds and an optional header for tools, results or inspectors. */
export function Panel({
  children,
  title,
  leading,
  style,
  bodyStyle,
  sessionId,
  messageId,
}: PanelProps) {
  return (
    <section
      className="panel"
      data-source-session={sessionId}
      data-source-message={messageId}
      style={{ overflow: "hidden", ...style }}
    >
      {title !== undefined && (
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "24px 27px",
            borderBottom: "1px solid var(--border)",
            fontSize: 20,
            color: "var(--muted-foreground)",
          }}
        >
          {leading}
          {title}
        </header>
      )}
      <div style={{ padding: 26, ...bodyStyle }}>{children}</div>
    </section>
  );
}

/** An editable message surface; callers supply recorded content and source identity. */
export function ConversationMessage({
  role,
  children,
  messageId,
  label = "CLIO",
  style,
}: {
  role: "user" | "assistant";
  children: React.ReactNode;
  messageId?: string;
  label?: string;
  style?: React.CSSProperties;
}) {
  return (
    <article
      data-source-message={messageId}
      data-role={role}
      style={{
        fontSize: 25,
        lineHeight: 1.5,
        ...(role === "user"
          ? {
              background: "var(--composer)",
              border: "1px solid var(--composer-border)",
              borderRadius: 22,
              padding: "25px 30px",
            }
          : {}),
        ...style,
      }}
    >
      {role === "assistant" && (
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
          {label}
        </div>
      )}
      {children}
    </article>
  );
}
