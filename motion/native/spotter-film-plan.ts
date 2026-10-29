import inspections from "./attention-inspections.json";
import {
  buildPairedTimeline,
  frameForSource,
  pairedClock,
  type PairedReplay,
} from "./paired-replay";

export const SPOTTER_FILM_TIMING = {
  charactersPerSecond: 100,
  thinkingSeconds: 10,
  idleSpeed: 16,
  thinkingHoldFrames: 72,
  answerHoldFrames: 36,
  collapseFrames: 30,
  toolResultHoldFrames: 60,
};
type SpotterFilmPlan = {
  at: number;
  source: number;
  shots: Array<{ id: string; start: number; frames: number }>;
  resume: number;
  added: number;
  frames: number;
};
const plans = new WeakMap<PairedReplay, SpotterFilmPlan>();

/** Keep recorded content untouched while choosing an explicit shared editorial pace. */
export function filmPair(pair: PairedReplay): PairedReplay {
  return { ...pair, timing: SPOTTER_FILM_TIMING };
}

/** Insert the user's investigation only after SPOTTER's recorded danger alert. */
export function buildSpotterFilmPlan(pair: PairedReplay): SpotterFilmPlan {
  const cached = plans.get(pair);
  if (cached) return cached;
  const ids = ["chainB-alert-answer-line", "chainB-alert-number"] as const;
  if (pair.source.sha256 !== inspections[ids[0]].sourceSha256)
    throw new Error("SPOTTER film belongs to another source export");
  const reviewer = pair.sessions.find((s) => s.role === "spotter")!;
  const alert = reviewer.blocks.find((b) =>
    reviewer.view.messages.some((m) =>
      m.blocks.some(
        (x) =>
          x.id === b.blockId && x.tool_id === inspections[ids[0]].triggerToolId,
      ),
    ),
  );
  if (!alert || !pair.sessions.find((s) => s.role === "primary")?.quarantine)
    throw new Error(
      "The film requires the recorded SPOTTER danger alert and quarantine",
    );
  const at = frameForSource(pair, alert.end);
  let next = at + 180;
  const shots = ids.map((id) => {
    const shot = { id, start: next, frames: inspections[id].frames };
    next += shot.frames;
    return shot;
  });
  const plan = {
    at,
    source: alert.end,
    shots,
    resume: next,
    added: next - at,
    frames: buildPairedTimeline(pair).frames + next - at + 180,
  };
  plans.set(pair, plan);
  return plan;
}

/** Both panes share the same clock; all inspection and return frames pause that clock. */
export function spotterFilmAt(pair: PairedReplay, frame: number) {
  const plan = buildSpotterFilmPlan(pair);
  if (!Number.isInteger(frame) || frame < 0 || frame >= plan.frames)
    throw new Error("Invalid SPOTTER film frame");
  const held = frame >= plan.at && frame < plan.resume;
  const replayFrame =
    frame < plan.at ? frame : held ? plan.at : frame - plan.added;
  const shot = plan.shots.find(
    (s) => frame >= s.start && frame < s.start + s.frames,
  );
  const source = held
    ? plan.source
    : Math.max(
        frame >= plan.resume ? plan.source : -1,
        pairedClock(pair, replayFrame).source,
      );
  return {
    replayFrame,
    source,
    inspectionId: shot?.id,
    inspectionFrame: shot ? frame - shot.start : undefined,
    caption:
      shot?.id === "chainB-alert-number"
        ? "Trace a single token"
        : shot
          ? "Inspect the flagged answer"
          : held
            ? "SPOTTER flags an instruction from evidence"
            : source < 0
              ? "Enable SPOTTER review"
              : source < 109000
                ? "An OPAL analysis, watched by SPOTTER"
                : source < plan.source
                  ? "SPOTTER reviews the workflow"
                  : "SPOTTER’s finding",
  };
}
