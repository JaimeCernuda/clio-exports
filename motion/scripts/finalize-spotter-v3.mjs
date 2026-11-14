import { rename, readFile, writeFile, unlink } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";

/** Promote an already-qualified movie without deleting the prior final if Windows holds it open. */
export async function promoteVideo(
  pending,
  target,
  { renameFile = rename, retries = 20, delayMs = 100 } = {},
) {
  for (let attempt = 0; ; attempt++) {
    try {
      await renameFile(pending, target);
      return;
    } catch (error) {
      if (
        !["EPERM", "EACCES", "EBUSY"].includes(error.code) ||
        attempt >= retries
      )
        throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function sha(file) {
  const hash = createHash("sha256");
  for await (const bytes of createReadStream(file)) hash.update(bytes);
  return hash.digest("hex");
}

/** Recover only a finished clean conform after a blocked promotion; never recapture or reencode. */
async function main() {
  const compact = process.argv.includes("--notebook-compact");
  const notebook = compact || process.argv.includes("--notebook");
  const bodyEnd = compact ? 216 : 210;
  const totalFrames = (bodyEnd - 7) * 60 + 480;
  const target = `out/${compact ? "spotter-v3-notebook-compact" : notebook ? "spotter-v3-notebook" : "spotter-v3"}/spotter-three-steps-full.mp4`,
    pending = target.replace(/\.mp4$/, ".conform.pending.mp4");
  const run = promisify(execFile);
  const video = JSON.parse(
    (
      await run("ffprobe", [
        "-v",
        "error",
        "-count_frames",
        "-show_streams",
        "-of",
        "json",
        pending,
      ])
    ).stdout,
  ).streams.find((s) => s.codec_type === "video");
  assert.equal(video.width, 1920);
  assert.equal(video.height, 1080);
  assert.equal(video.avg_frame_rate, "60/1");
  assert.equal(Number(video.nb_read_frames), totalFrames);
  assert.equal(Number(video.duration), bodyEnd + 1);
  const poses = JSON.parse(
    await readFile(target + ".pointer-poses.json", "utf8"),
  );
  assert.equal(poses.length, totalFrames - 480);
  let maximumPixelsPerFrame = 0;
  poses.forEach((p, index) => {
    assert.equal(p.frame, 420 + index);
    assert.equal(p.paintedFrame, p.frame);
    assert.equal(p.count, 1);
    const phase = Math.max(
      0,
      Math.min(1, p.frame / 60 - (compact ? 210 : 204)),
    );
    assert.ok(
      Math.abs(p.opacity - (1 - phase * phase * (3 - 2 * phase))) < 0.001,
    );
    assert.ok(
      Math.abs(p.x - p.expectedX) < 0.05 && Math.abs(p.y - p.expectedY) < 0.05,
    );
    if (index)
      maximumPixelsPerFrame = Math.max(
        maximumPixelsPerFrame,
        Math.hypot(p.x - poses[index - 1].x, p.y - poses[index - 1].y),
      );
  });
  assert.ok(maximumPixelsPerFrame <= 30.1);
  const parity = JSON.parse(
    (
      await readFile(
        compact
          ? ".native-ui/spotter-compact-full.log"
          : notebook
            ? ".native-ui/spotter-notebook-full.log"
            : ".native-ui/spotter-v3-full-clean.log",
        "utf8",
      )
    )
      .split(/\r?\n/)
      .find((line) => line.startsWith('{"pixelParity":')),
  ).pixelParity;
  assert.equal(parity.length, compact ? 32 : 24);
  assert.ok(parity.every((p) => p.same));
  const ledger = JSON.parse(
    await readFile("../videos/spotter-opal/v3/source-projection.json", "utf8"),
  );
  const intro = notebook
    ? "out/spotter-intro-notebook-v1.mp4"
    : "out/spotter-intro-v4.mp4";
  const receipt = {
    schema: "clio.spotter-v3-render.v1",
    mode: "full",
    sha256: await sha(pending),
    ui: JSON.parse(await readFile("native/source-current.json", "utf8")),
    ...(notebook
      ? {
          presentation: {
            theme: "light",
            family: "Notebook",
            heatStyleRevision: "075c0581f1f9ef15d6206b0339e7c105889a546f",
            heatDefault: "Words / Max",
            scope:
              "Native pinned shell with scoped heat-style backport; unchanged recorded attention",
          },
        }
      : {}),
    sourceSha256: ledger.source.sha256,
    frames: totalFrames,
    bodyFrames: totalFrames - 480,
    fps: 60,
    width: 1920,
    height: 1080,
    ranges: [[7, bodyEnd]],
    errors: [],
    capturePages: 2,
    independentPagePixelParity: parity,
    sourcePreroll: { leadFrames: 24 },
    pointerAudit: {
      frames: poses.length,
      maximumPixelsPerFrame,
      missingOrStale: 0,
    },
    markers: ledger.editorial.markers
      .filter(([s]) => s >= 7)
      .map(([s, label]) => [s + 1, label]),
    video,
    approvedIntro: {
      file: intro,
      sha256: await sha(intro),
      frames: 480,
      source: "src/SpotterIntro.tsx",
      deliveryOffsetSeconds: 1,
    },
    promotionRecovery:
      "Revalidated the completed clean conform after the prior movie was held open on Windows. No recapture or reencode.",
  };
  await promoteVideo(pending, target);
  await writeFile(target + ".json", JSON.stringify(receipt, null, 2) + "\n");
  await unlink(target.replace(/\.mp4$/, ".pending.mp4"));
  console.log(
    JSON.stringify({
      output: path.resolve(target),
      sha256: receipt.sha256,
      frames: receipt.frames,
      pointerAudit: receipt.pointerAudit,
    }),
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
)
  await main();
