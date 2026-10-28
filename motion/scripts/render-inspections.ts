import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inspectionPlan } from "./inspection-plan";
import type { CampaignId } from "../native/campaign-catalog";
import { campaigns } from "../native/campaign-catalog";
import { renderComposition, composeCursor } from "./compose-cursor";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "out/inspections");
await mkdir(out, { recursive: true });
const requested = process.argv.slice(2);
const jobs = [];
for (const id of ["tahoe", "alta", "konza"] as CampaignId[]) {
  const scene = JSON.parse(
    await readFile(path.join(root, `native/public/${id}.native.json`), "utf8"),
  );
  jobs.push(...inspectionPlan(id, scene.view.messages));
}
await writeFile(
  path.join(out, "plan.json"),
  JSON.stringify(jobs, null, 2) + "\n",
);
if (requested.includes("--plan")) {
  console.log(JSON.stringify(jobs, null, 2));
  process.exit(0);
}
for (const job of jobs) {
  if (requested.length && !requested.includes(job.id)) continue;
  const props = path.join(out, job.id + ".props.json");
  await writeFile(
    props,
    JSON.stringify({
      nativeServer: "http://127.0.0.1:3357",
      campaignId: job.campaign,
      frameOffset: job.frameOffset,
      shotFrames: job.shotFrames,
      recordCursor: true,
      inspectionFocus: campaigns[job.campaign].focuses.find(
        (f) => job.id === job.campaign + "-" + f.id,
      ),
    }),
  );
  const target = path.join(out, job.id + ".base.mp4");
  console.log("INSPECTION " + job.id);
  await renderComposition("NdpNativeInspection", props, target);
  await composeCursor(job);
}
