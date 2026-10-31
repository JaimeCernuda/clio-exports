import type { StudyShot } from "./study-film-plan";
import type { StudyReplay } from "./study-replay-model";

export type StudyClockPoint = { frame: number; source: number };
function lastIndex<T>(values: T[], matches: (value: T) => boolean): number {
  for (let index = values.length - 1; index >= 0; index--)
    if (matches(values[index])) return index;
  return 0;
}

/** Give public prose readable time and compress idle delivery gaps on one source clock. */
export function paceStudyShots(
  shots: StudyShot[],
  a: StudyReplay,
  b: StudyReplay,
): StudyShot[] {
  const durations: Record<number, number> = {
    0: 4,
    25: 4,
    36: 2,
    39: 8,
    49: 12,
    65: 11,
    82: 19,
    105: 17,
    124: 15,
    145: 18,
    180: 6,
    200: 17,
    245: 12,
    550: 5,
  };
  let begin = 0;
  return shots.map((shot) => {
    const replay = shot.run === "run60" ? a : b;
    const seconds = durations[shot.begin] ?? shot.end - shot.begin;
    const result: StudyShot = {
      ...shot,
      originalBegin: shot.begin,
      begin,
      end: begin + seconds,
    };
    begin += seconds;
    if (shot.from === shot.to) return result;
    const session = replay.sessions.find((s) => s.session.id === shot.session)!;
    const blocks = new Map(
      session.view.messages
        .filter((m) => m.role === "assistant")
        .flatMap((m) => m.blocks.map((block) => [block.id, block] as const)),
    );
    const timed = session.blocks.filter(
      (t) => blocks.has(t.blockId) && t.end > shot.from && t.start < shot.to,
    );
    const boundaries = [
      ...new Set([
        shot.from,
        shot.to,
        ...timed.flatMap((t) => [
          Math.max(shot.from, t.start),
          Math.min(shot.to, t.end),
        ]),
      ]),
    ].sort((x, y) => x - y);
    const weights = boundaries.slice(1).map((to, i) => {
      const from = boundaries[i];
      const active = timed.filter((t) => t.start < to && t.end > from);
      const weight = Math.max(
        0,
        ...active.map((t) => {
          const block = blocks.get(t.blockId)!;
          const span = Math.max(1, t.end - t.start);
          const duration =
            block.type === "text"
              ? Math.max(0.35, Array.from(block.text ?? "").length / 100)
              : block.type === "reasoning"
                ? 0.3
                : block.type === "tool"
                  ? Math.min(0.65, Math.max(0.2, span / 8000))
                  : 0.08;
          return (duration * (to - from)) / span;
        }),
      );
      return weight || Math.min(0.1, (to - from) / 1000);
    });
    const total = weights.reduce((sum, value) => sum + value, 0);
    let elapsed = 0;
    result.clock = boundaries.map((source, i) => {
      if (i) elapsed += weights[i - 1];
      return {
        source,
        frame: (result.begin + (seconds * elapsed) / total) * 60,
      };
    });
    return result;
  });
}

/** Sample the common editorial clock without relying on previous rendered frames. */
export function studySourceAt(shot: StudyShot, frame: number): number {
  if (!shot.clock?.length) return shot.from;
  const points = shot.clock;
  const index = lastIndex(points, (p) => p.frame <= frame);
  const left = points[index],
    right = points[index + 1];
  return right
    ? left.source +
        (right.source - left.source) *
          Math.max(
            0,
            Math.min(1, (frame - left.frame) / (right.frame - left.frame)),
          )
    : left.source;
}

/** Resolve an event onto this same clock for row entry and short tool-group closing. */
export function studyFrameForSource(
  shots: StudyShot[],
  run: StudyShot["run"],
  source: number,
): number {
  for (const shot of shots) {
    if (shot.run !== run || source < shot.from || source > shot.to) continue;
    if (!shot.clock?.length) return shot.begin * 60;
    const points = shot.clock;
    const index = lastIndex(points, (p) => p.source <= source);
    const left = points[index],
      right = points[index + 1];
    return right
      ? left.frame +
          ((right.frame - left.frame) * (source - left.source)) /
            (right.source - left.source)
      : left.frame;
  }
  return source < shots[0].from ? 0 : shots.at(-1)!.end * 60;
}
