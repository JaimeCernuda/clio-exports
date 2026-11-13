import { chromium } from "playwright-core";
import {
  mkdir,
  readFile,
  writeFile,
  rename,
  statfs,
  access,
  unlink,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { spawn, execFile } from "node:child_process";
import { once } from "node:events";
import { promisify } from "node:util";
import path from "node:path";

const mode = process.argv[2] ?? "proof";
if (!["proof", "full", "benchmark", "graph-proof"].includes(mode))
  throw new Error("Choose proof, full or benchmark");
const root = path.resolve("."),
  temp = path.join(root, ".native-ui/spotter-v3-direct"),
  out = path.join(root, "out/spotter-v3");
await mkdir(temp, { recursive: true });
await mkdir(out, { recursive: true });
process.env.TEMP = temp;
process.env.TMP = temp;
process.env.TMPDIR = temp;
const disk = await statfs(root);
if (disk.bavail * disk.bsize < 2 * 1024 ** 3)
  throw new Error("Need 2 GiB of free project-drive space");
const pin = JSON.parse(await readFile("native/source-current.json", "utf8"));
const live = await (
  await fetch("http://127.0.0.1:3372/clio-ui-source.json")
).json();
if (live.revision !== pin.revision)
  throw new Error("Start the pinned current UI on 3372");
const ranges =
  mode === "full"
    ? [[7, 210]]
    : mode === "graph-proof"
      ? [
          [58.5, 63],
          [99.5, 104],
          [108, 114.5],
        ]
      : mode === "benchmark"
        ? [[101, 101.5]]
        : [
            [101, 104],
            [132, 134],
            [168, 194],
          ];
const sourceFrames = ranges.flatMap(([a, b]) =>
  Array.from(
    { length: Math.round((b - a) * 60) },
    (_, i) => Math.round(a * 60) + i,
  ),
);
const target = path.join(out, `spotter-three-steps-${mode}.mp4`),
  pending = path.join(out, `spotter-three-steps-${mode}.pending.mp4`);
const intro = path.resolve("out/spotter-intro-v4.mp4");
if (mode === "full") {
  try {
    await access(intro);
  } catch {
    const code = await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          "render.mjs",
          "video",
          "--composition",
          "SpotterIntro",
          "--scale",
          "1",
          "--concurrency",
          "1",
          "--output",
          intro,
        ],
        { stdio: "inherit" },
      );
      child.once("error", reject);
      child.once("exit", resolve);
    });
    if (code !== 0) throw new Error("Approved intro render failed");
  }
}
const browser = await chromium.launch({
  headless: true,
  executablePath: path.resolve(
    "node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe",
  ),
  args: [
    "--use-gl=angle",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
  ],
});
let ffmpeg,
  stderr = "",
  nonce = 1;
let collectPointer = false;
const pointerPoses = [];
try {
  const errors = [];
  const workers = await Promise.all(
    Array.from({ length: 2 }, async () => {
      const page = await browser.newPage({
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
      });
      page.on("pageerror", (error) => errors.push(error.message));
      const cdp = await page.context().newCDPSession(page);
      await page.goto(
        "http://127.0.0.1:3372/?demo=demos/spotter-current.json&render=1",
      );
      await page.waitForSelector("[data-frame]");
      return { page, cdp };
    }),
  );
  async function capture(worker, frame, format = "jpeg") {
    const pose = await worker.page.evaluate(
      ({ frame, nonce }) =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            removeEventListener("message", receive);
            reject(new Error(`Frame ${frame} did not acknowledge paint`));
          }, 65000);
          function receive(event) {
            if (event.data?.kind === "clio-film-error") {
              clearTimeout(timer);
              removeEventListener("message", receive);
              reject(new Error(event.data.message));
            }
            if (
              event.data?.kind === "clio-film-ready" &&
              event.data.frame === frame &&
              event.data.nonce === nonce
            ) {
              clearTimeout(timer);
              removeEventListener("message", receive);
              const pointers = document.querySelectorAll(".sv3-pointer");
              const cursor = pointers[0];
              const box = cursor?.getBoundingClientRect();
              resolve({
                frame,
                paintedFrame: Number(
                  document.querySelector("[data-frame]")?.dataset.frame,
                ),
                count: pointers.length,
                x: box?.x,
                y: box?.y,
                opacity: cursor ? Number(getComputedStyle(cursor).opacity) : 0,
              });
            }
          }
          addEventListener("message", receive);
          postMessage(
            {
              kind: "clio-film-frame",
              frame,
              nonce,
              viewport: { width: 1920, height: 1080 },
            },
            "*",
          );
        }),
      { frame, nonce: nonce++ },
    );
    if (pose.paintedFrame !== frame || pose.count !== 1 || pose.opacity !== 1)
      throw new Error(`Missing or stale native pointer at ${frame}`);
    if (collectPointer) pointerPoses.push(pose);
    const shot = await worker.cdp.send("Page.captureScreenshot", {
      format,
      ...(format === "jpeg" ? { quality: 100 } : {}),
      fromSurface: true,
      optimizeForSpeed: true,
    });
    return Buffer.from(shot.data, "base64");
  }
  // A new stateless renderer must qualify cold/backward seeks before independent
  // pages can share its workload. Compare exact decoded PNGs, not JPEG metadata.
  const { PNG } = await import("pngjs");
  const parity = [];
  for (const frame of [
    3060, 5130, 6270, 9030, 10320, 10470, 11010, 11280, 11580,
  ]) {
    console.log(JSON.stringify({ checkingPixelParity: frame }));
    await capture(workers[0], Math.max(0, frame - 1), "png");
    const warm = await capture(workers[0], frame, "png");
    const a = PNG.sync.read(warm).data;
    await capture(workers[1], 0, "png");
    const cold = await capture(workers[1], frame, "png");
    const b = PNG.sync.read(cold).data;
    const same = a.equals(b);
    parity.push({ frame, same });
    if (!same) {
      await writeFile(path.join(temp, `parity-${frame}-warm.png`), warm);
      await writeFile(path.join(temp, `parity-${frame}-cold.png`), cold);
      throw new Error(`Cold/sequential pixel parity failed at ${frame}`);
    }
  }
  console.log(JSON.stringify({ pixelParity: parity }));
  collectPointer = true;
  ffmpeg = spawn(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "image2pipe",
      "-vcodec",
      "mjpeg",
      "-framerate",
      "60",
      "-i",
      "pipe:0",
      "-an",
      "-vf",
      "scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "16",
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
      pending,
    ],
    { stdio: ["pipe", "ignore", "pipe"] },
  );
  ffmpeg.stderr.on("data", (data) => {
    stderr += data.toString();
  });
  const finished = once(ffmpeg, "exit");
  const started = performance.now();
  for (let offset = 0; offset < sourceFrames.length; offset += workers.length) {
    if (errors.length) throw new Error(errors.join("\n"));
    const batch = sourceFrames.slice(offset, offset + workers.length);
    const buffers = await Promise.all(
      batch.map((frame, i) => capture(workers[i], frame)),
    );
    for (const bytes of buffers)
      if (!ffmpeg.stdin.write(bytes)) await once(ffmpeg.stdin, "drain");
    const count = offset + batch.length;
    if (offset % 120 === 0 || count === sourceFrames.length)
      console.log(
        JSON.stringify({
          captured: count,
          total: sourceFrames.length,
          sourceFrame: batch.at(-1),
          elapsedSeconds: Math.round((performance.now() - started) / 1000),
          fps: Number(
            ((count * 1000) / (performance.now() - started)).toFixed(2),
          ),
        }),
      );
  }
  ffmpeg.stdin.end();
  const [code] = await finished;
  if (code !== 0) throw new Error(`FFmpeg failed: ${stderr}`);
  pointerPoses.sort((a, b) => a.frame - b.frame);
  let maximumPointerTravel = 0;
  for (let index = 1; index < pointerPoses.length; index++) {
    const previous = pointerPoses[index - 1],
      current = pointerPoses[index];
    if (current.frame !== previous.frame + 1) continue;
    const travel = Math.hypot(current.x - previous.x, current.y - previous.y);
    maximumPointerTravel = Math.max(maximumPointerTravel, travel);
    if (travel > 30.1)
      throw new Error(
        `Encoded-source pointer speed spike at ${current.frame}: ${travel}`,
      );
  }
  if (pointerPoses.length !== sourceFrames.length)
    throw new Error("Native pointer coverage is incomplete");
  const probe = JSON.parse(
    (
      await promisify(execFile)("ffprobe", [
        "-v",
        "error",
        "-count_frames",
        "-show_streams",
        "-of",
        "json",
        pending,
      ])
    ).stdout,
  );
  const video = probe.streams.find((s) => s.codec_type === "video");
  if (
    video.width !== 1920 ||
    video.height !== 1080 ||
    video.avg_frame_rate !== "60/1" ||
    Number(video.nb_read_frames) !== sourceFrames.length
  )
    throw new Error("Delivery dimensions/frame count failed");
  let deliveryVideo = video,
    introSha256;
  if (mode === "full") {
    const introProbe = JSON.parse(
      (
        await promisify(execFile)("ffprobe", [
          "-v",
          "error",
          "-select_streams",
          "v:0",
          "-show_streams",
          "-of",
          "json",
          intro,
        ])
      ).stdout,
    ).streams[0];
    if (
      introProbe.width !== 1920 ||
      introProbe.height !== 1080 ||
      introProbe.avg_frame_rate !== "60/1" ||
      Number(introProbe.nb_frames) !== 480
    )
      throw new Error("Approved intro dimensions/frame count mismatch");
    await promisify(execFile)("ffmpeg", [
      "-v",
      "error",
      "-y",
      "-i",
      intro,
      "-i",
      pending,
      "-filter_complex",
      "[0:v]setsar=1,setpts=PTS-STARTPTS[a];[1:v]setsar=1,setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1:a=0[v]",
      "-map",
      "[v]",
      "-an",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "16",
      "-pix_fmt",
      "yuv420p",
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
      target,
    ]);
    deliveryVideo = JSON.parse(
      (
        await promisify(execFile)("ffprobe", [
          "-v",
          "error",
          "-count_frames",
          "-show_streams",
          "-of",
          "json",
          target,
        ])
      ).stdout,
    ).streams.find((s) => s.codec_type === "video");
    if (Number(deliveryVideo.nb_read_frames) !== sourceFrames.length + 480)
      throw new Error("Approved-intro conform frame count failed");
    const introHash = createHash("sha256");
    for await (const bytes of createReadStream(intro)) introHash.update(bytes);
    introSha256 = introHash.digest("hex");
    await unlink(pending);
  } else await rename(pending, target);
  const hash = createHash("sha256");
  for await (const bytes of createReadStream(target)) hash.update(bytes);
  await writeFile(
    `${target}.json`,
    JSON.stringify(
      {
        schema: "clio.spotter-v3-render.v1",
        capture:
          "direct native page; same frame/paint protocol as Remotion bridge",
        mode,
        sha256: hash.digest("hex"),
        ui: pin,
        sourceSha256:
          "cfdd456f2640519c6a0f715e817927c7fb70e77974d6d9605be12cc903131cd5",
        frames: Number(deliveryVideo.nb_read_frames),
        bodyFrames: sourceFrames.length,
        fps: 60,
        width: 1920,
        height: 1080,
        ranges,
        errors,
        independentPagePixelParity: parity,
        capturePages: workers.length,
        pointerAudit: {
          frames: pointerPoses.length,
          maximumPixelsPerFrame: maximumPointerTravel,
          missingOrStale: 0,
        },
        markers:
          mode === "full"
            ? JSON.parse(
                await readFile(
                  "../videos/spotter-opal/v3/source-projection.json",
                  "utf8",
                ),
              )
                .editorial.markers.filter(([s]) => s >= 7)
                .map(([s, label]) => [s + 1, label])
            : [],
        video: deliveryVideo,
        approvedIntro:
          mode === "full"
            ? {
                file: "out/spotter-intro-v4.mp4",
                sha256: introSha256,
                frames: 480,
                source: "src/SpotterIntro.tsx",
                deliveryOffsetSeconds: 1,
              }
            : undefined,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify({ output: target }));
} finally {
  if (ffmpeg && ffmpeg.exitCode === null) ffmpeg.kill();
  await browser.close();
}
