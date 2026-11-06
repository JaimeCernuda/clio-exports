/** Rebuild the procedural soundtrack without re-encoding reviewed video packets. */
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { makeSound } from "./sound.mjs";
const root = path.resolve(import.meta.dirname, ".."),
  file = path.join(root, "output/manifest.json");
const manifest = JSON.parse(await fs.readFile(file, "utf8"));
const run = (args) =>
  execFileSync("ffmpeg", ["-v", "error", "-y", ...args], {
    encoding: "utf8",
    maxBuffer: 2e6,
  });
const pictureHash = (input) =>
  run(["-i", input, "-map", "0:v:0", "-c", "copy", "-f", "hash", "-"]).trim();
for (const f of manifest.filter((f) => f.width === 1920 && !f.audioMastering)) {
  const input = path.join(root, "output", f.filename),
    sound = path.join(root, `.cache/${f.id}-sound-final.wav`),
    candidate = path.join(root, `.cache/${f.id}-sound-final.mp4`);
  await makeSound(f, sound);
  run([
    "-i",
    input,
    "-i",
    sound,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-af",
    "loudnorm=I=-19:TP=-1.5:LRA=7,volume=-2dB",
    "-movflags",
    "+faststart",
    "-t",
    String(f.seconds),
    candidate,
  ]);
  if (pictureHash(input) !== pictureHash(candidate))
    throw new Error(`Video changed during audio mastering: ${f.id}`);
  const probe = JSON.parse(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-count_frames",
        "-show_streams",
        "-of",
        "json",
        candidate,
      ],
      { encoding: "utf8" },
    ),
  );
  if (
    Number(
      probe.streams.find((s) => s.codec_type === "video").nb_read_frames,
    ) !== f.frames
  )
    throw new Error(`Frame loss: ${f.id}`);
  await fs.rename(candidate, input);
  await fs.unlink(sound);
  const bytes = await fs.readFile(input);
  Object.assign(f, {
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
    audioMastering:
      "Original procedural source, loudnorm -19 LUFS then -2 dB headroom; reviewed video packets retained exactly",
  });
  await fs.writeFile(file, JSON.stringify(manifest, null, 2) + "\n");
  console.log("MASTERED", f.id);
}
