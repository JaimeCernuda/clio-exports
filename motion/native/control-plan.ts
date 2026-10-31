export type ControlTrack =
  | {
      id: string;
      kind: "choices";
      options: string[];
      initial: string[];
      keyframes: Array<{ at: number; value: string[]; target: string }>;
    }
  | {
      id: string;
      kind: "range";
      initial: [number, number];
      step: number;
      keyframes: Array<{
        at: number;
        duration: number;
        value: [number, number];
      }>;
    };

/** Reject control scripts that cannot restore the captured UI before chat resumes. */
export function validateControlTrack(
  track: ControlTrack,
  frames: number,
): void {
  if (
    !track.id ||
    !track.keyframes.length ||
    track.keyframes.some(
      (key, index) =>
        !Number.isInteger(key.at) ||
        key.at < 150 ||
        (index > 0 && key.at <= track.keyframes[index - 1].at),
    )
  )
    throw new Error("Invalid control keyframes");
  if (track.kind === "choices") {
    if (
      new Set(track.options).size !== track.options.length ||
      [
        ...track.initial,
        ...track.keyframes.flatMap((key) => [...key.value, key.target]),
      ].some((label) => !track.options.includes(label))
    )
      throw new Error("Unknown native control choice");
    if (
      JSON.stringify([...track.keyframes.at(-1)!.value].sort()) !==
      JSON.stringify([...track.initial].sort())
    )
      throw new Error("Choices must return to the captured state");
  } else {
    if (
      !Number.isFinite(track.step) ||
      track.step <= 0 ||
      [track.initial, ...track.keyframes.map((key) => key.value)].some(
        (value) =>
          value.length !== 2 ||
          !value.every(Number.isFinite) ||
          value[0] >= value[1],
      ) ||
      track.keyframes.some(
        (key) => !Number.isInteger(key.duration) || key.duration < 1,
      )
    )
      throw new Error("Invalid slider interval");
    if (
      JSON.stringify(track.keyframes.at(-1)!.value) !==
      JSON.stringify(track.initial)
    )
      throw new Error("Slider must return to the captured state");
  }
  if (
    track.keyframes.some(
      (key) => key.at + ("duration" in key ? key.duration : 0) >= frames - 168,
    )
  )
    throw new Error("Control changes overlap the return to chat");
}

/** Resolve exact local control values and the current cursor gesture for any seek frame. */
export function controlAt(track: ControlTrack, frame: number) {
  if (track.kind === "choices") {
    const applied = track.keyframes.filter((key) => frame >= key.at).at(-1);
    const gesture = track.keyframes.find(
      (key) => frame >= key.at - 24 && frame < key.at + 12,
    );
    return {
      kind: "choices" as const,
      id: track.id,
      options: track.options,
      value: applied?.value ?? track.initial,
      gesture: gesture
        ? { at: gesture.at, end: gesture.at, target: gesture.target }
        : undefined,
    };
  }
  let value = [...track.initial] as [number, number],
    gesture: { at: number; end: number; thumb: number } | undefined;
  for (const key of track.keyframes) {
    const before = value;
    if (frame >= key.at - 24 && frame < key.at + key.duration + 12)
      gesture = {
        at: key.at,
        end: key.at + key.duration,
        thumb: key.value[0] !== before[0] ? 0 : 1,
      };
    const t = Math.max(0, Math.min(1, (frame - key.at) / key.duration)),
      p = t * t * (3 - 2 * t);
    value = value.map(
      (start, index) =>
        Math.round((start + (key.value[index] - start) * p) / track.step) *
        track.step,
    ) as [number, number];
  }
  return {
    kind: "range" as const,
    id: track.id,
    value,
    step: track.step,
    gesture,
  };
}
