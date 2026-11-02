import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { assets } from "../src/assets";
process.chdir(path.resolve(import.meta.dirname, ".."));
const reports = [];
for (const asset of assets) {
  const folder = path.join(asset.folder, "output"),
    manifest = JSON.parse(
      readFileSync(path.join(folder, "manifest.json"), "utf8"),
    );
  const formats = [];
  for (const name of ["loop.mp4", "loop.webm", "loop.gif"]) {
    const file = path.join(folder, name),
      record = manifest.files.find(
        (item: { name: string }) => item.name === name,
      ),
      data = readFileSync(file);
    assert.equal(
      createHash("sha256").update(data).digest("hex"),
      record.sha256,
    );
    const meta = JSON.parse(
        execFileSync(
          "ffprobe",
          [
            "-v",
            "error",
            "-count_frames",
            "-show_streams",
            "-show_format",
            "-of",
            "json",
            file,
          ],
          { encoding: "utf8" },
        ),
      ),
      stream = meta.streams.find(
        (s: { codec_type: string }) => s.codec_type === "video",
      ),
      gif = name.endsWith("gif"),
      frames = gif ? (asset.frames / asset.fps) * asset.gifFps : asset.frames;
    assert.equal(Number(stream.nb_read_frames), frames);
    assert.equal(stream.width, gif ? asset.gifWidth : asset.width);
    assert.ok(
      Math.abs(Number(meta.format.duration) - asset.frames / asset.fps) < 0.06,
    );
    assert.ok(
      !meta.streams.some(
        (s: { codec_type: string }) => s.codec_type === "audio",
      ),
    );
    execFileSync("ffmpeg", ["-v", "error", "-i", file, "-f", "null", "-"], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    const width = asset.folder === "plugin-composition" ? 420 : 360,
      height = Math.round((width * asset.height) / asset.width),
      size = width * height,
      pixels = execFileSync(
        "ffmpeg",
        [
          "-v",
          "error",
          "-i",
          file,
          "-vf",
          `scale=${width}:${height},format=gray`,
          "-fps_mode",
          "passthrough",
          "-f",
          "rawvideo",
          "-",
        ],
        { maxBuffer: 256 * 1024 * 1024 },
      );
    assert.equal(pixels.length, size * frames);
    let minMean = 255,
      backgroundMin = 255,
      seam = 0;
    for (let i = 0; i < size; i++)
      seam += Math.abs(pixels[i] - pixels[(frames - 1) * size + i]);
    seam /= size;
    for (let f = 0; f < frames; f++) {
      if (gif)
        for (let x = 0; x < width; x++)
          backgroundMin = Math.min(backgroundMin, pixels[f * size + x]);
      let sum = 0;
      for (let i = 0; i < size; i++) sum += pixels[f * size + i];
      minMean = Math.min(minMean, sum / size);
    }
    assert.ok(seam < 1, `${file}: visible loop join (${seam})`);
    assert.ok(minMean > 215, `${file}: unexpectedly dark or broken frame`);
    if (gif)
      assert.ok(
        backgroundMin >= 254,
        `${file}: dither appeared in the white margin`,
      );
    formats.push({
      file,
      bytes: data.length,
      frames,
      duration: Number(meta.format.duration),
      seamMeanDifference: seam,
      minFrameLuminance: minMean,
      gifBackgroundMin: gif ? backgroundMin : undefined,
      decode: "passed",
    });
  }
  const poster = PNG.sync.read(readFileSync(path.join(folder, "poster.png")));
  assert.equal(poster.width, asset.width);
  assert.equal(poster.height, asset.height);
  reports.push({
    id: asset.id,
    formats,
    poster: { width: poster.width, height: poster.height },
  });
}
mkdirSync("review", { recursive: true });
writeFileSync(
  "review/verification.json",
  JSON.stringify(
    {
      assets: reports,
      reviewBoundary:
        "Full media decode and seam/frame checks; sampled visual review remains separate.",
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify(reports, null, 2));
