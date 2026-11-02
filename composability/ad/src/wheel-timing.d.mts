export function wheelTiming(wheel: {
  at: number;
  holdFrames: number;
  firstChangeFrames: number;
  lastChangeFrames: number;
  rampPower?: number;
  words: readonly string[];
}): { durations: number[]; stops: number[] };
