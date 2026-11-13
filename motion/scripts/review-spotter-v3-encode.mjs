import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
const run = promisify(execFile),
  mode = process.argv[2] ?? "full";
if (!["full", "proof"].includes(mode)) throw new Error("Choose full or proof");
const root = path.resolve("out/spotter-v3"),
  file = path.join(root, `spotter-three-steps-${mode}.mp4`),
  dir = path.join(root, `${mode}-review`);
const receipt = JSON.parse(await readFile(file + ".json", "utf8"));
await mkdir(dir, { recursive: true });
const times =
  mode === "proof"
    ? [
        0, 1, 2.5, 3, 3.9, 4, 4.15, 4.3, 4.45, 5, 5.8, 8, 10.8, 11, 11.5, 12,
        12.5, 14, 17, 18, 18.9, 19, 19.5, 20, 20.5, 21, 21.8, 22, 22.8, 25,
        27.8, 28, 28.5, 29, 29.5, 30.5,
      ]
    : [
        0, 4, 7.9, 8, 9.5, 12, 14, 19, 21, 25.5, 30, 34.5, 45, 48.2, 51.5, 60,
        66.7, 77, 86, 91.5, 101, 105, 114.5, 122, 135.5, 143, 146, 152, 155,
        160.5, 165, 166.5, 169.8, 173, 175, 176.5, 181.5, 185.1, 185.2, 185.4,
        186.2, 186.8, 190, 192, 194, 199.5, 205.5, 209,
      ];
for (const time of times)
  await run("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-ss",
    String(time),
    "-i",
    file,
    "-frames:v",
    "1",
    path.join(dir, `${String(time).replace(".", "_")}.png`),
  ]);
const strips =
  mode === "proof"
    ? [
        [3.9, 4.5],
        [10.9, 12.5],
        [18.9, 21.1],
        [27.9, 29.5],
      ]
    : [
        [7.7, 8.3],
        [19, 21],
        [23.9, 24.5],
        [48, 48.5],
        [50.3, 51.2],
        [61.8, 62.4],
        [100.8, 101.5],
        [102.8, 103.6],
        [114.03, 114.26],
        [133.9, 134.5],
        [159.8, 160.6],
        [166.3, 167.2],
        [175, 177],
        [183, 185.1],
        [185.1, 187.2],
        [192, 194],
        [199.5, 201.5],
        [204.8, 206.2],
      ];
for (const [a, b] of strips)
  await run("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-ss",
    String(a),
    "-i",
    file,
    "-vf",
    `trim=duration=${b - a},setpts=PTS-STARTPTS,fps=6,scale=640:360,tile=3x${Math.ceil(((b - a) * 6) / 3)}`,
    "-frames:v",
    "1",
    path.join(dir, `strip-${a}.png`),
  ]);
const consecutiveFrames =
  mode === "full"
    ? [
        [3619, 3630],
        [6079, 6090],
        [6843, 6854],
        [9986, 9997],
        [11108, 11119],
        [12355, 12366],
      ]
    : [];
for (const [first, last] of consecutiveFrames)
  await run("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-ss",
    String(first / receipt.fps),
    "-i",
    file,
    "-vf",
    `trim=end_frame=${last - first + 1},setpts=PTS-STARTPTS,scale=640:360,tile=3x4`,
    "-frames:v",
    "1",
    path.join(dir, `consecutive-${first}.png`),
  ]);
await run("ffmpeg", [
  "-v",
  "error",
  "-y",
  "-i",
  file,
  "-vf",
  `fps=1/${mode === "proof" ? 2 : 10},scale=480:270,tile=4x6`,
  "-frames:v",
  "1",
  path.join(dir, "overview.png"),
]);
await writeFile(
  path.join(dir, "coverage.json"),
  JSON.stringify(
    {
      video: path.basename(file),
      sha256: receipt.sha256,
      frames: receipt.frames,
      times,
      strips,
      consecutiveFrames,
      note: "Generated review material; inspection must be recorded separately.",
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ dir }));
