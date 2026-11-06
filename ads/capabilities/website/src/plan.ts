import { films, type FilmId } from "../../src/registry.ts";
import { clamp, phase } from "../../src/motion.ts";

export type Variant = "short" | "long";
export type Crop = { x: number; y: number; width: number; height: number };
export type WebsiteAsset = {
  id: FilmId;
  variant: Variant;
  key: string;
  title: string;
  description: string;
  sourceStart: number;
  sourceEnd: number;
  speed: number;
  crop: Crop;
  width: number;
  height: number;
  fps: number;
  frames: number;
  seconds: number;
};
type Choice = [number, number, number, Crop, string];
const frame = (x: number, y: number, width: number, height: number): Crop => ({
  x,
  y,
  width,
  height,
});
const plans: Record<FilmId, Record<Variant, Choice>> = {
  method: {
    short: [
      10.8,
      25.5,
      2,
      frame(150, 380, 1700, 510),
      "A result travels through the flow, fails review and returns through the relevant calculation.",
    ],
    long: [
      4.2,
      25.7,
      1.3,
      frame(100, 200, 1720, 710),
      "A procedure unfolds into executable work, followed by review and a revised beam result.",
    ],
  },
  hypothesis: {
    short: [
      13,
      26.8,
      1.85,
      frame(80, 210, 1760, 710),
      "A numerical discrepancy grows linked evidence and a revised scientific claim.",
    ],
    long: [
      4.2,
      27,
      1.35,
      frame(80, 210, 1760, 710),
      "The pendulum test, divergent curves and science-log graph preserve why a claim changes.",
    ],
  },
  team: {
    short: [
      17,
      32.4,
      1.9,
      frame(650, 250, 1190, 690),
      "Three specialist results join and trigger a conditional timing review.",
    ],
    long: [
      4,
      32.8,
      1.65,
      frame(30, 180, 1820, 750),
      "Nested preparation, concurrent specialists, a live inspector and evidence-dependent follow-up stay in one graph.",
    ],
  },
  interface: {
    short: [
      9.6,
      19,
      1.5,
      frame(100, 200, 1720, 720),
      "Baseline and month controls update the chart and linked table.",
    ],
    long: [
      4.2,
      23.8,
      1.35,
      frame(100, 200, 1720, 720),
      "A snowfall result becomes an interactive chart, linked comparison and exported view.",
    ],
  },
  provenance: {
    short: [
      5,
      23.3,
      2.15,
      frame(150, 200, 1620, 700),
      "Follow the mapped-area result through measurement and geometry to its source, then return.",
    ],
    long: [
      4.5,
      24,
      1.3,
      frame(150, 200, 1620, 700),
      "Inspect a mapped lake-boundary result, its calculation and original dataset without losing the result's identity.",
    ],
  },
  tools: {
    short: [
      11,
      24,
      1.8,
      frame(90, 220, 1720, 640),
      "A program reads scientific sources and produces a source-linked quality summary.",
    ],
    long: [
      4.2,
      25,
      1.35,
      frame(90, 220, 1720, 640),
      "Data sources and scientific tools assemble around one program and its sparse-matrix result.",
    ],
  },
  selection: {
    short: [
      5,
      14,
      1.35,
      frame(125, 220, 1700, 650),
      "Select hurricane observations and carry those same records into a question's reference.",
    ],
    long: [
      4.6,
      27.3,
      1.45,
      frame(125, 220, 1700, 700),
      "Select observations, reference them, ask a question, read the records and compute the answer.",
    ],
  },
  streams: {
    short: [
      15.8,
      22.6,
      1.05,
      frame(90, 175, 1740, 775),
      "Ask the current observations a question while the background stream and dashboard keep running.",
    ],
    long: [
      6.8,
      34,
      1.45,
      frame(90, 175, 1740, 775),
      "Burn observations feed live context, an agent query and a wind-driven model in the same investigation.",
    ],
  },
};

export const assets: WebsiteAsset[] = films.flatMap((f) =>
  (["short", "long"] as Variant[]).map((variant) => {
    const [sourceStart, sourceEnd, speed, crop, description] =
      plans[f.id][variant];
    const width = 1280,
      height = 2 * Math.round(((crop.height / crop.width) * width) / 2),
      fps = 30;
    const frames = Math.ceil(((sourceEnd - sourceStart) / speed + 1.15) * fps);
    return {
      id: f.id,
      variant,
      key: `${f.id}-${variant}`,
      title: f.title,
      description,
      sourceStart,
      sourceEnd,
      speed,
      crop,
      width,
      height,
      fps,
      frames,
      seconds: frames / fps,
    };
  }),
);

/** Map website time to a forward-only source interval with a readable final hold. */
export function sourceTime(asset: WebsiteAsset, t: number): number {
  return Math.min(
    asset.sourceEnd,
    asset.sourceStart +
      clamp((t - 0.35) * asset.speed, 0, asset.sourceEnd - asset.sourceStart),
  );
}

/** Mask the reset at the loop join, rather than reversing scientific execution. */
export function loopOpacity(asset: WebsiteAsset, t: number): number {
  return (
    phase(t, 0, 0.35) *
    (1 - phase(t, asset.seconds - 0.35, 0.35 - 1 / asset.fps))
  );
}

export function getAsset(key: string): WebsiteAsset {
  const asset = assets.find((a) => a.key === key);
  if (!asset) throw new Error(`Unknown website asset: ${key}`);
  return asset;
}
