import React from "react";
import { RecordedParagraph } from "../native/recorded-paragraph";
import { renderToStaticMarkup } from "react-dom/server";
import assert from "node:assert/strict";
import test from "node:test";

test("recorded Markdown preserves paragraph boundaries for whole-part attention mapping", () => {
  const html = renderToStaticMarkup(
    <>
      <RecordedParagraph>ANSWER: 73; MATCHES</RecordedParagraph>
      <RecordedParagraph node={{ type: "element" }}>
        Explanation
      </RecordedParagraph>
    </>,
  );
  assert.ok(html.includes("MATCHES\n</p><p>Explanation"));
  assert.ok(!html.includes("node="));
});
import {
  ActivityRow,
  AgentCard,
  ClioUIProvider,
  Composer,
  ConversationMessage,
  Panel,
  SourceText,
  WorkspaceChrome,
} from "../src/ui";

test("components render independently with caller labels, content and geometry", () => {
  const html = renderToStaticMarkup(
    <ClioUIProvider labels={{ workspace: "My workspace", standard: "Precise" }}>
      <WorkspaceChrome
        sidebarWidth={256}
        agentCount={2}
        title="Another recorded run"
        brandMarkSrc="/brand.svg"
      >
        <Composer
          text="A source prompt"
          pressed={0}
          messageId="message-123"
          style={{ width: 725, height: 180 }}
        />
      </WorkspaceChrome>
    </ClioUIProvider>,
  );
  assert.ok(
    html.includes("My workspace") && html.includes("Another recorded run"),
  );
  assert.ok(html.includes("Precise") && html.includes("width:725px"));
  assert.ok(
    html.includes('src="/brand.svg"') &&
      html.includes('data-source-message="message-123"'),
  );
  assert.ok(!html.includes("Reading guide"));
});

test("card motion is deterministic for a frame and accepts minimal source identity", () => {
  const agent = { id: "session-123", name: "Recorded child", agent: "explore" };
  const render = (frame: number) =>
    renderToStaticMarkup(
      <AgentCard
        agent={agent}
        frame={frame}
        ended={false}
        style={{ left: 200, width: 450 }}
      />,
    );
  assert.equal(render(42), render(42));
  assert.notEqual(render(42), render(43));
  assert.ok(render(42).includes('data-source-session="session-123"'));
  const ended = renderToStaticMarkup(
    <ClioUIProvider labels={{ returned: "Recorded end" }}>
      <AgentCard agent={agent} frame={42} ended style={{}} />
    </ClioUIProvider>,
  );
  assert.ok(ended.includes("Recorded end") && !ended.includes("rotate("));
  const pending = renderToStaticMarkup(
    <AgentCard
      agent={agent}
      frame={42}
      ended={false}
      status={{ label: "Awaiting input", kind: "recorded" }}
      style={{}}
    />,
  );
  assert.ok(
    pending.includes("Awaiting input") &&
      !pending.includes("Running") &&
      !pending.includes("rotate("),
  );
});

test("nested labels inherit defaults and do not leak to sibling compositions", () => {
  const render = () =>
    renderToStaticMarkup(<Composer text="Prompt" pressed={0} style={{}} />);
  const before = render();
  const custom = renderToStaticMarkup(
    <ClioUIProvider labels={{ standard: "Custom mode" }}>
      <ClioUIProvider labels={{ auto: "Manual" }}>
        <Composer text="Prompt" pressed={0} style={{}} />
      </ClioUIProvider>
    </ClioUIProvider>,
  );
  assert.ok(custom.includes("Custom mode") && custom.includes("Manual"));
  assert.equal(render(), before);
});

test("panels and activity preserve provenance while escaping transcript HTML", () => {
  const html = renderToStaticMarkup(
    <Panel title="<unsafe>" sessionId="session-123" style={{ width: 900 }}>
      <ConversationMessage role="assistant" messageId="reply-123">
        <SourceText
          partId="part-123"
          style={{ fontSize: 40 }}
          text={'# Actual heading\n<img src=x onerror="bad()">'}
        />
      </ConversationMessage>
      <ActivityRow
        label="Read file"
        detail="real.md"
        frame={10}
        callId="call-123"
      />
    </Panel>,
  );
  for (const attribute of [
    'data-source-session="session-123"',
    'data-source-message="reply-123"',
    'data-source-part="part-123"',
    'data-source-call="call-123"',
  ])
    assert.ok(html.includes(attribute));
  assert.ok(html.includes("&lt;img") && html.includes("&lt;unsafe&gt;"));
  assert.ok(html.includes("font-size:40px"));
  assert.ok(!html.includes("<img src=x") && !html.includes("# Actual heading"));
});
