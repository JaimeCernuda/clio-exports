import assert from "node:assert/strict";
import test from "node:test";
import { flashMeasure } from "../scripts/scan-video-flashes";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mediaCommand, videoHash } from "../scripts/video-tools";

test("an isolated paint flash differs from a sustained transition or ordinary progression", () => {
  const a = Uint8Array.from([10, 20, 30]),
    b = Uint8Array.from([100, 110, 120]);
  const flash = flashMeasure(a, b, a);
  assert.equal(flash.amplitude, 90);
  assert.equal(flash.ratio, 0);
  assert.equal(flashMeasure(a, b, b).amplitude, 0);
  assert.equal(
    flashMeasure(
      a,
      Uint8Array.from([11, 21, 31]),
      Uint8Array.from([12, 22, 32]),
    ).ratio,
    2,
  );
  assert.throws(() => flashMeasure(a, b, new Uint8Array()), /equally sized/);
});

test("the flash scanner decodes every real encoded frame and rejects incomplete coverage", async () => {
  const motion = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const base = path.join(motion, ".native-ui/tmp");
  await mkdir(base, { recursive: true });
  const root = await mkdtemp(path.join(base, "flash-scan-test-"));
  try {
    const movie = path.join(root, "constant.mkv");
    await mediaCommand("ffmpeg", [
      "-v",
      "error",
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=white:s=16x16:r=60",
      "-frames:v",
      "6",
      "-c:v",
      "ffv1",
      movie,
    ]);
    const cli = [
      path.join(motion, "node_modules/tsx/dist/cli.mjs"),
      path.join(motion, "scripts/scan-video-flashes.ts"),
      movie,
    ];
    await mediaCommand(process.execPath, [...cli, "6"], motion);
    const receipt = JSON.parse(
      await readFile(movie + ".flash-scan.json", "utf8"),
    );
    assert.equal(receipt.frames, 6);
    assert.equal(receipt.sha256, await videoHash(movie));
    assert.deepEqual(receipt.candidates, []);
    await assert.rejects(
      mediaCommand(process.execPath, [...cli, "7"], motion),
      /Incomplete flash scan/,
    );
  } finally {
    if (!path.resolve(root).startsWith(path.resolve(base) + path.sep))
      throw new Error("Refusing cleanup outside the owned test directory");
    await rm(root, { recursive: true, force: true });
  }
});
