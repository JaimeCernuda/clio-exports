/** Deterministic campaign driver. Keeps all transient media on the project volume. */
import path from "node:path";
import {
  mkdir,
  writeFile,
  readFile,
  unlink,
  statfs,
  rename,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { films } from "./src/registry.ts";
import { makeSound } from "./scripts/sound.mjs";
import { buildKey } from "./scripts/build-key.mjs";
import { clickFrames } from "./scripts/interactions.mjs";
const root = import.meta.dirname,
  args = process.argv.slice(2),
  draft = args.includes("--draft"),
  stills = args.includes("--stills");
if (args.includes("--help")) {
  console.log(
    "node render.mjs [all|method|hypothesis|team|interface|provenance|tools|selection|streams] [--draft] [--stills] [--frames 240,600]",
  );
  process.exit(0);
}
const positional = args.filter(
    (a, i) => !a.startsWith("--") && args[i - 1] !== "--frames",
  ),
  choice = positional[0] ?? "all";
const selected =
  choice === "all"
    ? films
    : films.filter((f) => choice.split(",").includes(f.id));
if (!selected.length) throw new Error(`Unknown film ${choice}`);
const tmp = path.join(root, ".cache/tmp");
await mkdir(tmp, { recursive: true });
for (const key of ["TEMP", "TMP", "TMPDIR"]) process.env[key] = tmp;
if (path.parse(root).root.toLowerCase() === "c:\\")
  throw new Error("Campaign output must stay off the OS drive");
const disk = await statfs(root);
if (disk.bavail * disk.bsize < 1024 ** 3 * 3)
  throw new Error("Need 3 GiB free on the project drive");
const { bundle } = await import("@remotion/bundler");
const { openBrowser, renderMedia, renderStill, selectComposition } =
  await import("@remotion/renderer");
const require = createRequire(import.meta.url);
const QRCode = require("qrcode");
await QRCode.toFile(
  path.join(root, "public/qr.svg"),
  "https://clio.iowarp.ai",
  {
    type: "svg",
    margin: 1,
    color: { dark: "#173b4c", light: "#ffffff" },
    errorCorrectionLevel: "M",
  },
);
const currentKey = await buildKey(root),
  stamp = path.join(root, ".cache/compile.json");
let url;
if (args.includes("--reuse")) {
  const compiled = JSON.parse(await readFile(stamp, "utf8"));
  if (compiled.key !== currentKey)
    throw new Error("Render inputs changed: rebuild without --reuse.");
  url = path.join(root, ".cache/bundle");
  console.log("REUSING VERIFIED BUNDLE");
} else {
  console.log("BUNDLE");
  url = await bundle({
    entryPoint: path.join(root, "src/index.tsx"),
    publicDir: path.join(root, "public"),
    outDir: path.join(root, ".cache/bundle"),
    enableCaching: false,
    onProgress: (p) => {
      if (p === 100) console.log("BUNDLED");
    },
  });
  await writeFile(
    stamp,
    JSON.stringify({ key: currentKey, compiledAt: new Date().toISOString() }),
  );
}
const browserPath =
  process.env.DEMO_CHROME_PATH ??
  path.resolve(
    root,
    "../../composability/ad/node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe",
  );
console.log("OPEN BROWSER", browserPath);
const browser = await openBrowser("chrome", {
  browserExecutable: existsSync(browserPath) ? browserPath : undefined,
  chromiumOptions: { gl: "swangle" },
});
console.log("BROWSER READY");
await mkdir(path.join(root, "output"), { recursive: true });
await mkdir(path.join(root, "review"), { recursive: true });
const ff = (a) =>
  execFileSync("ffmpeg", ["-v", "error", "-y", ...a], {
    stdio: ["ignore", "ignore", "pipe"],
  });
let manifest = [];
try {
  manifest = JSON.parse(
    await readFile(path.join(root, "output/manifest.json"), "utf8"),
  );
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
try {
  for (const film of selected) {
    const composition = await selectComposition({
      serveUrl: url,
      id: `Clio-${film.id}`,
      puppeteerInstance: browser,
      inputProps: { review: stills },
    });
    const stem = `${String(film.number).padStart(2, "0")}-${film.id}`;
    if (stills) {
      const fsGeometry = [];
      const arg = args.indexOf("--frames");
      let frames =
        arg >= 0
          ? args[arg + 1].split(",").map(Number)
          : film.markers.map((m) =>
              Math.min(
                composition.durationInFrames - 1,
                Math.round((m.at + 0.8) * 60),
              ),
            );
      if (args.includes("--interactions")) {
        const scene = await readFile(
          path.join(root, `films/${stem}/scene.tsx`),
          "utf8",
        );
        frames = [...new Set([...frames, ...clickFrames(scene)])].sort(
          (a, b) => a - b,
        );
      }
      for (const frame of frames) {
        await renderStill({
          serveUrl: url,
          composition,
          puppeteerInstance: browser,
          frame,
          output: path.join(root, `review/${stem}-${frame}.png`),
          imageFormat: "png",
          logLevel: "error",
          inputProps: { review: true },
          onBrowserLog: (log) => {
            if (log.text.startsWith("__REVIEW__"))
              fsGeometry.push(JSON.parse(log.text.slice("__REVIEW__".length)));
          },
        });
      }
      console.log(`STILLS ${film.id}`);
      await writeFile(
        path.join(root, `review/${stem}-geometry.json`),
        JSON.stringify(fsGeometry, null, 2),
      );
      continue;
    }
    const raw = path.join(root, `.cache/${stem}.native.mp4`),
      output = path.join(root, `output/${stem}${draft ? "-draft" : ""}.mp4`);
    const delivery = path.join(root, `.cache/${stem}.delivery.mp4`);
    let progress = -1;
    await renderMedia({
      serveUrl: url,
      composition,
      puppeteerInstance: browser,
      codec: "h264",
      outputLocation: raw,
      crf: draft ? 23 : 16,
      scale: draft ? 0.5 : 1,
      concurrency: 4,
      muted: true,
      enforceAudioTrack: false,
      logLevel: "error",
      onProgress: ({ progress: p }) => {
        const n = Math.floor(p * 10) * 10;
        if (n !== progress) {
          progress = n;
          console.log(`${stem} ${n}%`);
        }
      },
    });
    const sound = path.join(root, `.cache/${stem}.wav`);
    await makeSound(film, sound);
    ff([
      "-i",
      raw,
      "-i",
      sound,
      "-map",
      "0:v",
      "-map",
      "1:a",
      "-vf",
      "scale=in_range=auto:out_range=tv:out_color_matrix=bt709,format=yuv420p",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      draft ? "22" : "18",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-af",
      "loudnorm=I=-19:TP=-1.5:LRA=7,volume=-2dB",
      "-color_range",
      "tv",
      "-colorspace",
      "bt709",
      "-color_primaries",
      "bt709",
      "-color_trc",
      "bt709",
      "-movflags",
      "+faststart",
      "-t",
      String(film.seconds),
      delivery,
    ]);
    const verified = JSON.parse(
      execFileSync(
        "ffprobe",
        [
          "-v",
          "error",
          "-count_frames",
          "-show_streams",
          "-of",
          "json",
          delivery,
        ],
        { encoding: "utf8" },
      ),
    );
    const track = verified.streams.find((s) => s.codec_type === "video");
    if (
      Number(track?.nb_read_frames) !== film.seconds * 60 ||
      track?.r_frame_rate !== "60/1" ||
      !verified.streams.some((s) => s.codec_type === "audio")
    )
      throw new Error(`Incomplete delivery encode: ${film.id}`);
    await rename(delivery, output);
    await unlink(raw);
    await unlink(sound);
    const poster = path.join(root, `output/${stem}.jpg`);
    ff([
      "-ss",
      String(film.seconds - 8),
      "-i",
      output,
      "-frames:v",
      "1",
      "-q:v",
      "2",
      poster,
    ]);
    const bytes = await readFile(output);
    const record = {
      ...film,
      filename: path.basename(output),
      poster: path.basename(poster),
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length,
      width: draft ? 960 : 1920,
      height: draft ? 540 : 1080,
      fps: 60,
      frames: film.seconds * 60,
      status: "rendered-awaiting-review",
      audioMastering:
        "Original procedural source, loudnorm -19 LUFS then -2 dB headroom",
      sourceKey: currentKey,
    };
    manifest = manifest.filter(
      (r) => !(r.id === film.id && r.width === record.width),
    );
    manifest.push(record);
    await writeFile(
      path.join(root, "output/manifest.json"),
      JSON.stringify(manifest, null, 2) + "\n",
    );
    console.log(`ENCODED ${output}`);
  }
} finally {
  await browser.close({ silent: true });
}
