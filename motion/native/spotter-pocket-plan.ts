import { frameForSource, type PairedReplay } from "./paired-replay";
import { buildOpalScenario } from "./opal-scenario";

export type PocketTab = "spotter" | "provenance" | "evidence";
export type PocketCue = {
  at: number;
  tab: PocketTab;
  round: number;
  focus?: string;
  reason: string;
};
const cache = new WeakMap<PairedReplay, PocketCue[]>();
export const OPAL_SCENARIO_SHA =
  "cfdd456f2640519c6a0f715e817927c7fb70e77974d6d9605be12cc903131cd5";

/** Editorial view choices anchored to recorded source events, never a second transcript clock. */
export function buildPocketCues(pair: PairedReplay): PocketCue[] {
  if (pair.source.sha256 !== OPAL_SCENARIO_SHA)
    throw new Error("Pocket cues belong to Chain B 7795459");
  const cached = cache.get(pair);
  if (cached) return cached;
  const rounds = buildOpalScenario(pair);
  const cue = (
    source: number,
    tab: PocketTab,
    round: number,
    reason: string,
    focus?: string,
  ): PocketCue => ({
    at: frameForSource(pair, source),
    tab,
    round,
    reason,
    focus,
  });
  const cues: PocketCue[] = [
    {
      at: 240,
      tab: "spotter",
      round: 1,
      reason: "Enable the recorded reviewer",
    },
  ];
  for (const r of rounds) {
    const span = r.answerAt - r.promptAt;
    if (r.number !== 3 && r.number !== 4)
      cues.push(
        cue(
          r.promptAt + span * 0.16,
          "evidence",
          r.number,
          "Inspect supplied scientific evidence",
        ),
      );
    cues.push(
      cue(
        r.promptAt + span * 0.48,
        "evidence",
        r.number,
        "Inspect the decision gate",
        `row-${[0, 2, 0, 4, 0, 3][r.number - 1]}`,
      ),
    );
    if (r.number !== 2)
      cues.push(
        cue(
          r.answerEnd,
          "provenance",
          r.number,
          "Attach the actual answer to its sources",
        ),
      );
  }
  cues.push(
    cue(137000, "spotter", 2, "Show concurrent recorded reviewer reasoning"),
  );
  cues.push(cue(160835, "spotter", 2, "Show the real activity review"));
  cues.push(
    cue(
      231873,
      "spotter",
      4,
      "Show attention inspections and the recorded clean review",
    ),
  );
  cues.push(
    cue(270000, "evidence", 4, "Inspect scheduled and usable modalities"),
  );
  cues.push(cue(463062, "spotter", 6, "The actual Round 4 format warning"));
  cues.push(
    cue(480000, "evidence", 6, "Complete the variance comparison", "row-3"),
  );
  cues.push(cue(508804, "spotter", 5, "SPOTTER inspects Round 5 attention"));
  cues.sort((a, b) => a.at - b.at);
  cache.set(pair, cues);
  return cues;
}

/** A selected tab changes presentation only; source time is supplied by the paired replay. */
export function pocketAt(pair: PairedReplay, replayFrame: number) {
  const cues = buildPocketCues(pair);
  const index = Math.max(0, cues.filter((c) => c.at <= replayFrame).length - 1);
  return { ...cues[index], next: cues[index + 1], index };
}
