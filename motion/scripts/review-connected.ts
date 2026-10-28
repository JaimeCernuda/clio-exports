import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { parseFrameDifferences } from "./frame-review";
import { mediaCommand, verifyVideo } from "./video-tools";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { values } = parseArgs({
  options: { video: { type: "string" }, out: { type: "string" } },
});
const video = path.resolve(
  values.video ?? path.join(root, "out/ndp-clio-connected-v1.mp4"),
);
const target = path.resolve(
  values.out ?? path.join(root, "review/connected-motion-review.json"),
);
const receipt = JSON.parse(await readFile(video + ".json", "utf8"));
const verified = await verifyVideo(video, receipt.frames);
if (verified.sha256 !== receipt.sha256)
  throw new Error("Film differs from its receipt");
await mkdir(path.join(root, "review"), { recursive: true });
await mkdir(path.dirname(target), { recursive: true });
const metadataFile = `review/${path.basename(video).replace(/[^a-z0-9-]/gi, "-")}-frames.txt`;
await mediaCommand(
  "ffmpeg",
  [
    "-y",
    "-v",
    "error",
    "-i",
    video,
    "-vf",
    `scale=960:-1,signalstats,metadata=mode=print:file=${metadataFile}`,
    "-f",
    "null",
    "-",
  ],
  root,
);
const rows = parseFrameDifferences(
  await readFile(path.join(root, metadataFile), "utf8"),
  receipt.frames,
);
const candidates = [...rows]
  .sort((a, b) => b.difference - a.difference)
  .slice(0, 50);
const impulses = rows
  .slice(1, -1)
  .map((row, index) => ({
    ...row,
    impulse:
      row.difference -
      Math.max(rows[index].difference, rows[index + 2].difference),
  }))
  .sort((a, b) => b.impulse - a.impulse)
  .slice(0, 50);
await writeFile(
  target,
  JSON.stringify(
    {
      schema: "clio.connected-motion-review.v1",
      sha256: verified.sha256,
      frames: rows.length,
      metadataFile,
      timeline: receipt.timeline ?? [],
      candidates,
      impulses,
      method:
        "Every adjacent decoded frame at 960px width; differences and isolated impulses flag candidates, not defects or creative approval.",
      review:
        "Pending actual visual and playback review. This script does not generate a verdict.",
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ frames: rows.length, report: target }));
