import type { FocusBeat } from "./presentation-plan";
import { controlAt } from "./control-plan";

export type CursorBeat = {
  at: number;
  sampleAt: number;
  kind: "button" | "observation" | "control";
  label?: string;
  pulse?: boolean;
  drag?: boolean;
};
export type CursorPose = { x: number; y: number; size: number };
export type CursorKey = CursorBeat & CursorPose;

/** Describe one pointer's ordered actions, independently of renderer history. */
export function cursorBeats(focus: FocusBeat): CursorBeat[] {
  const points: CursorBeat[] = [];
  const add = (
    at: number,
    kind: CursorBeat["kind"],
    extra: Partial<CursorBeat> = {},
  ) => points.push({ at, sampleAt: at, kind, ...extra });
  add(72, "button", { pulse: true });
  for (const control of focus.controls ?? [])
    for (const key of control.keyframes) {
      add(key.at, "control", { pulse: true });
      if ("duration" in key)
        add(key.at + key.duration, "control", { drag: true });
    }
  for (const observation of focus.observations ?? []) {
    add(observation.at + 32, "observation", { label: observation.label });
    if (observation.select)
      add(observation.at + 60, "observation", {
        label: observation.label,
        pulse: true,
      });
  }
  if (focus.chartZoom)
    for (const at of [focus.chartZoom.at, focus.chartZoom.reset])
      add(at, "button", { sampleAt: at - 1, pulse: true });
  if (focus.download)
    for (const at of [
      focus.download.open,
      focus.download.formats,
      focus.download.save,
    ])
      add(at, "button", { sampleAt: at - 1, pulse: true });
  if (focus.action === "map-zoom") add(198, "button", { pulse: true });
  if (focus.action === "resources")
    for (const at of [198, 232, 266]) add(at, "button", { pulse: true });
  add(focus.frames - 120, "button", {
    sampleAt: focus.frames - 121,
    pulse: true,
  });
  points.sort((a, b) => a.at - b.at);
  if (points.some((p, i) => i > 0 && p.at <= points[i - 1].at))
    throw new Error(`Overlapping pointer actions in ${focus.id}`);
  return points;
}

/** Leave a short click hold, then travel continuously instead of resetting per gesture. */
export function cursorMoveStart(
  previous: CursorBeat,
  next: CursorBeat,
): number {
  if (
    previous.kind === "observation" &&
    next.kind === "observation" &&
    previous.label === next.label
  )
    return next.at;
  return next.drag
    ? previous.at
    : Math.max(
        previous.at + Math.min(12, (next.at - previous.at) / 3),
        next.at - 84,
      );
}

/** Tooltips follow the pointer's arrival and departure, including travel to a control. */
export function cursorObservation(
  focus: FocusBeat,
  age: number,
): string | undefined {
  const beats = cursorBeats(focus);
  const index = beats.filter((beat) => beat.at <= age).length - 1;
  if (index < 0 || beats[index].kind !== "observation") return;
  const next = beats[index + 1];
  if (next && age >= cursorMoveStart(beats[index], next)) return;
  return beats[index].label;
}

/** Keep continuous UI changes at 60 fps; reuse frames only while the UI is unchanged. */
export function inspectionUiFrame(focus: FocusBeat, age: number): number {
  const keys = new Set([0]);
  const range = (start: number, end: number) => {
    for (let frame = start; frame <= end; frame++) keys.add(frame);
  };
  range(72, 132);
  range(focus.frames - 120, focus.frames - 60);
  const beats = cursorBeats(focus);
  for (const [index, beat] of beats.entries()) {
    keys.add(beat.at);
    keys.add(beat.sampleAt);
    if (index) keys.add(Math.ceil(cursorMoveStart(beats[index - 1], beat)));
  }
  for (const control of focus.controls ?? [])
    for (const key of control.keyframes)
      if ("duration" in key) {
        let previous = JSON.stringify(controlAt(control, key.at - 1).value);
        for (let frame = key.at; frame <= key.at + key.duration; frame++) {
          const value = JSON.stringify(controlAt(control, frame).value);
          if (value !== previous) keys.add(frame);
          previous = value;
        }
      }
  let scroll = 0;
  for (const observation of focus.observations ?? []) {
    if ((observation.scroll ?? 0) !== scroll)
      range(observation.at - 48, observation.at);
    scroll = observation.scroll ?? 0;
  }
  if (focus.selectionClearAt !== undefined) keys.add(focus.selectionClearAt);
  else keys.add(focus.frames - 168);
  if (focus.action === "map-zoom") range(198, 248);
  return Math.max(...Array.from(keys).filter((frame) => frame <= age));
}

/** Bind exact action endpoints to the actual native control positions captured in the base. */
export function bindCursorTrack(
  focus: FocusBeat,
  samples: Record<number, CursorPose | null>,
): CursorKey[] {
  const beats = cursorBeats(focus);
  const keys = beats.map((beat) => {
    const point = samples[beat.sampleAt];
    if (!point || ![point.x, point.y, point.size].every(Number.isFinite))
      throw new Error(
        `Missing native cursor anchor ${focus.id}:${beat.sampleAt}`,
      );
    return { ...beat, ...point };
  });
  return [
    { ...keys[0], at: 0, sampleAt: 0, y: keys[0].y + 90, pulse: false },
    ...keys,
  ];
}

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};
const steadyTravel = (n: number, duration: number) => {
  const t = clamp(n),
    ramp = Math.min(0.25, 8 / duration);
  const enter = (value: number) =>
    (value / 2 - (ramp * Math.sin((Math.PI * value) / ramp)) / (2 * Math.PI)) /
    (1 - ramp);
  return t < ramp
    ? enter(t)
    : t > 1 - ramp
      ? 1 - enter(1 - t)
      : (t - ramp / 2) / (1 - ramp);
};

/** Resolve a smooth, seek-independent pointer; render workers cannot change its path. */
export function cursorAt(
  keys: readonly CursorKey[],
  frame: number,
  frames: number,
) {
  if (!keys.length || frame < 0 || frame >= frames)
    throw new Error("Invalid cursor frame");
  const index = keys.filter((key) => key.at <= frame).length - 1;
  const previous = keys[Math.max(0, index)],
    next = keys[index + 1];
  let start = next
    ? previous.at === 0
      ? 0
      : cursorMoveStart(previous, next)
    : 0;
  if (
    next &&
    !next.drag &&
    previous.at !== 0 &&
    previous.kind !== "observation" &&
    Math.hypot(next.x - previous.x, next.y - previous.y) > 400
  )
    start = Math.max(previous.at + 8, next.at - 120);
  const p = !next
    ? 0
    : next.drag
      ? smooth((frame - start) / (next.at - start))
      : steadyTravel((frame - start) / (next.at - start), next.at - start);
  const pulseKey = keys.filter((key) => key.pulse && key.at <= frame).at(-1);
  return {
    x: previous.x + ((next?.x ?? previous.x) - previous.x) * p,
    y: previous.y + ((next?.y ?? previous.y) - previous.y) * p,
    size: previous.size,
    opacity: smooth(frame / 18) * (1 - smooth((frame - frames + 25) / 25)),
    pulse: pulseKey ? 1 - smooth((frame - pulseKey.at) / 12) : 0,
  };
}
