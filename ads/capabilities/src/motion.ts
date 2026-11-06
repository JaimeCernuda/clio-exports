/** Frame-independent pure motion functions: no hidden wall-clock state. */
export const clamp = (x: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, x));
export const ease = (x: number) => {
  const p = clamp(x);
  return p * p * (3 - 2 * p);
};
export const phase = (t: number, at: number, d = 0.6) => ease((t - at) / d);
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export const visible = (t: number, at: number, end = 1000) =>
  phase(t, at) * (1 - phase(t, end, 0.45));
export const linePath = (
  rows: number[],
  x: number,
  y: number,
  w: number,
  h: number,
  min: number,
  max: number,
) =>
  rows
    .map(
      (v, i) =>
        `${i ? "L" : "M"}${(x + (i / (rows.length - 1)) * w).toFixed(2)},${(y + h - ((v - min) / (max - min)) * h).toFixed(2)}`,
    )
    .join(" ");
export type PointerKey = { at: number; x: number; y: number; press?: boolean };
export function pointerAt(
  t: number,
  keys: PointerKey[],
): { x: number; y: number; press: number } {
  if (!keys.length) return { x: 2000, y: 1000, press: 0 };
  let i = 0;
  while (i + 1 < keys.length && t >= keys[i + 1].at) i++;
  const a = keys[i],
    b = keys[Math.min(i + 1, keys.length - 1)],
    p = b.at === a.at ? 0 : ease((t - a.at) / (b.at - a.at));
  return {
    x: mix(a.x, b.x, p),
    y: mix(a.y, b.y, p),
    press: keys.reduce(
      (v, k) => Math.max(v, k.press ? clamp(1 - Math.abs(t - k.at) / 0.15) : 0),
      0,
    ),
  };
}
