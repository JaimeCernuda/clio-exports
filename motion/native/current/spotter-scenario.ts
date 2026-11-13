import { buildOpalScenario, type ScenarioRound } from "../opal-scenario";
import type { PairedReplay } from "../paired-replay";

export const SPOTTER_SOURCE_SHA =
  "cfdd456f2640519c6a0f715e817927c7fb70e77974d6d9605be12cc903131cd5";
export const SPOTTER_SOURCE_ROUNDS = [1, 2, 5] as const;
export interface SourceSpan {
  messageId: string;
  partId: string;
  start: number;
  end: number;
}
export interface ReconstructedLookup {
  id: string;
  step: number;
  order: number;
  lookup: string;
  arguments: string;
  request: string;
  result: string;
  packetSource: SourceSpan;
  requestSource: SourceSpan;
  resultSource: SourceSpan;
  table: ScenarioRound["packets"][number]["table"];
}
export interface ReconstructedStep {
  number: number;
  sourceRound: number;
  title: string;
  promptId: string;
  answerId: string;
  answer: string;
  dependsOn: number[];
  tools: ReconstructedLookup[];
}

/** Reflow saved lookup packets into source-bound tool views without mutating the recorded run. */
export function buildSpotterReconstruction(pair: PairedReplay): {
  schema: "clio.spotter-reconstruction.v1";
  source: PairedReplay["source"];
  steps: ReconstructedStep[];
  actualSpotterToolIds: string[];
  actualPrimaryToolCount: number;
} {
  if (pair.source.sha256 !== SPOTTER_SOURCE_SHA)
    throw new Error("Reconstruction belongs to Polaris Chain B 7795459");
  const rounds = buildOpalScenario(pair);
  const displayNumber = new Map<number, number>(
    SPOTTER_SOURCE_ROUNDS.map((round, index) => [round, index + 1]),
  );
  const main = pair.sessions.find((s) => s.role === "primary")!;
  const reviewer = pair.sessions.find((s) => s.role === "spotter");
  if (!reviewer) throw new Error("Recorded SPOTTER session missing");
  const steps = SPOTTER_SOURCE_ROUNDS.map(
    (sourceRound, index): ReconstructedStep => {
      const round = rounds[sourceRound - 1];
      return {
        number: index + 1,
        sourceRound,
        title: round.title,
        promptId: round.promptId,
        answerId: round.answerId,
        answer: round.answer,
        dependsOn: round.dependencies.map((parent) => {
          const display = displayNumber.get(parent);
          if (!display)
            throw new Error("Selected steps omit a required dependency");
          return display;
        }),
        tools: round.packets.map((packet, toolIndex) => {
          const points = [...packet.text];
          const newline = points.indexOf("\n");
          if (newline < 0)
            throw new Error("A lookup result must follow its request line");
          const span = (start: number, end: number): SourceSpan => ({
            messageId: packet.messageId,
            partId: packet.partId,
            start,
            end,
          });
          return {
            id: `reconstruction:step-${index + 1}:tool-${toolIndex + 1}`,
            step: index + 1,
            order: toolIndex + 1,
            lookup: packet.lookup,
            arguments: packet.arguments,
            request: points.slice(0, newline).join(""),
            result: points.slice(newline + 1).join(""),
            packetSource: span(packet.start, packet.end),
            requestSource: span(packet.start, packet.start + newline),
            resultSource: span(packet.start + newline + 1, packet.end),
            table: packet.table,
          };
        }),
      };
    },
  );
  return {
    schema: "clio.spotter-reconstruction.v1",
    source: pair.source,
    steps,
    actualSpotterToolIds: reviewer.view.tools.map((t) => t.id),
    actualPrimaryToolCount: main.view.tools.length,
  };
}
