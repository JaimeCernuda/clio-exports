/** Dense encoded review around editorial markers and the interactions reported by the user. */
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
const extra = {
  team: [10.7, 16, 21.5, 28.2],
  selection: [6.6, 11.8, 15.7, 18.4, 20.9, 22.8, 23.5],
  streams: [27.4, 29.15],
};
export async function reviewTransitions(film, input, directory) {
  await fs.mkdir(directory, { recursive: true });
  const cues = [
    ...new Set([
      ...film.markers.slice(1, -1).map((m) => m.at),
      ...(extra[film.id] ?? []),
    ]),
  ].sort((a, b) => a - b);
  for (const at of cues)
    execFileSync(
      "ffmpeg",
      [
        "-v",
        "error",
        "-y",
        "-ss",
        String(Math.max(0, at - 0.6)),
        "-i",
        input,
        "-t",
        "1.2",
        "-vf",
        "fps=12,scale=480:270,tile=5x3",
        "-frames:v",
        "1",
        "-q:v",
        "2",
        path.join(directory, `transition-${at}.jpg`),
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
) {
  const root = path.resolve(import.meta.dirname, ".."),
    manifest = JSON.parse(
      await fs.readFile(path.join(root, "output/manifest.json"), "utf8"),
    );
  for (const film of manifest.filter(
    (f) => f.width === 1920 && process.argv.slice(2).includes(f.id),
  ))
    await reviewTransitions(
      film,
      path.join(root, "output", film.filename),
      path.join(root, "review", film.id),
    );
}
