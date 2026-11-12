import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mediaCommand, videoHash } from "./video-tools";
import { buildPocketCues } from "../native/spotter-pocket-plan";
import { buildOpalScenario } from "../native/opal-scenario";
import { frameForSource } from "../native/paired-replay";
import { buildSpotterFilmPlan, filmPair } from "../native/spotter-film-plan";
import { resolveAttentionInspection } from "../native/attention-inspection-plan";
import type { PairedReplay } from "../native/paired-replay";

/** Extract review coverage from the delivery encode; generated sheets never imply that someone inspected them. */
async function main(): Promise<void> {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const video = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(root, "out/spotter-v2/spotter-opal-investigation-v2.mp4");
  const output = path.resolve(root, "out/spotter-v2/encoded-review");
  await mkdir(output, { recursive: true });
  const pair = filmPair(
    JSON.parse(
      await readFile(
        path.join(root, "native/public/opal-chainB-7795459.native.json"),
        "utf8",
      ),
    ) as PairedReplay,
  );
  const plan = buildSpotterFilmPlan(pair);
  pair.attention = JSON.parse(
    await readFile(
      path.join(root, "native/public/chainB-7795459-attention.json"),
      "utf8",
    ),
  );
  const events = [
    { frame: 90, reason: "Transparent-logo introduction" },
    { frame: 546, reason: "Security menu opens" },
    { frame: 630, reason: "SPOTTER selected" },
    ...buildPocketCues(pair).map((cue) => ({
      frame: 450 + cue.at,
      reason: cue.reason,
    })),
    ...[7940, 8838, 9550, 13211, 14837].map((frame) => ({
      frame,
      reason: "Frame-exact correction join",
    })),
    {
      frame:
        450 + frameForSource(pair, buildOpalScenario(pair)[4].answerLineAt),
      reason: "Answer line complete; comparison opens",
    },
    {
      frame: 450 + frameForSource(pair, buildOpalScenario(pair)[4].answerEnd),
      reason: "Progressive Markdown answer completes",
    },
    { frame: 450 + plan.at, reason: "Actual danger alert" },
    ...plan.shots.flatMap((shot) => {
      const spec = resolveAttentionInspection(pair, shot.id);
      return [
        [spec.selectionStart, "Selection begins"],
        [spec.selectionEnd, "Native action menu"],
        [spec.click, "Understand attention"],
        [spec.scrollEnd, "Word heat on source"],
        [spec.returnEnd ?? spec.frames - 1, "Return to answer"],
      ].map(([offset, reason]) => ({
        frame: 450 + shot.start + Number(offset),
        reason: `${shot.id}: ${reason}`,
      }));
    }),
    { frame: 450 + plan.resume, reason: "Both logs resume" },
    { frame: 16406 - 200, reason: "Closing mark" },
  ].sort((a, b) => a.frame - b.frame);
  await mediaCommand("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-i",
    video,
    "-vf",
    "fps=1,scale=384:216,tile=4x4",
    path.join(output, "overview-%02d.png"),
  ]);
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const first = Math.max(0, event.frame - 30);
    const file = `event-${String(i + 1).padStart(2, "0")}-${event.frame}.png`;
    await mediaCommand("ffmpeg", [
      "-v",
      "error",
      "-y",
      "-ss",
      String(first / 60),
      "-i",
      video,
      "-t",
      "1",
      "-vf",
      "fps=12,scale=426:240,tile=4x3",
      "-frames:v",
      "1",
      path.join(output, file),
    ]);
    Object.assign(event, { file, firstFrame: first, sampleStepFrames: 5 });
  }
  await writeFile(
    path.join(output, "manifest.json"),
    JSON.stringify(
      {
        video,
        sha256: await videoHash(video),
        overview:
          "1 fps, 16 seconds per sheet, left to right then top to bottom",
        events,
        status: "extracted, not automatically approved",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(output);
}
await main();
