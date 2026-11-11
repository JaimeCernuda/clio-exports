import { mkdir, readFile, writeFile, unlink, statfs } from "node:fs/promises";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseRenderArgs, renderHelp } from "./scripts/render-options.mjs";
const root = path.dirname(fileURLToPath(import.meta.url));
if (
  process.argv[process.argv.indexOf("--composition") + 1] === "ClioComposableAd"
) {
  execFileSync(
    process.execPath,
    [
      path.join(root, "../composability/ad/render.mjs"),
      ...process.argv.slice(2),
    ],
    {
      stdio: "inherit",
    },
  );
  process.exit(0);
}
const options = parseRenderArgs(process.argv.slice(2));
if (options.help) {
  console.log(renderHelp);
  process.exit(0);
}
if (
  options.output &&
  path.parse(path.resolve(root, options.output)).root.toLowerCase() !==
    path.parse(root).root.toLowerCase()
)
  throw new Error(
    "Keep video outputs on the project drive; no OS-drive fallback is allowed.",
  );
const renderTemporary = path.join(root, ".native-ui/render-temp");
await mkdir(renderTemporary, { recursive: true });
process.env.TEMP = renderTemporary;
process.env.TMP = renderTemporary;
process.env.TMPDIR = renderTemporary;
const disk = await statfs(root);
if (disk.bavail * disk.bsize < 1024 ** 3)
  throw new Error(
    "Less than 1 GiB free on the project drive. Clean owned intermediates before rendering.",
  );
const { bundle } = await import("@remotion/bundler");
const { openBrowser, renderMedia, renderStill, selectComposition } =
  await import("@remotion/renderer");
const inputProps = options.propsFile
  ? JSON.parse(await readFile(path.resolve(root, options.propsFile), "utf8"))
  : {};
const cursorSamples = new Map();
let promptLayouts;
let adLayouts;
let adOpening;
const adPlugins = new Map();
const adSelections = new Map();
const adAdditions = new Map();
const collectBrowserLog = (log) => {
  if (log.text.startsWith("__CLIO_AD_ADDITIONS__"))
    for (const addition of JSON.parse(
      log.text.slice("__CLIO_AD_ADDITIONS__".length),
    ))
      adAdditions.set(`${addition.frame}:${addition.id}`, addition);
  if (log.text.startsWith("__CLIO_AD_SELECTION__")) {
    const selection = JSON.parse(
      log.text.slice("__CLIO_AD_SELECTION__".length),
    );
    adSelections.set(selection.frame, selection);
  }
  if (log.text.startsWith("__CLIO_AD_PLUGINS__"))
    for (const plugin of JSON.parse(
      log.text.slice("__CLIO_AD_PLUGINS__".length),
    ))
      adPlugins.set(`${plugin.id}:${plugin.width}`, plugin);
  if (log.text.startsWith("__CLIO_AD_OPENING__"))
    adOpening = JSON.parse(log.text.slice("__CLIO_AD_OPENING__".length));
  if (log.text.startsWith("__CLIO_AD_LAYOUTS__"))
    adLayouts = JSON.parse(log.text.slice("__CLIO_AD_LAYOUTS__".length));
  if (log.text.startsWith("__CLIO_PROMPT_LAYOUTS__"))
    promptLayouts = JSON.parse(
      log.text.slice("__CLIO_PROMPT_LAYOUTS__".length),
    );
  if (log.text.startsWith("__CLIO_CURSOR__")) {
    const value = JSON.parse(log.text.slice("__CLIO_CURSOR__".length));
    cursorSamples.set(value.frame, value.pose);
  }
};
if (
  inputProps === null ||
  Array.isArray(inputProps) ||
  typeof inputProps !== "object"
)
  throw new Error("Input props must be a JSON object");
await mkdir(path.join(root, "review"), { recursive: true });
await mkdir(path.join(root, "out"), { recursive: true });
const url = await bundle({
  enableCaching: false,
  entryPoint: path.join(
    root,
    options.composition === "ClioComposableAd"
      ? "src/composable-ad-index.tsx"
      : options.composition.startsWith("ClioComposable")
        ? "src/composable-index.tsx"
        : options.composition.startsWith("WordleStudy")
          ? "src/wordle-index.tsx"
          : "src/index.tsx",
  ),
  publicDir: path.join(root, "public"),
  outDir: path.join(root, "bundle"),
});
const browser = await openBrowser("chrome", {
  browserExecutable: process.env.DEMO_CHROME_PATH,
  chromiumOptions: {
    // Hardware ANGLE intermittently enlarges SVG glyphs on one capture worker.
    // SwiftShader also renders the native map while keeping chart text stable.
    gl:
      process.env.DEMO_GL ??
      (options.composition.startsWith("WordleStudy") ? "angle" : "swangle"),
  },
});
try {
  const composition = await selectComposition({
    serveUrl: url,
    id: options.composition,
    inputProps,
    puppeteerInstance: browser,
  });
  if (options.mode === "stills") {
    const frames = options.frames.length
      ? options.frames
      : [50, 130, 270, 340, 470, 665].filter(
          (frame) => frame < composition.durationInFrames,
        );
    if (frames.some((frame) => frame >= composition.durationInFrames))
      throw new Error("Still frame is outside the composition");
    for (const frame of frames) {
      await renderStill({
        serveUrl: url,
        composition,
        puppeteerInstance: browser,
        inputProps,
        frame,
        output: path.join(
          root,
          `review/${options.composition === "ClioProof" ? "" : options.composition + "-"}frame-${frame}.png`,
        ),
        imageFormat: "png",
        onBrowserLog: collectBrowserLog,
        scale: options.scale,
        logLevel: "error",
      });
      console.log(`FRAME ${frame}`);
    }
    await writeFile(
      path.join(root, "review/composition.json"),
      JSON.stringify(composition, null, 2),
    );
  } else {
    const scale = options.scale;
    let last = -1;
    const output = path.resolve(
      root,
      options.output ??
        (options.composition === "ClioProof"
          ? "out/clio-editable-ui-proof.mp4"
          : `out/${options.composition}.mp4`),
    );
    await mkdir(path.dirname(output), { recursive: true });
    const native = path.join(
      path.dirname(output),
      path.basename(output, ".mp4") + ".native.mp4",
    );
    const renderStarted = Date.now();
    await renderMedia({
      serveUrl: url,
      composition,
      puppeteerInstance: browser,
      inputProps,
      outputLocation: native,
      codec: "h264",
      crf: 16,
      scale,
      pixelFormat: "yuv420p",
      muted: true,
      enforceAudioTrack: false,
      concurrency: options.concurrency,
      x264Preset: "fast",
      logLevel: "error",
      onBrowserLog: collectBrowserLog,
      onProgress: ({ progress }) => {
        const p = Math.floor(progress * 100);
        if (p !== last) {
          last = p;
          console.log(
            `RENDER ${p}% (${Math.round((Date.now() - renderStarted) / 1000)}s)`,
          );
        }
      },
    });
    await promisify(execFile)("ffmpeg", [
      "-v",
      "error",
      "-y",
      "-i",
      native,
      "-map",
      "0:v:0",
      "-vf",
      "scale=in_range=auto:out_range=tv:out_color_matrix=bt709,format=yuv420p",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "16",
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
      output,
    ]);
    if (inputProps.recordCursor) {
      if (!cursorSamples.size)
        throw new Error("Native cursor measurements were not recorded");
      await writeFile(
        output + ".cursor.raw.json",
        JSON.stringify(Object.fromEntries(cursorSamples), null, 2) + "\n",
      );
    }
    await unlink(native);
    console.log(`DONE ${output}`);
  }
  if (promptLayouts)
    await writeFile(
      path.join(root, "review/composable-layouts.json"),
      JSON.stringify(promptLayouts, null, 2) + "\n",
    );
  if (adLayouts)
    await writeFile(
      path.join(root, "review/composable-ad-layouts.json"),
      JSON.stringify(adLayouts, null, 2) + "\n",
    );
  if (adPlugins.size)
    await writeFile(
      path.join(root, "review/composable-ad-plugins.json"),
      JSON.stringify([...adPlugins.values()], null, 2),
    );
  if (adSelections.size)
    await writeFile(
      path.join(root, "review/composable-ad-selections.json"),
      JSON.stringify([...adSelections.values()], null, 2),
    );
  if (adAdditions.size)
    await writeFile(
      path.join(root, "review/composable-ad-additions.json"),
      JSON.stringify([...adAdditions.values()], null, 2),
    );
  if (adOpening)
    await writeFile(
      path.join(root, "review/composable-ad-opening.json"),
      JSON.stringify(adOpening, null, 2) + "\n",
    );
} finally {
  await browser
    .close({ silent: true })
    .catch((error) => console.error(`Browser cleanup: ${String(error)}`));
}
