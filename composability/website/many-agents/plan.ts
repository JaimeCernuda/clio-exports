import { copy } from "../../ad/src/composable-ad-plan";
import { phase } from "../../ad/src/prompt-morph";
export const words = copy.wheel.words.filter((word) => word !== "composable");
export const config = {
  id: "ManyAgents",
  folder: "many-agents",
  width: 1440,
  height: 280,
  fps: 60,
  frames: words.length * 72,
  gifWidth: 1152,
  gifFps: 30,
  poster: 0,
};

/** An even hold-and-roll cadence through all domains, including the wrap to the first. */
export function pose(frame: number) {
  const f = ((frame % config.frames) + config.frames) % config.frames,
    index = Math.floor(f / 72),
    p = phase(f % 72, 40, 32);
  return { position: index + p, blur: Math.sin(p * Math.PI) * 1.2 };
}
