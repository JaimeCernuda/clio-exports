import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { campaigns } from "../native/campaign-catalog";
import {
  bindCursorTrack,
  cursorAt,
  type CursorPose,
} from "../native/cursor-plan";
import { verifyVideo } from "./video-tools";
import type { inspectionPlan } from "./inspection-plan";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export type InspectionJob = ReturnType<typeof inspectionPlan>[number];

/** Run a render sequentially because the authoring entrypoint owns a shared bundle. */
export async function renderComposition(
  composition: string,
  props: string,
  target: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        path.join(root, "render.mjs"),
        "video",
        "--composition",
        composition,
        "--scale",
        "1",
        "--concurrency",
        "6",
        "--props",
        props,
        "--output",
        target,
      ],
      { cwd: root, stdio: "inherit" },
    );
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${composition} exited ${code}`)),
    );
  });
}

/** Composite an editable continuous pointer over a cursor-free native moving capture. */
export async function composeCursor(job: InspectionJob): Promise<void> {
  const directory = path.join(root, "out/inspections"),
    base = path.join(directory, job.id + ".base.mp4");
  const verified = await verifyVideo(base, job.shotFrames);
  const recorded = JSON.parse(
    await readFile(base + ".cursor.raw.json", "utf8"),
  ) as Record<number, CursorPose | null>;
  const samples = Object.fromEntries(
    Object.entries(recorded).map(([frame, point]) => [
      Number(frame) - job.frameOffset,
      point,
    ]),
  );
  const focus = campaigns[job.campaign].focuses.find(
    (f) => job.id === job.campaign + "-" + f.id,
  )!;
  const track = bindCursorTrack(focus, samples);
  let maximumStep = 0;
  for (let f = 1; f < job.shotFrames; f++) {
    const before = cursorAt(track, f - 1, job.shotFrames),
      after = cursorAt(track, f, job.shotFrames);
    maximumStep = Math.max(
      maximumStep,
      Math.hypot(after.x - before.x, after.y - before.y),
    );
  }
  if (maximumStep > 60)
    throw new Error(
      `Pointer travel is too fast in ${job.id}: ${maximumStep}px/frame`,
    );
  const stage = path.join(root, ".native-ui/build/inspection-media");
  await mkdir(stage, { recursive: true });
  await copyFile(base, path.join(stage, path.basename(base)));
  const props = path.join(directory, job.id + ".cursor.props.json");
  await writeFile(
    props,
    JSON.stringify(
      {
        video: "http://127.0.0.1:3357/inspection-media/" + path.basename(base),
        frames: job.shotFrames,
        track,
      },
      null,
      2,
    ) + "\n",
  );
  const target = path.join(directory, job.id + ".mp4");
  await renderComposition("NdpCursorComposite", props, target);
  await writeFile(
    target + ".json",
    JSON.stringify(
      {
        ...job,
        ...(await verifyVideo(target, job.shotFrames)),
        base: verified,
        cursor: {
          track,
          maximumStep,
          method:
            "Native DOM endpoints, one deterministic path with short speed ramps and steady travel. Slider drags follow the data-control easing.",
        },
      },
      null,
      2,
    ) + "\n",
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const jobs = JSON.parse(
    await readFile(path.join(root, "out/inspections/plan.json"), "utf8"),
  ) as InspectionJob[];
  for (const job of jobs)
    if (!process.argv.slice(2).length || process.argv.slice(2).includes(job.id))
      await composeCursor(job);
}
