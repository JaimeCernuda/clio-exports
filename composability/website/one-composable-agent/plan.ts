import { adWheel, copy } from "../../ad/src/composable-ad-plan";
import { phase } from "../../ad/src/prompt-morph";
export const words = copy.wheel.words;
export const config = {
  id: "OneComposableAgent",
  folder: "one-composable-agent",
  width: 1440,
  height: 280,
  fps: 60,
  frames: copy.wheel.end + 72 + 36,
  gifWidth: 1152,
  gifFps: 30,
  poster: copy.wheel.end + 36,
};

/** Accelerate into composable, hold it, then roll forward to the first domain to loop. */
export function pose(frame: number) {
  const f = ((frame % config.frames) + config.frames) % config.frames;
  if (f <= copy.wheel.end) return { ...adWheel(f), neighborOpacity: 1 };
  const p = phase(f, copy.wheel.end + 72, 36);
  return {
    position: words.length - 1 + p,
    blur: Math.sin(p * Math.PI) * 1.2,
    neighborOpacity:
      1 - phase(f, copy.wheel.end, 18) + phase(f, copy.wheel.end + 60, 12),
  };
}
