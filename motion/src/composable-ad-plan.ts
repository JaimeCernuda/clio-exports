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
  role: string;
  color: string;
  lines: Array<{ id: string; text: string }>;
  pieces: string[];
  modules: AdModule[];
}
export interface OpeningGeometry {
  width: number;
  height: number;
  logo: { x: number; y: number; width: number; height: number };
  plus: { x: number; y: number; width: number; height: number };
}

/** Plugins own their instructions and every contributed capability family. */
export const profiles = Object.fromEntries(
  copy.stages.map((stage) => {
    const modules = stage.modules.map((id) => {
      const module = copy.modules.find((candidate) => candidate.id === id);
      if (!module) throw new Error(`Unknown plugin: ${id}`);
      return module;
    });
    const domain = modules.find((module) => module.role);
    return [
      stage.id,
      {
        id: stage.id,
        role: domain?.role ?? copy.baseLines[0].text,
        color: domain?.color ?? "#cee6f4",
        lines: [
          ...copy.baseLines.map((line) =>
            line.id === "role" && domain
              ? { ...line, text: domain.role }
              : line,
          ),
          ...modules.flatMap((module) => module.lines),
        ],
        pieces: modules.map((module) => module.name),
        modules,
      } satisfies AdProfile,
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

/** One vertical slot: readable first fields, acceleration, then a physical stop. */
export function adWheel(frame: number) {
  const positionAt = (f: number) => {
    if (f <= 30) return 0;
    if (f < 70) return phase(f, 30, 40);
    if (f < 90) return 1;
    if (f < 126) return 1 + phase(f, 90, 36);
    if (f < 132) return 2;
    if (f < 270) return 2 + 12 * ((f - 132) / 138) ** 2;
    if (f < copy.wheel.end) {
      const p = (f - 270) / (copy.wheel.end - 270),
        v = (24 / 138) * (copy.wheel.end - 270);
      return (
        (2 * p ** 3 - 3 * p ** 2 + 1) * 14 +
        (p ** 3 - 2 * p ** 2 + p) * v +
        (-2 * p ** 3 + 3 * p ** 2) * 18
      );
    }
    return copy.wheel.words.length - 1;
  };
  const position = positionAt(frame),
    velocity = (positionAt(frame + 0.5) - positionAt(frame - 0.5)) * 124;
  return { position, velocity, blur: Math.min(17, Math.abs(velocity) * 0.75) };
}

/** Retained plugins move first; arriving rows keep clearance from occupied slots. */
export function adPluginPoses(from: AdProfile, to: AdProfile, p: number) {
  const slots = (profile: AdProfile) =>
    Object.fromEntries(
      profile.pieces.map((name, i) => [
        name,
        960 - (profile.pieces.length * 330 - 20) / 2 + i * 330,
      ]),
    );
  const before = slots(from),
    after = slots(to),
    t = ease(p);
  return [...new Set([...from.pieces, ...to.pieces])].map((name) => {
    const a = before[name],
      b = after[name],
      kept = a !== undefined && b !== undefined;
    const module = [...to.modules, ...from.modules].find(
      (module) => module.name === name,
    )!;
    const enter = phase(p, 0.18, 0.27),
      exit = 1 - ease(p / 0.18);
    let x = kept
      ? a + (b - a) * t
      : b === undefined
        ? a - 70 * (1 - exit)
        : b + (to.pieces.indexOf(name) === 0 ? -220 : 220) * (1 - enter);
    if (a === undefined)
      for (const other of from.pieces.filter(
        (candidate) => after[candidate] !== undefined,
      )) {
        const occupied = before[other] + (after[other] - before[other]) * t;
        x =
          b < after[other]
            ? Math.min(x, occupied - 330)
            : Math.max(x, occupied + 330);
      }
    return {
      name,
      module,
      width: 310,
      x,
      opacity: kept ? 1 : b === undefined ? exit : enter,
      kept,
      added: a === undefined,
    };
  });
}

/** Contribution ownership is preserved when plugins are added, removed or reused. */
export function adContributions(profile: AdProfile) {
  return profile.modules.flatMap((module) =>
    (["skills", "mcpServers", "tools", "hooks"] as const).flatMap((family) =>
      module[family].map((name) => ({ owner: module.id, family, name })),
    ),
  );
}

/** Inserted text waits for the retained lower lines to open its space. */
export function adWords(
  a: PromptLayout,
  b: PromptLayout,
  p: number,
): Array<AnimatedWord & { clipBottom: number }> {
  const words = [
      ...morphWords(
        { ...a, words: a.words.filter((word) => word.block === "role") },
        { ...b, words: b.words.filter((word) => word.block === "role") },
        Math.min(1, p / 0.5),
      ),
      ...morphWords(
        { ...a, words: a.words.filter((word) => word.block !== "role") },
        { ...b, words: b.words.filter((word) => word.block !== "role") },
        p,
      ),
    ],
    endY = new Map(b.words.map((word) => [word.block, word.y])),
    startY = new Map(a.words.map((word) => [word.block, word.y]));
  const kept = words.filter((word) => word.motion === "keep");
  return words.map((word) => {
    let bottom = Infinity;
    if (word.motion === "insert")
      for (const following of kept)
        if (
          (endY.get(following.block) ?? -Infinity) >
          (endY.get(word.block) ?? Infinity) + 25
        )
          bottom = Math.min(bottom, following.y - 7);
    if (word.motion === "remove")
      for (const following of kept)
        if (
          (startY.get(following.block) ?? -Infinity) >
          (startY.get(word.block) ?? Infinity) + 25
        )
          bottom = Math.min(bottom, following.y - 7);
    return { ...word, clipBottom: Math.max(0, word.y + word.height - bottom) };
  });
}

/** A continuous pointer operates the plus and the real-style plugin picker. */
export function adPointer(frame: number, geometry?: OpeningGeometry | null) {
  const plus = geometry
    ? {
        x: 960 - geometry.width / 2 + geometry.plus.x + geometry.plus.width / 2,
        y: 540,
      }
    : { x: 1600, y: 540 };
  const points = [
    { f: 440, x: 1790, y: 755 },
    { f: 480, ...plus },
    { f: 500, ...plus },
    { f: 554, x: 1300, y: 694 },
    { f: 568, x: 1300, y: 694 },
    { f: 604, x: 1770, y: 900 },
  ];
  const b = points.find((point) => frame <= point.f) ?? points.at(-1)!;
  const i = points.indexOf(b),
    a = points[Math.max(0, i - 1)],
    p = a.f === b.f ? 1 : phase(frame, a.f, b.f - a.f);
  return {
    x: a.x + (b.x - a.x) * p,
    y: a.y + (b.y - a.y) * p,
    opacity: phase(frame, 440, 16) * (1 - phase(frame, 585, 20)),
    press: Math.max(
      0,
      1 - Math.abs(frame - 484) / 5,
      1 - Math.abs(frame - 559) / 5,
    ),
  };
}
