import { ease } from "./film-plan";

export interface ReplayLayoutTrack {
  schema: "clio.replay-layout.v1";
  key: string;
  frames: number;
  raw: number[];
  scroll: number[];
  measurementStep?: number;
}

/** Continue the last canvas inspection position while subsequent prose is written. */
export function surfaceScrollOffset(
  maxOffset: number,
  start: number,
  end: number,
  frame: number,
): number {
  if (!Number.isFinite(maxOffset) || maxOffset < 0 || end <= start)
    throw new Error("Invalid canvas scroll range");
  const duration = end - start;
  return maxOffset * ease(frame - start, duration * 0.55, duration - 15);
}

/** Fill the viewport path between measured native keyframes without changing their positions. */
export function interpolateMeasurements(
  samples: readonly (number | undefined)[],
  frames: number,
): number[] {
  if (
    !Number.isInteger(frames) ||
    frames < 1 ||
    samples[0] === undefined ||
    samples[frames - 1] === undefined
  )
    throw new Error("Native measurements require both endpoints");
  const entries = Array.from(samples.entries()).filter(
    (entry): entry is [number, number] => entry[1] !== undefined,
  );
  if (
    entries.some(
      ([frame, value]) =>
        frame >= frames || !Number.isFinite(value) || value < 0,
    )
  )
    throw new Error("Invalid native layout sample");
  let index = 0;
  return Array.from({ length: frames }, (_, frame) => {
    while (index + 1 < entries.length && entries[index + 1][0] <= frame)
      index++;
    const [start, value] = entries[index];
    const next = entries[index + 1];
    return next
      ? value + ((next[1] - value) * (frame - start)) / (next[0] - start)
      : value;
  });
}

/** Bake a bounded, damped scroll path from native geometry at every source frame. */
export function smoothScroll(raw: readonly number[]): number[] {
  if (
    !raw.length ||
    Array.from(raw).some((value) => !Number.isFinite(value) || value < 0)
  )
    throw new Error("Scroll measurements must be nonnegative finite values");
  let position = raw[0],
    velocity = 0;
  return raw.map((target) => {
    const difference = target - position;
    velocity = Math.max(
      -9,
      Math.min(9, velocity + difference * 0.12 - velocity * 0.58),
    );
    if (Math.abs(velocity) > Math.abs(difference)) velocity = difference;
    position = Math.max(0, position + velocity);
    if (position === 0) velocity = 0;
    return Math.round(position * 1000) / 1000;
  });
}

/** Identify the scene, timing, geometry and editorial selection for a measured path. */
export function layoutKey(
  sessionId: string,
  frames: number,
  turns: number,
  portrait: boolean,
  edits: unknown,
): string {
  return JSON.stringify({
    version: 3,
    sessionId,
    frames,
    turns,
    portrait,
    edits,
  });
}

/** Reject stale and incomplete measurements before rendering. */
export function validateLayout(
  value: ReplayLayoutTrack,
  key: string,
  frames: number,
): void {
  if (
    value.schema !== "clio.replay-layout.v1" ||
    value.key !== key ||
    value.frames !== frames ||
    value.raw.length !== frames ||
    value.scroll.length !== frames ||
    [...value.raw, ...value.scroll].some((n) => !Number.isFinite(n) || n < 0)
  )
    throw new Error(
      "The replay layout must be measured again for this scene and timing",
    );
}
