import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildStudyShots,
  buildStudyProof,
  studyFilmAt,
} from "../native/study-film-plan";
import {
  studyCursorKeys,
  studyCursorAt,
  type StudyCursorBook,
} from "../native/study-cursor";
import type { StudyReplay } from "../native/study-replay-model";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = async (relative: string) =>
  JSON.parse(await readFile(path.join(root, relative), "utf8"));
const a = (await read(".native-ui/wordle-data/run60.json")) as StudyReplay;
const b = (await read(".native-ui/wordle-data/run30.json")) as StudyReplay;
const book = (await read(
  "story/wordle-cursor-targets.json",
)) as StudyCursorBook & { sources: unknown[] };
assert.deepEqual(
  book.sources,
  [a.source, b.source],
  "Cursor measurements belong to different exports",
);
const reports = [];
for (const [cut, shots] of [
  ["full", buildStudyShots(a, b)],
  ["proof", buildStudyProof(a, b)],
] as const) {
  for (const shot of shots.filter((s) => s.target && !s.card))
    assert(
      book[cut].some((m) => m.begin === shot.begin && m.target === shot.target),
      `No measured target: ${cut}/${shot.begin}/${shot.target}`,
    );
  const keys = studyCursorKeys(shots, book[cut]);
  for (let index = 1; index < keys.length; index++) {
    const key = keys[index];
    assert(
      key.travelFrames !== undefined &&
        key.travelFrames >= 21 &&
        key.travelFrames <= 60,
      `Pointer travel is not bounded: ${cut}/${key.at}`,
    );
    const previousKey = keys[index - 1];
    const parkedFrame = Math.max(previousKey.at, key.at - key.travelFrames - 1);
    const parked = studyCursorAt(keys, parkedFrame);
    assert.equal(
      parked.x,
      previousKey.x,
      `Pointer crawls before its approach: ${cut}/${key.at}`,
    );
    assert.equal(
      parked.y,
      previousKey.y,
      `Pointer crawls before its approach: ${cut}/${key.at}`,
    );
    const arrived = studyCursorAt(keys, key.at);
    assert.equal(arrived.x, key.x);
    assert.equal(arrived.y, key.y);
  }
  const frames = shots.at(-1)!.end * 60;
  let previous = studyCursorAt(keys, 0),
    maximumTravel = 0;
  for (let frame = 1; frame < frames; frame++) {
    const point = studyCursorAt(keys, frame);
    const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
    assert(
      point.x >= 0 && point.x <= 1280 && point.y >= 0 && point.y <= 720,
      `Pointer offscreen: ${cut}/${frame}`,
    );
    assert(distance < 45, `Pointer jumps ${distance}px at ${cut}/${frame}`);
    maximumTravel = Math.max(maximumTravel, distance);
    previous = point;
  }
  const inspections = shots.filter((s) => s.from === s.to && !s.card);
  for (const shot of inspections)
    assert.equal(
      studyFilmAt(shots, shot.begin * 60).source,
      studyFilmAt(shots, shot.end * 60 - 1).source,
      `${shot.label} advances the source while paused`,
    );
  reports.push({
    cut,
    frames,
    measuredActions: shots.filter((s) => s.target).length,
    pausedInspections: inspections.length,
    maximumPixelsPerFrame: maximumTravel,
    firstActionSeconds: keys[1].at / 60,
    firstApproachSeconds: keys[1].travelFrames! / 60,
  });
}
await mkdir(path.join(root, "review"), { recursive: true });
await writeFile(
  path.join(root, "review/wordle-plan-audit.json"),
  JSON.stringify({ status: "passed", sources: book.sources, reports }, null, 2),
);
console.log(JSON.stringify(reports));
