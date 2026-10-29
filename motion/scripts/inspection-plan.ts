import { campaigns, type CampaignId } from "../native/campaign-catalog";
import { buildReplayPlan, type ReplayMessage } from "../native/replay-plan";
import { buildPresentation } from "../native/presentation-plan";

/** Map original moving footage to replacement native inspection intervals. */
export function inspectionPlan(
  id: CampaignId,
  messages: readonly ReplayMessage[],
) {
  const story = campaigns[id];
  const replay = buildReplayPlan(
    messages,
    story.pitch.sourceFrames,
    story.pitch.turns ?? 2,
    story.replay,
  );
  const old = buildPresentation(
    replay,
    story.focuses.map((focus, index) => ({
      ...focus,
      canvas: false,
      observations: undefined,
      chartHeights: undefined,
      controls: undefined,
      download: undefined,
      frames:
        focus.action === "select-text"
          ? 300
          : id === "tahoe"
            ? 360
            : id === "alta" && index === 0
              ? 360
              : 420,
    })),
  );
  const updated = buildPresentation(replay, story.focuses);
  return updated.focuses
    .filter((focus) => focus.canvas)
    .map((focus) => {
      const previous = old.focuses.find((value) => value.id === focus.id)!;
      return {
        id: `${id}-${focus.id}`,
        campaign: id,
        frameOffset: focus.start + 120,
        shotFrames: focus.frames,
        oldStart: previous.start + 120,
        oldFrames: previous.frames,
        sourceFrame: focus.sourceFrame,
      };
    });
}
