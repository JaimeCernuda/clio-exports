import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { campaigns } from "../native/campaign-catalog";
import { inspectionUiFrame } from "../native/cursor-plan";
import { mediaCommand } from "./video-tools";
import type { InspectionJob } from "./compose-cursor";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jobs = JSON.parse(
  await readFile(path.join(root, "out/inspections/plan.json"), "utf8"),
) as InspectionJob[];
const report = [];
for (const job of jobs) {
  if (process.argv.slice(2).length && !process.argv.slice(2).includes(job.id))
    continue;
  const metadata = `review/${job.id}-ui-holds.txt`;
  await mediaCommand("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-i",
    path.join(root, "out/inspections", job.id + ".base.mp4"),
    "-vf",
    `scale=640:-1,signalstats,metadata=mode=print:file=${metadata}`,
    "-f",
    "null",
    "-",
  ]);
  const values = [
    ...(await readFile(path.join(root, metadata), "utf8")).matchAll(
      /frame:(\d+)[^\n]*pts_time:([\d.]+)[\s\S]*?lavfi.signalstats.YDIF=([\d.eE+-]+)/g,
    ),
  ].map((m) => ({ frame: Number(m[1]), difference: Number(m[3]) }));
  if (values.length !== job.shotFrames)
    throw new Error(`Incomplete UI scan ${job.id}`);
  const focus = campaigns[job.campaign].focuses.find(
    (f) => job.id === job.campaign + "-" + f.id,
  )!;
  const candidates = values.filter(
    (v) =>
      v.frame > 0 &&
      inspectionUiFrame(focus, v.frame) ===
        inspectionUiFrame(focus, v.frame - 1) &&
      v.difference > 0.15,
  );
  report.push({ id: job.id, frames: values.length, candidates });
  console.log(
    job.id +
      ": " +
      candidates.length +
      " unexpected hold-frame differences; max " +
      Math.max(0, ...candidates.map((v) => v.difference)).toFixed(3),
  );
}
await writeFile(
  path.join(root, "review/ui-hold-review.json"),
  JSON.stringify(
    {
      method:
        "Adjacent decoded-frame luma differences during identical native UI states. Differences over0.15 flag review candidates; this is not automatic visual approval.",
      shots: report,
    },
    null,
    2,
  ) + "\n",
);
