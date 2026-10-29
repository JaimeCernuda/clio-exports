export type FrameDifference = {
  frame: number;
  seconds: number;
  difference: number;
};

/** Require one finite measurement for every decoded frame, in source order. */
export function parseFrameDifferences(
  metadata: string,
  expectedFrames: number,
): FrameDifference[] {
  const rows = [
    ...metadata.matchAll(
      /frame:(\d+)[^\n]*pts_time:([\d.]+)[\s\S]*?lavfi.signalstats.YDIF=([\d.eE+-]+)/g,
    ),
  ].map((m) => ({
    frame: Number(m[1]),
    seconds: Number(m[2]),
    difference: Number(m[3]),
  }));
  if (
    !Number.isInteger(expectedFrames) ||
    expectedFrames < 1 ||
    rows.length !== expectedFrames ||
    rows.some(
      (row, index) =>
        row.frame !== index ||
        !Number.isFinite(row.seconds) ||
        !Number.isFinite(row.difference) ||
        row.difference < 0,
    )
  )
    throw new Error(
      `Incomplete or invalid frame scan: ${rows.length}/${expectedFrames}`,
    );
  return rows;
}

export type InspectionActor = {
  frameOffset: number;
  shotFrames: number;
  id: string;
};

/** Resolve only inspection boundaries retained in a conformed story clip. */
export function inspectionBoundaries(
  segment: { start: number; inFrame: number; outFrame: number },
  replacements: InspectionActor[],
) {
  if (
    ![segment.start, segment.inFrame, segment.outFrame].every(
      Number.isInteger,
    ) ||
    segment.start < 0 ||
    segment.inFrame < 0 ||
    segment.outFrame <= segment.inFrame
  )
    throw new Error("Invalid story clip range");
  return replacements.flatMap((shot) => {
    if (
      ![shot.frameOffset, shot.shotFrames].every(Number.isInteger) ||
      shot.frameOffset < 0 ||
      shot.shotFrames < 1
    )
      throw new Error("Invalid inspection range");
    return (
      [
        ["enter", shot.frameOffset],
        ["leave", shot.frameOffset + shot.shotFrames],
      ] as const
    )
      .filter(([, at]) => at > segment.inFrame && at < segment.outFrame)
      .map(([boundary, at]) => ({
        shot: shot.id,
        boundary,
        frame: segment.start + at - segment.inFrame,
      }));
  });
}
