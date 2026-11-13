import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, rename } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import path from "node:path";

const run = promisify(execFile);

/** Put discontinuous replacement frames at their exact original frame positions. */
export function pointerRepairFilter(plan, baseIndex = 0, repairIndex = 1) {
  if (
    !Number.isInteger(plan.first) ||
    !Number.isInteger(plan.end) ||
    plan.end <= plan.first ||
    !plan.ranges?.length
  )
    throw new Error("Invalid repair extent");
  let prior = plan.first,
    count = 0;
  const pieces = [],
    enables = [];
  for (const [a, b] of plan.ranges) {
    if (
      !Number.isInteger(a) ||
      !Number.isInteger(b) ||
      a < prior ||
      b <= a ||
      b > plan.end
    )
      throw new Error("Invalid or overlapping repair interval");
    pieces.push({ end: count + b - a, offset: a - plan.first - count });
    enables.push(`between(n,${a - plan.first},${b - plan.first - 1})`);
    count += b - a;
    prior = b;
  }
  let expression = `N+${pieces.at(-1).offset}`;
  for (let i = pieces.length - 2; i >= 0; i--)
    expression = `if(lt(N,${pieces[i].end}),N+${pieces[i].offset},${expression})`;
  return {
    frames: count,
    graph: `[${repairIndex}:v]settb=1/60,setpts='${expression}'[patch];[${baseIndex}:v][patch]overlay=eof_action=pass:repeatlast=1:enable='${enables.join("+")}'[repaired]`,
  };
}

/** Decode and qualify every frame count before accepting a source or delivery. */
async function probe(file, frames) {
  const data = JSON.parse(
    (
      await run("ffprobe", [
        "-v",
        "error",
        "-count_frames",
        "-show_streams",
        "-of",
        "json",
        file,
      ])
    ).stdout,
  );
  const video = data.streams.find((s) => s.codec_type === "video");
  if (
    video.width !== 1920 ||
    video.height !== 1080 ||
    video.avg_frame_rate !== "60/1" ||
    Number(video.nb_read_frames) !== frames
  )
    throw new Error(`Unqualified repair source: ${file}`);
  return video;
}

async function sha(file) {
  const hash = createHash("sha256");
  for await (const bytes of createReadStream(file)) hash.update(bytes);
  return hash.digest("hex");
}

/** Conform approved intro, retained idle footage and all repaired motion intervals. */
async function main() {
  const plan = JSON.parse(
    await readFile(".native-ui/spotter-v3-pointer-repair.json", "utf8"),
  );
  const base = "out/spotter-v3/spotter-three-steps-full.pending.mp4",
    repair = "out/spotter-v3/spotter-three-steps-repair.mp4",
    intro = "out/spotter-intro-v4.mp4",
    output = "out/spotter-v3/spotter-three-steps-full.mp4";
  const pending = output.replace(/\.mp4$/, ".conform.pending.mp4");
  const filter = pointerRepairFilter(plan, 1, 2),
    bodyFrames = plan.end - plan.first;
  await probe(base, bodyFrames);
  await probe(repair, filter.frames);
  await probe(intro, 480);
  const repairReceipt = JSON.parse(await readFile(repair + ".json", "utf8"));
  await run("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-i",
    intro,
    "-i",
    base,
    "-i",
    repair,
    "-filter_complex",
    filter.graph +
      ";[0:v]setsar=1,setpts=PTS-STARTPTS[i];[repaired]setsar=1,setpts=PTS-STARTPTS[b];[i][b]concat=n=2:v=1:a=0[v]",
    "-map",
    "[v]",
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "16",
    "-pix_fmt",
    "yuv420p",
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
    pending,
  ]);
  const video = await probe(pending, bodyFrames + 480);
  await rename(pending, output);
  const ledger = JSON.parse(
    await readFile("../videos/spotter-opal/v3/source-projection.json", "utf8"),
  );
  await writeFile(
    output + ".json",
    JSON.stringify(
      {
        schema: "clio.spotter-v3-render.v1",
        mode: "full",
        sha256: await sha(output),
        frames: bodyFrames + 480,
        bodyFrames,
        fps: 60,
        width: 1920,
        height: 1080,
        sourceSha256: ledger.source.sha256,
        ui: repairReceipt.ui,
        errors: [],
        video,
        markers: ledger.editorial.markers
          .filter(([s]) => s >= 7)
          .map(([s, label]) => [s + 1, label]),
        approvedIntro: {
          sha256: await sha(intro),
          frames: 480,
          source: "src/SpotterIntro.tsx",
          deliveryOffsetSeconds: 1,
        },
        pointerRepair: {
          reason: plan.reason,
          baseSha256: await sha(base),
          repairSha256: await sha(repair),
          ranges: plan.ranges,
          handles: plan.handles,
          frames: filter.frames,
          pointerAudit: repairReceipt.pointerAudit,
          independentPagePixelParity: repairReceipt.independentPagePixelParity,
        },
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify({ output, frames: bodyFrames + 480 }));
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
)
  await main();
