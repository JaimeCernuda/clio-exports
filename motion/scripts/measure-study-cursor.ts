import { bundle } from "@remotion/bundler";
import {
  openBrowser,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildStudyShots, buildStudyProof } from "../native/study-film-plan";
import type { StudyReplay } from "../native/study-replay-model";
import type { StudyCursorMeasurement } from "../native/study-cursor";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const a = JSON.parse(
  await readFile(path.join(root, ".native-ui/wordle-data/run60.json"), "utf8"),
) as StudyReplay;
const b = JSON.parse(
  await readFile(path.join(root, ".native-ui/wordle-data/run30.json"), "utf8"),
) as StudyReplay;
const serveUrl = await bundle({
  entryPoint: path.join(root, "src/wordle-index.tsx"),
  publicDir: path.join(root, "public"),
  onProgress: () => {},
});
const browser = await openBrowser("chrome", {
  chromiumOptions: {
    gl: (process.env.DEMO_GL as "angle" | "swangle" | undefined) ?? "angle",
  },
});
let records: {
  full: StudyCursorMeasurement[];
  proof: StudyCursorMeasurement[];
} = { full: [], proof: [] };
if (process.argv.includes("--resume"))
  records = JSON.parse(
    await readFile(
      path.join(root, "review/study-targets/partial.json"),
      "utf8",
    ),
  );
await mkdir(path.join(root, "review/study-targets"), { recursive: true });
try {
  for (const cut of ["proof", "full"] as const) {
    const composition = await selectComposition({
      serveUrl,
      id: cut === "proof" ? "WordleStudyProof" : "WordleStudyWalkthrough",
      inputProps: { debugLayout: true },
      puppeteerInstance: browser,
    });
    const shots =
      cut === "proof" ? buildStudyProof(a, b) : buildStudyShots(a, b);
    for (const shot of shots.filter((s) => s.target && !s.card)) {
      if (
        records[cut].some(
          (m) => m.begin === shot.begin && m.target === shot.target,
        )
      )
        continue;
      const sampleOption = shot.seed && shot.target!.startsWith("seed:");
      const frame = Math.round(
        (shot.begin +
          (sampleOption ? 2.2 : shot.target!.startsWith("chart:") ? 3 : 0.5)) *
          60,
      );
      let measurement: StudyCursorMeasurement | undefined;
      await renderStill({
        serveUrl,
        composition,
        inputProps: { debugLayout: true },
        puppeteerInstance: browser,
        frame,
        scale: 1,
        imageFormat: "png",
        output: path.join(
          root,
          `review/study-targets/${cut}-${shot.begin}.png`,
        ),
        logLevel: "error",
        onBrowserLog: (log) => {
          try {
            const parsed = JSON.parse(log.text);
            if (parsed?.studyTarget?.x !== undefined)
              measurement = parsed.studyTarget as StudyCursorMeasurement;
            if (sampleOption && parsed?.seedOption?.x !== undefined) {
              const option = parsed.seedOption as StudyCursorMeasurement;
              if (
                option.x < 0 ||
                option.y < 0 ||
                option.x > 1280 ||
                option.y > 720
              )
                throw new Error(
                  `Offscreen seed option ${JSON.stringify(option)}`,
                );
              records[cut].push(option);
            }
          } catch {
            /* Ordinary browser log, not a measurement envelope. */
          }
        },
      });
      if (!measurement)
        throw new Error(
          `Missing native target ${cut} ${shot.begin}: ${shot.target}`,
        );
      if (
        measurement.x < 0 ||
        measurement.y < 0 ||
        measurement.x > 1280 ||
        measurement.y > 720
      )
        throw new Error(
          `Offscreen native target: ${JSON.stringify(measurement)}`,
        );
      if (
        sampleOption &&
        !records[cut].some(
          (m) =>
            m.begin === shot.begin && m.target === `seed-option:${shot.seed}`,
        )
      )
        throw new Error(`No visible seed option for ${shot.begin}`);
      records[cut].push(measurement);
      await writeFile(
        path.join(root, "review/study-targets/partial.json"),
        JSON.stringify(records),
      );
      console.log(`TARGET ${cut} ${shot.begin} ${shot.target}`);
    }
  }
  const book = {
    schema: "clio.study-cursor.v1",
    sources: [a.source, b.source],
    ...records,
  };
  await writeFile(
    path.join(root, "story/wordle-cursor-targets.json"),
    JSON.stringify(book, null, 2) + "\n",
  );
  await writeFile(
    path.join(root, ".native-ui/wordle-data/wordle-cursor.json"),
    JSON.stringify(book) + "\n",
  );
} finally {
  await browser.close({ silent: true });
}
