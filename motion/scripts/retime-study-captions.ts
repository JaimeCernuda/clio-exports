import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildStudyShots } from "../native/study-film-plan";
import type { StudyReplay } from "../native/study-replay-model";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = async (relative: string) =>
  JSON.parse(await readFile(path.join(root, relative), "utf8"));
const a = (await read(".native-ui/wordle-data/run60.json")) as StudyReplay;
const b = (await read(".native-ui/wordle-data/run30.json")) as StudyReplay;
const shots = buildStudyShots(a, b);
const at = (old: number) => {
  const index = Math.max(
    0,
    shots.findIndex(
      (s, i) =>
        old >= s.originalBegin! && old < (shots[i + 1]?.originalBegin ?? 560),
    ),
  );
  if (old === 560) return shots.at(-1)!.end;
  const shot = shots[index],
    end = shots[index + 1]?.originalBegin ?? 560;
  return (
    shot.begin +
    ((old - shot.originalBegin!) / (end - shot.originalBegin!)) *
      (shot.end - shot.begin)
  );
};
const plan = await read("story/wordle-narration.json");
const copy: Record<string, string> = {
  opening: "Follow one question through a complete CLIO study.",
  hypotheses:
    "The Science Log records the question and three predictions: open with akuzo, use akuzo then nivyl, or start with terva. Each hypothesis can be checked against the same seeds.",
  launch:
    "The workflow starts three strategies in parallel. Merge waits for all three branches, then an independent review checks the result.",
  delegation:
    "The delegation tree opens each worker’s conversation. Each worker receives five seeds, the same strategy rules, and the instruction to cite its tool calls when it writes an observation.",
  "board-inspect":
    "Pause here: yellow means another position; grey means absent.",
  close: "The study remains connected to its evidence.",
};
const revised = {
  ...plan,
  durationSeconds: shots.at(-1)!.end,
  revision: 2,
  cues: plan.cues.map(
    (cue: { id: string; start: number; end: number; text: string }) => ({
      ...cue,
      start: at(cue.start),
      end: at(cue.end),
      text: copy[cue.id] ?? cue.text,
    }),
  ),
};
const previousPlan = await read("story/wordle-walkthrough-plan.json");
const revisedPlan = {
  ...previousPlan,
  revision: 2,
  status: "rendered_revision",
  durationSeconds: revised.durationSeconds,
  audio: { ...previousPlan.audio, script: "wordle-narration-v2.json" },
  chapters: previousPlan.chapters.map(
    (chapter: { start: number; seconds: number; actions: string[] }) => ({
      ...chapter,
      start: at(chapter.start),
      seconds: at(chapter.start + chapter.seconds) - at(chapter.start),
      actions: chapter.actions.map((action) =>
        action.replace("Science log in List mode", "Science log in Graph mode"),
      ),
    }),
  ),
  visualGrammar: {
    ...previousPlan.visualGrammar,
    text: "Public assistant prose is retyped uniformly within its recorded block boundaries. Weighted source-clock segments give burst-delivered sentences readable time and compress idle gaps. Original token checkpoints remain available for source inspection.",
    pointer:
      "One measured viewport pointer. Park until a distance-bounded 0.35-1 second approach; never interpolate the first move across the whole opening or return to a distant corner after each action.",
    scrolling:
      "Bake measured native transcript heights into the NDP damped viewport path. Reset between conversations. Short completed tool groups hold 100ms and collapse over 183ms; they do not inherit SPOTTER thinking holds.",
  },
  implementationGates: previousPlan.implementationGates.map(
    (gate: { id: string; status: string }) => ({
      ...gate,
      designStatus: gate.status,
      status:
        gate.id === "full-cut-review"
          ? "review_receipt_retained_with_local_media"
          : "implemented_with_recorded_sources",
    }),
  ),
  productionOrder: previousPlan.productionOrder.map(
    (stage: { stage: string; deliverable: string; done: string }) => ({
      ...stage,
      deliverable: stage.deliverable.replace("9:20", "8:30"),
      done:
        stage.stage === "Complete playback and corrections"
          ? "The v1 was rejected. The full v2 encode is complete; see the local media handoff for decode, frame-scan and playback evidence and its limits."
          : "Implemented. See motion/native/WORDLE.md and the retained automated and native-browser evidence; v1 creative acceptance was rejected.",
    }),
  ),
  revisionNotes: [
    "The 9:20 v1 was rejected for its dotted title, choppy text/scrolling, short-tool pauses and crawling first Science Log pointer.",
    "The revised full timeline is 8:30. Source archives, event order, run boundaries and scientific qualifications are preserved.",
    "Both the revised opening and full cut are encoded. Playback review is recorded separately from automated validation; creative acceptance remains with the user.",
  ],
};
await writeFile(
  path.join(root, "story/wordle-walkthrough-plan-v2.json"),
  JSON.stringify(revisedPlan, null, 2) + "\n",
);
await writeFile(
  path.join(root, "story/wordle-narration-v2.json"),
  JSON.stringify(revised, null, 2) + "\n",
);
const markers: [number, string][] = [
  [0, "Question"],
  [25, "Hypotheses"],
  [36, "Expand graph"],
  [65, "Flow"],
  [105, "Branch"],
  [145, "Worker"],
  [166, "Feedback"],
  [200, "Observations"],
  [219, "Sources"],
  [260, "Graph growth"],
  [320, "Merge"],
  [360, "Review"],
  [405, "Second study"],
  [431, "Comparison"],
  [465, "Game boards"],
  [480, "Change seed"],
  [520, "Graph and conclusion"],
];
const chapters = markers.map(([time, label]) => [at(time), label]);
const htmlPath = path.join(root, "native/wordle-review.html");
const html = await readFile(htmlPath, "utf8");
const pattern = /(<script[^>]+id="wordle-chapters"[^>]*>)[\s\S]*?(<\/script>)/;
if (!pattern.test(html))
  throw new Error("Review chapter data block is missing");
await writeFile(
  htmlPath,
  html.replace(pattern, `$1${JSON.stringify(chapters)}$2`),
);
console.log(
  JSON.stringify({
    seconds: revised.durationSeconds,
    cues: revised.cues.length,
  }),
);
