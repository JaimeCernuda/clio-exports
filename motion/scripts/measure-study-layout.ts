import { chromium } from "playwright-core";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildStudyShots, buildStudyProof } from "../native/study-film-plan";
import { studyFrameForSource } from "../native/study-pacing";
import {
  bakeStudyLayout,
  studyLayoutKey,
  type StudyLayoutBook,
} from "../native/study-layout";
import type { StudyReplay } from "../native/study-replay-model";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const a = JSON.parse(
  await readFile(path.join(root, ".native-ui/wordle-data/run60.json"), "utf8"),
) as StudyReplay;
const b = JSON.parse(
  await readFile(path.join(root, ".native-ui/wordle-data/run30.json"), "utf8"),
) as StudyReplay;
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.DEMO_CHROME_PATH ??
    path.join(
      root,
      "node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe",
    ),
  args: ["--use-gl=angle"],
});
const book = { schema: "clio.study-layout.v1" } as StudyLayoutBook;
await mkdir(path.join(root, "review"), { recursive: true });
try {
  for (const cut of ["full", "proof"] as const) {
    const shots =
      cut === "full" ? buildStudyShots(a, b) : buildStudyProof(a, b);
    const frames = shots.at(-1)!.end * 60;
    const selected = new Set([0, frames - 1]);
    for (let frame = 0; frame < frames; frame += 12) selected.add(frame);
    for (const shot of shots) {
      for (const at of [
        shot.begin * 60,
        (shot.begin + 1.2) * 60,
        shot.end * 60,
      ])
        for (const delta of [-1, 0, 1])
          if (at + delta >= 0 && at + delta < frames)
            selected.add(Math.round(at + delta));
      const replay = shot.run === "run60" ? a : b;
      const session = replay.sessions.find(
        (s) => s.session.id === shot.session,
      )!;
      for (const block of session.blocks.filter(
        (t) => t.start >= shot.from && t.start <= shot.to,
      )) {
        const start = studyFrameForSource(shots, shot.run, block.start),
          end = studyFrameForSource(shots, shot.run, block.end);
        for (const at of [start, end])
          for (let delta = -4; delta <= 28; delta += 4) {
            const frame = Math.round(at + delta);
            if (frame >= 0 && frame < frames) selected.add(frame);
          }
      }
    }
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
    });
    // tsx preserves inferred callback names; serialized Playwright callbacks need its helper too.
    await page.addInitScript(
      "window.__name = (fn, name) => Object.defineProperty(fn, 'name', {value:name, configurable:true});",
    );
    await page.goto(
      `http://127.0.0.1:3361/?mode=study&cut=${cut}&render=1&layout=record`,
    );
    const samples: { frame: number; session: string; raw: number }[] = [];
    const pending = [...selected].sort((x, y) => x - y);
    for (const [index, frame] of pending.entries()) {
      const measured = await page.evaluate(
        ({ frame, nonce }) =>
          new Promise<{ frame: number; session: string; raw: number }>(
            (resolve, reject) => {
              const timer = setTimeout(
                () => reject(new Error(`Layout frame ${frame} did not settle`)),
                30000,
              );
              const receive = (event: MessageEvent) => {
                if (event.data?.kind === "clio-film-error") {
                  clearTimeout(timer);
                  window.removeEventListener("message", receive);
                  reject(new Error(event.data.message));
                }
                if (
                  event.data?.kind === "clio-film-ready" &&
                  event.data.frame === frame &&
                  event.data.nonce === nonce
                ) {
                  clearTimeout(timer);
                  window.removeEventListener("message", receive);
                  resolve(event.data.layout.chat);
                }
              };
              window.addEventListener("message", receive);
              window.postMessage(
                { kind: "clio-film-frame", frame, nonce },
                "*",
              );
            },
          ),
        { frame, nonce: index + 1 },
      );
      if (!measured.session || !Number.isFinite(measured.raw))
        throw new Error(`Missing native geometry at ${cut}/${frame}`);
      samples.push(measured);
      if (index % 200 === 0)
        console.log(`LAYOUT ${cut} ${index}/${pending.length}`);
    }
    book[cut] = bakeStudyLayout(shots, samples);
    await writeFile(
      path.join(root, `review/wordle-${cut}-layout-samples.json`),
      JSON.stringify({ key: studyLayoutKey(shots), samples }),
    );
    await page.close();
  }
  const temporary = path.join(
    root,
    ".native-ui/wordle-data/wordle-layout.json.tmp",
  );
  await writeFile(temporary, JSON.stringify(book));
  await rename(
    temporary,
    path.join(root, ".native-ui/wordle-data/wordle-layout.json"),
  );
  await writeFile(
    path.join(root, "story/wordle-layout.json"),
    JSON.stringify(book),
  );
  console.log("LAYOUT DONE");
} finally {
  await browser.close();
}
