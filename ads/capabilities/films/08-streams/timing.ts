import { clamp } from "../../src/motion";
import recordedQuery from "../../evidence/stream-query.json";
/** Monotone cubic source clock, anchored to the actual retained query and completion. */
export function sensorRowCount(t: number): number {
  const q = recordedQuery.sourceIndex + 1,
    d0 = (q - 2) / 12,
    d1 = (60 - q) / 12,
    m = (2 * d0 * d1) / (d0 + d1);
  const u = clamp((t - (t < 19 ? 7 : 19)) / 12),
    a = t < 19 ? 2 : q,
    b = t < 19 ? q : 60;
  const ma = t < 19 ? d0 / 2 : m,
    mb = t < 19 ? m : d1 * 1.4;
  return Math.floor(
    (2 * u ** 3 - 3 * u ** 2 + 1) * a +
      (u ** 3 - 2 * u ** 2 + u) * 12 * ma +
      (-2 * u ** 3 + 3 * u ** 2) * b +
      (u ** 3 - u ** 2) * 12 * mb +
      1e-8,
  );
}

/** Locate when a retained source row first becomes available on the editorial clock. */
export function sourceTimeForRow(row: number): number {
  let low = 7,
    high = 31;
  for (let i = 0; i < 32; i++) {
    const mid = (low + high) / 2;
    if (sensorRowCount(mid) >= row) high = mid;
    else low = mid;
  }
  return high;
}
