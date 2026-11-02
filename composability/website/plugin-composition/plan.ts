import {
  adPointerStops,
  adTreeLayout,
  adPluginControl,
  copy,
  profiles,
  tree,
} from "../../ad/src/composable-ad-plan";
import { phase } from "../../ad/src/prompt-morph";
export const config = {
  id: "PluginComposition",
  folder: "plugin-composition",
  width: 1680,
  height: 760,
  fps: 60,
  frames: 978,
  gifWidth: 1260,
  gifFps: 20,
  poster: 910,
};
export const firstEffect = 48,
  sourceStart = copy.changes[0].at,
  sourceEnd = 1698;

/** Play the additive build and Genomics change, holding before the later domain montage. */
export function sourceFrame(frame: number): number {
  return Math.min(sourceEnd, sourceStart + frame - firstEffect);
}
/** Only the loop reset fades: the cursor itself stays opaque and exits through the edge. */
export function opacity(frame: number): number {
  return phase(frame, 0, 18) * (1 - phase(frame, 960, 18));
}
/** The first plugin gets an actual add gesture in place of the advertisement's chooser. */
export function firstOffer(frame: number) {
  if (frame >= firstEffect) return undefined;
  return {
    ...adTreeLayout(profiles.manufacturing)[0],
    height: tree.header,
    change: copy.changes[0],
    opacity: phase(frame, 0, 12),
    hover: phase(frame, 28, 8),
    added: 0,
    clickAt: sourceStart - 8,
  };
}
export function control(
  frame: number,
  id: string,
): ReturnType<typeof adPluginControl> {
  const r = frame - firstEffect;
  if (id !== "manufacturing" || r >= 40)
    return adPluginControl(sourceFrame(frame), id);
  const hover = phase(frame, 28, 8);
  if (r < 4)
    return { kind: "add", opacity: 1 - phase(r, 0, 4), hover, adding: true };
  if (r < 34)
    return {
      kind: "added",
      opacity: phase(r, 4, 6) * (1 - phase(r, 30, 4)),
      hover: 0,
      adding: true,
    };
  return { kind: "remove", opacity: phase(r, 34, 6), hover: 0, adding: true };
}
const target = adTreeLayout(profiles.manufacturing)[0],
  x = target.x + target.width - 31,
  y = target.y + tree.header / 2 - 2;
export const pointerStops = [
  { f: 0, x: 1968, y: y + 130 },
  { f: 24, x, y },
  { f: 42, x, y },
  { f: 78, x: 1968, y: y + 130 },
  ...adPointerStops()
    .filter((p) => p.f >= copy.changes[1].at - copy.addition.leadFrames)
    .map((p) => ({ ...p, f: p.f - sourceStart + firstEffect })),
];
export const clicks = [
  firstEffect - 8,
  ...copy.changes
    .filter((c) => c.action === "remove" || (c.bundle && c.from !== "base"))
    .map(
      (c) =>
        c.at -
        (c.action === "remove"
          ? copy.removal.clickBefore
          : copy.addition.clickBefore) -
        sourceStart +
        firstEffect,
    ),
];

/** A continuous cursor route with all six additions/removals derived from their cues. */
export function pointer(frame: number) {
  const b = pointerStops.find((p) => frame <= p.f) ?? pointerStops.at(-1)!,
    i = pointerStops.indexOf(b),
    a = pointerStops[Math.max(0, i - 1)],
    p =
      a.f === b.f
        ? 1
        : a.x > 1920 && b.x > 1920
          ? Math.max(0, Math.min(1, (frame - a.f) / (b.f - a.f)))
          : phase(frame, a.f, b.f - a.f);
  return {
    x: a.x + (b.x - a.x) * p,
    y: a.y + (b.y - a.y) * p,
    press: Math.max(0, ...clicks.map((f) => 1 - Math.abs(frame - f) / 5)),
  };
}
