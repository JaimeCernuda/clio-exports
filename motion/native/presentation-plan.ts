import type { ReplayPlan } from "./replay-plan";
import {
  controlAt,
  validateControlTrack,
  type ControlTrack,
} from "./control-plan";
import { downloadPhase, type DownloadBeat } from "./download-plan";

export interface FocusBeat {
  id: string;
  toolId?: string;
  surfaceId?: string;
  blockId?: string;
  offset?: number;
  frames: number;
  targetLabel?: string;
  selectionText?: string;
  cameraOrigin?: string;
  maxZoom?: number;
  /** Open the production canvas, inspect recorded marks, then restore it. */
  canvas?: boolean;
  observations?: Array<{
    at: number;
    label: string;
    scroll?: number;
    select?: "replace" | "add";
    selector?: string;
  }>;
  chartZoom?: { at: number; reset: number };
  controls?: ControlTrack[];
  selectionClearAt?: number;
  download?: DownloadBeat;
  chartHeights?: Record<string, { from: number; to: number }>;
  action: "resources" | "map-zoom" | "chart-hover" | "select-text";
}

/** Insert named, frozen-source interaction shots without advancing the log. */
export function buildPresentation(
  plan: ReplayPlan,
  beats: readonly FocusBeat[],
) {
  let added = 0;
  const focuses = beats.map((beat) => {
    const event = plan.events.find((value) =>
      beat.toolId
        ? value.toolId === beat.toolId
        : beat.surfaceId
          ? value.surfaceId === beat.surfaceId
          : value.blockId === beat.blockId,
    );
    if (!event || !Number.isInteger(beat.frames) || beat.frames < 180)
      throw new Error(`Invalid focus beat ${beat.id}`);
    if (beat.canvas && (beat.frames < 360 || beat.action === "select-text"))
      throw new Error(`Invalid canvas inspection ${beat.id}`);
    for (const control of beat.controls ?? [])
      validateControlTrack(control, beat.frames);
    if (
      beat.download &&
      !(
        beat.download.open < beat.download.formats &&
        beat.download.formats < beat.download.save &&
        beat.download.save < beat.frames - 168
      )
    )
      throw new Error("Download must finish before restoring the canvas");
    if (
      beat.observations?.some(
        (value, index) =>
          !beat.canvas ||
          beat.action !== "chart-hover" ||
          !Number.isInteger(value.at) ||
          value.at < 150 ||
          value.at > beat.frames - 200 ||
          !value.label.trim() ||
          !Number.isFinite(value.scroll ?? 0) ||
          (value.scroll ?? 0) < 0 ||
          (index > 0 && value.at <= beat.observations![index - 1].at),
      )
    )
      throw new Error(`Invalid observation sequence ${beat.id}`);
    const sourceFrame = Math.min(
      event.end - 1,
      event.start + (beat.offset ?? event.end - event.start - 1),
    );
    const start = sourceFrame + added;
    added += beat.frames;
    return { ...beat, sourceFrame, start, end: start + beat.frames };
  });
  if (
    focuses.some(
      (value, index) =>
        index > 0 && value.sourceFrame < focuses[index - 1].sourceFrame,
    )
  )
    throw new Error("Focus beats must retain source order");
  return { focuses, frames: plan.frames + added, sourceFrames: plan.frames };
}

const ease = (value: number) => {
  const x = Math.max(0, Math.min(1, value));
  return x * x * (3 - 2 * x);
};

/** The replay clock remains constant for the whole approach, interaction and return. */
export function presentationAt(
  plan: ReturnType<typeof buildPresentation>,
  frame: number,
) {
  if (!Number.isInteger(frame) || frame < 0 || frame >= plan.frames)
    throw new Error("Presentation frame outside timeline");
  const focus = plan.focuses.find(
    (value) => frame >= value.start && frame < value.end,
  );
  const completed = plan.focuses.filter((value) => frame >= value.end);
  const age = focus ? frame - focus.start : 0;
  const approach = focus ? Math.min(1, age / 72) : 0;
  const retreat = focus ? Math.max(0, (age - (focus.frames - 78)) / 78) : 0;
  const canvas = Boolean(focus?.canvas);
  const expansion = canvas
    ? ease((age - 72) / 60) * (1 - ease((age - (focus!.frames - 120)) / 60))
    : 0;
  const observation = focus?.observations
    ?.filter((value) => age >= value.at)
    .at(-1);
  let selectedLabels: string[] = [];
  for (const value of focus?.observations ?? []) {
    if (
      value.select &&
      age >= value.at + 60 &&
      age < (focus!.selectionClearAt ?? focus!.frames - 168)
    )
      selectedLabels =
        value.select === "add"
          ? [...selectedLabels, value.label]
          : [value.label];
  }
  const chartZoom =
    focus?.chartZoom && age >= focus.chartZoom.at && age < focus.chartZoom.reset
      ? "selected"
      : "all";
  let canvasScroll = 0;
  for (const value of focus?.observations ?? []) {
    const progress = ease((age - value.at + 48) / 48);
    if (progress > 0)
      canvasScroll += ((value.scroll ?? 0) - canvasScroll) * progress;
  }
  return {
    sourceFrame:
      focus?.sourceFrame ??
      Math.min(
        plan.sourceFrames - 1,
        frame - completed.reduce((sum, value) => sum + value.frames, 0),
      ),
    focus,
    age,
    canvasExpansion: expansion,
    canvasMaximized: canvas && age >= 72 && age < focus!.frames - 60,
    observation,
    selectedLabels,
    chartZoom,
    controls: focus?.controls?.map((control) => controlAt(control, age)) ?? [],
    downloadPhase: downloadPhase(focus?.download, age),
    canvasScroll,
    zoom:
      focus && !canvas && focus.action !== "select-text"
        ? 1 +
          ((focus.maxZoom ?? 1.25) - 1) * ease(approach) * (1 - ease(retreat))
        : 1,
    actionProgress: focus ? ease((age - 90) / (focus.frames - 186)) : 0,
    completedActions: completed.map((value) => value.action),
  };
}
