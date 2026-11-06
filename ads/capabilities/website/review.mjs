/** Verify the actual website encodes, their loop joins, control hits and framing. */
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url),
  { PNG } = require("pngjs");
const root = import.meta.dirname,
  args = process.argv.slice(2).flatMap((a) => a.split(","));
const manifest = JSON.parse(
  await fs.readFile(path.join(root, "manifest.json"), "utf8"),
);
const selected = manifest.filter(
  (a) =>
    !args.length ||
    args.includes("all") ||
    args.includes(a.key) ||
    args.includes(a.id),
);
if (!selected.length) throw new Error("No rendered website assets to inspect");
const ff = (a) =>
  execFileSync("ffmpeg", ["-v", "error", "-y", ...a], {
    stdio: ["ignore", "ignore", "pipe"],
  });
const records = [];
for (const asset of selected) {
  const folder = path.join(root, asset.id, asset.variant, "output"),
    review = path.join(root, "review", asset.key);
  await fs.mkdir(review, { recursive: true });
  for (const file of asset.files) {
    const bytes = await fs.readFile(path.join(folder, file.name));
    if (createHash("sha256").update(bytes).digest("hex") !== file.sha256)
      throw new Error(`File changed: ${asset.key}/${file.name}`);
  }
  const formats = [];
  for (const name of ["loop.mp4", "loop.webm", "loop.gif"]) {
    const file = path.join(folder, name),
      probe = JSON.parse(
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
          { encoding: "utf8", maxBuffer: 2e6 },
        ),
      );
    const v = probe.streams.find((s) => s.codec_type === "video"),
      gif = name.endsWith("gif");
    if (
      v.width !== (gif ? 960 : asset.width) ||
      (!gif && v.height !== asset.height) ||
      probe.streams.some((s) => s.codec_type === "audio")
    )
      throw new Error(`Wrong deployment format: ${asset.key}/${name}`);
    if (
      Math.abs(Number(probe.format.duration) - asset.seconds) >
      (gif ? 0.08 : 0.05)
    )
      throw new Error(`Duration drift: ${asset.key}/${name}`);
    if (!gif && Number(v.nb_read_frames) !== asset.frames)
      throw new Error(`Frame loss: ${asset.key}/${name}`);
    if (
      gif &&
      !Buffer.from(await fs.readFile(file)).includes(Buffer.from("NETSCAPE2.0"))
    )
      throw new Error(`GIF does not loop: ${asset.key}`);
    ff(["-i", file, "-f", "null", "-"]);
    const first = path.join(review, `${name}-first.png`),
      last = path.join(review, `${name}-last.png`);
    ff(["-i", file, "-vf", "select=eq(n\\,0)", "-frames:v", "1", first]);
    ff([
      "-sseof",
      gif ? "-0.04" : String(-1 / asset.fps - 0.001),
      "-i",
      file,
      "-frames:v",
      "1",
      last,
    ]);
    const a = PNG.sync.read(await fs.readFile(first)),
      b = PNG.sync.read(await fs.readFile(last));
    let changed = 0;
    for (let i = 0; i < a.data.length; i += 4)
      if (
        Math.abs(a.data[i] - b.data[i]) +
          Math.abs(a.data[i + 1] - b.data[i + 1]) +
          Math.abs(a.data[i + 2] - b.data[i + 2]) >
        30
      )
        changed++;
    const fraction = changed / (a.width * a.height);
    if (fraction > 0.002)
      throw new Error(
        `Visible loop-join mismatch: ${asset.key}/${name} (${fraction})`,
      );
    const ssim = spawnSync(
      "ffmpeg",
      [
        "-v",
        "info",
        "-i",
        first,
        "-i",
        last,
        "-lavfi",
        "ssim",
        "-f",
        "null",
        "-",
      ],
      { encoding: "utf8" },
    );
    if (ssim.status !== 0) throw new Error(ssim.stderr);
    formats.push({
      name,
      width: v.width,
      height: v.height,
      frames: Number(v.nb_read_frames),
      duration: Number(probe.format.duration),
      audio: false,
      decode: "passed",
      loopChangedFraction: fraction,
      loopSSIM: Number(ssim.stderr.match(/All:([\d.]+)/)?.[1]),
    });
  }
  ff([
    "-i",
    path.join(folder, "loop.mp4"),
    "-vf",
    "fps=2,scale=480:-2,tile=4x3",
    "-q:v",
    "2",
    path.join(review, "timeline-%02d.jpg"),
  ]);
  ff([
    "-i",
    path.join(folder, "loop.gif"),
    "-vf",
    "fps=2,scale=480:-2,tile=4x3",
    "-q:v",
    "2",
    path.join(review, "gif-timeline-%02d.jpg"),
  ]);
  ff([
    "-i",
    path.join(folder, "loop.gif"),
    "-vf",
    "fps=1,scale=400:-2,tile=4x5",
    "-frames:v",
    "1",
    "-q:v",
    "2",
    path.join(review, "whole-gif.jpg"),
  ]);
  const entry = {
    key: asset.key,
    sourceKey: asset.sourceKey,
    files: asset.files,
    formats,
    status: "technical-passed-visual-review-required",
  };
  records.push(entry);
  console.log("WEBSITE CHECKS", asset.key);
}
let previous = [];
try {
  previous = JSON.parse(
    await fs.readFile(path.join(root, "verification.json"), "utf8"),
  );
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
await fs.writeFile(
  path.join(root, "verification.json"),
  JSON.stringify(
    [
      ...previous.filter((p) => !records.some((r) => r.key === p.key)),
      ...records,
    ],
    null,
    2,
  ) + "\n",
);
