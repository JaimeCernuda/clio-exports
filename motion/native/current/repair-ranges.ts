/** Parse ordered, non-overlapping [start,end) source ranges before starting a repair render. */
export function parseRepairRanges(
  value: string,
  frames: number,
): Array<{ start: number; end: number }> {
  if (!Number.isSafeInteger(frames) || frames < 1)
    throw new Error("Invalid source frame count");
  let previous = 0;
  return value.split(",").map((part) => {
    if (!/^\d+:\d+$/.test(part)) throw new Error("Use start:end repair ranges");
    const [start, end] = part.split(":").map(Number);
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < previous ||
      end <= start ||
      end > frames
    )
      throw new Error("Invalid or overlapping repair ranges");
    previous = end;
    return { start, end };
  });
}
