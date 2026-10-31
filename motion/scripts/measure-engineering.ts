import { chromium, type Page } from "playwright-core";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  engineeringReplayEdits,
  engineeringSourceFrames,
  engineeringSourceToGlobal,
} from "../native/engineering-film-plan";
import { buildReplayPlan, type ReplayMessage } from "../native/replay-plan";
import {
  layoutKey,
  smoothScroll,
  interpolateMeasurements,
  type ReplayLayoutTrack,
} from "../native/replay-layout";
import type { PointerKey } from "../native/engineering-plan";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = path.join(root, ".native-ui/engineering-data");
const temporary = path.join(root, ".native-ui/engineering-render/tmp");
await mkdir(temporary, { recursive: true });
process.env.TEMP = temporary;
process.env.TMP = temporary;
process.env.TMPDIR = temporary;
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
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1.5,
});
await page.addInitScript(
  "window.__name=(fn,name)=>Object.defineProperty(fn,'name',{value:name,configurable:true});",
);
page.on("pageerror", (e) => console.error(e.message));

let nextNonce = 40000;
async function seek(
  page: Page,
  frame: number,
): Promise<{ rawScroll: number; sourceFrame: number }> {
  const nonce = ++nextNonce;
  return page.evaluate(
    ({ frame, nonce }) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error(`Measurement frame ${frame} timed out`)),
          100000,
        );
        const receive = (event: MessageEvent) => {
          if (event.data?.kind === "clio-film-error") {
            clearTimeout(timer);
            removeEventListener("message", receive);
            reject(new Error(event.data.message));
          }
          if (
            event.data?.kind === "clio-film-ready" &&
            event.data.frame === frame &&
            event.data.nonce === nonce
          ) {
            clearTimeout(timer);
            removeEventListener("message", receive);
            resolve(event.data.evidence);
          }
        };
        addEventListener("message", receive);
        postMessage({ kind: "clio-film-frame", frame, nonce }, "*");
      }),
    { frame, nonce },
  );
}
async function point(
  seconds: number,
  selector: string,
  text?: string,
): Promise<{ x: number; y: number }> {
  console.log(`MEASURE ${seconds} ${text ?? selector}`);
  await seek(page, Math.round(seconds * 60));
  return page.evaluate(
    ({ selector, text }) => {
      const element = Array.from(
        document.querySelectorAll<HTMLElement>(selector),
      ).find(
        (e) =>
          e.getBoundingClientRect().width > 0 &&
          (!text || e.textContent?.trim() === text),
      );
      if (!element)
        throw new Error(`No visible pointer target: ${selector} ${text ?? ""}`);
      const rect = element.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    },
    { selector, text },
  );
}
try {
  await page.goto(
    "http://127.0.0.1:3365/engineering.html?mode=film&cut=full&render=1&layout=record",
  );
  await page.waitForSelector(".engineering-full", { timeout: 120000 });
  if (process.argv[2] !== "layout") {
    const park = { x: 1120, y: 654 };
    const keys: PointerKey[] = [];
    const add = (at: number, p: { x: number; y: number }) =>
      keys.push({ at, ...p });
    const max = await point(
      90.2,
      'button[aria-label="Restore canvas beside conversation"]',
    );
    const mesh = await point(
      94,
      '[data-slot="a2ui-mesh-viewport"][data-a2ui-component-id="c05"] canvas',
    );
    const half = await point(100, '[role="slider"]');
    const low = await point(104, '[role="slider"]');
    const c05 = await point(140, ".engineering-canvas td", "c05");
    const c10 = await point(145, ".engineering-canvas td", "c10");
    const pair = await point(
      182,
      '[data-slot="a2ui-mesh-viewport"][data-a2ui-component-id="inspView"] canvas',
    );
    const setup = await point(266, '[role="tab"]', "2 Setup");
    const results = await point(279, '[role="tab"]', "4 Results");
    const iso50 = await point(279, '[role="slider"]');
    const iso10 = await point(282, '[role="slider"]');
    const result = await point(
      305,
      '[data-slot="a2ui-mesh-viewport"][data-a2ui-component-id="v1"] canvas',
    );
    const stress = await point(
      320,
      '[data-slot="a2ui-mesh-viewport"][data-a2ui-component-id="v9s"] canvas',
    );
    const firstObjective = await point(
      327,
      '.engineering-canvas [data-slot="a2ui-chart"] svg .mark-symbol path[aria-label^="iteration: 0;"]',
    );
    const lastObjective = await point(
      332,
      '.engineering-canvas [data-slot="a2ui-chart"] svg .mark-symbol path[aria-label^="iteration: 10;"]',
    );
    const saved = await point(338, '[role="tab"]', "5 Saved trials");
    add(0, park);
    for (const run of ["e4", "e5"] as const) {
      const scene = JSON.parse(
        await readFile(
          path.join(data, `engineering-film-scene-${run}.json`),
          "utf8",
        ),
      );
      const messages = scene.view.messages as ReplayMessage[];
      const plan = buildReplayPlan(
        messages,
        engineeringSourceFrames(run),
        20,
        engineeringReplayEdits(messages, run),
      );
      const at = plan.events[0].revealEnd / 60 + (run === "e5" ? 195 : 0);
      const send = await point(at - 0.05, ".replay-composer button", "Send");
      add(at - 0.7, park);
      add(at - 0.05, send);
      add(at + 0.15, send);
      add(at + 0.75, park);
    }
    add(88.2, park);
    add(88.85, max);
    add(90.2, max);
    add(93.3, max);
    add(94, mesh);
    add(96.5, { x: mesh.x + 110, y: mesh.y + 15 });
    add(100.3, { x: mesh.x + 110, y: mesh.y + 15 });
    add(101, half);
    add(103, low);
    add(107.9, low);
    add(109.4, half);
    add(110, half);
    add(110.65, park);
    add(128.5, park);
    add(135.35, park);
    add(136, c05);
    add(143.3, c05);
    add(144, c10);
    add(147.3, c10);
    add(148, c05);
    add(150.3, c05);
    add(151, max);
    add(152.2, max);
    add(153, park);
    add(178.2, park);
    add(179, max);
    add(180.2, max);
    add(182.3, max);
    add(183, pair);
    add(186, { x: pair.x - 95, y: pair.y + 10 });
    add(188, { x: pair.x - 95, y: pair.y + 10 });
    add(188.7, park);
    add(258.2, park);
    add(259, max);
    add(260.2, max);
    add(264.3, max);
    add(265, setup);
    add(266, setup);
    add(266.7, park);
    add(277.3, park);
    add(278, results);
    add(279, results);
    add(280, iso50);
    add(281.4, iso10);
    add(282, iso10);
    add(282.7, park);
    add(301.3, park);
    add(302, iso10);
    add(303.4, iso50);
    add(304, iso50);
    add(305, result);
    add(307, { x: result.x + 90, y: result.y - 14 });
    add(308, { x: result.x + 90, y: result.y - 14 });
    add(308.7, park);
    add(311.2, park);
    add(311.9, { x: stress.x - 31.5, y: stress.y - 61 });
    add(315.1, { x: stress.x - 31.5, y: stress.y - 61 });
    add(315.8, { x: stress.x - 11.5, y: stress.y - 76 });
    add(319.2, { x: stress.x - 11.5, y: stress.y - 76 });
    add(319.9, park);
    add(320.3, park);
    add(321, stress);
    add(323.3, { x: stress.x - 90, y: stress.y + 15 });
    add(324, { x: stress.x - 90, y: stress.y + 15 });
    add(324.7, park);
    add(325.5, park);
    add(326.2, firstObjective);
    add(328.8, firstObjective);
    add(329.5, lastObjective);
    add(332.8, lastObjective);
    add(333.5, park);
    add(335.3, park);
    add(336, saved);
    add(337, saved);
    add(337.7, park);
    add(343.3, park);
    add(344, results);
    add(345, results);
    add(345.7, park);
    add(347.3, park);
    add(348, result);
    add(350, { x: result.x + 90, y: result.y - 14 });
    add(350.7, { x: result.x + 90, y: result.y - 14 });
    add(351.4, park);
    add(356, park);
    keys.sort((a, b) => a.at - b.at);
    await writeFile(
      path.join(data, "engineering-pointer.json"),
      JSON.stringify(keys, null, 2),
    );
    await writeFile(
      path.join(root, "story/engineering-pointer.json"),
      JSON.stringify(keys, null, 2),
    );
    console.log(`POINTER ${keys.length} continuous keys`);
  } else {
    const layouts: Partial<Record<"e4" | "e5", ReplayLayoutTrack>> = {};
    for (const run of ["e4", "e5"] as const) {
      const scene = JSON.parse(
        await readFile(
          path.join(data, `engineering-film-scene-${run}.json`),
          "utf8",
        ),
      );
      const frames = engineeringSourceFrames(run);
      const edits = engineeringReplayEdits(scene.view.messages, run);
      const plan = buildReplayPlan(scene.view.messages, frames, 20, edits);
      const pending = new Set<number>([0, frames - 1]);
      for (let f = 0; f < frames; f += 12) pending.add(f);
      for (const event of plan.events)
        for (const at of [event.start, event.revealEnd, event.end])
          for (let offset = -4; offset <= 40; offset += 4)
            if (at + offset >= 0 && at + offset < frames)
              pending.add(at + offset);
      const measurements: (number | undefined)[] = [];
      let count = 0;
      for (const source of [...pending].sort((a, b) => a - b)) {
        const global = engineeringSourceToGlobal(source, run);
        const measured = await seek(page, global);
        measurements[source] = measured.rawScroll;
        count++;
        if (count % 100 === 0)
          console.log(`LAYOUT ${run} ${count}/${pending.size}`);
      }
      const raw = interpolateMeasurements(measurements, frames);
      layouts[run] = {
        schema: "clio.replay-layout.v1",
        key: layoutKey(
          `${scene.session.id}:${scene.source.sha256}`,
          frames,
          20,
          false,
          edits,
        ),
        frames,
        raw,
        scroll: smoothScroll(raw),
        measurementStep: 12,
      };
      console.log(`BAKED ${run} ${frames} frames`);
    }
    await writeFile(
      path.join(data, "engineering-layout.json"),
      JSON.stringify(layouts),
    );
    await writeFile(
      path.join(root, "story/engineering-layout.json"),
      JSON.stringify(layouts),
    );
  }
} finally {
  await browser.close();
}
