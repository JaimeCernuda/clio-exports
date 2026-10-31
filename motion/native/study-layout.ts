import { interpolateMeasurements, smoothScroll } from "./replay-layout";
import type { StudyShot } from "./study-film-plan";

export type StudyLayoutTrack = {
  key: string;
  frames: number;
  raw: number[];
  scroll: number[];
};
export type StudyLayoutBook = {
  schema: "clio.study-layout.v1";
  full: StudyLayoutTrack;
  proof: StudyLayoutTrack;
};

/** Reject geometry sampled against a different edit or projection treatment. */
export function studyLayoutKey(shots: StudyShot[]): string {
  return JSON.stringify({ version: 2, viewport: [1280, 720], shots });
}

/** Bake the NDP damped viewport path, resetting at actual conversation changes. */
export function bakeStudyLayout(
  shots: StudyShot[],
  samples: { frame: number; session: string; raw: number }[],
): StudyLayoutTrack {
  const frames = shots.at(-1)!.end * 60;
  const raw: number[] = [];
  const scroll: number[] = [];
  let start = 0,
    first = 0;
  for (let index = 1; index <= samples.length; index++) {
    if (
      index < samples.length &&
      samples[index].session === samples[index - 1].session
    )
      continue;
    const end = index < samples.length ? samples[index].frame : frames;
    const sparse = Array<number | undefined>(end - start);
    for (const sample of samples.slice(first, index))
      sparse[sample.frame - start] = sample.raw;
    sparse[0] ??= samples[first].raw;
    sparse[sparse.length - 1] ??= samples[index - 1].raw;
    const segment = interpolateMeasurements(sparse, end - start);
    raw.push(...segment);
    scroll.push(...smoothScroll(segment));
    start = end;
    first = index;
  }
  return { key: studyLayoutKey(shots), frames, raw, scroll };
}
