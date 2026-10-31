import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  boardsAt,
  scienceAt,
  flowAt,
  studySessionAt,
  type StudyReplay,
} from "../native/study-replay-model";
import {
  buildStudyShots,
  buildStudyProof,
  studyFilmAt,
} from "../native/study-film-plan";
import { expressionFields } from "../native/recorded-expression-fields";
import { studyCursorKeys, studyCursorAt } from "../native/study-cursor";
import { studyFrameForSource, studySourceAt } from "../native/study-pacing";
import { bakeStudyLayout } from "../native/study-layout";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
function load(name: string, archive: string): StudyReplay {
  const file = path.join(root, `motion/.native-ui/wordle-data/${name}.json`);
  if (!existsSync(file)) {
    const result = spawnSync(
      "uv",
      [
        "run",
        "python",
        "tools/prepare_study_replay.py",
        `studies/${archive}`,
        "--out",
        file,
      ],
      { cwd: root, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
  }
  return JSON.parse(readFileSync(file, "utf8")) as StudyReplay;
}
const a = load("run60", "Wordle-study-session.html"),
  b = load("run30", "Wordle-study-views-session.html");

test("science entries and status mutations arrive at their recorded times", () => {
  const first = a.science[0];
  assert.equal(scienceAt(a, first.at - 1).entries.length, 0);
  assert.equal(scienceAt(a, first.at).entries.length, 1);
  const mutation = a.science.find((e) => e.record.type === "status")!;
  assert.equal(
    scienceAt(a, mutation.at - 1).entries.find(
      (e: { id: string }) => e.id === mutation.record.fields.entry,
    ).status,
    "open",
  );
  assert.equal(
    scienceAt(a, mutation.at).entries.find(
      (e: { id: string }) => e.id === mutation.record.fields.entry,
    ).status,
    mutation.record.fields.status,
  );
  assert.equal(scienceAt(a, a.durationMs).entries.length, 73);
  assert.equal(scienceAt(b, b.durationMs).entries.length, 47);
});
test("boards cannot reveal feedback before the corresponding tool result", () => {
  const update = a.boards.find((u) => u.callId === "call_9ae388b0c0dd")!;
  const before = boardsAt(a, update.at - 1, update.sessionId),
    after = boardsAt(a, update.at, update.sessionId);
  assert.equal(before.rows.filter((r) => r.game === "g36-s16").length, 0);
  assert.equal(after.rows.filter((r) => r.game === "g36-s16").length, 5);
  assert.deepEqual(
    after.rows.filter((r) => r.game === "g36-s16").map((r) => r.state),
    update.event.rows.map((r: { state: string }) => r.state),
  );
});
test("flow keeps its real dependency graph and hides future launches and results", () => {
  const run = flowAt(a, 200000);
  assert.equal(run.status, "running");
  assert.equal(run.result, null);
  assert.equal(
    run.view.steps.find((s: { id: string }) => s.id === "english").status,
    "running",
  );
  const merge = run.view.steps.find((s: { id: string }) => s.id === "merge");
  assert.equal(merge.status, "pending");
  assert.equal(merge.handle, undefined);
  assert.deepEqual(merge.after, ["tuned", "twofixed", "english"]);
  assert.equal(flowAt(a, a.durationMs).status, "completed");
});
test("session navigation shares time and unchanged frames preserve native view identity", () => {
  const worker = "sess_ba3f18b300c2eb46b8ba92aff356c2f0";
  const first = studySessionAt(a, worker, 250000);
  assert.strictEqual(studySessionAt(a, worker, 250000).view, first.view);
  const later = studySessionAt(a, worker, 550000);
  assert(later.view.tools.length > first.view.tools.length);
  const selected = first.session.blocks.find(
    (x) => x.precision === "recorded-token-deltas",
  )!;
  const point = selected.checkpoints[0];
  const partial = studySessionAt(a, worker, point[0])
    .view.messages.flatMap((m) => m.blocks)
    .find((x) => x.id === selected.blockId)!;
  const full = first.session.view.messages
    .flatMap((m) => m.blocks)
    .find((x) => x.id === selected.blockId)!;
  assert.equal(
    partial.text,
    Array.from(full.text!).slice(0, point[1]).join(""),
  );
});
test("full and proof timelines stay contiguous and monotonic within each recorded run", () => {
  for (const shots of [buildStudyShots(a, b), buildStudyProof(a, b)]) {
    assert.equal(shots[0].begin, 0);
    for (let i = 1; i < shots.length; i++) {
      assert.equal(shots[i].begin, shots[i - 1].end);
      if (shots[i].run === shots[i - 1].run)
        assert(
          shots[i].from >= shots[i - 1].to,
          `${shots[i].begin} rewinds source`,
        );
    }
    for (const inspection of shots.filter((s) => s.from === s.to)) {
      const before = studyFilmAt(
        shots,
        Math.round((inspection.begin + 0.1) * 60),
      );
      const after = studyFilmAt(shots, Math.round((inspection.end - 0.1) * 60));
      assert.equal(
        before.source,
        after.source,
        `${inspection.label} advances while paused`,
      );
      const replay = inspection.run === "run60" ? a : b;
      assert.deepEqual(
        scienceAt(replay, before.source),
        scienceAt(replay, after.source),
      );
      assert.deepEqual(
        flowAt(replay, before.source),
        flowAt(replay, after.source),
      );
    }
  }
});
test("computed Vega panel fields survive the native table projection", () => {
  assert.deepEqual(
    expressionFields({
      transform: [
        {
          calculate:
            "datum.strategy + datum.guesses_used + upper(datum['answer'])",
          as: "panel",
        },
      ],
    }),
    ["strategy", "guesses_used", "answer"],
  );
});
test("one measured cursor path is bounded and independent of frame seek order", () => {
  const shots = buildStudyProof(a, b);
  const measurements = shots
    .filter((s) => s.target)
    .map((s) => ({
      begin: s.begin,
      target: s.target!,
      x: 400,
      y: 200,
      width: 1280,
      height: 720,
    }));
  const keys = studyCursorKeys(shots, measurements);
  assert.deepEqual(studyCursorAt(keys, 300), studyCursorAt(keys, 300));
  let old = studyCursorAt(keys, 0);
  for (let frame = 1; frame < 96 * 60; frame++) {
    const pose = studyCursorAt(keys, frame);
    assert(
      Math.hypot(pose.x - old.x, pose.y - old.y) < 45,
      `pointer jump at ${frame}`,
    );
    assert(pose.x >= 0 && pose.x <= 1280 && pose.y >= 0 && pose.y <= 720);
    old = pose;
  }
});

test("the first Science Log pointer stays parked then travels briskly instead of crossing the whole opening", () => {
  const shots = buildStudyShots(a, b);
  const first = shots.find((s) => s.target)!;
  const keys = studyCursorKeys(shots, [
    {
      begin: first.begin,
      target: first.target!,
      x: 1200,
      y: 100,
      width: 1280,
      height: 720,
    },
  ]);
  const click = Math.round((first.begin + 1.2) * 60);
  assert.deepEqual(studyCursorAt(keys, 60 * 10).x, 1200);
  assert.equal(studyCursorAt(keys, click - 30).y, 140);
  assert.equal(studyCursorAt(keys, click).y, 100);
  assert.equal(studyCursorAt(keys, click + 10).y, 100);
});

test("editorial source clock spends time typing delivery bursts and crosses idle gaps promptly", () => {
  const shots = buildStudyShots(a, b);
  const start = studyFrameForSource(shots, "run60", 6077),
    end = studyFrameForSource(shots, "run60", 6105);
  assert(end - start > 30, "a complete sentence cannot flash in one frame");
  assert(
    studyFrameForSource(shots, "run60", 13195) -
      studyFrameForSource(shots, "run60", 6947) <
      30,
    "completed short tools should not wait through a long idle gap",
  );
  const shot = shots.find((s) => s.from <= 6077 && s.to >= 6105)!;
  assert(Math.abs(studySourceAt(shot, (start + end) / 2) - 6091) < 1);
  const original = a.sessions[0].view.messages
    .flatMap((m) => m.blocks)
    .find((b) => b.type === "text" && b.text?.startsWith("I'll treat this"))!;
  const visible = studySessionAt(a, a.rootSessionId, 6091, true)
    .view.messages.flatMap((m) => m.blocks)
    .find((b) => b.id === original.id)!;
  assert(
    visible.text!.length > 0 && visible.text!.length < original.text!.length,
  );
  assert(original.text!.startsWith(visible.text!));
});

test("measured scrolling damps block growth and resets when opening another agent", () => {
  const shots = [{ ...buildStudyShots(a, b)[0], begin: 0, end: 2 }];
  const track = bakeStudyLayout(shots, [
    { frame: 0, session: "a", raw: 0 },
    { frame: 30, session: "a", raw: 200 },
    { frame: 59, session: "a", raw: 200 },
    { frame: 60, session: "b", raw: 700 },
    { frame: 119, session: "b", raw: 700 },
  ]);
  assert.equal(track.scroll.length, 120);
  assert.equal(track.scroll[60], 700);
  assert(track.scroll[30] < 200);
  for (let frame = 1; frame < 60; frame++)
    assert(Math.abs(track.scroll[frame] - track.scroll[frame - 1]) <= 9);
});
