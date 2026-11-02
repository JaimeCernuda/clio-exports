import {
  adAddition,
  adChooser,
  adPluginControl,
  adPointer,
  adPointerStops,
  copy,
} from "../../ad/src/composable-ad-plan";
import { pluginChoiceTiming } from "../../ad/src/plugin-choice-timing.mjs";
import { phase } from "../../ad/src/prompt-morph";
export const firstEffect = 132,
  sourceStart = copy.changes[0].at,
  sourceEnd = copy.changes.find((change) => change.to === "climate")!.at - 2;
const end = firstEffect + sourceEnd - sourceStart + 50;
export const config = {
  id: "PluginComposition",
  folder: "plugin-composition",
  width: 1680,
  height: 880,
  fps: 60,
  frames: end,
  gifWidth: 1260,
  gifFps: 20,
  poster: end - 68,
};
/** Play each global chooser and additive build before holding the Genomics result. */
export function sourceFrame(frame: number): number {
  return Math.min(sourceEnd, sourceStart + frame - firstEffect);
}
/** Fade only the loop reset; the opaque cursor exits through the frame edge. */
export function opacity(frame: number): number {
  return phase(frame, 0, 18) * (1 - phase(frame, end - 18, 18));
}
/** Include the first plugin in the same global chooser semantics as every later add. */
export function offer(frame: number) {
  return adAddition(sourceFrame(frame), true);
}
export function choice(frame: number) {
  return adChooser(sourceFrame(frame), true);
}
export function control(frame: number, id: string) {
  return adPluginControl(sourceFrame(frame), id, true);
}
export const pointerStops = adPointerStops(undefined, true)
  .filter((point) => point.f >= sourceStart - firstEffect)
  .map((point) => ({ ...point, f: point.f - sourceStart + firstEffect }));
export const clicks = copy.changes
  .filter((change) => change.bundle || change.action === "remove")
  .flatMap((change) =>
    change.action === "remove"
      ? [change.at - copy.removal.clickBefore]
      : [
          pluginChoiceTiming(change, copy).openClick,
          pluginChoiceTiming(change, copy).selectClick,
        ],
  )
  .map((frame) => frame - sourceStart + firstEffect);
/** Reuse the full ad's continuous route, including both global-plus and choice clicks. */
export function pointer(frame: number) {
  return adPointer(sourceFrame(frame), undefined, true);
}
