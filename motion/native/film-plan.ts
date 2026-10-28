import story from "./film-story.json";
/** Follow recorded decisions, actions and results across two exchanges. */
export const FILM_FPS = 60;
export const FILM_FRAMES = 6480;
export const clamp01 = (value: number): number =>
  Math.max(0, Math.min(1, value));
export function progress(frame: number, start: number, end: number): number {
  return clamp01((frame - start) / (end - start));
}
export function ease(frame: number, start: number, end: number): number {
  const p = progress(frame, start, end);
  return p * p * (3 - 2 * p);
}
export function mix(a: number, b: number, p: number): number {
  return a + (b - a) * p;
}
/** Resolve an explicit editorial beat with its recorded causal dependencies. */
export function filmStage(frame: number) {
  if (!Number.isFinite(frame)) throw new Error("Film frame must be finite");
  return (
    story.stages.find((stage) => frame >= stage.start && frame < stage.end) ??
    story.stages.at(-1)!
  );
}
/** All geometry comes from frame; native widgets stay mounted. */
export function filmPose(frame: number) {
  const stage = filmStage(frame),
    age = frame - stage.start;
  const enter = ease(age, 0, 24),
    leave =
      stage.id === "finish" ? 1 : 1 - ease(frame, stage.end - 18, stage.end);
  const mapSmall = stage.id === "shore-plan";
  const chart = stage.id === "chart" || stage.id === "interpret";
  const detailEnter = stage.id === "interpret" ? ease(age, 360, 405) : 1;
  return {
    stageIndex: story.stages.indexOf(stage),
    stageOpacity: enter * leave,
    bodyY: 94 + (1 - enter) * 12,
    bodyWidth: stage.id === "shore-plan" ? 600 : 390,
    mapX: mapSmall ? 745 : 508,
    mapY: mapSmall ? 325 : 105,
    mapScale: mapSmall ? 0.46 : 0.78,
    mapOpacity:
      stage.id === "map"
        ? ease(age, 95, 140) * leave
        : mapSmall
          ? enter * leave
          : stage.id === "follow"
            ? 0.15
            : 0,
    chartX: 515,
    chartY: 120,
    chartScale: 0.81,
    chartOpacity: chart
      ? (stage.id === "chart" ? ease(age, 110, 155) : 1 - detailEnter) * leave
      : 0,
    methodOpacity: stage.id === "area" ? enter * leave : 0,
    detailOpacity: ["interpret", "finish"].includes(stage.id)
      ? detailEnter * enter * leave
      : 0,
    composerOpacity:
      stage.id === "ask"
        ? 1 - ease(age, 245, 275)
        : stage.id === "follow"
          ? 1 - ease(age, 265, 290)
          : 0,
    questionOpacity:
      stage.id === "ask"
        ? ease(age, 245, 275)
        : stage.id === "follow"
          ? ease(age, 265, 290)
          : 0,
    endOpacity: stage.id === "finish" ? ease(age, 0, 35) : 0,
  };
}
/** Type source text only, keeping the full message visible while sending. */
export function filmInput(
  frame: number,
  first: string,
  second: string,
): string {
  const stage = filmStage(frame),
    age = frame - stage.start;
  if (stage.id === "ask")
    return first.slice(0, Math.floor(first.length * progress(age, 15, 200)));
  if (stage.id === "follow")
    return second.slice(0, Math.floor(second.length * progress(age, 20, 225)));
  return "";
}
/** Select a contiguous verbatim excerpt; missing anchors are errors. */
export function sourceExcerpt(
  text: string,
  from?: string,
  until?: string,
): string {
  const start = from === undefined ? 0 : text.indexOf(from);
  if (start < 0) throw new Error(`Source excerpt start missing: ${from}`);
  const end = until === undefined ? text.length : text.indexOf(until, start);
  if (end < start) throw new Error(`Source excerpt end missing: ${until}`);
  return text.slice(start, end).trim();
}
