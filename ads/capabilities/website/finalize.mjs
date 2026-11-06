/** Record the precise website inspection coverage and publish its deployment inventory. */
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const root = import.meta.dirname;
const read = async (name) =>
  JSON.parse(await fs.readFile(path.join(root, name), "utf8"));
const manifest = await read("manifest.json"),
  checks = await read("verification.json"),
  notes = await read("review-notes.json"),
  framing = await read("review/framing.json");
if (manifest.length !== 16 || checks.length !== 16 || framing.problems.length)
  throw new Error("Complete, passing website collection required");
const observations = {},
  coverage = [...new Set(notes.map((n) => n.coverage))].join("\n\n"),
  pending = [...new Set(notes.map((n) => n.pending))].join("\n\n");
for (const asset of manifest) {
  const check = checks.find((c) => c.key === asset.key);
  if (!check || JSON.stringify(check.files) !== JSON.stringify(asset.files))
    throw new Error(`Review does not match ${asset.key}`);
  const note = notes.find((n) => n.key === asset.key);
  if (
    !note ||
    JSON.stringify(note.files) !== JSON.stringify(asset.files) ||
    !note.reviewed ||
    !note.observation ||
    !note.coverage
  )
    throw new Error(
      `Missing exact-version visual notes: ${asset.key}. Inspect the new render before recording findings.`,
    );
  observations[asset.key] = note.observation;
  for (const file of asset.files) {
    const actual = await fs.readFile(
      path.join(root, asset.id, asset.variant, "output", file.name),
    );
    if (createHash("sha256").update(actual).digest("hex") !== file.sha256)
      throw new Error(`Changed ${asset.key}/${file.name}`);
  }
  asset.status = "prepared-for-website-review";
  asset.review = {
    coverage: note.coverage,
    observation: note.observation,
    pending: note.pending,
  };
  check.visual = asset.review;
  await fs.writeFile(
    path.join(root, asset.id, asset.variant, "output/manifest.json"),
    JSON.stringify(asset, null, 2) + "\n",
  );
}
await fs.writeFile(
  path.join(root, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
await fs.writeFile(
  path.join(root, "verification.json"),
  JSON.stringify(checks, null, 2) + "\n",
);
const sum = (name) =>
  manifest.reduce((n, a) => n + a.files.find((f) => f.name === name).bytes, 0) /
  1e6;
const guide = `# Website output review\n\nSixteen placements have been rendered and prepared for website review. Every row\nbelow is tied to its exact files in [manifest.json](manifest.json) and format/loop\nchecks in [verification.json](verification.json). Generated media remain local.\n\n${coverage}\n\n**Outstanding:** ${pending}\n\n## Individual cuts\n\n| Cut | Duration | GIF / MP4 | Inspected action |\n| --- | --- | --- | --- |\n${manifest.map((a) => `| ${a.key} | ${a.seconds.toFixed(2)} s | ${(a.files.find((f) => f.name === "loop.gif").bytes / 1e6).toFixed(2)} / ${(a.files.find((f) => f.name === "loop.mp4").bytes / 1e6).toFixed(2)} MB | ${a.description} |`).join("\n")}\n\n## Findings and corrections\n\n${Object.entries(
  observations,
)
  .map(([id, note]) => `- **${id}:** ${note}`)
  .join(
    "\n",
  )}\n\nAll ${framing.records.filter((r) => !r.press).length} measured crop snapshots and ${framing.records.filter((r) => r.press).length} authored website presses passed. Method execution also has a frame-by-frame source route invariant and measured rendered-center checks. Loop joins passed in all three formats; all GIFs carry infinite-loop metadata. Reset is a soft fade after a forward-only process, never reversed scientific execution.\n\nThe complete GIF set is ${sum("loop.gif").toFixed(2)} MB; MP4 ${sum("loop.mp4").toFixed(2)} MB; WebM ${sum("loop.webm").toFixed(2)} MB. Use the lighter video formats for production websites.\n`;
await fs.writeFile(path.join(root, "REVIEW.md"), guide);
console.log(
  "Prepared 16 website placements with exact review identities and explicit moving-review limit",
);
