import type { PairedReplay, PairedSession } from "../paired-replay";
import { buildSpotterReconstruction } from "./spotter-scenario";

export const SPOTTER_FRAMES = 216 * 60;
export const SPOTTER_CUES = {
  firstAttention: 174,
  firstClose: 190,
  secondSelect: 191.2,
  secondAttention: 197,
  close: 210,
} as const;
export const SPOTTER_FPS = 60;
export type PocketName = "evidence" | "lineage" | "spotter";
export interface StepTiming {
  step: number;
  begin: number;
  submit: number;
  tools: Array<{ begin: number; result: number; compact: number }>;
  thinking: number;
  thoughtComplete: number;
  collapse: number;
  answer: number;
  complete: number;
}
const f = (seconds: number) => Math.round(seconds * SPOTTER_FPS);
export const STEP_TIMING: StepTiming[] = [
  {
    step: 1,
    begin: f(14),
    submit: f(18),
    tools: [
      { begin: f(19), result: f(20), compact: f(23) },
      { begin: f(23.5), result: f(24.5), compact: f(27.5) },
      { begin: f(28), result: f(29), compact: f(33) },
    ],
    thinking: f(33.5),
    thoughtComplete: f(44),
    collapse: f(47),
    answer: f(47.5),
    complete: f(49),
  },
  {
    step: 2,
    begin: f(55),
    submit: f(59),
    tools: [
      { begin: f(60), result: f(61), compact: f(64) },
      { begin: f(64.5), result: f(65.5), compact: f(68.5) },
      { begin: f(69), result: f(70), compact: f(73) },
    ],
    thinking: f(73.5),
    thoughtComplete: f(85),
    collapse: f(88),
    answer: f(88.5),
    complete: f(90),
  },
  {
    step: 3,
    begin: f(96),
    submit: f(100),
    tools: [
      { begin: f(101), result: f(102), compact: f(107) },
      { begin: f(107.5), result: f(108.5), compact: f(111.5) },
      { begin: f(112), result: f(113), compact: f(116) },
    ],
    thinking: f(116.5),
    thoughtComplete: f(130),
    collapse: f(133),
    answer: f(133.5),
    complete: f(143),
  },
];
export const SPOTTER_MARKERS = [
  [0, "SPOTTER-AI"],
  [7, "Enable SPOTTER"],
  [14, "Step 1 · Dose response"],
  [33.5, "Recorded reasoning"],
  [50, "Baseline lineage"],
  [55, "Step 2 · Transition"],
  [73.5, "Concurrent review"],
  [96, "Step 3 · Analogue"],
  [102, "Lookup result"],
  [116.5, "Recorded reasoning"],
  [144, "Later in the recorded review"],
  [159, "SPOTTER alert"],
  [167, "Select the answer"],
  [174, "Word attention"],
  [176, "Open the flagged source"],
  [180, "Compare the user's rule"],
  [184.5, "Inspect the earlier lookup"],
  [191.2, "Select 73"],
  [197, "Word attention for 73"],
  [203, "Trace the flagged graph node"],
  [210, "Close"],
] as const;

/** Smooth frame-only interpolation, shared by layout, cursor and disclosure. */
export function spotterProgress(
  frame: number,
  begin: number,
  end: number,
): number {
  const x = Math.max(
    0,
    Math.min(1, (frame - begin) / Math.max(1, end - begin)),
  );
  return x * x * (3 - 2 * x);
}
/** Open the source, inspect it, then return to the answer before closing attention. */
export function spotterInspectionAt(frame: number): {
  active: boolean;
  openness: number;
  scrollAmount: number;
} {
  const first = frame >= 174 * 60 && frame < 190 * 60,
    second = frame >= 197 * 60;
  const begin = (first ? 174 : 197) * 60;
  return {
    active: first || second,
    openness: spotterProgress(frame, begin, begin + 24),
    scrollAmount:
      spotterProgress(frame, begin, begin + 80) *
      (first ? 1 - spotterProgress(frame, 188 * 60, 190 * 60) : 1),
  };
}

const answerSource = '[data-answer="3"]';
const poisonSource = '[data-tool="reconstruction:step-3:tool-1"]';
const ruleSource = '[data-prompt-round="5"]';
const priorSource = '[data-tool="reconstruction:step-2:tool-1"]';
/** Navigate one frozen captured selection through its rule, earlier evidence and suspect result. */
export function spotterAttentionNavigationAt(frame: number): {
  from: string;
  to: string;
  progress: number;
  evidenceStep: number;
  expanded: Array<{ id: string; openness: number }>;
} {
  const second = frame >= f(191.2);
  const beats: Array<[number, string, number]> = second
    ? [
        [197, answerSource, 0],
        [203, poisonSource, 1],
      ]
    : [
        [174, answerSource, 0],
        [176, poisonSource, 1],
        [180, ruleSource, 1],
        [184.5, priorSource, 1],
        [188, answerSource, 1.2],
      ];
  const index = beats.reduce(
    (latest, [at], index) => (frame >= f(at) ? index : latest),
    0,
  );
  const [at, to, duration] = beats[index];
  const from = beats[Math.max(0, index - 1)][1];
  const active = spotterInspectionAt(frame).active;
  const expanded = active
    ? (second
        ? [[203, "reconstruction:step-3:tool-1"]]
        : [
            [176, "reconstruction:step-3:tool-1"],
            [184.5, "reconstruction:step-2:tool-1"],
          ]
      )
        .filter(([start]) => frame >= f(Number(start)))
        .map(([start, id]) => ({
          id: String(id),
          openness: spotterProgress(
            frame,
            f(Number(start)),
            f(Number(start) + 0.5),
          ),
        }))
    : [];
  return {
    from,
    to,
    progress: duration ? spotterProgress(frame, f(at), f(at + duration)) : 1,
    evidenceStep: frame >= f(184.5) && frame < f(203) ? 2 : 3,
    expanded,
  };
}
/** Linear text prefixes retain an even reading rate, independent of motion easing. */
export function spotterPrefix(
  text: string,
  frame: number,
  begin: number,
  end: number,
): string {
  const points = [...text];
  return points
    .slice(
      0,
      Math.floor(
        points.length *
          Math.max(0, Math.min(1, (frame - begin) / Math.max(1, end - begin))),
      ),
    )
    .join("");
}
/** Both transcripts advance on one source clock; omitted rounds are an explicit time cut. */
export function spotterSourceAt(pair: PairedReplay, frame: number): number {
  const main = pair.sessions.find((s) => s.role === "primary")!;
  const steps = buildSpotterReconstruction(pair).steps;
  const points: Array<[number, number]> = [[0, 0]];
  for (const t of STEP_TIMING) {
    const step = steps[t.step - 1];
    const prompt = main.blocks.find((b) => b.messageId === step.promptId)!;
    const answer = main.blocks.find(
      (b) =>
        b.messageId === step.answerId &&
        main.view.messages
          .find((m) => m.id === step.answerId)
          ?.blocks.some((x) => x.id === b.blockId && x.type === "text"),
    )!;
    const thought = main.blocks.find(
      (b) =>
        b.messageId === step.answerId &&
        main.view.messages
          .find((m) => m.id === step.answerId)
          ?.blocks.some((x) => x.id === b.blockId && x.type === "reasoning"),
    )!;
    points.push(
      [t.begin, prompt.start],
      [t.thinking, thought.start],
      [t.thoughtComplete, thought.end],
      [t.answer, answer.start],
      [t.complete, answer.end],
    );
  }
  points.push(
    [f(144), 412694.18],
    [f(146), 464866],
    [f(152), 508803.67],
    [f(154), 510232],
    [f(158), 554014],
    [f(159), 558644],
    [f(164), 567811],
    [SPOTTER_FRAMES, 567811],
  );
  for (let i = 1; i < points.length; i++) {
    const [b, sourceB] = points[i];
    const [a, sourceA] = points[i - 1];
    if (frame <= b)
      return sourceA + (sourceB - sourceA) * Math.max(0, (frame - a) / (b - a));
  }
  return points.at(-1)![1];
}
/** Choose the canvas by shot purpose while reviewer activity continues offscreen. */
export function spotterPocketAt(frame: number): PocketName {
  if (frame >= 12 * 60 && frame < 18 * 60) return "spotter";
  if (
    (frame >= f(50) && frame < f(64.5)) ||
    (frame >= f(90) && frame < f(114)) ||
    (frame >= f(183) && frame < f(184.5)) ||
    (frame >= f(201) && frame < f(203))
  )
    return "lineage";
  if (
    (frame >= f(144) && frame < f(165.5)) ||
    (frame >= f(74) && frame < f(88))
  )
    return "spotter";
  return "evidence";
}
export interface SourceExcerpt {
  text: string;
  blockId: string;
  start: number;
  end: number;
}
/** Select complete recorded reasoning passages, preserving exact source coordinates. */
export function mainThoughtExcerpt(
  session: PairedSession,
  answerId: string,
  step: number,
): SourceExcerpt {
  const block = session.view.messages
    .find((m) => m.id === answerId)
    ?.blocks.find((b) => b.type === "reasoning");
  if (!block?.text) throw new Error("Recorded thinking missing");
  const starts = [
    "So I should use",
    "Compute the loss",
    "But wait, the CURATION OVERRIDE",
  ];
  const ends = [
    "Therefore, the mean Fv/Fm_Lss peaks at dose 100 mg kg-1.",
    "So the biggest loss is MAGIC 75 with 0.231 loss.",
    "Thus report MATCHES.",
  ];
  const lo = block.text.indexOf(starts[step - 1]);
  const at = block.text.indexOf(ends[step - 1], lo);
  if (lo < 0 || at < 0)
    throw new Error(`Reasoning excerpt missing for step ${step}`);
  const hi = at + ends[step - 1].length;
  return {
    blockId: block.id,
    text: block.text.slice(lo, hi),
    start: [...block.text.slice(0, lo)].length,
    end: [...block.text.slice(0, hi)].length,
  };
}
/** Label selected source rounds without altering canonical recorded text or identities. */
export function displayedStepText(text: string): string {
  return text
    .replace(/round 1(?![\d–-])/giu, "Step 1")
    .replace(/round 2(?![\d–-])/giu, "Step 2")
    .replace(/round 5(?![\d–-])/giu, "Step 3");
}
