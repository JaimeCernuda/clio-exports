/** Original, deterministic sound design; no sampled music or reference audio. */
import { readFile, writeFile, unlink } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
process.chdir(root);
const source =
  process.argv[2] ?? "out/composable/clio-composable-ad-v7-clean.mp4";
const output = process.argv[3] ?? "out/composable/clio-composable-ad-v7.mp4";
const score = JSON.parse(await readFile("story/composable-ad.json", "utf8"));
const rate = 48000,
  seconds = score.frames / score.fps,
  samples = new Float64Array(rate * seconds);
let seed = 190729;
const noise = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2147483648 - 1;
};
function add(at, duration, voice) {
  const start = Math.round(at * rate),
    length = Math.round(duration * rate);
  for (let i = 0; i < length && start + i < samples.length; i++)
    if (start + i >= 0) samples[start + i] += voice(i / rate, i / length);
}
function tick(at, strength = 0.045) {
  let low = 0;
  add(at, 0.033, (t) => {
    low = 0.28 * noise() + 0.72 * low;
    return (
      strength *
      (low * 0.65 + Math.sin(2 * Math.PI * 1150 * t) * 0.35) *
      Math.exp(-t * 170)
    );
  });
}
function sweep(at, duration = 0.45, strength = 0.045) {
  let low = 0;
  add(at, duration, (t, p) => {
    low = 0.24 * noise() + 0.76 * low;
    return low * strength * Math.sin(Math.PI * p) ** 2;
  });
}
function chime(at, frequency = 480, strength = 0.032) {
  add(
    at,
    0.9,
    (t) =>
      strength *
      (Math.sin(2 * Math.PI * frequency * t) +
        0.25 * Math.sin(2 * Math.PI * frequency * 2 * t)) *
      Math.exp(-t * 6) *
      (1 - Math.exp(-t * 150)),
  );
}

// A sparse, warm pulse gives the film a meter without competing with the words.
for (let beat = 0; beat * 0.5 < score.closing.at / score.fps; beat++) {
  const at = beat * 0.5;
  if (beat % 2 === 0)
    add(
      at,
      0.27,
      (t) =>
        0.032 *
        Math.sin(2 * Math.PI * 65.406 * t) *
        Math.exp(-t * 18) *
        (1 - Math.exp(-t * 300)),
    );
  if (beat % 4 === 2) tick(at, 0.019);
  if (beat % 4 === 0)
    chime(
      at,
      [261.626, 329.628, 293.665, 220][Math.floor(beat / 4) % 4],
      0.008,
    );
}
for (const frame of [70, 126, score.wheel.end]) tick(frame / 60, 0.028);
for (const frame of [
  score.staging.brandAt,
  score.staging.plusAt,
  score.staging.menuAt,
  score.staging.selectAt,
  score.staging.promptAt,
  ...score.changes.map((change) => change.at),
  score.closing.at,
])
  sweep(frame / 60, 0.4, 0.055);
for (const [i, change] of score.changes.entries()) {
  tick((change.at + 10) / 60, 0.07);
  chime((change.at + 45) / 60, [440, 523.251, 659.255][i % 3], 0.022);
  if (change.bundle) {
    const from = score.stages.find((stage) => stage.id === change.from),
      to = score.stages.find((stage) => stage.id === change.to),
      moduleId = to.modules.find((id) => !from.modules.includes(id)),
      module = score.modules.find((item) => item.id === moduleId),
      rows =
        1 +
        module.skills.length +
        module.mcpServers.length +
        module.tools.length +
        module.hooks.length,
      dockAt =
        score.inspection.contentsAt +
        (rows - 1) * score.inspection.rowStaggerFrames +
        score.inspection.contentsFrames +
        change.readFrames +
        score.inspection.fadeFrames +
        score.inspection.collapseFrames +
        score.inspection.transferFrames;
    for (let row = 0; row < rows; row++)
      tick(
        (change.at +
          score.inspection.contentsAt +
          row * score.inspection.rowStaggerFrames) /
          score.fps,
        0.025,
      );
    tick((change.at + dockAt) / score.fps, 0.04);
  }
}
// The wheel has one rising air movement, not a click on every blurred word.
sweep(score.wheel.at / 60, (score.wheel.end - score.wheel.at) / 60, 0.07);
chime((score.closing.at + 50) / 60, 261.626, 0.04);
chime((score.closing.at + 50) / 60, 392, 0.016);
const pcm = Buffer.alloc(44 + samples.length * 2);
pcm.write("RIFF", 0);
pcm.writeUInt32LE(pcm.length - 8, 4);
pcm.write("WAVEfmt ", 8);
pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20);
pcm.writeUInt16LE(1, 22);
pcm.writeUInt32LE(rate, 24);
pcm.writeUInt32LE(rate * 2, 28);
pcm.writeUInt16LE(2, 32);
pcm.writeUInt16LE(16, 34);
pcm.write("data", 36);
pcm.writeUInt32LE(samples.length * 2, 40);
for (let i = 0; i < samples.length; i++) {
  const fade = Math.min(
    1,
    i / (rate * 0.08),
    (samples.length - i) / (rate * 0.8),
  );
  pcm.writeInt16LE(
    Math.round(Math.max(-1, Math.min(1, samples[i] * 2.1 * fade)) * 32767),
    44 + i * 2,
  );
}
const wave = output.replace(/\.mp4$/u, ".score.wav");
await writeFile(wave, pcm);
execFileSync("ffmpeg", [
  "-v",
  "error",
  "-y",
  "-i",
  source,
  "-i",
  wave,
  "-map",
  "0:v:0",
  "-map",
  "1:a:0",
  "-c:v",
  "copy",
  "-c:a",
  "aac",
  "-b:a",
  "128k",
  "-t",
  String(seconds),
  "-movflags",
  "+faststart",
  output,
]);
await unlink(wave);
console.log(`Finished original sound design: ${path.resolve(output)}`);
