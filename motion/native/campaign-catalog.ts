import tahoe from "./campaign-story.json";
import alta from "./campaigns/alta.json";
import konza from "./campaigns/konza.json";
import type { ReplayEdits } from "./replay-plan";
import type { ReplayWorkbench } from "./replay-config";
import type { FocusBeat } from "./presentation-plan";
export type CampaignId = "tahoe" | "alta" | "konza";
export interface CampaignTimeline {
  frames: number;
  sourceFrames: number;
  turns?: number;
  layoutFile?: string;
  stages: Array<{ id: string; start: number; end: number }>;
}
export interface CampaignStory {
  title: string;
  hook: string;
  closing: string;
  links: string[];
  sceneFile: string;
  pitch: CampaignTimeline;
  social: CampaignTimeline;
  replay: ReplayEdits;
  workbench: ReplayWorkbench;
  focuses: FocusBeat[];
}
export const campaigns: Record<CampaignId, CampaignStory> = {
  tahoe: tahoe as CampaignStory,
  alta: alta as CampaignStory,
  konza: konza as CampaignStory,
};
/** Reject unknown campaign IDs rather than silently showing the wrong session. */
export function campaignStory(id: string): CampaignStory {
  if (!Object.hasOwn(campaigns, id)) throw new Error("Unknown campaign: " + id);
  return campaigns[id as CampaignId];
}
