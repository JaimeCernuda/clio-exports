export interface CaptureViewport {
  width: number;
  height: number;
}

/** Accept bounded CSS-pixel capture dimensions from the private frame host. */
export function isCaptureViewport(value: unknown): value is CaptureViewport {
  if (!value || typeof value !== "object") return false;
  const viewport = value as Record<string, unknown>;
  return [viewport.width, viewport.height].every(
    (dimension) =>
      typeof dimension === "number" &&
      Number.isSafeInteger(dimension) &&
      dimension > 0 &&
      dimension <= 16384,
  );
}
