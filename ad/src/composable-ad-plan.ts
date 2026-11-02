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
  brand?: { x: number; y: number; width: number; height: number };
  prefix?: { x: number; y: number; width: number; height: number };
  slot?: { x: number; y: number; width: number; height: number };
  suffix?: { x: number; y: number; width: number; height: number };
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
  const blur = Math.min(
    copy.wheel.motionBlur.maxPixels,
    Math.max(0, Math.abs(velocity) - copy.wheel.motionBlur.threshold) *
      copy.wheel.motionBlur.exposure,
  );
  return { position, velocity, blur };
}

/** Change the sentence case in two phases so readable A/a glyphs never overlap. */
export function adOpeningCase(frame: number) {
  return {
    upper: 1 - phase(frame, copy.staging.brandAt + 14, 10),
    lower: phase(frame, copy.staging.brandAt + 24, 10),
  };
}

export const paper = { x: 140, y: 245, width: 1240, height: 620, scale: 0.82 };
export const tree = {
  x: 1270,
  y: 240,
  width: 500,
  header: 58,
  rowTop: 70,
  rowHeight: 38,
  gap: 26,
};

/** Each visible leaf retains its plugin owner and real contribution family. */
export function adContributions(profile: AdProfile) {
  return profile.modules.flatMap((module) => adModuleRows(module));
}

/** Flatten each plugin's capability arrays into attributed, readable tree leaves. */
export function adModuleRows(module: AdModule) {
  const labels = {
    skills: "Skills",
    mcpServers: "MCP servers",
    tools: "Tools",
    hooks: "Hooks",
  };
  return (["skills", "mcpServers", "tools", "hooks"] as const).flatMap(
    (family) =>
      module[family].map((name, index) => ({
        id: module.id + ":" + family + ":" + index,
        owner: module.id,
        family,
        label: labels[family],
        name,
      })),
  );
}

/** Persistent capability branches make room for an additive plugin below its owners. */
export function adTreeLayout(profile: AdProfile) {
  let y: number = tree.y;
  return profile.modules.map((module) => {
    const rows = adModuleRows(module),
      height = tree.header + 22 + rows.length * tree.rowHeight;
    const pose = { module, rows, x: tree.x, y, width: tree.width, height };
    y += height + tree.gap;
    return pose;
  });
}

/** Kept branches move as a unit; removed leaves clear before the replacement grows. */
export function adTreePoses(frame: number) {
  const { from, to, p, change } = adState(frame),
    before = adTreeLayout(from),
    after = adTreeLayout(to);
  return [
    ...new Set([...from.modules, ...to.modules].map((module) => module.id)),
  ]
    .map((id) => {
      const a = before.find((pose) => pose.module.id === id),
        b = after.find((pose) => pose.module.id === id),
        source = b ?? a!,
        kept = Boolean(a && b),
        added = !a,
        opacity = kept
          ? 1
          : !b
            ? 1 - phase(p, 0, 0.18)
            : change?.bundle
              ? 1
              : phase(p, 0.18, 0.27),
        open =
          kept || !b
            ? 1
            : change?.bundle
              ? phase(frame, change.at, 16)
              : phase(p, 0.22, 0.2);
      return {
        ...source,
        kept,
        added,
        opacity,
        open,
        edge: kept
          ? 1
          : !b
            ? opacity
            : change?.bundle
              ? phase(frame, change.at, 16)
              : opacity,
        y: kept ? a!.y + (b!.y - a!.y) * ease(p) : source.y,
        height: tree.header + (source.height - tree.header) * open,
        rows: source.rows.map((row, i) => ({
          ...row,
          opacity: kept
            ? 1
            : !b
              ? 1 - phase(p, 0, 0.14)
              : change?.bundle
                ? phase(frame, change.at + 16 + i * 8, 10)
                : phase(p, 0.4 + i * 0.08, 0.16),
        })),
      };
    })
    .sort((a, b) => a.y - b.y);
}

/** The paper has one fixed scale, position and size throughout composition. */
export function adPromptBounds() {
  return {
    x: paper.x,
    y: paper.y,
    width: paper.width * paper.scale,
    height: paper.height * paper.scale,
  };
}

/** A workflow addition is offered at its eventual tree position before the click. */
export function adAddition(frame: number) {
  const change = copy.changes.find(
    (entry) =>
      entry.bundle &&
      entry.from !== "base" &&
      frame >= entry.at - copy.addition.leadFrames &&
      frame <= entry.at + 36,
  );
  if (!change) return null;
  const target = adTreeLayout(profiles[change.to]).find(
    (pose) =>
      !profiles[change.from].modules.some(
        (module) => module.id === pose.module.id,
      ),
  );
  if (!target) throw Error("Missing offered plugin at " + change.at);
  return {
    ...target,
    height: tree.header,
    change,
    opacity: phase(
      frame,
      change.at - copy.addition.leadFrames,
      copy.addition.showFrames,
    ),
    hover: phase(frame, change.at - 20, 8),
    added: phase(frame, change.at, copy.addition.controlFrames),
    clickAt: change.at - copy.addition.clickBefore,
  };
}

/** Menu neighbors disappear before the selected source row changes its styling. */
export function adMenu(frame: number) {
  return {
    opacity:
      phase(frame, copy.staging.menuAt, 18) *
      (1 - phase(frame, copy.staging.selectAt, copy.selection.retireFrames)),
    hover: phase(frame, copy.selection.hoverAt, copy.selection.hoverFrames),
    sourceOpacity: frame < copy.staging.selectAt ? 1 : 0,
  };
}

/** The selected row follows a rounded, clear route into the capability tree. */
export function adSelection(frame: number) {
  const source = copy.selection.source,
    p = phase(
      frame,
      copy.staging.selectAt,
      copy.staging.dockAt - copy.staging.selectAt,
    ),
    radius = 20,
    leg = tree.x - radius - source.x,
    turn = (Math.PI * radius) / 2,
    rise = source.y - radius - tree.y,
    distance = p * (leg + turn + rise);
  let x: number, y: number;
  if (distance <= leg) {
    x = source.x + distance;
    y = source.y;
  } else if (distance <= leg + turn) {
    const angle = (distance - leg) / radius;
    x = tree.x - radius + radius * Math.sin(angle);
    y = source.y - radius + radius * Math.cos(angle);
  } else {
    x = tree.x;
    y = source.y - radius - (distance - leg - turn);
  }
  return {
    x,
    y,
    width: source.width + (tree.width - source.width) * p,
    height: tree.header,
    morph: phase(
      frame,
      copy.staging.selectAt + copy.selection.retireFrames,
      copy.selection.morphFrames,
    ),
  };
}

/** Color only changed fragments, with their owning plugin's tint, through the reading settle. */
export function adEditMarks(a: PromptLayout, b: PromptLayout, frame: number) {
  const state = adState(frame);
  if (!state.change) return [];
  const strength =
      1 - phase(frame, state.change.at + state.change.duration + 24, 24),
    groups = new Map<
      string,
      {
        x: number;
        y: number;
        width: number;
        height: number;
        color: string;
        opacity: number;
        removed: boolean;
      }
    >();
  for (const word of adWords(a, b, state.p)) {
    if (
      word.motion === "keep" ||
      word.opacity < 0.02 ||
      word.clipBottom >= word.height
    )
      continue;
    const removed = word.motion === "remove",
      profile = removed ? state.from : state.to,
      owner = profile.modules.find((module) =>
        word.block.startsWith(module.id + ":"),
      ),
      color = owner?.color ?? profile.color,
      opacity = removed ? word.opacity * 0.34 : strength * word.opacity * 0.7,
      key = word.motion + ":" + word.block + ":" + word.y.toFixed(2),
      existing = groups.get(key),
      right = word.x + word.width;
    if (opacity <= 0.001) continue;
    if (existing) {
      const left = Math.min(existing.x, word.x);
      existing.width = Math.max(existing.x + existing.width, right) - left;
      existing.x = left;
    } else
      groups.set(key, {
        x: word.x,
        y: word.y,
        width: word.width,
        height: word.height - word.clipBottom,
        color,
        opacity,
        removed,
      });
  }
  return [...groups.values()];
}

/** One continuous cursor approaches each actual add control, then clears the tree. */
export function adPointer(frame: number, geometry?: OpeningGeometry | null) {
  const addition = adAddition(frame);
  if (addition) {
    const r = frame - addition.change.at,
      approach = phase(r, -36, 22),
      depart = phase(r, 6, 22),
      targetX = addition.x + addition.width - 31,
      targetY = addition.y + tree.header / 2 - 2;
    return {
      x: targetX + 101 * (1 - approach) + 71 * depart,
      y: targetY + 148 * (1 - approach) + 103 * depart,
      opacity: phase(r, -36, 8) * (1 - phase(r, 16, 16)),
      press: Math.max(0, 1 - Math.abs(frame - addition.clickAt) / 5),
    };
  }
  const plus = geometry
      ? {
          x:
            960 -
            geometry.width / 2 +
            geometry.plus.x +
            geometry.plus.width / 2,
          y: 540,
        }
      : { x: 1600, y: 540 },
    points = [
      { f: 440, x: 1790, y: 755 },
      { f: 480, ...plus },
      { f: 500, ...plus },
      { f: 554, x: 1450, y: 694 },
      { f: 568, x: 1450, y: 694 },
      { f: 604, x: 1810, y: 900 },
    ],
    b = points.find((point) => frame <= point.f) ?? points.at(-1)!,
    i = points.indexOf(b),
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
