import copy from "../story/composable-ad.json";
import {
  ease,
  phase,
  morphWords,
  type PromptLayout,
  type AnimatedWord,
} from "./prompt-morph";

export { copy };
export type AdModule = (typeof copy.modules)[number];
export interface AdProfile {
  id: string;
  name: string;
  role: string;
  color: string;
  icon: string;
  lines: Array<{ id: string; text: string }>;
  pieces: string[];
  modules: AdModule[];
}
export const profiles = Object.fromEntries(
  copy.stages.map((stage) => {
    const modules = stage.modules.map((id) => {
      const module = copy.modules.find((candidate) => candidate.id === id);
      if (!module) throw new Error(`Unknown composition module: ${id}`);
      return module;
    });
    return [
      stage.id,
      {
        id: stage.id,
        name: "CLIO",
        role: "CLIO",
        color: modules.at(-1)?.color ?? "#cee6f4",
        icon: "agent",
        lines: [
          ...copy.baseLines,
          ...modules.flatMap((module) => module.lines),
        ],
        pieces: modules
          .filter((module) => module.kind === "plugin")
          .map((module) => module.name),
        modules,
      },
    ];
  }),
) as Record<string, AdProfile>;
export function adState(frame: number) {
  const change = [...copy.changes]
    .reverse()
    .find((change) => frame >= change.at);
  return change
    ? {
        from: profiles[change.from],
        to: profiles[change.to],
        p: Math.min(1, (frame - change.at) / change.duration),
        change,
      }
    : { from: profiles.base, to: profiles.base, p: 1, change: undefined };
}

/** Keep incoming plugin rows outside the space still occupied by existing rows. */
export function adPluginPoses(from: AdProfile, to: AdProfile, p: number) {
  const slots = (profile: AdProfile) => {
    let x = 1600;
    return Object.fromEntries(
      [...profile.pieces].reverse().map((name) => {
        const width =
          name === "Manufacturing" ? 310 : name === "Simulation" ? 220 : 180;
        x -= width;
        const slot = [name, { x, width }];
        x -= 14;
        return slot;
      }),
    ) as Record<string, { x: number; width: number }>;
  };
  const before = slots(from),
    after = slots(to),
    t = ease(p);
  const retainedRight = Math.max(
    -Infinity,
    ...from.pieces.map(
      (name) =>
        before[name].x +
        (after[name].x - before[name].x) * t +
        before[name].width,
    ),
  );
  return to.pieces.map((name) => {
    const previous = before[name],
      target = after[name],
      module = to.modules.find((module) => module.name === name)!;
    const enter = from.id === "base" || previous ? 1 : ease(p / 0.72);
    return {
      name,
      color: module.color,
      width: target.width,
      enter,
      x: previous
        ? previous.x + (target.x - previous.x) * t
        : Math.max(target.x + 280 * (1 - enter), retainedRight + 14),
    };
  });
}

/** Fixed-key typography: classic typing, hold and backspace, never scrambling. */
export function adHeadline(frame: number) {
  const pass =
    [...copy.intro].reverse().find((pass) => frame >= pass.at) ?? copy.intro[0];
  const length =
    frame < pass.typed
      ? Math.floor(
          (pass.word.length * (frame - pass.at)) / (pass.typed - pass.at),
        )
      : frame >= pass.erase
        ? Math.ceil(
            pass.word.length *
              (1 - (frame - pass.erase) / (pass.end - pass.erase)),
          )
        : pass.word.length;
  return {
    ...pass,
    text: pass.word.slice(0, Math.max(0, length)),
    typing: frame < pass.typed || frame >= pass.erase,
  };
}

/** A widening field of possibilities accelerates into a clean final word. */
export function adWheel(frame: number) {
  const p = Math.max(
    0,
    Math.min(1, (frame - copy.wheel.at) / (copy.wheel.end - copy.wheel.at)),
  );
  return {
    position: 13 * p ** 2.3,
    blur: 30 * p ** 3,
    opacity:
      phase(frame, copy.wheel.at, 16) *
      (1 - phase(frame, copy.wheel.end - 28, 28)),
  };
}

/** Keep inserted text inside the space already opened by following stable lines. */
export function adWords(
  a: PromptLayout,
  b: PromptLayout,
  p: number,
): Array<AnimatedWord & { clipBottom: number }> {
  const words = morphWords(a, b, p),
    endY = new Map(b.words.map((word) => [word.block, word.y]));
  const kept = words.filter((word) => word.motion === "keep");
  return words.map((word) => {
    let bottom = Infinity;
    if (word.motion === "insert")
      for (const following of kept)
        if (
          (endY.get(following.block) ?? -Infinity) >
          (endY.get(word.block) ?? Infinity) + 30
        )
          bottom = Math.min(bottom, following.y - 10);
    return { ...word, clipBottom: Math.max(0, word.y + word.height - bottom) };
  });
}

/** One deliberate cursor action. Composition changes afterwards are motion graphics. */
export function adPointer(frame: number) {
  const enter = phase(frame, 467, 16),
    travel = phase(frame, 472, 26),
    exit = phase(frame, 518, 24);
  return {
    x: 1680 + (1585 - 1680) * travel,
    y: 625 + (489 - 625) * travel,
    opacity: enter * (1 - exit),
    press: Math.max(0, 1 - Math.abs(frame - 506) / 6),
  };
}
export const adEase = ease;
