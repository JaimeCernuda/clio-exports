/** Shared frame clock for the animated wheel and its sound cues. */
export function wheelTiming(wheel) {
  const ease = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const durations = Array.from(
    { length: wheel.words.length - 1 },
    (_, index) =>
      wheel.firstChangeFrames +
      (wheel.lastChangeFrames - wheel.firstChangeFrames) *
        ease(index / (wheel.words.length - 2)),
  );
  const stops = durations.reduce(
    (values, duration) => [...values, values.at(-1) + duration],
    [wheel.at + wheel.holdFrames],
  );
  return { durations, stops };
}
