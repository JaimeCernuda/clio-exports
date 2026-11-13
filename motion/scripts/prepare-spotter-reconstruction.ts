import { readFile, writeFile, mkdir } from "node:fs/promises";
import { buildSpotterReconstruction } from "../native/current/spotter-scenario";
import type { PairedReplay } from "../native/paired-replay";
import {
  mainThoughtExcerpt,
  STEP_TIMING,
  SPOTTER_MARKERS,
} from "../native/current/spotter-plan";

const pair = JSON.parse(
  await readFile("native/public/opal-chainB-7795459.native.json", "utf8"),
) as PairedReplay;
const data = buildSpotterReconstruction(pair);
const primary = pair.sessions.find((session) => session.role === "primary")!;
const ledger = {
  ...data,
  editorial: {
    timing: STEP_TIMING,
    markers: SPOTTER_MARKERS,
    reasoningExcerpts: data.steps.map((step) => ({
      step: step.number,
      sourceRound: step.sourceRound,
      ...mainThoughtExcerpt(primary, step.answerId, step.number),
    })),
    aliases: { "round 1": "Step 1", "round 2": "Step 2", "round 5": "Step 3" },
    toolPresentation:
      "Reconstructed from exact archived prompt packets. Zero primary-agent tool calls were executed in the source run.",
    attention:
      "Captured token mass regrouped by exact source ownership; unchanged tensors, residual, denominator and display heat scale. Not a newly measured tool-role model run.",
  },
};
await mkdir("../videos/spotter-opal/v3", { recursive: true });
await writeFile(
  "../videos/spotter-opal/v3/source-projection.json",
  JSON.stringify(ledger, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    steps: data.steps.map((s) => ({
      display: s.number,
      source: s.sourceRound,
      tools: s.tools.length,
    })),
    actualPrimaryToolCount: data.actualPrimaryToolCount,
  }),
);
