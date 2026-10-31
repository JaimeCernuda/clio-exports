import { cursorAt, type CursorKey } from "./cursor-plan";
import type { StudyShot } from "./study-film-plan";

export type StudyCursorMeasurement = {
  begin: number;
  target: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
};
export type StudyCursorBook = {
  schema: "clio.study-cursor.v1";
  full: StudyCursorMeasurement[];
  proof: StudyCursorMeasurement[];
};

/** Build a repeatable pointer path from native control measurements, independent of seek history. */
export function studyCursorKeys(
  shots: StudyShot[],
  measurements: StudyCursorMeasurement[],
): CursorKey[] {
  const first = measurements.find((m) =>
    shots.some((s) => s.begin === m.begin && s.target === m.target),
  );
  const keys: CursorKey[] = [
    {
      at: 0,
      sampleAt: 0,
      kind: "button",
      x: first?.x ?? 1250,
      y: Math.min(680, (first?.y ?? 630) + 40),
      size: 23,
    },
  ];
  const add = (key: CursorKey) => {
    const previous = keys.at(-1)!;
    const distance = Math.hypot(key.x - previous.x, key.y - previous.y);
    keys.push({
      ...key,
      travelFrames: Math.round(
        60 * Math.min(1, Math.max(0.35, distance / 1400)),
      ),
    });
  };
  for (const shot of shots) {
    if (!shot.target || shot.card) continue;
    const point = measurements.find(
      (m) => m.begin === shot.begin && m.target === shot.target,
    );
    if (!point) continue;
    const at = Math.round(
      (shot.begin + (shot.target.startsWith("chart:") ? 4.2 : 1.2)) * 60,
    );
    add({
      at,
      sampleAt: at,
      kind: shot.target.startsWith("chart:") ? "observation" : "button",
      x: point.x,
      y: point.y,
      size: 23,
      pulse: !shot.target.startsWith("chart:"),
    });
    const option = shot.seed
      ? measurements.find(
          (m) =>
            m.begin === shot.begin && m.target === `seed-option:${shot.seed}`,
        )
      : undefined;
    if (option)
      add({
        at: Math.round((shot.begin + 2.4) * 60),
        sampleAt: Math.round((shot.begin + 2.4) * 60),
        kind: "button",
        x: option.x,
        y: option.y,
        size: 23,
        pulse: true,
      });
  }
  return keys.sort((a, b) => a.at - b.at);
}

export function studyCursorAt(keys: CursorKey[], frame: number) {
  return cursorAt(keys, frame, 560 * 60);
}
