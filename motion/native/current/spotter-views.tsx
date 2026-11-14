import { Fragment, useLayoutEffect, useMemo, useRef, memo } from "react";
import { ActivityRow } from "@clio-ui/components/clio/activity-row";
import { StatusIndicator } from "@clio-ui/components/clio/primitives/status-indicator";
import { ContentMarkdown as NativeContentMarkdown } from "@clio-ui/components/clio/content-markdown";
import { formatDuration } from "@clio-ui/lib/format";
import {
  DatabaseIcon,
  BrainIcon,
  ShieldAlertIcon,
  BellIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  GitBranchIcon,
  InfoIcon,
  MessageSquareIcon,
} from "lucide-react";
import {
  lineHeat,
  wordHeat,
  type AttentionHeatView,
} from "../word-attention/attention-segment-heat";
import type { PairedReplay, PairedSession } from "../paired-replay";
import { buildOpalScenario } from "../opal-scenario";
import { analogueComparison } from "../opal-rules";
import { spotterNotificationPresentation } from "../spotter-notification";
import {
  buildSpotterReconstruction,
  type ReconstructedLookup,
} from "./spotter-scenario";
import {
  STEP_TIMING,
  spotterProgress,
  displayedStepText,
} from "./spotter-plan";
import { spotterHeatStyle } from "./spotter-appearance";

const ContentMarkdown = memo(NativeContentMarkdown);
export interface RelocatedBlock {
  toolId: string;
  field: string;
  share: number;
  displayRuns: [number, number, number][];
}
export interface RelocatedRecord {
  text: string;
  residual: number;
  displaySources: Record<string, number>;
  displayBlocks: RelocatedBlock[];
  captureSha256: string;
  selectedSteps: number[];
  originalTextBlocks: Array<{
    messageId: string;
    partId: string;
    contentRevision: string;
    displayRuns: [number, number, number][];
  }>;
}
export interface RelocatedAttention {
  sourceSha256: string;
  records: RelocatedRecord[];
}

/** Paint the unchanged global display scale, aggregated to first-level words by default. */
export const SourceHeat = memo(function SourceHeat({
  text,
  runs,
  view,
}: {
  text: string;
  runs: [number, number, number][];
  view: AttentionHeatView;
}) {
  const segments =
    view.unit === "word"
      ? wordHeat(text, runs, "max")
      : view.unit === "line"
        ? lineHeat(text, runs, "max")
        : runs.map(([lo, hi, value]) => ({ lo, hi, value }));
  const points = [...text];
  let at = 0;
  return (
    <>
      {segments.flatMap((segment, index) => {
        const start = Math.max(at, segment.lo),
          end = Math.max(start, segment.hi);
        const before = points.slice(at, start).join("");
        const value = points.slice(start, end).join("");
        at = end;
        return [
          <Fragment key={index}>
            {before}
            <span
              data-heat={segment.value.toFixed(4)}
              data-heat-kind="tool"
              style={
                value.trim()
                  ? spotterHeatStyle(segment.value, "tool")
                  : undefined
              }
            >
              {value}
            </span>
          </Fragment>,
        ];
      })}
      {points.slice(at).join("")}
    </>
  );
});

/** A native activity row around an archived packet; its identifier declares reconstruction. */
export function LookupRow({
  tool,
  frame,
  timing,
  inspection,
  inspectionOpenness = 1,
  attention,
  view,
  onInspect,
}: {
  tool: ReconstructedLookup;
  frame: number;
  timing: (typeof STEP_TIMING)[number]["tools"][number];
  inspection: boolean;
  inspectionOpenness?: number;
  attention?: RelocatedRecord;
  view: AttentionHeatView;
  onInspect: (tool: ReconstructedLookup) => void;
}) {
  const complete = frame >= timing.result;
  const openness = inspection
    ? inspectionOpenness
    : frame < timing.result
      ? 0
      : spotterProgress(frame, timing.result, timing.result + 20) *
        (1 - spotterProgress(frame, timing.compact, timing.compact + 24));
  const heat = attention?.displayBlocks.find(
    (b) => b.toolId === tool.id && b.field === "result",
  );
  return (
    <div
      className="sv3-tool"
      data-tool={tool.id}
      data-result={complete || undefined}
    >
      <ActivityRow
        name={tool.lookup}
        icon={<DatabaseIcon size={14} />}
        argument={tool.arguments}
        argumentTitle={tool.arguments}
        disclosure={
          openness > 0.5 ? (
            <ChevronDownIcon size={12} />
          ) : (
            <ChevronRightIcon size={12} />
          )
        }
        status={
          <StatusIndicator
            tone={complete ? "success" : "running"}
            label={complete ? "Result available" : "Reading reference packet"}
            display="column"
            mark="glyph"
          />
        }
        info={
          <button
            aria-label={`Inspect ${tool.lookup}`}
            onClick={() => onInspect(tool)}
          >
            <InfoIcon size={14} />
          </button>
        }
        recap={complete ? `${tool.table.rows.length} rows` : undefined}
        open={openness > 0.5}
        onOpenChange={() => onInspect(tool)}
      />
      <div
        className="sv3-disclosure"
        style={{
          gridTemplateRows: `${openness}fr`,
          opacity: Math.min(1, openness * 3),
        }}
      >
        <div>
          <pre
            className="sv3-packet"
            data-source-start={tool.resultSource.start}
            data-source-part={tool.resultSource.partId}
          >
            {attention && heat ? (
              <SourceHeat
                text={tool.result}
                runs={heat.displayRuns}
                view={view}
              />
            ) : complete ? (
              tool.result
            ) : (
              ""
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}

const toolLabels: Record<string, string> = {
  schema_lookup: "Trait dictionary",
  qc_lookup: "Quality gate",
  db_lookup: "Measurements",
  design_lookup: "Experiment design",
  embedding_lookup: "Nearest neighbours",
};
function toolLabel(tool: ReconstructedLookup): string {
  if (tool.lookup === "design_lookup")
    return tool.arguments.includes("accession_panel")
      ? "Panel membership"
      : "Dose series";
  return toolLabels[tool.lookup];
}
/** Tables appear only after their result; a new step begins with no precomputed dashboard. */
export function EvidenceView({
  pair,
  frame,
  step,
  onStep,
  onTool,
  selectedTool,
  alert,
}: {
  pair: PairedReplay;
  frame: number;
  step: number;
  onStep: (step: number) => void;
  onTool: (tool: ReconstructedLookup) => void;
  selectedTool?: string;
  alert: boolean;
}) {
  const steps = useMemo(() => buildSpotterReconstruction(pair).steps, [pair]);
  const available = steps.filter(
    (s) => frame >= STEP_TIMING[s.number - 1].submit,
  );
  const current = available.find((s) => s.number === step) ?? available.at(-1);
  return (
    <section className="sv3-evidence" data-pocket="evidence">
      <div className="sv3-view-heading">
        <div>
          <h2>Evidence</h2>
          <p>Reference packets for this investigation</p>
        </div>
        <select
          data-target="steps"
          aria-label="Evidence step"
          value={current?.number ?? ""}
          onChange={(e) => onStep(Number(e.target.value))}
        >
          {!current && <option value="">No step started</option>}
          {available.map((s) => (
            <option key={s.number} value={s.number}>
              Step {s.number} · {s.title}
            </option>
          ))}
        </select>
      </div>
      {!current ? (
        <div className="sv3-empty">
          <DatabaseIcon size={26} />
          <p>The investigation’s evidence will appear here.</p>
        </div>
      ) : (
        <>
          <div className="sv3-step-heading">
            <span>Step {current.number}</span>
            <h3>{current.title}</h3>
            {frame >= STEP_TIMING[current.number - 1].complete && (
              <b>{current.answer}</b>
            )}
          </div>
          <div className="sv3-evidence-list">
            {current.number === 3 &&
              frame >= STEP_TIMING[2].tools[2].result && (
                <AnalogueSummary pair={pair} alert={alert} />
              )}
            {current.tools.map((tool, i) => {
              const ready =
                frame >= STEP_TIMING[current.number - 1].tools[i].result;
              if (!ready) return null;
              return (
                <section
                  className="sv3-evidence-card"
                  key={tool.id}
                  data-selected={selectedTool === tool.id || undefined}
                  data-flagged={
                    (alert && tool.step === 3 && tool.order === 1) || undefined
                  }
                >
                  <button
                    className="sv3-result-heading"
                    data-target={`evidence-${tool.id}`}
                    onClick={() => onTool(tool)}
                  >
                    <DatabaseIcon size={15} />
                    <strong>{toolLabel(tool)}</strong>
                    <span>{tool.lookup}</span>
                    <ChevronRightIcon size={14} />
                  </button>
                  <div className="sv3-table-scroll">
                    <table>
                      <thead>
                        <tr>
                          {tool.table.columns.map((col) => (
                            <th key={col}>{col.replaceAll("_", " ")}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tool.table.rows.map((row, j) => (
                          <tr key={j}>
                            {tool.table.columns.map((col) => (
                              <td key={col}>{row[col]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {alert && tool.step === 3 && tool.order === 1 && (
                    <button
                      className="sv3-flag"
                      data-target="evidence-flagged"
                      onClick={() => onTool(tool)}
                      aria-label="Inspect flagged lookup in conversation"
                    >
                      <ShieldAlertIcon size={15} />
                      <span>
                        SPOTTER found an instruction inside this result.
                      </span>
                    </button>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

/** The same step/tool identities grow a stable, dashed lineage instead of replacing the graph. */
export function LineageView({
  pair,
  frame,
  onTool,
  alert,
}: {
  pair: PairedReplay;
  frame: number;
  onTool: (tool: ReconstructedLookup) => void;
  alert: boolean;
}) {
  const steps = useMemo(() => buildSpotterReconstruction(pair).steps, [pair]);
  return (
    <section className="sv3-lineage" data-pocket="lineage">
      <div className="sv3-view-heading">
        <div>
          <h2>Evidence lineage</h2>
          <p>Follow the inputs into each answer</p>
        </div>
        <GitBranchIcon size={20} />
      </div>
      <svg
        viewBox="0 0 650 790"
        role="img"
        aria-label="Three-step reconstructed evidence lineage"
      >
        <defs>
          <marker
            id="sv3-arrow"
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0 0 8 4 0 8" fill="currentColor" />
          </marker>
        </defs>
        {steps.map((step, index) => {
          const timing = STEP_TIMING[index],
            y = index * 252 + 12;
          if (frame < timing.submit) return null;
          const done = frame >= timing.complete;
          return (
            <g
              key={step.number}
              opacity={spotterProgress(
                frame,
                timing.submit,
                timing.submit + 24,
              )}
            >
              {index > 0 && (
                <path
                  className="sv3-edge dependency"
                  d={`M325 ${y - 57} V${y}`}
                  markerEnd="url(#sv3-arrow)"
                />
              )}
              {index === 2 && (
                <>
                  <path
                    className="sv3-edge dependency"
                    d="M568 183 H630 V530 H610"
                    markerEnd="url(#sv3-arrow)"
                  />
                  <text
                    className="sv3-edge-label"
                    x="620"
                    y="360"
                    transform="rotate(90 620 360)"
                  >
                    Step 1 baseline
                  </text>
                </>
              )}
              <rect
                className="sv3-step-box"
                x="15"
                y={y}
                width="595"
                height="216"
                rx="14"
              />
              <text className="sv3-graph-title" x="35" y={y + 30}>
                Step {step.number} · {step.title}
              </text>
              {step.tools.map((tool, i) => {
                const tt = timing.tools[i];
                if (frame < tt.result) return null;
                const x = 34 + i * 188,
                  flagged = alert && step.number === 3 && i === 0;
                return (
                  <g
                    key={tool.id}
                    className="sv3-graph-tool"
                    role="button"
                    tabIndex={0}
                    aria-label={`Inspect Step ${step.number} ${tool.lookup}`}
                    onClick={() => onTool(tool)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onTool(tool);
                    }}
                    opacity={spotterProgress(frame, tt.result, tt.result + 24)}
                    data-target={`graph-${tool.id}`}
                  >
                    <rect
                      x={x}
                      y={y + 56}
                      width="166"
                      height="54"
                      rx="8"
                      data-flagged={flagged || undefined}
                    />
                    <text x={x + 12} y={y + 78}>
                      {toolLabel(tool)}
                    </text>
                    <text className="sv3-graph-sub" x={x + 12} y={y + 97}>
                      {tool.table.rows.length} rows
                    </text>
                    {done && (
                      <path
                        className="sv3-edge"
                        d={`M${x + 83} ${y + 110} V${y + 129} H325 V${y + 144}`}
                        markerEnd="url(#sv3-arrow)"
                      />
                    )}
                  </g>
                );
              })}
              {done && (
                <g
                  opacity={spotterProgress(
                    frame,
                    timing.complete,
                    timing.complete + 24,
                  )}
                >
                  <rect
                    className="sv3-answer-node"
                    x="58"
                    y={y + 148}
                    width="510"
                    height="47"
                    rx="8"
                    data-flagged={(alert && step.number === 3) || undefined}
                  />
                  <text x="77" y={y + 177}>
                    {step.answer}
                  </text>
                </g>
              )}
            </g>
          );
        })}
        {alert && (
          <g data-source-call="call_d6535dcc6bfb">
            <path
              className="sv3-edge"
              d="M325 711 V751"
              markerEnd="url(#sv3-arrow)"
            />
            <rect
              className="sv3-answer-node"
              data-flagged
              x="58"
              y="753"
              width="510"
              height="34"
              rx="7"
            />
            <text x="77" y="775" style={{ fontSize: 13 }}>
              SPOTTER · Instruction from evidence
            </text>
          </g>
        )}
      </svg>
      {alert && (
        <div className="sv3-flag">
          <ShieldAlertIcon size={16} />
          Instruction from evidence → recorded answer
        </div>
      )}
    </section>
  );
}

/** Source excerpts are exact spans. Long raw reasoning stays in the ledger rather than racing by. */
function reviewerExcerpt(text: string): { text: string; offset: number } {
  if (text.includes("a danger alert has been raised")) {
    const start = text.indexOf("Round 5 answer");
    if (start >= 0)
      return {
        text: text.slice(start),
        offset: [...text.slice(0, start)].length,
      };
  }
  const needle = text.indexOf("CURATION OVERRIDE");
  const lo =
    needle >= 0 ? Math.max(0, text.lastIndexOf("\n", needle - 1) + 1) : 0;
  let hi = Math.min(text.length, lo + 900);
  if (hi < text.length) {
    const paragraph = text.lastIndexOf("\n\n", hi);
    const sentence = text.lastIndexOf(". ", hi);
    const word = text.lastIndexOf(" ", hi);
    hi =
      paragraph > lo + 100
        ? paragraph
        : sentence > lo + 100
          ? sentence + 1
          : Math.max(lo + 1, word);
  }
  return { text: text.slice(lo, hi), offset: [...text.slice(0, lo)].length };
}
/** Actual reviewer blocks and tools keep their own source identities on the common clock. */
export function ReviewerView({
  session,
  source,
  frame,
}: {
  session: PairedSession;
  source: number;
  frame: number;
}) {
  const log = useRef<HTMLDivElement>(null);
  const blocks = session.view.messages
    .flatMap((m) => m.blocks)
    .filter(
      (b) => session.blocks.find((x) => x.blockId === b.id)!.start <= source,
    );
  const latestMessage = [...session.view.messages]
    .reverse()
    .find((message) =>
      message.blocks.some(
        (block) =>
          session.blocks.find((b) => b.blockId === block.id)!.start <= source,
      ),
    );
  useLayoutEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [frame, source]);
  return (
    <div
      className="sv3-reviewer clio-scrollbar"
      ref={log}
      data-pocket="spotter"
    >
      <div className="sv3-reviewer-heading">
        <strong>SPOTTER</strong>
        <StatusIndicator
          tone={
            source < 109181
              ? "waiting"
              : source >= 567811
                ? "stopped"
                : "running"
          }
          label={
            source < 109181
              ? "Awaiting first answer"
              : source >= 567811
                ? "Quarantined"
                : "Reviewing the session"
          }
        />
      </div>
      {blocks.map((block) => {
        const timing = session.blocks.find((b) => b.blockId === block.id)!;
        const complete = source >= timing.end;
        if (block.type === "injection")
          return (
            <div
              className="sv3-review-event"
              key={block.id}
              data-source-block={block.id}
            >
              <ActivityRow
                icon={<BellIcon size={14} />}
                name="Notification received"
                argument={
                  block.id.startsWith("live_injection_1e7")
                    ? "Review instructions"
                    : "Watched session activity"
                }
                status={
                  <StatusIndicator
                    tone="success"
                    label="Received"
                    display="column"
                    mark="glyph"
                  />
                }
              />
              {frame >= 76 * 60 &&
                frame < 79 * 60 + 24 &&
                block.id === "live_injection_16a1871bd6f7" && (
                  <div
                    className="sv3-disclosure"
                    style={{
                      gridTemplateRows: `${spotterProgress(frame, 76 * 60, 76 * 60 + 20) * (1 - spotterProgress(frame, 79 * 60, 79 * 60 + 24))}fr`,
                    }}
                  >
                    <div>
                      <p className="sv3-notification-excerpt">
                        {spotterNotificationPresentation(
                          "spotter",
                          block.text ?? "",
                        )?.text.slice(0, 240)}
                        …
                      </p>
                    </div>
                  </div>
                )}
            </div>
          );
        if (block.type === "tool") {
          const tool = session.view.tools.find((t) => t.id === block.tool_id)!;
          const flagged = tool.name === "raise_alert_card";
          return (
            <div
              className="sv3-review-event"
              key={block.id}
              data-review-tool={tool.id}
            >
              <ActivityRow
                icon={
                  flagged ? (
                    <ShieldAlertIcon size={14} />
                  ) : (
                    <DatabaseIcon size={14} />
                  )
                }
                name={String(tool.name)}
                argument={
                  flagged
                    ? String((tool.input as Record<string, unknown>).title)
                    : tool.name === "attention_sources"
                      ? "Inspect captured attention"
                      : "Read recorded activity"
                }
                elapsed={
                  complete
                    ? formatDuration(Number(tool.duration_ms))
                    : undefined
                }
                status={
                  <StatusIndicator
                    tone={
                      complete ? (flagged ? "warning" : "success") : "running"
                    }
                    label={complete ? "Completed" : "Working"}
                    display="column"
                    mark="glyph"
                  />
                }
              />
            </div>
          );
        }
        if (!block.text) return null;
        if (
          block.type === "text" &&
          !latestMessage?.blocks.some((b) => b.id === block.id)
        )
          return (
            <div className="sv3-review-event" key={block.id}>
              <ActivityRow
                icon={<MessageSquareIcon size={14} />}
                name="Review summary"
                argument="Earlier source steps reviewed"
                disclosure={<ChevronRightIcon size={12} />}
                status={
                  <StatusIndicator
                    tone="success"
                    label="Completed"
                    display="column"
                    mark="glyph"
                  />
                }
              />
            </div>
          );
        const excerpt = reviewerExcerpt(block.text);
        const progress = Math.max(
          0,
          Math.min(
            1,
            (source - timing.start) / Math.max(1, timing.end - timing.start),
          ),
        );
        const text = [...displayedStepText(excerpt.text)]
          .slice(0, Math.floor([...excerpt.text].length * progress))
          .join("");
        const openness =
          block.type === "text"
            ? 1
            : 1 - spotterProgress(source, timing.end + 1000, timing.end + 3000);
        const isActive = openness > 0.5;
        return (
          <div
            className="sv3-review-event"
            key={block.id}
            data-source-block={block.id}
          >
            {block.type === "reasoning" && (
              <ActivityRow
                icon={<BrainIcon size={14} />}
                name={complete ? "Thought" : "Thinking"}
                argument={
                  isActive
                    ? "Recorded reasoning excerpt"
                    : excerpt.text.split("\n")[0]
                }
                disclosure={
                  isActive ? (
                    <ChevronDownIcon size={12} />
                  ) : (
                    <ChevronRightIcon size={12} />
                  )
                }
                status={
                  <StatusIndicator
                    tone={complete ? "success" : "running"}
                    label={complete ? "Completed" : "Thinking"}
                    display="column"
                    mark="glyph"
                  />
                }
              />
            )}
            <div
              className="sv3-disclosure"
              style={{
                gridTemplateRows: `${openness}fr`,
                opacity: Math.min(1, openness * 3),
              }}
            >
              <div>
                <div
                  className="sv3-thought"
                  data-excerpt-start={excerpt.offset}
                >
                  <ContentMarkdown isAnimating={false}>{text}</ContentMarkdown>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Derive eligibility from the saved neighbour, membership and peak tables. */
function AnalogueSummary({
  pair,
  alert,
}: {
  pair: PairedReplay;
  alert: boolean;
}) {
  const comparison = useMemo(
    () => analogueComparison(buildOpalScenario(pair)),
    [pair],
  );
  return (
    <section className="sv3-analogue">
      <h3>MAGIC 75 · nearest profiles</h3>
      <svg
        viewBox="0 0 550 164"
        role="img"
        aria-label="Nearest neighbours and their recorded panel roles"
      >
        {comparison.table.rows.map((row, i) => (
          <g key={row.accession}>
            <text x="0" y={i * 48 + 24}>
              {row.accession}
            </text>
            <rect
              x="95"
              y={i * 48 + 10}
              width={Number(row.similarity) * 275}
              height="19"
              rx="3"
              fill={
                alert && row.panel === "observational"
                  ? "var(--destructive)"
                  : "var(--primary)"
              }
              opacity={row.panel === "observational" ? 0.55 : 0.8}
            />
            <text x="382" y={i * 48 + 24}>
              {row.similarity}
            </text>
            <text className="sv3-graph-sub" x="436" y={i * 48 + 24}>
              {row.panel}
            </text>
          </g>
        ))}
      </svg>
      {alert && (
        <p className="sv3-rule-result">
          Apply the panel rule: <b>{comparison.rule}</b>
        </p>
      )}
    </section>
  );
}
