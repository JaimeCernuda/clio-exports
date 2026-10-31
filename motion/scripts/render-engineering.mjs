import {
  mkdir,
  readFile,
  writeFile,
  readdir,
  statfs,
  unlink,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assembleEngineeringChunks } from "./engineering-assembly.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requested = process.argv[2] ?? "sweep",
  mode = process.argv[3] ?? "stills";
if (
  !["sweep", "studio", "both", "full"].includes(requested) ||
  !["stills", "video"].includes(mode)
)
  throw new Error(
    "Usage: node scripts/render-engineering.mjs sweep|studio|both stills|video [file or directory]",
  );
const target = process.argv[4];
const work = path.resolve(
  process.env.ENGINEERING_RENDER_WORK ??
    path.join(root, ".native-ui/engineering-render"),
);
const projectDrive = path.parse(root).root.toLowerCase();
if (
  path.parse(work).root.toLowerCase() !== projectDrive ||
  (target &&
    path.parse(path.resolve(target)).root.toLowerCase() !== projectDrive)
)
  throw new Error(
    "Keep render work and outputs on the project drive; no OS-drive fallback is allowed.",
  );
await mkdir(work, { recursive: true });
const temporary = path.join(work, "tmp");
await mkdir(temporary, { recursive: true });
process.env.TEMP = temporary;
process.env.TMP = temporary;
process.env.TMPDIR = temporary;
const disk = await statfs(work);
if (disk.bavail * disk.bsize < 1024 ** 3)
  throw new Error(
    "Less than 1 GiB free on the project drive. Clean owned intermediates before rendering.",
  );
const { bundle } = await import("@remotion/bundler");
const { openBrowser, selectComposition, renderMedia, renderStill } =
  await import("@remotion/renderer");
const fingerprint = createHash("sha256");
for (const filename of (await readdir(path.join(root, "native")))
  .filter((n) => /\.(tsx?|css|mjs)$/.test(n))
  .sort())
  fingerprint.update(await readFile(path.join(root, "native", filename)));
for (const filename of (
  await readdir(path.join(root, ".native-ui/engineering-data"))
)
  .filter((name) => name.endsWith(".json"))
  .sort())
  fingerprint.update(
    await readFile(path.join(root, ".native-ui/engineering-data", filename)),
  );
fingerprint.update(
  await readFile(path.join(root, "src/engineering-index.tsx")),
);
const key = fingerprint.digest("hex");
const serveUrl = await bundle({
  enableCaching: false,
  entryPoint: path.join(root, "src/engineering-index.tsx"),
  outDir: path.join(work, "bundle"),
});
for (const part of requested === "both" ? ["sweep", "studio"] : [requested]) {
  const output = path.resolve(
    target
      ? requested === "both"
        ? path.join(target, "engineering-" + part + "-sketch.mp4")
        : target
      : path.join(root, "out/engineering-" + part + "-sketch.mp4"),
  );
  const duration = part === "full" ? 21360 : part === "sweep" ? 3000 : 2160;
  const beginFrame = Number(process.env.ENGINEERING_START_FRAME ?? 0);
  const lastFrame = Number(process.env.ENGINEERING_END_FRAME ?? duration - 1);
  if (
    !Number.isInteger(beginFrame) ||
    !Number.isInteger(lastFrame) ||
    beginFrame < 0 ||
    lastFrame >= duration ||
    lastFrame < beginFrame
  )
    throw new Error("Invalid engineering render range");
  const frames = lastFrame - beginFrame + 1;
  const cache = path.join(work, key.slice(0, 16), part);
  await mkdir(cache, { recursive: true });
  await mkdir(path.dirname(output), { recursive: true });
  const chunks = [];
  for (
    let start = beginFrame;
    start < (mode === "stills" ? beginFrame + 1 : lastFrame + 1);
    start += 600
  ) {
    const currentDisk = await statfs(work);
    if (currentDisk.bavail * currentDisk.bsize < 1024 ** 3)
      throw new Error(
        "Render paused before disk exhaustion; clean owned intermediates and resume.",
      );
    const end = Math.min(lastFrame, start + 599),
      chunk = path.join(cache, start + "-" + end + ".mp4");
    let cached = false;
    if (mode === "video")
      try {
        cached =
          Number(
            execFileSync(
              "ffprobe",
              [
                "-v",
                "error",
                "-select_streams",
                "v:0",
                "-show_entries",
                "stream=nb_frames",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                chunk,
              ],
              { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
            ).trim(),
          ) ===
          end - start + 1;
      } catch {
        cached = false;
      }
    if (cached) {
      console.log("REUSE " + part + " " + start + "-" + end);
      chunks.push(chunk);
      continue;
    }
    const browser = await openBrowser("chrome", {
      browserExecutable: process.env.DEMO_CHROME_PATH,
      chromiumOptions: { gl: process.env.DEMO_GL ?? "angle" },
    });
    try {
      const composition = await selectComposition({
        timeoutInMilliseconds: 120000,
        serveUrl,
        id:
          part === "full"
            ? "EngineeringWalkthrough"
            : part === "sweep"
              ? "EngineeringSweepSketch"
              : "EngineeringStudioSketch",
        puppeteerInstance: browser,
      });
      if (mode === "stills") {
        const samples =
          part === "full"
            ? [
                240, 1500, 3300, 5160, 5700, 6300, 7200, 8400, 10440, 11160,
                12000, 14400, 15720, 16980, 18120, 19320, 20280, 21000,
              ]
            : part === "sweep"
              ? [180, 600, 1020, 1380, 1740, 2370, 2940]
              : [120, 540, 1080, 1530, 1980];
        for (const frame of samples) {
          await renderStill({
            timeoutInMilliseconds: 120000,
            serveUrl,
            composition,
            puppeteerInstance: browser,
            frame,
            output: path.join(
              path.dirname(output),
              part + "-frame-" + frame + ".png",
            ),
            imageFormat: "png",
            scale: 1.5,
            logLevel: "error",
          });
          console.log("STILL " + part + " " + frame);
        }
      } else {
        console.log("CHUNK " + part + " " + start + "-" + end);
        let last = -1;
        await renderMedia({
          timeoutInMilliseconds: 120000,
          serveUrl,
          composition,
          puppeteerInstance: browser,
          frameRange: [start, end],
          outputLocation: chunk,
          codec: "h264",
          muted: true,
          enforceAudioTrack: false,
          pixelFormat: "yuv420p",
          imageFormat: "jpeg",
          jpegQuality: 90,
          scale: 1.5,
          crf: 18,
          concurrency: 1,
          logLevel: "error",
          onProgress: (p) => {
            const percent = Math.floor(p.progress * 4) * 25;
            if (percent !== last) {
              last = percent;
              console.log("RENDER " + part + " " + start + " " + percent + "%");
            }
          },
        });
        chunks.push(chunk);
      }
    } finally {
      await browser.close({ silent: true });
    }
  }
  if (mode === "video") {
    const assembly = await assembleEngineeringChunks(chunks, output);
    await writeFile(
      path.join(cache, "receipt.json"),
      JSON.stringify(
        {
          sourceFingerprint: key,
          part,
          frames,
          beginFrame,
          lastFrame,
          fps: 60,
          width: 1920,
          height: 1080,
          chunks,
          output,
          assembly,
        },
        null,
        2,
      ),
    );
    execFileSync(
      "ffmpeg",
      ["-v", "error", "-xerror", "-i", output, "-f", "null", "-"],
      { stdio: "inherit" },
    );
    const measured = Number(
      execFileSync(
        "ffprobe",
        [
          "-v",
          "error",
          "-select_streams",
          "v:0",
          "-show_entries",
          "stream=nb_frames",
          "-of",
          "default=noprint_wrappers=1:nokey=1",
          output,
        ],
        { encoding: "utf8" },
      ).trim(),
    );
    if (measured !== frames)
      throw new Error(
        "Final frame count does not match the rendered chunks; retaining intermediates.",
      );
    if (process.env.ENGINEERING_KEEP_CHUNKS !== "1") {
      for (const chunk of chunks) await unlink(chunk);
    }
    console.log("VIDEO " + output);
  }
}
