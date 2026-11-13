import { segmentLevel } from "../word-attention/attention-segment-heat";
import { displayedStepText } from "./spotter-plan";

/** Native Notebook light and the heat ramps reviewed in gact-tui PR 1288. */
export const SPOTTER_THEME = "light" as const;
export const SPOTTER_HEAT_SOURCE = "075c0581f1f9ef15d6206b0339e7c105889a546f";
export const HEAT_LEVEL_MIX = [0, 22, 30, 39, 48, 56, 64, 73, 82, 90] as const;
export type HeatKind = "text" | "tool";
export type HeatRun = readonly [number, number, number];

/** Use the captured global scale; never rescale a small displayed excerpt. */
export function spotterHeatStyle(
  value: number,
  kind: HeatKind,
): Partial<
  Record<
    | "backgroundColor"
    | "textDecoration"
    | "textDecorationColor"
    | "textDecorationThickness"
    | "color",
    string
  >
> {
  const level = segmentLevel(value, 1);
  if (level === 0) return {};
  const hue = `var(--attention-heat-${kind})`;
  return {
    backgroundColor: `color-mix(in oklch, ${hue} ${HEAT_LEVEL_MIX[level]}%, transparent)`,
    textDecoration: "underline",
    textDecorationColor: hue,
    textDecorationThickness: "2px",
    ...(level >= 6 ? { color: "var(--foreground)" } : {}),
  };
}

/** Project only the displayed prompt, dropping heat that overlaps edited aliases. */
export function spotterPromptProjection(
  source: string,
  sourceRound: number,
  runs: readonly HeatRun[] = [],
): { text: string; runs: [number, number, number][] } {
  const heading = source.indexOf(`ROUND ${sourceRound} - TASK`);
  if (heading < 0) throw new Error("Recorded prompt heading is missing");
  const afterHeading = source.indexOf("\n", heading) + 1;
  const end = source.indexOf("TOOL OUTPUTS", afterHeading);
  if (afterHeading <= 0 || end < afterHeading)
    throw new Error("Recorded prompt boundaries are missing");
  const raw = source.slice(afterHeading, end);
  const body = raw.trim();
  const start = [...source.slice(0, afterHeading + raw.indexOf(body))].length;
  const bodyLength = [...body].length;
  const aliases = [...body.matchAll(/round (?:1|2|5)(?![\d–-])/giu)].map(
    (match) => {
      const lo = [...body.slice(0, match.index)].length;
      return {
        lo,
        hi: lo + [...match[0]].length,
        delta: [...displayedStepText(match[0])].length - [...match[0]].length,
      };
    },
  );
  const offset = (at: number) =>
    at +
    aliases
      .filter((alias) => alias.hi <= at)
      .reduce((n, alias) => n + alias.delta, 0);
  const projected: [number, number, number][] = [];
  for (const [lo, hi, value] of runs) {
    const a = Math.max(0, lo - start),
      b = Math.min(bodyLength, hi - start);
    if (b <= a || aliases.some((alias) => a < alias.hi && b > alias.lo))
      continue;
    projected.push([offset(a), offset(b), value]);
  }
  return { text: displayedStepText(body), runs: projected };
}
