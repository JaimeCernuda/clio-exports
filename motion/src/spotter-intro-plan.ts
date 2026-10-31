export type Point = readonly [number, number];
export type Curve = readonly [Point, Point, Point, Point];
export const introRoutes = {
  data: [
    [460, 360],
    [600, 360],
    [740, 360],
    [880, 360],
  ],
  record: [
    [1040, 360],
    [1170, 360],
    [1300, 360],
    [1430, 360],
  ],
  observe: [
    [710, 780],
    [560, 780],
    [570, 520],
    [905, 405],
  ],
  provenance: [
    [1570, 555],
    [1570, 815],
    [1320, 800],
    [1230, 800],
  ],
} as const satisfies Record<string, Curve>;

/** Bounded frame easing shared by route drawing, nodes and the handoff. */
export function introEase(frame: number, start: number, end: number): number {
  if (end <= start) throw new Error("Invalid intro timing range");
  const t = Math.max(0, Math.min(1, (frame - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

/** Point on an editable cubic route, independent of DOM measurements or seek order. */
export function routePoint(curve: Curve, progress: number): Point {
  const t = Math.max(0, Math.min(1, progress)),
    u = 1 - t;
  const coordinate = (axis: 0 | 1) =>
    u ** 3 * curve[0][axis] +
    3 * u ** 2 * t * curve[1][axis] +
    3 * u * t ** 2 * curve[2][axis] +
    t ** 3 * curve[3][axis];
  return [coordinate(0), coordinate(1)];
}

/** Reverse an attribution route while retaining its exact geometry. */
export function reverseRoute(curve: Curve): Curve {
  return [curve[3], curve[2], curve[1], curve[0]];
}

/** One illustrative track/detect/trace sequence; it makes no captured-runtime timing claim. */
export function spotterIntroFrame(frame: number) {
  if (!Number.isFinite(frame) || frame < 0)
    throw new Error("Invalid intro frame");
  return {
    question: introEase(frame, 0, 36),
    opal: introEase(frame, 105, 140),
    clio: introEase(frame, 132, 170),
    flowcept: introEase(frame, 170, 205),
    guardian: introEase(frame, 0, 32),
    routes: {
      data: introEase(frame, 145, 180),
      record: introEase(frame, 205, 240),
      observe: introEase(frame, 235, 285),
      provenance: introEase(frame, 265, 315),
    },
    track: introEase(frame, 210, 235),
    detect: introEase(frame, 315, 340),
    trace: introEase(frame, 360, 385),
    returnToAgent: introEase(frame, 360, 400),
    returnToData: introEase(frame, 410, 450),
    origin: introEase(frame, 440, 465),
  };
}
