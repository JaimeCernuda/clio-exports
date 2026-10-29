import defaultStory from "./campaign-story.json";
import type { CampaignStory } from "./campaign-catalog";
import { ease, mix } from "./film-plan";

export type CampaignCut = "pitch" | "social";
export const CAMPAIGN_FPS = 60;

/** Keep campaign framing separate from the continuous native conversation. */
export function campaignFrame(
  frame: number,
  cut: CampaignCut,
  story: CampaignStory = defaultStory as CampaignStory,
) {
  const timeline = story[cut];
  if (!Number.isInteger(frame) || frame < 0 || frame >= timeline.frames)
    throw new Error("Campaign frame outside its timeline");
  const stage = timeline.stages.find(
    (value) => frame >= value.start && frame < value.end,
  )!;
  const intro = stage.id === "intro",
    outro = stage.id === "outro";
  const age = frame - stage.start;
  const portrait = cut === "social";
  const large = intro
    ? 1 - ease(age, stage.end - stage.start - 40, stage.end - stage.start)
    : outro
      ? ease(age, 0, 45)
      : 0;
  const replay = timeline.stages.find((value) => value.id === "conversation")!;
  return {
    stage,
    replayFrame: Math.max(
      0,
      Math.min(replay.end - replay.start - 1, frame - replay.start),
    ),
    replayFrames: timeline.sourceFrames,
    turns: timeline.turns ?? (cut === "social" ? 1 : 2),
    nativeOpacity: intro
      ? ease(age, stage.end - stage.start - 32, stage.end - stage.start)
      : outro
        ? 1 - ease(age, 0, 40)
        : 1,
    brandLeft: mix(portrait ? 168 : 940, portrait ? 40 : 320, large),
    brandTop: mix(portrait ? 24 : 16, portrait ? 270 : 190, large),
    brandScale: mix(portrait ? 0.6 : 0.45, 1, large),
    introOpacity: intro
      ? ease(age, 0, 15) *
        (1 -
          ease(age, stage.end - stage.start - 48, stage.end - stage.start - 12))
      : 0,
    outroOpacity: outro ? ease(age, 20, 55) : 0,
  };
}
