import { readFile, writeFile, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { inspectionPlan } from "./inspection-plan";
import { campaigns, type CampaignId } from "../native/campaign-catalog";
import { mediaCommand, verifyVideo, encodeArgs } from "./video-tools";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const originals = {
  tahoe: {
    file: "ndp-clio-pitch-v3.mp4",
    frames: 5520,
    sha256: "b95d88d561e301d303eaa6ad11be7c54778d016310fa7d9655ebe066d08388a4",
    output: "ndp-clio-tahoe-v4.mp4",
  },
  alta: {
    file: "ndp-clio-alta-v1.mp4",
    frames: 5880,
    sha256: "5e82b661b07de897631c8bd6c396a8fd9685af3e2d8b0051a2388341299d097c",
    output: "ndp-clio-alta-v2.mp4",
  },
  konza: {
    file: "ndp-clio-konza-v1.mp4",
    frames: 5940,
    sha256: "6c461dfee4bf4196ae77b711abe30e904359205836bfa7c06e70dbcc8ac265b1",
    output: "ndp-clio-konza-v2.mp4",
  },
};
const storyFile = path.join(root, "story/ndp-connected.json");
const story = JSON.parse(await readFile(storyFile, "utf8"));
for (const id of ["tahoe", "alta", "konza"] as CampaignId[]) {
  if (process.argv.length > 2 && !process.argv.slice(2).includes(id)) continue;
  const original = originals[id],
    source = path.join(root, "out", original.file);
  const checked = await verifyVideo(source, original.frames);
  if (checked.sha256 !== original.sha256)
    throw new Error("Original moving source changed: " + source);
  const scene = JSON.parse(
    await readFile(
      path.join(root, "native/public", campaigns[id].sceneFile),
      "utf8",
    ),
  );
  const jobs = inspectionPlan(id, scene.view.messages);
  const args = ["-y", "-v", "error", "-i", source];
  const movingReplacements = [];
  for (const job of jobs) {
    const shot = path.join(root, "out/inspections", job.id + ".mp4");
    movingReplacements.push({
      ...job,
      ...(await verifyVideo(shot, job.shotFrames)),
    });
    args.push("-i", shot);
  }
  const filters: string[] = [],
    parts: string[] = [];
  let cursor = 0;
  const add = (input: number, start: number, end: number) => {
    if (end <= start) return;
    const name = "p" + parts.length;
    filters.push(
      `[${input}:v]trim=start_frame=${start}:end_frame=${end},setpts=PTS-STARTPTS,settb=expr=1/60,format=yuv420p[${name}]`,
    );
    parts.push(`[${name}]`);
  };
  jobs.forEach((job, index) => {
    add(0, cursor, job.oldStart);
    add(index + 1, 0, job.shotFrames);
    cursor = job.oldStart + job.oldFrames;
  });
  add(0, cursor, original.frames);
  filters.push(`${parts.join("")}concat=n=${parts.length}:v=1:a=0[out]`);
  const target = path.join(root, "out", original.output);
  console.log("CONFORM " + id);
  await mediaCommand("ffmpeg", [
    ...args,
    "-filter_complex",
    filters.join(";"),
    "-map",
    "[out]",
    ...encodeArgs,
    target,
  ]);
  const expected =
    original.frames +
    jobs.reduce((sum, j) => sum + j.shotFrames - j.oldFrames, 0);
  const verification = await verifyVideo(target, expected);
  await mediaCommand("ffmpeg", [
    "-v",
    "error",
    "-i",
    target,
    "-f",
    "null",
    "-",
  ]);
  await writeFile(
    target + ".json",
    JSON.stringify(
      { source: original, replacements: movingReplacements, ...verification },
      null,
      2,
    ) + "\n",
  );
  const clip = story.segments.find(
    (value: { campaign?: string }) => value.campaign === id,
  );
  Object.assign(clip, {
    file: original.output,
    sha256: verification.sha256,
    sourceFrames: expected,
  });
  if (id === "tahoe") {
    clip.inFrame = 120;
    clip.outFrame = expected - 180;
    clip.holdFrames = 0;
  }
  if (id === "alta") {
    clip.inFrame = 120;
    clip.outFrame = expected - 180;
  }
  if (id === "konza") {
    clip.inFrame = 120;
    clip.outFrame = expected - 180;
  }
  console.log("VERIFIED " + original.output + " " + expected + " frames");
}
story.editorial.cuts =
  "Each case retains its first two questions, including native control changes and generated results. The Tahoe follow-up includes plot-to-table selection. Short source-organization bridges connect the independent sessions.";
await writeFile(storyFile + ".tmp", JSON.stringify(story, null, 2) + "\n");
await rename(storyFile + ".tmp", storyFile);
