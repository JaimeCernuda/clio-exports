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

/** Build continuous off-frame parking and distance-aware travel around measured action times. */
export function spotterPointerWaypoints(
  profile: PointerProfile,
): PointerPoint[] {
  const points: PointerPoint[] = [
    { frame: 0, x: profile.width + 40, y: profile.height * 0.6 },
  ];
  for (const [index, point] of profile.points.entries()) {
    const prior = profile.points[index - 1];
    const entry = { frame: 0, x: profile.width + 40, y: point.y };
    if (!prior) {
      points.push({
        ...entry,
        frame: point.frame - travelFrames(entry, point, 42),
      });
    } else {
      const exit = { frame: 0, x: profile.width + 40, y: prior.y };
      const exitTime = prior.frame + 36 + travelFrames(prior, exit, 36);
      const entryTime = point.frame - travelFrames(entry, point, 42);
      if (point.frame - prior.frame > 180 && exitTime < entryTime) {
        points.push(
          { ...prior, frame: prior.frame + 36 },
          { ...exit, frame: exitTime },
          { ...entry, frame: entryTime },
        );
      } else {
        const departure = Math.max(
          prior.frame,
          point.frame - travelFrames(prior, point, 36),
        );
        if (departure > prior.frame)
          points.push({ ...prior, frame: departure });
      }
    }
    points.push(point);
  }
  const last = profile.points.at(-1);
  if (last) {
    const exit = { frame: 0, x: profile.width + 40, y: last.y };
    points.push(
      { ...last, frame: last.frame + 40 },
      { ...exit, frame: last.frame + 40 + travelFrames(last, exit, 40) },
    );
  }
  return points;
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
