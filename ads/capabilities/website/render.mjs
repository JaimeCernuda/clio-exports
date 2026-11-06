/** Render the sixteen website placements with one shared installation and browser. */
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { assets } from "./src/plan.ts";
import { websiteKey } from "./hash.mjs";
import { encodeWebsite } from "./encode.mjs";
import { films } from "../src/registry.ts";
import { clickFrames } from "../scripts/interactions.mjs";
const root = import.meta.dirname,
  parent = path.resolve(root, ".."),
  args = process.argv.slice(2),
  stills = args.includes("--stills");
const chosen = args
  .filter((a) => !a.startsWith("--"))
  .flatMap((a) => a.split(","));
const selected = assets.filter(
  (a) =>
    !chosen.length ||
    chosen.includes("all") ||
    chosen.includes(a.key) ||
    chosen.includes(a.id),
);
if (!selected.length) throw new Error("No matching website assets");
if (path.parse(root).root.toLowerCase() === "c:\\")
  throw new Error("Website work must stay on D:");
const tmp = path.join(parent, ".cache/tmp");
await fs.mkdir(tmp, { recursive: true });
for (const key of ["TEMP", "TMP", "TMPDIR"]) process.env[key] = tmp;
const disk = await fs.statfs(root);
if (disk.bavail * disk.bsize < 3 * 1024 ** 3)
  throw new Error("Need 3 GiB free on D:");
const { bundle } = await import("@remotion/bundler"),
  { openBrowser, renderStill, renderMedia, selectComposition } = await import(
    "@remotion/renderer"
  );
const key = await websiteKey(root),
  cache = path.join(parent, ".cache/website"),
  stamp = path.join(cache, "compile.json");
await fs.mkdir(cache, { recursive: true });
await fs.mkdir(path.join(root, "review"), { recursive: true });
const serveUrl = path.join(cache, "bundle");
if (args.includes("--reuse")) {
  if (JSON.parse(await fs.readFile(stamp, "utf8")).key !== key)
    throw new Error("Website source changed; rebuild without --reuse");
} else {
  console.log("BUNDLE WEBSITE");
  await bundle({
    entryPoint: path.join(root, "src/index.tsx"),
    publicDir: path.join(parent, "public"),
    outDir: serveUrl,
    enableCaching: false,
  });
  await fs.writeFile(stamp, JSON.stringify({ key }));
}
const browserPath =
  process.env.DEMO_CHROME_PATH ??
  path.resolve(
    parent,
    "../../composability/ad/node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe",
  );
const browser = await openBrowser("chrome", {
  browserExecutable: existsSync(browserPath) ? browserPath : undefined,
  chromiumOptions: { gl: "swangle" },
});
let manifest = [];
try {
  manifest = JSON.parse(
    await fs.readFile(path.join(root, "manifest.json"), "utf8"),
  );
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
try {
  for (const asset of selected) {
    const composition = await selectComposition({
      serveUrl,
      id: `Website-${asset.key}`,
      puppeteerInstance: browser,
      inputProps: { review: stills },
    });
    const output = path.join(root, asset.id, asset.variant, "output");
    await fs.mkdir(output, { recursive: true });
    if (stills) {
      const film = films.find((f) => f.id === asset.id);
      const scene = await fs.readFile(
        path.join(
          parent,
          "films",
          `${String(film.number).padStart(2, "0")}-${film.id}`,
          "scene.tsx",
        ),
        "utf8",
      );
      const presses = clickFrames(scene)
        .map((f) => f / 60)
        .filter((t) => t >= asset.sourceStart && t <= asset.sourceEnd);
      const geometry = [],
        frames = [
          ...new Set([
            0,
            Math.round(0.8 * asset.fps),
            Math.round(asset.frames * 0.4),
            Math.round(asset.frames * 0.7),
            asset.frames - 20,
            asset.frames - 1,
            ...presses.map((t) =>
              Math.round(
                (0.35 + (t - asset.sourceStart) / asset.speed) * asset.fps,
              ),
            ),
          ]),
        ].sort((a, b) => a - b);
      for (const frame of frames)
        await renderStill({
          serveUrl,
          composition,
          puppeteerInstance: browser,
          frame,
          output: path.join(root, "review", `${asset.key}-${frame}.png`),
          imageFormat: "png",
          inputProps: { review: true },
          logLevel: "error",
          onBrowserLog: (log) => {
            if (log.text.startsWith("__WEBSITE__"))
              geometry.push(JSON.parse(log.text.slice(11)));
          },
        });
      await fs.writeFile(
        path.join(root, "review", `${asset.key}-geometry.json`),
        JSON.stringify(geometry, null, 2),
      );
      console.log("STILLS", asset.key);
      continue;
    }
    const native = path.join(cache, `${asset.key}.native.mp4`);
    let progress = -1;
    await renderMedia({
      serveUrl,
      composition,
      puppeteerInstance: browser,
      outputLocation: native,
      codec: "h264",
      crf: 16,
      muted: true,
      enforceAudioTrack: false,
      concurrency: 4,
      logLevel: "error",
      onProgress: ({ progress: p }) => {
        const step = Math.floor(p * 4) * 25;
        if (step !== progress) {
          progress = step;
          console.log(asset.key, step + "%");
        }
      },
    });
    encodeWebsite(asset, native, output);
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
          path.join(output, "loop.mp4"),
        ],
        { encoding: "utf8" },
      ),
    );
    if (
      Number(probe.streams[0].nb_read_frames) !== asset.frames ||
      probe.streams.some((s) => s.codec_type === "audio")
    )
      throw new Error(`Invalid website encode: ${asset.key}`);
    const files = [];
    for (const name of ["loop.mp4", "loop.webm", "loop.gif", "poster.png"]) {
      const bytes = await fs.readFile(path.join(output, name));
      files.push({
        name,
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      });
    }
    const record = {
      ...asset,
      gifWidth: 960,
      gifFps: 25,
      audio: false,
      brandingOverlay: false,
      sourceKey: key,
      files,
      status: "rendered-awaiting-review",
    };
    await fs.writeFile(
      path.join(output, "manifest.json"),
      JSON.stringify(record, null, 2) + "\n",
    );
    manifest = manifest.filter((a) => a.key !== asset.key);
    manifest.push(record);
    manifest.sort(
      (a, b) =>
        assets.findIndex((f) => f.key === a.key) -
        assets.findIndex((f) => f.key === b.key),
    );
    await fs.writeFile(
      path.join(root, "manifest.json"),
      JSON.stringify(manifest, null, 2) + "\n",
    );
    await fs.unlink(native);
    console.log(
      "ENCODED",
      asset.key,
      files.map((f) => `${f.name}:${(f.bytes / 1e6).toFixed(2)}MB`).join(" "),
    );
  }
} finally {
  await browser.close({ silent: true });
}
