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
  return { position, velocity, blur: Math.min(17, Math.abs(velocity) * 0.75) };
}

/** Change the sentence case in two phases so readable A/a glyphs never overlap. */
export function adOpeningCase(frame: number) {
  return {
    upper: 1 - phase(frame, copy.staging.brandAt + 14, 10),
    lower: phase(frame, copy.staging.brandAt + 24, 10),
  };
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

/** Extract below the prompt, round its corner, then rise beside it. */
export function adSelection(frame: number) {
  const cue = copy.staging,
    source = copy.selection.source,
    progress = phase(frame, cue.selectAt, cue.dockAt - cue.selectAt),
    firstLeg = 1280 - source.x,
    lastLeg = source.y - 20 - 300,
    distance = progress * (firstLeg + 10 * Math.PI + lastLeg),
    morph = phase(
      frame,
      cue.selectAt + copy.selection.retireFrames,
      copy.selection.morphFrames,
    );
  let x: number, y: number;
  if (distance <= firstLeg) {
    x = source.x + distance;
    y = source.y;
  } else if (distance <= firstLeg + 10 * Math.PI) {
    const angle = (distance - firstLeg) / 20;
    x = 1280 + 20 * Math.sin(angle);
    y = source.y - 20 + 20 * Math.cos(angle);
  } else {
    x = 1300;
    y = source.y - 20 - (distance - firstLeg - 10 * Math.PI);
  }
  return {
    x,
    y,
    width: source.width + (470 - source.width) * progress,
    height: source.height + (76 - source.height) * morph,
    morph,
    focus: phase(frame, cue.selectAt, 16),
  };
}

/** The filmed cursor highlights its choice; neighbors retire before the row grows. */
export function adMenu(frame: number) {
  return {
    opacity:
      phase(frame, copy.staging.menuAt, 18) *
      (1 - phase(frame, copy.staging.selectAt, copy.selection.retireFrames)),
    hover: phase(frame, copy.selection.hoverAt, copy.selection.hoverFrames),
    sourceOpacity: frame < copy.staging.selectAt ? 1 : 0,
  };
}

interface RoutePoint {
  x: number;
  y: number;
  length: number;
}
const inspectionRoutes = new Map<number, RoutePoint[]>();

/** Row count and reading time determine when a bundle can close and travel. */
export function adInspectionTiming(at: number) {
  const change = copy.changes.find((change) => change.at === at);
  if (!change?.bundle) throw new Error(`No bundle inspection at frame ${at}`);
  const module = profiles[change.to].modules.find(
    (module) => !profiles[change.from].pieces.includes(module.name),
  );
  if (!module) throw new Error(`No new plugin at frame ${at}`);
  const rows =
    1 +
    module.skills.length +
    module.mcpServers.length +
    module.tools.length +
    module.hooks.length;
  const cue = copy.inspection,
    allRowsAt =
      cue.contentsAt + (rows - 1) * cue.rowStaggerFrames + cue.contentsFrames,
    fadeAt = allRowsAt + change.readFrames,
    collapseAt = fadeAt + cue.fadeFrames,
    transferAt = collapseAt + cue.collapseFrames,
    settleAt = transferAt + cue.transferFrames,
    end = settleAt + cue.settleFrames;
  return { rows, allRowsAt, fadeAt, collapseAt, transferAt, settleAt, end };
}

/** Contributions appear in their plugin in order, with a readable complete hold. */
export function adContributionOpacity(frame: number, at: number, row: number) {
  const cue = copy.inspection,
    elapsed = frame - at,
    timing = adInspectionTiming(at);
  if (!Number.isInteger(row) || row < 0 || row >= timing.rows)
    throw new Error(`Invalid contribution row ${row}`);
  return (
    phase(
      elapsed,
      cue.contentsAt + row * cue.rowStaggerFrames,
      cue.contentsFrames,
    ) *
    (1 - phase(elapsed, timing.fadeAt, cue.fadeFrames))
  );
}

/** Constant-distance sampling of a rounded route outside prompt and occupied slots. */
export function adInspectionRoute(targetX: number, progress: number) {
  let points = inspectionRoutes.get(targetX);
  if (!points) {
    const coordinates: Array<{ x: number; y: number }> = [
      { x: 1300, y: 300 },
      { x: 1300, y: 680 },
    ];
    const corner = (
      start: { x: number; y: number },
      control: { x: number; y: number },
      end: { x: number; y: number },
    ) => {
      for (let i = 1; i <= 24; i++) {
        const t = i / 24;
        coordinates.push({
          x:
            (1 - t) ** 2 * start.x +
            2 * (1 - t) * t * control.x +
            t * t * end.x,
          y:
            (1 - t) ** 2 * start.y +
            2 * (1 - t) * t * control.y +
            t * t * end.y,
        });
      }
    };
    corner({ x: 1300, y: 680 }, { x: 1300, y: 715 }, { x: 1265, y: 715 });
    coordinates.push({ x: targetX + 35, y: 715 });
    corner(
      { x: targetX + 35, y: 715 },
      { x: targetX, y: 715 },
      { x: targetX, y: 750 },
    );
    coordinates.push({ x: targetX, y: 820 });
    let length = 0;
    points = coordinates.map((point, i) => {
      if (i)
        length += Math.hypot(
          point.x - coordinates[i - 1].x,
          point.y - coordinates[i - 1].y,
        );
      return { ...point, length };
    });
    inspectionRoutes.set(targetX, points);
  }
  const distance = points.at(-1)!.length * Math.max(0, Math.min(1, progress));
  const i = Math.max(
    1,
    points.findIndex((point) => point.length >= distance),
  );
  const a = points[i - 1],
    b = points[i],
    p = (distance - a.length) / (b.length - a.length);
  return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
}

/** Inspection, collapse, transfer and refocus are separate from prompt-edit timing. */
export function adInspection(
  frame: number,
  at: number,
  targetX: number,
  handedOff = false,
) {
  const cue = copy.inspection,
    elapsed = frame - at,
    timing = adInspectionTiming(at);
  const arrival = handedOff ? 1 : phase(elapsed, 4, 12);
  const collapse = phase(elapsed, timing.collapseAt, cue.collapseFrames);
  const expand = phase(elapsed, 0, cue.expandFrames) * (1 - collapse);
  const travel = phase(elapsed, timing.transferAt, cue.transferFrames);
  const route = adInspectionRoute(targetX, travel);
  const release = phase(elapsed, timing.settleAt, cue.settleFrames);
  return {
    x: route.x + 280 * (1 - arrival),
    y: route.y,
    width: 470 - 160 * collapse,
    expand,
    bodyOpacity:
      phase(elapsed, cue.contentsAt, cue.contentsFrames) *
      (1 - phase(elapsed, timing.fadeAt, cue.fadeFrames)),
    opacity: arrival,
    focus:
      (handedOff ? adSelection(frame).focus : phase(elapsed, 0, 16)) *
      (1 - release),
    travel,
  };
}

/** The visible prompt bounds, including its cinematic scale and slight rotation. */
export function adPromptBounds(height: number, focus: number) {
  const scale = 1 - 0.2 * focus,
    angle = (1.3 * focus * Math.PI) / 180;
  const cx = 960 - 180 * focus,
    cy = 465;
  const halfWidth =
    scale * (620 * Math.cos(angle) + (height / 2) * Math.sin(angle));
  const halfHeight =
    scale * ((height / 2) * Math.cos(angle) + 620 * Math.sin(angle));
  return {
    x: cx - halfWidth,
    y: cy - halfHeight,
    width: halfWidth * 2,
    height: halfHeight * 2,
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
