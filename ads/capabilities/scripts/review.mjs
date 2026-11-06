/** Check actual encoded movies and extract time-ordered visual inspection sequences. */
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
const root = path.resolve(import.meta.dirname, ".."),
  require = createRequire(import.meta.url);
const { PNG } = require("pngjs"),
  jsQR = require("jsqr");
const manifest = JSON.parse(
  await fs.readFile(path.join(root, "output/manifest.json"), "utf8"),
);
const args = process.argv.slice(2),
  draft = args.includes("--draft");
const chosen = manifest.filter(
  (f) =>
    f.width === (draft ? 960 : 1920) &&
    (!args.some((a) => !a.startsWith("--")) || args.includes(f.id)),
);
const records = [];
if (!chosen.length) throw new Error("No matching rendered films to verify");
for (const film of chosen) {
  const input = path.join(root, "output", film.filename),
    directory = path.join(root, "review", film.id + (draft ? "-draft" : ""));
  await fs.mkdir(directory, { recursive: true });
  const probe = JSON.parse(
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
        input,
      ],
      { encoding: "utf8", maxBuffer: 4e6 },
    ),
  );
  const video = probe.streams.find((s) => s.codec_type === "video"),
    audio = probe.streams.find((s) => s.codec_type === "audio");
  if (
    video.width !== film.width ||
    video.height !== film.height ||
    video.r_frame_rate !== "60/1" ||
    Number(video.nb_read_frames) !== film.frames
  )
    throw new Error(`Wrong video parameters: ${film.id}`);
  if (!audio) throw new Error(`Missing audio: ${film.id}`);
  if (Math.abs(Number(probe.format.duration) - film.seconds) > 0.05)
    throw new Error(`Duration drift: ${film.id}`);
  execFileSync("ffmpeg", ["-v", "error", "-i", input, "-f", "null", "-"], {
    stdio: ["ignore", "ignore", "pipe"],
  });
  const ff = (a) =>
    execFileSync("ffmpeg", ["-v", "error", "-y", ...a], {
      stdio: ["ignore", "ignore", "pipe"],
    });
  ff([
    "-i",
    input,
    "-vf",
    "fps=1,scale=480:270,tile=4x2",
    "-q:v",
    "2",
    path.join(directory, "timeline-%02d.jpg"),
  ]);
  for (const m of film.markers.slice(1, -1))
    ff([
      "-ss",
      String(Math.max(0, m.at - 0.6)),
      "-i",
      input,
      "-t",
      "1.2",
      "-vf",
      "fps=12,scale=480:270,tile=5x3",
      "-frames:v",
      "1",
      "-q:v",
      "2",
      path.join(directory, `transition-${m.at}.jpg`),
    ]);
  const qr = path.join(directory, "close.png");
  ff(["-ss", String(film.seconds - 3), "-i", input, "-frames:v", "1", qr]);
  const image = PNG.sync.read(await fs.readFile(qr));
  const code = jsQR(
    new Uint8ClampedArray(image.data),
    image.width,
    image.height,
  );
  if (code?.data !== "https://clio.iowarp.ai")
    throw new Error(`QR did not decode: ${film.id}`);
  const last = path.join(directory, "close-last.png");
  ff(["-ss", String(film.seconds - 0.05), "-i", input, "-frames:v", "1", last]);
  const a = PNG.sync.read(await fs.readFile(qr)),
    b = PNG.sync.read(await fs.readFile(last));
  let pixels = 0;
  for (let i = 0; i < a.data.length; i += 4)
    if (
      Math.abs(a.data[i] - b.data[i]) +
        Math.abs(a.data[i + 1] - b.data[i + 1]) +
        Math.abs(a.data[i + 2] - b.data[i + 2]) >
      40
    )
      pixels++;
  // H.264 quantization settles across an otherwise stationary GOP. Structural
  // similarity catches movement without mistaking that codec noise for animation.
  const compared = spawnSync(
    "ffmpeg",
    ["-v", "info", "-i", qr, "-i", last, "-lavfi", "ssim", "-f", "null", "-"],
    { encoding: "utf8" },
  );
  if (compared.status !== 0) throw new Error(compared.stderr);
  const similarity = Number(compared.stderr.match(/All:([0-9.]+)/)?.[1]);
  if (!Number.isFinite(similarity) || similarity < 0.99)
    throw new Error(`Closing card moves: ${film.id}`);
  const bytes = await fs.readFile(input);
  records.push({
    id: film.id,
    file: film.filename,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    frames: Number(video.nb_read_frames),
    duration: Number(probe.format.duration),
    width: video.width,
    height: video.height,
    fullDecode: "passed",
    audio: "present",
    qr: code.data,
    closeChangedPixels: pixels,
    closeStructuralSimilarity: similarity,
    inspection:
      "Time-ordered 1 fps whole-film sheets and 12 fps cue-transition sheets extracted; requires recorded visual findings.",
  });
  console.log("ENCODE CHECKS", film.id);
}
await fs.writeFile(
  path.join(
    root,
    "review",
    draft ? "draft-technical.json" : "final-technical.json",
  ),
  JSON.stringify(records, null, 2) + "\n",
);
