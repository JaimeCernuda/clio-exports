/** Retain the actual filtered scientific comparison represented by the export gesture. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "..");
const science = JSON.parse(
  await readFile(path.join(root, "evidence/science.json"), "utf8"),
);
const rows = science.snowfall.filter(
  (r) => r.cohort === "available" && ["Jan", "Feb", "Mar"].includes(r.month),
);
if (rows.length !== 3)
  throw new Error("Expected the selected three month records");
const directory = path.join(root, "evidence/exports");
await mkdir(directory, { recursive: true });
const csv =
  "month,target_in,mean_in,q25_in,q75_in,min_in,max_in,anomaly_in\n" +
  rows
    .map((r) =>
      [
        r.month,
        r.target_in,
        r.mean_in,
        r.q25_in,
        r.q75_in,
        r.min_in,
        r.max_in,
        r.target_in - r.mean_in,
      ].join(","),
    )
    .join("\n") +
  "\n";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><rect width="960" height="540" fill="white"/><g font-family="sans-serif" fill="#173b4c"><text x="70" y="58" font-size="26">Monthly snowfall · January–March</text><text x="70" y="91" font-size="18">2023–24 vs all complete historical months · inches</text>${rows
  .map((r, i) => {
    const x = 180 + i * 300,
      y = (v) => 430 - (v / 250) * 270;
    return `<line x1="${x}" x2="${x}" y1="${y(r.min_in)}" y2="${y(r.max_in)}" stroke="#aebec7"/><rect x="${x - 30}" y="${y(r.q75_in)}" width="60" height="${y(r.q25_in) - y(r.q75_in)}" fill="#d6e5ef"/><circle cx="${x}" cy="${y(r.target_in)}" r="8" fill="#198e9d"/><circle cx="${x}" cy="${y(r.mean_in)}" r="6" fill="#d2a44c"/><text x="${x}" y="475" text-anchor="middle" font-size="23">${r.month}</text><text x="${x}" y="505" text-anchor="middle" font-size="18">${r.target_in} / mean ${r.mean_in.toFixed(1)}</text>`;
  })
  .join("")}</g></svg>`;
const exports = [];
for (const [name, content] of [
  ["snowfall-comparison.csv", csv],
  ["snowfall-comparison.svg", svg],
]) {
  await writeFile(path.join(directory, name), content);
  exports.push({
    name,
    sha256: createHash("sha256").update(content).digest("hex"),
  });
}
await writeFile(
  path.join(directory, "manifest.json"),
  JSON.stringify(
    { cohort: "available", months: rows.map((r) => r.month), exports },
    null,
    2,
  ) + "\n",
);
console.log(
  "Exported actual three-month comparison and its editable vector view",
);
