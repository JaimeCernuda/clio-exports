import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { videoHash } from "./video-tools";

/** Measure an isolated paint change against both neighbours; low through/into ratio suggests a flash, not a sustained transition. */
export function flashMeasure(
  older: Uint8Array,
  middle: Uint8Array,
  newer: Uint8Array,
) {
  if (
    !older.length ||
    older.length !== middle.length ||
    older.length !== newer.length
  )
    throw new Error(
      "Flash measurements require three equally sized nonempty frames",
    );
  let into = 0,
    out = 0,
    through = 0;
  for (let i = 0; i < older.length; i++) {
    into += Math.abs(middle[i] - older[i]);
    out += Math.abs(newer[i] - middle[i]);
    through += Math.abs(newer[i] - older[i]);
  }
  into /= older.length;
  out /= older.length;
  through /= older.length;
  const amplitude = Math.min(into, out);
  return {
    into,
    out,
    through,
    amplitude,
    ratio: through / Math.max(amplitude, 0.00001),
  };
}

/** Scan every decoded delivery frame with bounded memory. Candidates require visual diagnosis, never automatic approval or repair. */
async function main(): Promise<void> {
  const video = path.resolve(
    process.argv[2] ?? "out/spotter-v2/spotter-opal-investigation-v2.mp4",
  );
  const expected = Number(process.argv[3] ?? 16406);
  if (!Number.isInteger(expected) || expected < 3)
    throw new Error("Invalid expected frame count");
  const pixels = 320 * 180;
  const child = spawn(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      video,
      "-vf",
      "scale=320:180,format=gray",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "gray",
      "pipe:1",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let errors = "";
  child.stderr.on("data", (data: Buffer) => {
    errors = (errors + data.toString()).slice(-4096);
  });
  const completion = new Promise<number | null>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  let pending = Buffer.alloc(0),
    older: Buffer | undefined,
    middle: Buffer | undefined,
    frames = 0;
  const candidates: Array<{ frame: number } & ReturnType<typeof flashMeasure>> =
    [];
  for await (const data of child.stdout) {
    pending = Buffer.concat([pending, data as Buffer]);
    while (pending.length >= pixels) {
      const current = Buffer.from(pending.subarray(0, pixels));
      pending = pending.subarray(pixels);
      if (older && middle) {
        const measured = flashMeasure(older, middle, current);
        if (measured.amplitude > 0.12 && measured.ratio < 0.5)
          candidates.push({ frame: frames - 1, ...measured });
      }
      older = middle;
      middle = current;
      frames++;
    }
  }
  if ((await completion) !== 0)
    throw new Error("FFmpeg flash scan failed: " + errors);
  if (frames !== expected || pending.length)
    throw new Error(`Incomplete flash scan: ${frames}/${expected}`);
  candidates.sort((a, b) => b.amplitude - a.amplitude);
  const result = {
    sha256: await videoHash(video),
    frames,
    candidates,
    interpretation:
      "Low-resolution temporal candidates only; inspect consecutive encoded frames before drawing conclusions.",
  };
  await writeFile(
    video + ".flash-scan.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      frames,
      candidates: candidates.length,
      strongest: candidates.slice(0, 10),
    }),
  );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
