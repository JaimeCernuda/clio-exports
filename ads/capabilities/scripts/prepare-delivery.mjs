/** Publish a review ledger tied to eight already inspected delivery hashes. */
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, ".."),
  read = async (name) =>
    JSON.parse(await fs.readFile(path.join(root, name), "utf8"));
const movies = (await read("output/manifest.json"))
  .filter((f) => f.width === 1920)
  .sort((a, b) => a.number - b.number);
const history = (await read("review-history.json")).entries;
if (movies.length !== 8) throw new Error("Eight delivery films are required");
const films = [];
for (const f of movies) {
  const hash = createHash("sha256")
    .update(await fs.readFile(path.join(root, "output", f.filename)))
    .digest("hex");
  const review = history.findLast(
    (r) => r.id === f.id && r.sha256 === hash && r.stage === "delivery",
  );
  if (
    hash !== f.sha256 ||
    !review ||
    review.status !== "ready-for-editorial-review"
  )
    throw new Error(`No matching delivery review: ${f.id}`);
  const story = await read(
    `films/${String(f.number).padStart(2, "0")}-${f.id}/storyboard.json`,
  );
  films.push({
    ...f,
    coverage: review.coverage,
    limits: story.limits,
    findings: review.findings,
  });
}
await fs.writeFile(
  path.join(root, "output/review-manifest.json"),
  JSON.stringify({ schema: "clio.capability-delivery.v1", films }, null, 2) +
    "\n",
);
// Original inputs and validated finals stay untouched. Separate superseded draft
// movies from the eight files the user will upload. Resolve both parents first.
const drafts = path.join(root, "review/drafts");
await fs.mkdir(drafts, { recursive: true });
const canonicalRoot = (await fs.realpath(root)).toLowerCase() + path.sep;
if (!(await fs.realpath(drafts)).toLowerCase().startsWith(canonicalRoot))
  throw new Error("Draft target leaves campaign workspace");
for (const f of movies) {
  const name = f.filename.replace(/\.mp4$/, "-draft.mp4"),
    source = path.join(root, "output", name);
  try {
    if (!(await fs.realpath(source)).toLowerCase().startsWith(canonicalRoot))
      throw new Error("Draft source leaves campaign workspace");
    await fs.rename(source, path.join(drafts, name));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
await fs.writeFile(
  path.join(root, "output/manifest.json"),
  JSON.stringify(movies, null, 2) + "\n",
);
await fs.writeFile(
  path.join(root, "output/READ-ME.txt"),
  `Eight CLIO capability advertisements\n1920 x 1080, 60 fps, H.264/AAC. Movies remain local for Drive upload.\n\n${films.map((f) => `${f.filename} | ${f.seconds}s | SHA-256 ${f.sha256}`).join("\n")}\n\nReview coverage and presentation limits: review-manifest.json\nSource, data ledger, scripts and skills: clio-exports/ads/capabilities\n`,
);
console.log(
  "Prepared eight reviewed delivery files and separated superseded drafts",
);
