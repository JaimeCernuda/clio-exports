import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import {
  assembleEngineeringChunks,
  engineeringProbe,
} from "../scripts/engineering-assembly.mjs";

test("AAC container padding cannot extend joined video or create non-CFR gaps", async () => {
  const parent = path.resolve(".native-ui/engineering-test");
  await mkdir(parent, { recursive: true });
  const work = await mkdtemp(path.join(parent, "assembly-"));
  try {
    const chunks = [0, 1].map((n) => path.join(work, `${n}.mp4`));
    const video = path.join(work, "video.mp4");
    execFileSync("ffmpeg", [
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=teal:s=64x64:r=60:d=0.5",
      "-c:v",
      "libx264",
      video,
    ]);
    for (const chunk of chunks)
      execFileSync("ffmpeg", [
        "-v",
        "error",
        "-i",
        video,
        "-f",
        "lavfi",
        "-i",
        "anullsrc=r=48000:cl=stereo",
        "-t",
        "0.548",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        chunk,
      ]);
    assert.ok(Number(engineeringProbe(chunks[0]).format.duration) > 0.5);
    const output = path.join(work, "joined.mp4");
    const receipt = await assembleEngineeringChunks(chunks, output);
    assert.equal(receipt.frames, 60);
    assert.equal(receipt.duration, 1);
    assert.equal(receipt.fps, 60);
    assert.equal(receipt.audio, "absent");
    execFileSync("ffmpeg", [
      "-v",
      "error",
      "-xerror",
      "-i",
      output,
      "-f",
      "null",
      "-",
    ]);
    await assert.rejects(
      assembleEngineeringChunks(chunks, chunks[0]),
      /overlapping/,
    );
  } finally {
    // This unique test directory is created above and cannot contain user data.
    await rm(work, { recursive: true });
  }
});
