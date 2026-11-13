import { spotterProgress } from "./spotter-plan";

export interface PointerPoint {
  frame: number;
  x: number;
  y: number;
}
export interface PointerProfile {
  width: number;
  height: number;
  points: PointerPoint[];
}

/** Give a smoothstep trajectory enough time for its peak velocity, not just its average. */
function travelFrames(
  a: PointerPoint,
  b: PointerPoint,
  minimum: number,
): number {
  return Math.max(
    minimum,
    Math.ceil((1.5 * Math.hypot(b.x - a.x, b.y - a.y)) / 30),
  );
}

/** Rest at the last action, then travel directly to the next measured target. */
export function spotterPointerWaypoints(
  profile: PointerProfile,
): PointerPoint[] {
  const first = profile.points[0];
  if (!first) throw new Error("A pointer profile needs at least one action");
  const points: PointerPoint[] = [{ ...first, frame: 0 }];
  for (const [index, point] of profile.points.entries()) {
    const prior = profile.points[index - 1];
    if (prior) {
      const departure = Math.max(
        prior.frame,
        point.frame - travelFrames(prior, point, 36),
      );
      if (departure > prior.frame) points.push({ ...prior, frame: departure });
    }
    points.push(point);
  }
  return points;
}

/** The pointer belongs to the interface shot and fades with its closing curtain. */
export function spotterPointerOpacityAt(frame: number): number {
  return frame < 7 * 60 ? 0 : 1 - spotterProgress(frame, 204 * 60, 205 * 60);
}

/** Evaluate the same immutable path for sequential playback, reverse seeks and capture. */
export function spotterPointerAt(
  points: PointerPoint[],
  frame: number,
): PointerPoint {
  const index = points.findIndex((point) => point.frame >= frame);
  const b = index < 0 ? points.at(-1)! : points[index];
  const a = points[Math.max(0, index - 1)] ?? b;
  if (frame >= b.frame) return { ...b, frame };
  const progress = spotterProgress(frame, a.frame, b.frame);
  return {
    frame,
    x: a.x + (b.x - a.x) * progress,
    y: a.y + (b.y - a.y) * progress,
  };
}

/** Cover every visible movement and its settling handles without replacing idle footage. */
export function spotterPointerMotionRanges(
  profile: PointerProfile,
  first: number,
  end: number,
  handles = 12,
): Array<[number, number]> {
  const points = spotterPointerWaypoints(profile);
  const ranges: Array<[number, number]> = [];
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1],
      b = points[index];
    if (
      (a.x === b.x && a.y === b.y) ||
      (a.x > profile.width + 24 && b.x > profile.width + 24)
    )
      continue;
    const start = Math.max(first, a.frame - handles),
      stop = Math.min(end, b.frame + handles);
    if (stop <= start) continue;
    const prior = ranges.at(-1);
    if (prior && start <= prior[1]) prior[1] = Math.max(stop, prior[1]);
    else ranges.push([start, stop]);
  }
  return ranges;
}
