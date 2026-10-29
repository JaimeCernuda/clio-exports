import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  inspectionBoundaries,
  parseFrameDifferences,
  type InspectionActor,
} from "./frame-review";
import { mediaCommand, verifyVideo } from "./video-tools";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { values } = parseArgs({
  options: {
    video: { type: "string" },
    scan: { type: "string" },
    out: { type: "string" },
  },
});
const video = path.resolve(
  values.video ?? path.join(root, "out/ndp-clio-connected-v1.mp4"),
);
const target = path.resolve(
  values.out ?? path.join(root, "review/connected-joins.json"),
);
const scan = JSON.parse(
  await readFile(
    path.resolve(
      values.scan ?? path.join(root, "review/connected-motion-review.json"),
    ),
    "utf8",
  ),
);
const receipt = JSON.parse(await readFile(video + ".json", "utf8"));
const checked = await verifyVideo(video, receipt.frames);
if (checked.sha256 !== receipt.sha256 || checked.sha256 !== scan.sha256)
  throw new Error("Film, receipt and motion scan do not match");
if (typeof scan.metadataFile !== "string")
  throw new Error("Run review-connected.ts to generate frame metadata first");
const rows = parseFrameDifferences(
  await readFile(path.resolve(root, scan.metadataFile), "utf8"),
  receipt.frames,
);
const joins = [];
await mkdir(path.dirname(target), { recursive: true });
for (const segment of receipt.timeline) {
  if (segment.kind !== "clip") continue;
  if (
    !/^[a-z0-9-]+\.mp4$/.test(segment.file) ||
    !/^[a-z0-9-]+$/.test(segment.campaign)
  )
    throw new Error("Invalid actor filename or campaign");
  const actor = JSON.parse(
    await readFile(
      path.join(path.dirname(video), segment.file + ".json"),
      "utf8",
    ),
  );
  const boundaries = inspectionBoundaries(
    segment,
    actor.replacements as InspectionActor[],
  );
  const frames = boundaries.flatMap(({ frame }) => [frame - 1, frame]);
  if (!frames.length) continue;
  for (const boundary of boundaries) {
    if (!rows[boundary.frame])
      throw new Error("Inspection boundary is outside the film");
    joins.push({
      campaign: segment.campaign,
      ...boundary,
      seconds: boundary.frame / 60,
      difference: rows[boundary.frame].difference,
    });
  }
  const sheet = path.join(
    path.dirname(target),
    `connected-joins-${segment.campaign}.jpg`,
  );
  await mediaCommand("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-i",
    video,
    "-vf",
    `select='${frames.map((frame) => `eq(n,${frame})`).join("+")}',scale=640:-1,tile=4x${Math.ceil(frames.length / 4)}`,
    "-frames:v",
    "1",
    sheet,
  ]);
}
await writeFile(target, JSON.stringify(joins, null, 2) + "\n");
console.log(JSON.stringify({ joins: joins.length, report: target }));
