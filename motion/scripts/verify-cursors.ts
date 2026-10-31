import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cursorAt } from "../native/cursor-plan";
import type { CursorCompositeProps } from "../src/CursorComposite";
import type { InspectionJob } from "./compose-cursor";
import { verifyVideo } from "./video-tools";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = path.join(root, "out/inspections");
const jobs = JSON.parse(
  await readFile(path.join(directory, "plan.json"), "utf8"),
) as InspectionJob[];
const sourceSha256 = createHash("sha256")
  .update(await readFile(path.join(root, "native/cursor-plan.ts")))
  .digest("hex");
for (const job of jobs) {
  const file = path.join(directory, job.id + ".mp4");
  const props = JSON.parse(
    await readFile(path.join(directory, job.id + ".cursor.props.json"), "utf8"),
  ) as CursorCompositeProps;
  const receipt = JSON.parse(await readFile(file + ".json", "utf8"));
  let maximumStep = 0;
  for (let frame = 1; frame < job.shotFrames; frame++) {
    const a = cursorAt(props.track, frame - 1, job.shotFrames),
      b = cursorAt(props.track, frame, job.shotFrames);
    maximumStep = Math.max(maximumStep, Math.hypot(a.x - b.x, a.y - b.y));
  }
  if (maximumStep > 60)
    throw new Error(`Pointer discontinuity in ${job.id}: ${maximumStep}`);
  Object.assign(receipt, await verifyVideo(file, job.shotFrames));
  Object.assign(receipt.cursor, {
    maximumStep,
    sourceSha256,
    method:
      "Native DOM endpoints; short smooth speed ramps, steady travel, matched slider drags, fixed action times.",
  });
  await writeFile(file + ".json", JSON.stringify(receipt, null, 2) + "\n");
  console.log(job.id + ": " + maximumStep.toFixed(2) + " px/frame");
}
