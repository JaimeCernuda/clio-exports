import type { StudyChoices } from "./study-types";
import type { StudyReplay } from "./study-replay-model";
import {
  paceStudyShots,
  studySourceAt,
  type StudyClockPoint,
} from "./study-pacing";

export type StudyShot = {
  begin: number;
  end: number;
  run: "run60" | "run30";
  from: number;
  to: number;
  session: string;
  tab: "flow" | "science-log" | "board";
  label: string;
  choices?: StudyChoices;
  maximized?: boolean;
  target?: string;
  call?: string;
  game?: string;
  seed?: string;
  scroll?: number;
  card?: "intro" | "second" | "close";
  originalBegin?: number;
  clock?: StudyClockPoint[];
};
const ROOT = "sess_e483d2ea61ab",
  ENGLISH = "sess_8a41e2029f6686fa83a6822755a2f977",
  WORKER = "sess_ba3f18b300c2eb46b8ba92aff356c2f0";
const OBS = "e_eabe97d01f4b";
const duration = 510;
export const STUDY_DURATION_SECONDS = duration;
export const STUDY_PROOF_SECONDS = 96;

/** A monotonic source clock per run. Inspection shots freeze all study projections. */
const cachedShots = new WeakMap<
  StudyReplay,
  WeakMap<StudyReplay, StudyShot[]>
>();
const cachedProof = new WeakMap<
  StudyReplay,
  WeakMap<StudyReplay, StudyShot[]>
>();
export function buildStudyShots(a: StudyReplay, b: StudyReplay): StudyShot[] {
  const cached = cachedShots.get(a)?.get(b);
  if (cached) return cached;
  const merge = a.study.branches.find(
    (x: { workflow_step: string }) => x.workflow_step === "merge",
  ).session_id as string;
  const check = a.study.branches.find(
    (x: { workflow_step: string }) => x.workflow_step === "check",
  ).session_id as string;
  const root30 = b.rootSessionId;
  const shot = (
    begin: number,
    end: number,
    from: number,
    to: number,
    session: string,
    tab: StudyShot["tab"],
    label: string,
    extra: Partial<StudyShot> = {},
  ): StudyShot => ({
    begin,
    end,
    from,
    to,
    session,
    tab,
    label,
    run: "run60",
    ...extra,
  });
  const shots: StudyShot[] = [
    shot(
      0,
      7,
      0,
      0,
      ROOT,
      "science-log",
      "One question. Parallel experiments. Traceable evidence.",
      { card: "intro" },
    ),
    shot(7, 25, 0, 39000, ROOT, "science-log", "Define the question"),
    shot(
      25,
      36,
      39000,
      52000,
      ROOT,
      "science-log",
      "Record testable hypotheses",
      { choices: { branch: ROOT, graphScope: "all" } },
    ),
    shot(
      36,
      39,
      52000,
      56000,
      ROOT,
      "science-log",
      "Inspect a testable prediction",
      { maximized: true, target: "button:Maximize canvas" },
    ),
    shot(
      39,
      49,
      56000,
      74000,
      ROOT,
      "science-log",
      "Inspect a testable prediction",
      {
        maximized: true,
        choices: { entry: "e_d501905012d0", graphScope: "linked" },
        target: "graph-node:e_d501905012d0",
      },
    ),
    shot(
      49,
      65,
      74000,
      80000,
      ROOT,
      "science-log",
      "Three strategies, the same seeds",
      {
        choices: { mode: "graph", graphScope: "all" },
        maximized: true,
        target: "button:Entire study",
      },
    ),
    shot(65, 82, 80000, 90000, ROOT, "flow", "Launch the workflow", {
      target: "tab:Flow run",
    }),
    shot(
      82,
      105,
      90000,
      107000,
      ROOT,
      "flow",
      "Parallel branches; merge and review wait",
      {
        maximized: true,
        choices: { flowSelection: "english" },
        target: "flow:english",
      },
    ),
    shot(105, 124, 107000, 131000, ENGLISH, "flow", "Open a running branch", {
      choices: { flowSelection: "english" },
      target: "button:Open",
    }),
    shot(
      124,
      145,
      131000,
      166000,
      ENGLISH,
      "science-log",
      "Delegate seeded batches",
      { choices: { branch: ENGLISH, mode: "list" }, target: "tab:Science log" },
    ),
    shot(
      145,
      166,
      166000,
      208000,
      WORKER,
      "board",
      "Watch the agent choose a guess",
      { target: "task:terva seeds 16-20", game: "g36-s16" },
    ),
    shot(
      166,
      180,
      208000,
      250000,
      WORKER,
      "board",
      "Feedback arrives from the tool",
      { game: "g36-s16" },
    ),
    shot(
      180,
      188,
      250000,
      250000,
      WORKER,
      "board",
      "Inspect the returned letters",
      { maximized: true, game: "g36-s16", target: "chart:board" },
    ),
    shot(188, 200, 250000, 430000, WORKER, "board", "Continue the batch", {
      game: "g36-s16",
    }),
    shot(
      200,
      219,
      430000,
      549000,
      WORKER,
      "science-log",
      "The agent records observations",
      { choices: { branch: WORKER, entry: OBS } },
    ),
    shot(
      219,
      229,
      549000,
      549000,
      WORKER,
      "science-log",
      "An observation cites the game and every guess",
      {
        maximized: true,
        choices: { branch: WORKER, entry: OBS },
        target: "sources:" + OBS,
        scroll: 1,
      },
    ),
    shot(
      229,
      240,
      549000,
      549000,
      WORKER,
      "science-log",
      "Open the source call",
      {
        choices: { branch: WORKER, entry: OBS },
        call: "call_cad39cfb92fe",
        target: "source:call_cad39cfb92fe",
        scroll: 1,
      },
    ),
    shot(
      240,
      245,
      549000,
      570500,
      WORKER,
      "flow",
      "Return to the advancing workflow",
      { target: "tab:Flow run" },
    ),
    shot(
      245,
      260,
      570500,
      635000,
      ROOT,
      "flow",
      "Return to the study conversation",
      { target: "nav:Study" },
    ),
    shot(
      260,
      280,
      635000,
      700000,
      ROOT,
      "science-log",
      "Follow observations across the branches",
      { target: "tab:Science log", choices: { graphScope: "all" } },
    ),
    shot(
      280,
      300,
      700000,
      800000,
      ROOT,
      "science-log",
      "The study graph fills with observations",
      {
        maximized: true,
        choices: { branch: ROOT, mode: "graph", graphScope: "all" },
        target: "button:Maximize canvas",
      },
    ),
    shot(
      300,
      310,
      800000,
      800000,
      ROOT,
      "science-log",
      "Follow the experiment links",
      {
        maximized: true,
        choices: {
          mode: "graph",
          entry: "e_c116796b11b2",
          graphScope: "linked",
        },
        target: "graph-node:e_c116796b11b2",
      },
    ),
    shot(
      310,
      320,
      800000,
      845000,
      ROOT,
      "science-log",
      "Return to the growing study",
      {
        maximized: true,
        choices: { mode: "graph", graphScope: "all" },
        target: "button:Entire study",
      },
    ),
    shot(320, 326, 845000, 873500, ROOT, "flow", "The merge step starts", {
      choices: { flowSelection: "merge" },
      target: "tab:Flow run",
    }),
    shot(326, 340, 873500, 940000, merge, "flow", "Open the merge agent", {
      choices: { flowSelection: "merge" },
      target: "button:Open merge",
    }),
    shot(
      340,
      344,
      940000,
      946000,
      merge,
      "science-log",
      "Evidence changes the hypothesis status",
      { choices: { branch: merge }, target: "tab:Science log" },
    ),
    shot(
      344,
      347,
      946000,
      951000,
      merge,
      "science-log",
      "Inspect the evidence",
      {
        maximized: true,
        target: "button:Maximize canvas",
      },
    ),
    shot(
      347,
      360,
      951000,
      1006000,
      merge,
      "science-log",
      "Evidence changes the hypothesis status",
      {
        maximized: true,
        choices: { entry: "e_d501905012d0", graphScope: "linked" },
        target: "graph-node:e_d501905012d0",
      },
    ),
    shot(
      360,
      366,
      1006000,
      1021333,
      merge,
      "flow",
      "The independent review starts",
      { choices: { flowSelection: "check" }, target: "tab:Flow run" },
    ),
    shot(366, 378, 1021333, 1052000, check, "flow", "Open the review agent", {
      choices: { flowSelection: "check" },
      target: "button:Open check",
    }),
    shot(
      378,
      381,
      1052000,
      1060000,
      check,
      "science-log",
      "Keep the conflicts and uncertainty",
      {
        choices: { mode: "graph" },
        target: "tab:Science log",
      },
    ),
    shot(
      381,
      384,
      1060000,
      1070000,
      check,
      "science-log",
      "Inspect the review record",
      {
        maximized: true,
        target: "button:Maximize canvas",
      },
    ),
    shot(
      384,
      394,
      1070000,
      a.durationMs,
      check,
      "science-log",
      "Keep the conflicts and uncertainty",
      {
        maximized: true,
        choices: { entry: "e_4c3a5ad4439b", graphScope: "linked" },
        target: "graph-node:e_4c3a5ad4439b",
      },
    ),
    shot(
      394,
      405,
      a.durationMs,
      a.durationMs,
      ROOT,
      "science-log",
      "A conclusion backed by a study",
      {
        choices: { branch: merge, entry: "e_0efad464f535" },
        maximized: true,
        target: "graph-node:e_0efad464f535",
      },
    ),
    shot(
      405,
      412,
      0,
      0,
      root30,
      "science-log",
      "A second study adds explorable views",
      { run: "run30", card: "second" },
    ),
    shot(
      412,
      425,
      b.durationMs,
      b.durationMs,
      root30,
      "flow",
      "10 shared seeds · three strategies",
      { run: "run30", choices: { flowSelection: "review" } },
    ),
    shot(
      425,
      431,
      b.durationMs,
      b.durationMs,
      root30,
      "science-log",
      "Open the study record",
      { run: "run30", choices: { mode: "graph" }, target: "tab:Science log" },
    ),
    shot(
      431,
      442,
      b.durationMs,
      b.durationMs,
      root30,
      "science-log",
      "Open the study’s attached views",
      {
        run: "run30",
        choices: { mode: "views", viewEntry: "e_28b3cb045168" },
        target: "button:Views",
      },
    ),
    shot(
      442,
      465,
      b.durationMs,
      b.durationMs,
      root30,
      "science-log",
      "Compare guesses, failures and paired results",
      {
        run: "run30",
        choices: { mode: "views", viewEntry: "e_28b3cb045168" },
        maximized: true,
        target: "chart:comparison",
      },
    ),
    shot(
      465,
      480,
      b.durationMs,
      b.durationMs,
      root30,
      "science-log",
      "Inspect the actual guesses",
      {
        run: "run30",
        choices: { mode: "views", viewEntry: "e_9cdb51455051" },
        maximized: true,
        seed: "5",
        target: "view:Game boards by seed",
      },
    ),
    shot(
      480,
      496,
      b.durationMs,
      b.durationMs,
      root30,
      "science-log",
      "Change the seed; every board updates",
      {
        run: "run30",
        choices: { mode: "views", viewEntry: "e_9cdb51455051" },
        maximized: true,
        seed: "10",
        target: "seed:10",
      },
    ),
    shot(
      496,
      508,
      b.durationMs,
      b.durationMs,
      root30,
      "science-log",
      "Compare the strategies on the same game",
      {
        run: "run30",
        choices: { mode: "views", viewEntry: "e_9cdb51455051" },
        maximized: true,
        seed: "10",
        target: "chart:games",
      },
    ),
    shot(
      508,
      520,
      b.durationMs,
      b.durationMs,
      root30,
      "science-log",
      "Return to seed 5",
      {
        run: "run30",
        choices: { mode: "views", viewEntry: "e_9cdb51455051" },
        maximized: true,
        seed: "5",
        target: "seed:5",
      },
    ),
    shot(
      520,
      526,
      b.durationMs,
      b.durationMs,
      root30,
      "science-log",
      "Views are attached to the study record",
      {
        run: "run30",
        choices: { mode: "graph", graphScope: "all" },
        maximized: true,
        target: "button:Graph",
      },
    ),
    shot(
      526,
      536,
      b.durationMs,
      b.durationMs,
      root30,
      "science-log",
      "Views are attached to the study record",
      {
        run: "run30",
        maximized: true,
        choices: {
          mode: "graph",
          entry: "e_9cdb51455051",
          graphScope: "linked",
        },
        target: "graph-node:e_9cdb51455051",
      },
    ),
    shot(
      536,
      539,
      b.durationMs,
      b.durationMs,
      root30,
      "science-log",
      "Return to the whole study",
      {
        run: "run30",
        maximized: true,
        choices: { mode: "graph", graphScope: "all" },
        target: "button:Entire study",
      },
    ),
    shot(
      539,
      550,
      b.durationMs,
      b.durationMs,
      root30,
      "science-log",
      "Keep the conclusion—and its caveats",
      {
        run: "run30",
        choices: {
          branch: b.science.find((e) => e.record.id === "e_82710bfe8985")!
            .record.branch,
          mode: "graph",
          entry: "e_82710bfe8985",
        },
        maximized: true,
        target: "graph-node:e_82710bfe8985",
      },
    ),
    shot(
      550,
      560,
      b.durationMs,
      b.durationMs,
      root30,
      "science-log",
      "Ask. Run. Inspect. Trace.",
      { run: "run30", card: "close" },
    ),
  ];
  const result = paceStudyShots(shots, a, b);
  if (!cachedShots.has(a)) cachedShots.set(a, new WeakMap());
  cachedShots.get(a)!.set(b, result);
  return result;
}

/** A complete moving slice with node navigation, real board updates and provenance. */
export function buildStudyProof(a: StudyReplay, b: StudyReplay): StudyShot[] {
  const prior = cachedProof.get(a)?.get(b);
  if (prior) return prior;
  const full = buildStudyShots(a, b);
  const at = (begin: number) => {
    const found = full.find((s) => s.originalBegin === begin);
    if (!found) throw new Error(`Missing study shot ${begin}`);
    return found;
  };
  const proof: StudyShot[] = [
    {
      ...at(82),
      begin: 0,
      end: 4,
      from: 108000,
      to: 108000,
      maximized: false,
    },
    { ...at(105), begin: 4, end: 10, from: 108000, to: 123000 },
    { ...at(124), begin: 10, end: 23, from: 123000, to: 166000 },
    { ...at(145), begin: 23, end: 38, from: 166000, to: 208000 },
    { ...at(166), begin: 38, end: 46, from: 208000, to: 250000 },
    { ...at(180), begin: 46, end: 53 },
    { ...at(188), begin: 53, end: 64 },
    { ...at(200), begin: 64, end: 76 },
    { ...at(219), begin: 76, end: 84 },
    { ...at(229), begin: 84, end: 91 },
    { ...at(240), begin: 91, end: 93, from: 549000, to: 583400 },
    { ...at(245), begin: 93, end: 96, from: 583400, to: 635000 },
  ];
  // The proof has its own duration; rebuild its shared source knots at those anchors.
  const result = paceStudyShots(proof, a, b).map((shot, i) => ({
    ...shot,
    begin: proof[i].begin,
    end: proof[i].end,
    clock: shot.clock?.map((p) => ({
      ...p,
      frame:
        (proof[i].begin +
          ((p.frame / 60 - shot.begin) / (shot.end - shot.begin)) *
            (proof[i].end - proof[i].begin)) *
        60,
    })),
  }));
  if (!cachedProof.has(a)) cachedProof.set(a, new WeakMap());
  cachedProof.get(a)!.set(b, result);
  return result;
}

export function studyFilmAt(shots: StudyShot[], frame: number) {
  const seconds = frame / 60;
  let index = 0;
  for (let i = 0; i < shots.length; i++) {
    if (shots[i].begin <= seconds) index = i;
    else break;
  }
  const shot = shots[index];
  const progress = Math.max(
    0,
    Math.min(1, (seconds - shot.begin) / (shot.end - shot.begin)),
  );
  const source = studySourceAt(shot, frame);
  const actionDelay = shot.target && index > 0 ? 1.2 : 0;
  const transition = Math.max(
    0,
    Math.min(1, (seconds - shot.begin - actionDelay) / 0.8),
  );
  const ease = transition * transition * (3 - 2 * transition);
  const before = shots[Math.max(0, index - 1)];
  const maximize =
    Number(Boolean(before.maximized)) +
    (Number(Boolean(shot.maximized)) - Number(Boolean(before.maximized))) *
      ease;
  const displayed =
    seconds < shot.begin + actionDelay
      ? {
          ...shot,
          session: before.session,
          tab: before.tab,
          choices: before.choices,
          game: before.game,
          call: before.call,
          maximized: before.maximized,
        }
      : shot;
  return {
    shot: displayed,
    intent: shot,
    index,
    source,
    seconds,
    progress,
    maximize,
  };
}
