import { bundle } from "@remotion/bundler";
import {
  openBrowser,
  renderMedia,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseRenderArgs, renderHelp } from "./scripts/render-options.mjs";
const root = path.dirname(fileURLToPath(import.meta.url));
const options = parseRenderArgs(process.argv.slice(2));
if (options.help) {
  console.log(renderHelp);
  process.exit(0);
}
const inputProps = options.propsFile
  ? JSON.parse(await readFile(path.resolve(root, options.propsFile), "utf8"))
  : {};
if (
  inputProps === null ||
  Array.isArray(inputProps) ||
  typeof inputProps !== "object"
)
  throw new Error("Input props must be a JSON object");
await mkdir(path.join(root, "review"), { recursive: true });
await mkdir(path.join(root, "out"), { recursive: true });
const url = await bundle({
  entryPoint: path.join(root, "src/index.tsx"),
  publicDir: path.join(root, "public"),
  outDir: path.join(root, "bundle"),
});
const browser = await openBrowser("chrome", {
  browserExecutable: process.env.DEMO_CHROME_PATH,
  chromiumOptions: { gl: "swangle" },
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
      onProgress: ({ progress }) => {
        const p = Math.floor(progress * 10) * 10;
        if (p !== last) {
          last = p;
          console.log(`RENDER ${p}%`);
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
    console.log(`DONE ${output}`);
  }
} finally {
  await browser.close({ silent: true });
}
