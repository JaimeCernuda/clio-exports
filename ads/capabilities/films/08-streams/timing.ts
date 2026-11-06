import { clamp } from "../../src/motion";
/** Smooth editorial acceleration, anchored to the retained query at 16:16 (row 17). */
export function sensorRowCount(t: number): number {
  const elapsed = clamp(t - 7, 0, 24);
  return Math.min(
    60,
    Math.floor(
      2 +
        1.1 * elapsed -
        (43 / 1440) * elapsed ** 2 +
        (61 / 17280) * elapsed ** 3 +
        1e-8,
    ),
  );
}
