import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildStoryPlan, type StorySpec } from "../src/story-plan";
import { mediaCommand, verifyVideo, encodeArgs } from "./video-tools";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const story = JSON.parse(
  await readFile(path.join(root, "story/ndp-connected.json"), "utf8"),
) as StorySpec;
const plan = buildStoryPlan(story),
  scratch = path.join(root, "out/connected-story"),
  stage = path.join(root, ".native-ui/build/story-media");
const reuseCards = process.argv.includes("--reuse-cards");
await mkdir(scratch, { recursive: true });
await mkdir(stage, { recursive: true });
const cards: Record<string, string> = {
  intro: "NdpStoryIntro",
  "alta-bridge": "NdpStoryAltaBridge",
  "konza-bridge": "NdpStoryKonzaBridge",
  outro: "NdpStoryOutro",
};
for (const segment of plan.segments) {
  const target = path.join(scratch, segment.id + ".mp4");
  if (segment.kind === "card" && reuseCards) {
    console.log("REUSE BRIDGE " + segment.cardId);
  } else if (segment.kind === "card") {
    console.log("BRIDGE " + segment.cardId);
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          path.join(root, "render.mjs"),
          "video",
          "--composition",
          cards[segment.cardId],
          "--scale",
          "1",
          "--concurrency",
          "6",
          "--output",
          target,
        ],
        { cwd: root, stdio: "inherit" },
      );
      child.on("error", reject);
      child.on("exit", (code) =>
        code === 0
          ? resolve()
          : reject(new Error("Bridge render failed " + segment.cardId)),
      );
    });
  } else {
    const source = path.join(root, "out", segment.file),
      checked = await verifyVideo(source, segment.sourceFrames);
    if (checked.sha256 !== segment.sha256)
      throw new Error("Moving actor hash mismatch " + segment.file);
    await copyFile(source, path.join(stage, segment.file));
    await mediaCommand("ffmpeg", [
      "-y",
      "-v",
      "error",
      "-i",
      source,
      "-vf",
      `trim=start_frame=${segment.inFrame}:end_frame=${segment.outFrame},setpts=PTS-STARTPTS,fps=60,settb=expr=1/60,tpad=stop_mode=clone:stop=${segment.holdFrames}`,
      ...encodeArgs,
      target,
    ]);
  }
  await verifyVideo(target, segment.frames);
}
const inputs = plan.segments.flatMap((s) => [
  "-i",
  path.join(scratch, s.id + ".mp4"),
]);
const filters: string[] = [];
for (let index = 1; index < plan.segments.length; index++) {
  const previous = index === 1 ? "0:v" : `fade${index - 1}`;
  filters.push(
    `[${previous}][${index}:v]xfade=transition=fade:duration=${story.crossfadeFrames / story.fps}:offset=${plan.segments[index].start / story.fps}[fade${index}]`,
  );
}
const target = path.join(root, "out/ndp-clio-connected-v1.mp4");
console.log("ASSEMBLE " + plan.frames + " frames");
await mediaCommand("ffmpeg", [
  "-y",
  "-v",
  "error",
  ...inputs,
  "-filter_complex_threads",
  "1",
  "-filter_complex",
  filters.join(";"),
  "-map",
  `[fade${plan.segments.length - 1}]`,
  ...encodeArgs,
  target,
]);
const verification = await verifyVideo(target, plan.frames);
await mediaCommand("ffmpeg", ["-v", "error", "-i", target, "-f", "null", "-"]);
await writeFile(
  target + ".json",
  JSON.stringify(
    { ...verification, timeline: plan.segments, source: story },
    null,
    2,
  ) + "\n",
);
console.log("DONE " + target);
