import { ease, phase } from "./prompt-morph";
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const pointerStops = [
  [0, 1150, 870],
  [72, 1150, 870],
  [112, 354, 160],
  [156, 354, 160],
  [199, 817, 261],
  [244, 817, 261],
  [330, 817, 261],
  [376, 165, 447],
  [407, 165, 447],
  [430, 238, 575],
  [448, 238, 575],
  [488, 195, 794],
  [640, 195, 794],
  [682, 330, 447],
  [707, 330, 447],
  [742, 365, 575],
  [790, 365, 575],
  [924, 365, 575],
  [976, 165, 447],
  [1000, 165, 447],
  [1030, 225, 575],
  [1116, 225, 575],
  [1176, 540, 928],
  [1450, 540, 928],
] as const;

/** A continuous pointer path; no shot-boundary fades or coordinate resets. */
export function pointerAt(frame: number): {
  x: number;
  y: number;
  opacity: number;
  pressed: number;
} {
  let previous: readonly number[] = pointerStops[0];
  let next: readonly number[] = pointerStops.at(-1)!;
  for (let i = 1; i < pointerStops.length; i++)
    if (frame <= pointerStops[i][0]) {
      previous = pointerStops[i - 1];
      next = pointerStops[i];
      break;
    }
  const t = ease((frame - previous[0]) / Math.max(1, next[0] - previous[0]));
  const clicks = [112, 199, 376, 430, 682, 742, 976, 1030];
  return {
    x: lerp(previous[1], next[1], t),
    y: lerp(previous[2], next[2], t),
    opacity: 1 - phase(frame, 1180, 18),
    pressed: Math.max(
      ...clicks.map((click) => Math.max(0, 1 - Math.abs(frame - click) / 6)),
    ),
  };
}
