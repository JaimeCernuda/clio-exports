import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { buildOpalScenario } from "../native/opal-scenario";
import { analogueComparison } from "../native/opal-rules";
import { buildPocketCues } from "../native/spotter-pocket-plan";
import { buildSpotterFilmPlan, filmPair } from "../native/spotter-film-plan";
import type { PairedReplay } from "../native/paired-replay";

/** Build a portable source/timing ledger without changing the original paired transcript. */
async function main(): Promise<void> {
  const base = new URL("../../", import.meta.url);
  const pair = filmPair(
    JSON.parse(
      await readFile(
        new URL("motion/native/public/opal-chainB-7795459.native.json", base),
        "utf8",
      ),
    ) as PairedReplay,
  );
  const plan = buildSpotterFilmPlan(pair);
  const output = new URL(
    "videos/spotter-opal/investigation-v2.sources.json",
    base,
  );
  await mkdir(new URL("./", output), { recursive: true });
  const rounds = buildOpalScenario(pair);
  await writeFile(
    output,
    JSON.stringify(
      {
        schema: "clio.spotter-investigation.v2",
        source: pair.source,
        ui: {
          base: "f333d67d490174d2f2b82d7c0671e08ee0943ceb",
          wordHeat: "939b5ed4ad247d62681701aecc696495b9cc390c",
          default: { unit: "word", reduction: "max" },
        },
        evidenceKind:
          "Reconstruction of supplied prompt results; not primary-agent tool telemetry",
        presentationEdits: [
          {
            scope: "Native code blocks in the Spotter film adapter",
            rendering:
              "Immediate native raw tokens retain code, line numbers and controls without asynchronous syntax-highlighting paint",
            sourceTextUnchanged: true,
          },
          {
            scope: "Native code-container paint in the Spotter film adapter",
            rendering:
              "Force full content visibility without intrinsic placeholders so code bodies and log heights remain painted during capture",
            sourceTextAndControlsUnchanged: true,
          },
          {
            partId: "part_2174d879dc87",
            rendering:
              "Progressive native Markdown instead of a plain-text-to-Markdown completion switch",
            sourceTextAndStreamingMetadataUnchanged: true,
          },
          {
            scope: "Streaming thinking in the native film adapter",
            rendering:
              "Escape a dangling Markdown underline until its next characters arrive, preventing temporary Setext headings",
            sourceTextAndCompletedRenderingUnchanged: true,
          },
          {
            partId: "part_cba0f67a7e31",
            rendering:
              "Keep literal accession/dose answer-format placeholders visible outside code during streaming and completed reasoning, instead of consuming them as Markdown HTML",
            canonicalSourceTextAndCoordinatesUnchanged: true,
          },
          {
            scope: "Final SPOTTER activity group after recorded quarantine",
            rendering:
              "Retain the final tool trail while its public conclusion streams instead of snapping the entire parent group closed",
            sourceOrderAndToolResultsUnchanged: true,
          },
        ],
        actualPrimaryToolCount: 0,
        actualSpotterToolIds: pair.sessions
          .find((s) => s.role === "spotter")!
          .view.tools.map((t) => t.id),
        rounds,
        calculatedAnalogueComparison: {
          kind: "Rule calculation over supplied tables; not another model run",
          ...analogueComparison(rounds),
        },
        pocketCues: buildPocketCues(pair),
        film: {
          introFrames: 450,
          body: plan,
          outroFrames: 240,
          totalFrames: 450 + plan.frames + 240,
          fps: 60,
          width: 1280,
          height: 720,
        },
        output: "motion/out/spotter-v2/spotter-opal-investigation-v2.mp4",
        limitations: [
          "Finite recorded attention replies only; arbitrary manual selections require the recorded-bundle backend.",
          "Rule-compliant comparisons are calculations over supplied tables, not an alternate model run.",
          "No SPOTTER-model attention capture is available.",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  console.log(fileURLToPath(output));
  const review = new URL("motion/out/spotter-v2/", base);
  await mkdir(review, { recursive: true });
  const cues = buildPocketCues(pair);
  const pick = (round: number, tab: string) =>
    450 + cues.find((c) => c.round === round && c.tab === tab)!.at;
  await writeFile(
    new URL("review-markers.json", review),
    JSON.stringify(
      [
        { label: "Enable SPOTTER", frame: 450 },
        { label: "Dose evidence", frame: pick(1, "evidence") },
        { label: "Growing provenance", frame: pick(1, "provenance") },
        { label: "Live review", frame: pick(2, "spotter") },
        { label: "Leaf area", frame: pick(3, "evidence") },
        { label: "Analogue lookup", frame: pick(5, "evidence") },
        { label: "Format warning", frame: pick(6, "spotter") },
        { label: "Danger alert", frame: 450 + plan.at },
        ...plan.shots.map((shot, i) => ({
          label: i ? "Select 73" : "Inspect the answer",
          frame: 450 + shot.start,
        })),
        { label: "Conclusion", frame: 450 + plan.resume },
      ],
      null,
      2,
    ) + "\n",
  );
}
await main();
