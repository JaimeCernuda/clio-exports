import path from "node:path";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile, unlink, statfs } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { selectAssets } from "./src/assets.ts";
import { encodeGif } from "./scripts/encode-gifs.mjs";
const root = import.meta.dirname,
  args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(
    "npm run render -- [many-agents|one-composable-agent|plugin-composition] [--stills]",
  );
  process.exit(0);
}
const chosen = selectAssets(args.filter((arg) => arg !== "--stills")),
  temporary = path.join(root, ".cache/tmp");
await mkdir(temporary, { recursive: true });
process.env.TEMP = temporary;
process.env.TMP = temporary;
process.env.TMPDIR = temporary;
const disk = await statfs(root);
if (disk.bavail * disk.bsize < 1024 ** 3)
  throw new Error(
    "Keep at least 1 GiB free on the project volume; no OS-drive fallback.",
  );
const { bundle } = await import("@remotion/bundler"),
  { openBrowser, renderMedia, renderStill, selectComposition } = await import(
    "@remotion/renderer"
  );
const require = createRequire(import.meta.url);
const serveUrl = await bundle({
  entryPoint: path.join(root, "src/index.tsx"),
  publicDir: path.join(root, "../ad/public"),
  outDir: path.join(root, ".cache/bundle"),
  enableCaching: false,
  webpackOverride: (config) => ({
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        react: path.dirname(require.resolve("react/package.json")),
        "react-dom": path.dirname(require.resolve("react-dom/package.json")),
        remotion: path.dirname(require.resolve("remotion/package.json")),
      },
    },
  }),
});
const savedBrowser = path.join(
  root,
  "../ad/node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe",
);
const browser = await openBrowser("chrome", {
  browserExecutable:
    process.env.DEMO_CHROME_PATH ??
    (existsSync(savedBrowser) ? savedBrowser : undefined),
  chromiumOptions: { gl: "swangle" },
});
const ffmpeg = (args) =>
  execFileSync("ffmpeg", ["-v", "error", "-y", ...args], {
    stdio: ["ignore", "ignore", "pipe"],
  });
try {
  for (const asset of chosen) {
    const composition = await selectComposition({
        serveUrl,
        id: asset.id,
        puppeteerInstance: browser,
      }),
      output = path.join(root, asset.folder, "output");
    await mkdir(output, { recursive: true });
    if (args.includes("--stills")) {
      for (const frame of [
        ...new Set([0, asset.poster, Math.floor(asset.frames / 2)]),
      ]) {
        const review = path.join(root, "review");
        await mkdir(review, { recursive: true });
        await renderStill({
          serveUrl,
          composition,
          puppeteerInstance: browser,
          frame,
          output: path.join(review, `${asset.folder}-${frame}.png`),
          imageFormat: "png",
          logLevel: "error",
        });
      }
      console.log(`STILLS ${asset.folder}`);
      continue;
    }
    const native = path.join(root, ".cache", `${asset.folder}.native.mp4`),
      mp4 = path.join(output, "loop.mp4");
    let last = -1;
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
      onProgress: ({ progress }) => {
        const p = Math.floor(progress * 10) * 10;
        if (p !== last) {
          last = p;
          console.log(`${asset.folder} ${p}%`);
        }
      },
    });
    ffmpeg([
      "-i",
      native,
      "-vf",
      "scale=in_range=auto:out_range=tv:out_color_matrix=bt709,format=yuv420p",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "18",
      "-an",
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
      mp4,
    ]);
    ffmpeg([
      "-i",
      mp4,
      "-c:v",
      "libvpx-vp9",
      "-b:v",
      "0",
      "-crf",
      "28",
      "-row-mt",
      "1",
      "-cpu-used",
      "4",
      "-an",
      path.join(output, "loop.webm"),
    ]);
    encodeGif(asset, mp4, path.join(output, "loop.gif"));
    ffmpeg([
      "-i",
      mp4,
      "-vf",
      `select=eq(n\\,${asset.poster})`,
      "-frames:v",
      "1",
      path.join(output, "poster.png"),
    ]);
    const files = [];
    for (const name of ["loop.mp4", "loop.webm", "loop.gif", "poster.png"]) {
      const data = await readFile(path.join(output, name));
      files.push({
        name,
        bytes: data.length,
        sha256: createHash("sha256").update(data).digest("hex"),
      });
    }
    await writeFile(
      path.join(output, "manifest.json"),
      JSON.stringify(
        {
          ...asset,
          duration: asset.frames / asset.fps,
          audio: false,
          background: "white",
          brandingOverlay: false,
          files,
        },
        null,
        2,
      ) + "\n",
    );
    await unlink(native);
    console.log(`DONE ${asset.folder}`);
  }
} finally {
  await browser.close({ silent: true });
}
