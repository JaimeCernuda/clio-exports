export const ENGINEERING_FPS = 60;
export type EngineeringPart = "sweep" | "studio";
export const engineeringFrames = (part: EngineeringPart): number =>
  (part === "sweep" ? 50 : 36) * ENGINEERING_FPS;
export const smooth = (value: number): number => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};
const ramp = (time: number, start: number, end: number): number =>
  smooth((time - start) / (end - start));
/** Resolve explicit inspection timing independently of capture worker order. */
export function engineeringPose(part: EngineeringPart, frame: number) {
  const t = frame / ENGINEERING_FPS;
  if (part === "sweep")
    return {
      t,
      expansion: ramp(t, 14, 15.1) * (1 - ramp(t, 37, 38)),
      opacity: ramp(t, 12, 12.6),
      threshold:
        Math.round(
          100 * (0.5 - 0.15 * ramp(t, 20, 22) + 0.15 * ramp(t, 24, 25)),
        ) / 100,
      selection: t >= 28 ? 4 : 9,
      panel: "matrix",
      tab: "tSetup",
      iteration: 10,
      orbit: ramp(t, 16, 19) * 0.42,
      scroll: ramp(t, 26, 27),
      sourcePhase: t < 12 ? t / 12 : t < 39 ? 1 : 1 + (t - 39) / 11,
    };
  return {
    t,
    expansion: 0,
    opacity: 1,
    threshold: t < 25 ? 0.1 : 0.1 + 0.4 * ramp(t, 25, 26),
    selection: 0,
    panel: "history",
    tab: t < 6 ? "tSetup" : t < 32 ? "tRes" : "tSaved",
    iteration: t < 8 ? 0 : Math.min(10, Math.floor((t - 8) / 1.4)),
    orbit: 0.35 * ramp(t, 28, 30),
    scroll: 0,
    sourcePhase: 0,
  };
}
export interface PointerKey {
  at: number;
  x: number;
  y: number;
}

/** OrbitControls preserves camera values within floating-point roundoff. */
export function cameraMatches(
  actual: unknown,
  expected: { position: number[]; target: number[]; fov: number; zoom: number },
): boolean {
  if (!actual || typeof actual !== "object") return false;
  const value = actual as Record<string, unknown>;
  for (const key of ["position", "target"] as const) {
    const vector = value[key];
    if (
      !Array.isArray(vector) ||
      vector.length !== 3 ||
      !vector.every(
        (n, i) =>
          typeof n === "number" && Math.abs(n - expected[key][i]) < 1e-7,
      )
    )
      return false;
  }
  return (
    typeof value.fov === "number" &&
    Math.abs(value.fov - expected.fov) < 1e-7 &&
    typeof value.zoom === "number" &&
    Math.abs(value.zoom - expected.zoom) < 1e-7
  );
}
/** Use a single continuous path with bounded approach intervals and no opacity resets. */
export function engineeringPointer(
  keys: readonly PointerKey[],
  seconds: number,
): { x: number; y: number } {
  if (!keys.length) throw new Error("Pointer needs a path");
  const next = keys.findIndex((k) => k.at > seconds);
  if (next === 0) return keys[0];
  if (next === -1) return keys.at(-1)!;
  const a = keys[next - 1],
    b = keys[next],
    p = smooth((seconds - a.at) / (b.at - a.at));
  return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
}
