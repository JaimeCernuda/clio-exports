import {
  smooth,
  type PointerKey,
  engineeringPointer,
} from "./engineering-plan";
import {
  buildReplayPlan,
  type ReplayEdits,
  type ReplayMessage,
} from "./replay-plan";
import filmCopy from "../story/engineering-film-copy.json";

export const ENGINEERING_SECONDS = 356;
export const ENGINEERING_FILM_FRAMES = ENGINEERING_SECONDS * 60;
export const engineeringRamp = (t: number, begin: number, end: number) =>
  smooth((t - begin) / (end - begin));

export const engineeringSourceFrames = (run: "e4" | "e5") =>
  run === "e4" ? 6570 : 3720;

/** Convert the source clock back to film time, excluding the editorial time cut. */
export function engineeringSourceToGlobal(source: number, run: "e4" | "e5") {
  if (run === "e5") return 11700 + source;
  return source < 2310 ? source : source < 5130 ? source + 150 : source + 4110;
}

/** A brief editorial time cut, separate from the array watcher's 944 ms launch call. */
export function engineeringTimeBridge(seconds: number) {
  return (
    engineeringRamp(seconds, 38.2, 38.6) *
    (1 - engineeringRamp(seconds, 40.4, 41))
  );
}

/** One source clock per genuine session; all inspections hold that clock. */
export function engineeringFilmPose(frame: number) {
  const t = frame / 60;
  const run: "e4" | "e5" = t < 195 ? "e4" : "e5";
  const sourceSeconds =
    run === "e4"
      ? t < 38.5
        ? t
        : t < 41
          ? 38.5 - 1 / 60
          : t < 88
            ? t - 2.5
            : t < 154
              ? 85.5 - 1 / 60
              : t < 178
                ? t - 68.5
                : 109.5 - 1 / 60
      : Math.min(62 - 1 / 60, Math.max(0, t - 195));
  const dashboard = run === "e4" ? t >= 86 : t >= 257;
  const expansion =
    run === "e4"
      ? engineeringRamp(t, 89, 90.1) * (1 - engineeringRamp(t, 151, 152.1)) +
        engineeringRamp(t, 179, 180.1)
      : engineeringRamp(t, 259, 260.1);
  const phase =
    t < 88
      ? "conversation"
      : t < 130
        ? "matrix"
        : t < 154
          ? "case"
          : t < 178
            ? "comparison-work"
            : t < 195
              ? "comparison"
              : t < 257
                ? "studio-work"
                : t < 278
                  ? "setup"
                  : t < 309
                    ? "history"
                    : t < 336
                      ? "fields"
                      : t < 344
                        ? "saved"
                        : "close";
  const threshold =
    run === "e4"
      ? 0.5 -
        0.15 * engineeringRamp(t, 101, 103) +
        0.15 * engineeringRamp(t, 108, 109.4)
      : t < 280
        ? 0.5
        : 0.5 -
          0.4 * engineeringRamp(t, 280, 281.4) +
          0.4 * engineeringRamp(t, 302, 303.4);
  const orbit =
    run === "e4"
      ? 0.42 * engineeringRamp(t, 94, 96.5) -
        0.17 * engineeringRamp(t, 183, 186)
      : 0.36 * engineeringRamp(t, 305, 307) -
        0.22 * engineeringRamp(t, 321, 323.3) +
        0.2 * engineeringRamp(t, 348, 350);
  return {
    t,
    run,
    phase,
    dashboard,
    pane: engineeringRamp(t, run === "e4" ? 86 : 257, run === "e4" ? 87 : 258),
    expansion: Math.min(1, expansion),
    sourceFrame: Math.floor(sourceSeconds * 60),
    sourceFrames: engineeringSourceFrames(run),
    report:
      phase === "comparison"
        ? "comparison"
        : phase === "fields"
          ? "fields"
          : run === "e4"
            ? "sweep"
            : "studio",
    threshold: Math.round(threshold * 100) / 100,
    orbit,
    selection: t < 136 || (t >= 144 && t < 148) ? 9 : 4,
    tab:
      phase === "saved"
        ? "tSaved"
        : ["history", "fields", "close"].includes(phase)
          ? "tRes"
          : t < 265
            ? "tMesh"
            : "tSetup",
    iteration: t < 282 ? 10 : Math.min(10, Math.floor((t - 282) / 1.65)),
    scroll:
      t < 115
        ? 0
        : t < 129
          ? engineeringRamp(t, 115, 117) * 0.48
          : engineeringRamp(t, 129, 130.5),
    caption:
      phase === "matrix"
        ? "Twelve completed cases"
        : phase === "case"
          ? "A design linked to its files"
          : phase === "comparison"
            ? "The same case, before and after smoothing"
            : phase === "setup"
              ? "Inspect the recorded trial settings"
              : phase === "history"
                ? "T001 · saved iterations 0–10"
                : phase === "fields"
                  ? "T009 · unitless solver field"
                  : phase === "saved"
                    ? "T001 saved · T009 discarded"
                    : "",
  };
}

/** Allocate readable time to real blocks; preserve the exact native source order. */
export function engineeringReplayEdits(
  messages: readonly ReplayMessage[],
  run: "e4" | "e5",
): ReplayEdits {
  const all = messages.flatMap((m) =>
    m.blocks.map((b) => ({ ...b, role: m.role })),
  );
  const boundary = all.findIndex((b) => b.id === "part_5fe40ff0460b");
  const groups =
    run === "e4" ? [all.slice(0, boundary), all.slice(boundary)] : [all];
  const weights: Record<string, number> = {};
  groups.forEach((blocks, index) => {
    const seconds = run === "e4" ? (index === 0 ? 85.5 : 24) : 62;
    const raw = blocks.map(
      (b) =>
        (filmCopy[run].blocks as Record<string, { seconds: number }>)[b.id]
          ?.seconds ??
        (b.type === "tool"
          ? 2
          : Math.max(
              1.6,
              (b.text?.length ?? 0) / (b.role === "user" ? 65 : 55) + 0.65,
            )),
    );
    const total = raw.reduce((a, b) => a + b, 0);
    blocks.forEach((b, i) => {
      weights[b.id] = (raw[i] / total) * seconds;
    });
  });
  // Validate the authored range using the same planner as the native renderer.
  buildReplayPlan(messages, engineeringSourceFrames(run), 20, {
    weightsByBlockId: weights,
  });
  return {
    weightsByBlockId: weights,
    reasoningIds: [],
    includeInjections: false,
  };
}

/** Keep a visible, continuous pointer across both chapter contexts. */
export function engineeringFilmPointer(
  keys: readonly PointerKey[],
  frame: number,
) {
  return engineeringPointer(keys, frame / 60);
}

/** Inspect native field values, then the recorded convergence endpoints. */
export function engineeringFieldHover(
  frame: number,
): "mesh" | "chart" | undefined {
  const t = frame / 60;
  if (t >= 311.9 && t <= 319.2) return "mesh";
  if (t >= 326.2 && t <= 332.8) return "chart";
  return undefined;
}
