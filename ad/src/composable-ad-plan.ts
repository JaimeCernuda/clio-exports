import copy from "../story/composable-ad.json";
import { wheelTiming } from "./wheel-timing.mjs";
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

/** Each successive change has a shorter duration along one smooth timing ramp. */
const wheelClock = wheelTiming(copy.wheel);
export const wheelDurations = wheelClock.durations;
export const wheelStops = wheelClock.stops;

/** C1 Hermite motion crosses the duration stops without jumping to a new speed. */
export function adWheel(frame: number) {
  if (frame <= wheelStops[0])
    return { position: 0, velocity: 0, blur: 0, duration: wheelDurations[0] };
  if (frame >= wheelStops.at(-1)!)
    return {
      position: copy.wheel.words.length - 1,
      velocity: 0,
      blur: 0,
      duration: wheelDurations.at(-1)!,
    };
  const i = wheelDurations.findIndex(
      (_, index) => frame <= wheelStops[index + 1],
    ),
    h = wheelDurations[i],
    u = (frame - wheelStops[i]) / h,
    m0 = i === 0 ? 0 : 2 / (wheelDurations[i - 1] + h),
    m1 = i === wheelDurations.length - 1 ? 0 : 2 / (h + wheelDurations[i + 1]),
    position =
      i +
      3 * u * u -
      2 * u * u * u +
      h * m0 * (u * u * u - 2 * u * u + u) +
      h * m1 * (u * u * u - u * u),
    velocity =
      124 *
      ((6 * u - 6 * u * u) / h +
        m0 * (3 * u * u - 4 * u + 1) +
        m1 * (3 * u * u - 2 * u)),
    duration =
      (wheelDurations[Math.max(0, i - 1)] + h) / 2 +
      ((h + wheelDurations[Math.min(wheelDurations.length - 1, i + 1)]) / 2 -
        (wheelDurations[Math.max(0, i - 1)] + h) / 2) *
        ease(u),
    cadence =
      (1 / duration - 1 / wheelDurations[0]) /
      (1 / wheelDurations.at(-1)! - 1 / wheelDurations[0]),
    exposure =
      copy.wheel.motionBlur.slowPixels +
      (copy.wheel.motionBlur.fastPixels - copy.wheel.motionBlur.slowPixels) *
        ease(cadence),
    motion = Math.min(1.5, (Math.abs(velocity) * duration) / 124),
    blur = Math.min(copy.wheel.motionBlur.maxPixels, exposure * motion);
  return { position, velocity, blur, duration };
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
  // Keep the reusable subtree below the vacant domain slot during explicit removal.
  let y: number =
    tree.y +
    (profile.id === "reports-only"
      ? tree.header + 22 + 4 * tree.rowHeight + tree.gap
      : 0);
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
      frame <= entry.at + 48,
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

/** Locate the actual existing row whose X triggers an explicit removal. */
export function adRemoval(frame: number) {
  const change = copy.changes.find(
    (entry) =>
      entry.action === "remove" &&
      frame >= entry.at - copy.removal.leadFrames &&
      frame <= entry.at + 30,
  );
  if (!change) return null;
  const target = adTreeLayout(profiles[change.from]).find(
    (pose) => pose.module.id === change.controlId,
  );
  if (!target) throw new Error("Missing removal target at " + change.at);
  return {
    ...target,
    change,
    clickAt: change.at - copy.removal.clickBefore,
    hover: phase(frame, change.at - 22, 8) * (1 - phase(frame, change.at, 10)),
  };
}

/** Add, applied and remove are separate states; X appears after the add cursor leaves. */
export function adPluginControl(frame: number, id: string) {
  const addition = adAddition(frame);
  if (addition?.module.id === id) {
    const r = frame - addition.change.at;
    if (r < 4)
      return {
        kind: "add" as const,
        opacity: 1 - phase(r, 0, 4),
        hover: addition.hover,
        adding: true,
      };
    if (r < 34)
      return {
        kind: "added" as const,
        opacity: phase(r, 4, 6) * (1 - phase(r, 30, 4)),
        hover: 0,
        adding: true,
      };
    return {
      kind: "remove" as const,
      opacity: phase(r, 34, 6),
      hover: 0,
      adding: true,
    };
  }
  const removal = adRemoval(frame);
  return {
    kind: "remove" as const,
    opacity: 1,
    hover: removal?.module.id === id ? removal.hover : 0,
    adding: false,
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
  const removal = adRemoval(frame);
  if (removal) {
    const r = frame - removal.change.at,
      approach = phase(r, -36, 24),
      depart = phase(r, 1, 18),
      targetX = removal.x + removal.width - 31,
      targetY = removal.y + tree.header / 2 - 2;
    return {
      x: targetX + 101 * (1 - approach) + 71 * depart,
      y: targetY + 148 * (1 - approach) + 103 * depart,
      opacity: phase(r, -36, 8) * (1 - phase(r, 10, 12)),
      press: Math.max(0, 1 - Math.abs(frame - removal.clickAt) / 5),
    };
  }
  const addition = adAddition(frame);
  if (addition) {
    const r = frame - addition.change.at,
      approach = phase(r, -36, 22),
      depart = phase(r, -5, 16),
      targetX = addition.x + addition.width - 31,
      targetY = addition.y + tree.header / 2 - 2;
    return {
      x: targetX + 101 * (1 - approach) + 71 * depart,
      y: targetY + 148 * (1 - approach) + 103 * depart,
      opacity: phase(r, -36, 8) * (1 - phase(r, 10, 10)),
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
      { f: copy.staging.plusAt + 18, x: 1790, y: 755 },
      { f: copy.staging.menuAt - 10, ...plus },
      { f: copy.staging.menuAt + 10, ...plus },
      { f: copy.staging.selectAt - 6, x: 1450, y: 694 },
      { f: copy.staging.selectAt + 8, x: 1450, y: 694 },
      { f: copy.staging.dockAt - 16, x: 1810, y: 900 },
    ],
    b = points.find((point) => frame <= point.f) ?? points.at(-1)!,
    i = points.indexOf(b),
    a = points[Math.max(0, i - 1)],
    p = a.f === b.f ? 1 : phase(frame, a.f, b.f - a.f);
  return {
    x: a.x + (b.x - a.x) * p,
    y: a.y + (b.y - a.y) * p,
    opacity:
      phase(frame, copy.staging.plusAt + 18, 16) *
      (1 - phase(frame, copy.staging.selectAt + 25, 20)),
    press: Math.max(
      0,
      1 - Math.abs(frame - (copy.staging.menuAt - 6)) / 5,
      1 - Math.abs(frame - (copy.staging.selectAt - 1)) / 5,
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
