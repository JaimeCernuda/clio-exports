import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createReadStream, constants } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  demoPlan,
  type DemoScene,
  type DemoSpec,
} from "../native/current/demo-model";
import { sceneAssetPath } from "../native/scene-selection";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [
  manifest = "demos/tahoe-current.json",
  name = "out/current-ui/tahoe-current.mp4",
] = process.argv.slice(2);
sceneAssetPath(manifest);
const movie = path.resolve(root, name);
if (
  !movie.startsWith(path.join(root, "out") + path.sep) ||
  !movie.endsWith(".mp4")
)
  throw new Error("Repair only generated MP4s inside motion/out");
async function hash(file: string): Promise<string> {
  const digest = createHash("sha256");
  for await (const bytes of createReadStream(file)) digest.update(bytes);
  return digest.digest("hex");
}
const spec = JSON.parse(
  await readFile(path.join(root, "native/public", manifest), "utf8"),
) as DemoSpec;
sceneAssetPath(spec.sceneFile);
const scene = JSON.parse(
  await readFile(path.join(root, "native/public", spec.sceneFile), "utf8"),
) as DemoScene;
const plan = demoPlan(spec, scene);
const originalReceipt = JSON.parse(await readFile(movie + ".json", "utf8"));
if (
  originalReceipt.sessionId !== spec.sessionId ||
  originalReceipt.source.sha256 !== spec.sourceSha256 ||
  originalReceipt.frames !== spec.frames ||
  originalReceipt.sha256 !== (await hash(movie))
)
  throw new Error(
    "The base movie receipt does not match this manifest and file",
  );
const ranges = plan.events
  .filter((event) => event.type === "tool" && event.toolId)
  .map((event) => ({ start: event.start, end: event.revealEnd }));
if (!ranges.length) throw new Error("No tool ranges to repair");
const sourceFrames = ranges.flatMap((range) =>
  Array.from({ length: range.end - range.start }, (_, i) => range.start + i),
);
const work = path.join(root, ".native-ui/current-tool-clock-repair");
await mkdir(work, { recursive: true });
process.env.TEMP = work;
process.env.TMP = work;
process.env.TMPDIR = work;
const props = path.join(work, "props.json"),
  patch = path.join(work, "tools.mp4"),
  fixed = path.join(work, "conformed.mp4");
await writeFile(
  props,
  JSON.stringify({
    demoFile: manifest,
    sceneFile: spec.sceneFile,
    frames: spec.frames,
    sourceFrames,
  }),
);
execFileSync(
  process.execPath,
  [
    path.join(root, "render.mjs"),
    "video",
    "--composition",
    "ClioCurrentDemo",
    "--props",
    props,
    "--scale",
    "1",
    "--concurrency",
    "1",
    "--output",
    patch,
  ],
  { cwd: root, stdio: "inherit" },
);
const graph: string[] = [];
const labels: string[] = [];
let previous = 0,
  patchAt = 0;
function segment(input: number, start: number, end: number): void {
  if (end <= start) return;
  const label = `p${labels.length}`;
  labels.push(`[${label}]`);
  graph.push(
    `[${input}:v]trim=start_frame=${start}:end_frame=${end},setpts=PTS-STARTPTS[${label}]`,
  );
}
for (const range of ranges) {
  if (
    range.start < previous ||
    range.end > spec.frames ||
    range.end <= range.start
  )
    throw new Error("Invalid repair ranges");
  segment(0, previous, range.start);
  segment(1, patchAt, patchAt + range.end - range.start);
  patchAt += range.end - range.start;
  previous = range.end;
}
segment(0, previous, spec.frames);
graph.push(`${labels.join("")}concat=n=${labels.length}:v=1:a=0[out]`);
execFileSync(
  "ffmpeg",
  [
    "-v",
    "error",
    "-y",
    "-i",
    movie,
    "-i",
    patch,
    "-filter_complex",
    graph.join(";"),
    "-map",
    "[out]",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "16",
    "-pix_fmt",
    "yuv420p",
    "-r",
    "60",
    "-an",
    "-color_range",
    "tv",
    "-colorspace",
    "bt709",
    "-color_primaries",
    "bt709",
    "-color_trc",
    "bt709",
    "-movflags",
    "+faststart",
    fixed,
  ],
  { stdio: "inherit" },
);
const probe = JSON.parse(
  execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-count_frames",
      "-select_streams",
      "v:0",
      "-show_streams",
      "-of",
      "json",
      fixed,
    ],
    { encoding: "utf8" },
  ),
).streams[0];
if (
  Number(probe.nb_read_frames) !== spec.frames ||
  probe.avg_frame_rate !== "60/1" ||
  probe.width !== 1920 ||
  probe.height !== 1080
)
  throw new Error("Conformed video frame geometry/count mismatch");
execFileSync(
  "ffmpeg",
  ["-v", "error", "-xerror", "-i", fixed, "-f", "null", "-"],
  { stdio: "inherit" },
);
const report = {
  schema: "clio.demo-tool-clock-repair.v1",
  manifest,
  sourceSha256: scene.source.sha256,
  ranges,
  sourceFrames,
  frames: spec.frames,
  originalSha256: await hash(movie),
  patchSha256: await hash(patch),
  sha256: await hash(fixed),
  captureHtmlSha256: createHash("sha256")
    .update(await (await fetch("http://127.0.0.1:3372/")).text())
    .digest("hex"),
};
const review = path.join(path.dirname(movie), "review");
await mkdir(review, { recursive: true });
await copyFile(
  movie,
  path.join(review, path.basename(movie, ".mp4") + "-before-clock-fix.mp4"),
  constants.COPYFILE_EXCL,
);
await copyFile(fixed, movie);
await writeFile(
  movie + ".clock-repair.json",
  JSON.stringify(report, null, 2) + "\n",
);
const receipt = JSON.parse(await readFile(movie + ".json", "utf8"));
receipt.baseSha256 = receipt.sha256;
receipt.sha256 = report.sha256;
receipt.clockRepair = path.basename(movie) + ".clock-repair.json";
await writeFile(movie + ".json", JSON.stringify(receipt, null, 2) + "\n");
console.log(
  JSON.stringify({
    repairedFrames: sourceFrames.length,
    frames: spec.frames,
    sha256: report.sha256,
  }),
);
