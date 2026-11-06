/** Extract bounded, source-linked scientific data; never execute exported HTML. */
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "..");
const repo = path.resolve(root, "../..");
const product =
  process.env.CLIO_SOURCE_ROOT ?? path.resolve(repo, "../clio-agent");
const out = path.join(root, "evidence");
await fs.mkdir(out, { recursive: true });
const ledger = {
  schema: "clio.capability-evidence.v1",
  product: {
    commit: execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: product,
      encoding: "utf8",
    }).trim(),
    submodules: execFileSync(
      "git",
      [
        "submodule",
        "status",
        "external/gact-tui",
        "external/clio-agent-marketplace",
      ],
      { cwd: product, encoding: "utf8" },
    ).trim(),
  },
  sources: [],
};
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const write = async (name, value) =>
  fs.writeFile(path.join(out, name), JSON.stringify(value, null, 2) + "\n");
for (const name of ["alta", "konza", "tahoe"]) {
  const source = path.join(repo, "motion/native/public", name + ".native.json");
  const bytes = await fs.readFile(source),
    scene = JSON.parse(bytes);
  const tables = Object.values(scene.snapshot.tables ?? {});
  const responses = Object.entries(scene.snapshot.responses ?? {})
    .filter(([k]) => k.endsWith("/a2ui/surfaces"))
    .flatMap(([, v]) => v.json?.surfaces ?? []);
  await write(name + ".json", {
    session: scene.session.id,
    archive: scene.source,
    tables,
    surfaces: responses,
  });
  if (name === "tahoe") {
    const entry = Object.entries(scene.snapshot.responses).find(([k]) =>
      k.includes("artifact_47ed32665c174a5daf93ef98517023fc/bytes"),
    );
    if (!entry?.[1]?.bytes)
      throw new Error("Saved boundary geometry is unavailable");
    await fs.writeFile(
      path.join(out, "boundary.geojson"),
      Buffer.from(entry[1].bytes, "base64"),
    );
  }
  ledger.sources.push({
    name,
    path: path.relative(repo, source).replaceAll("\\", "/"),
    sha256: hash(bytes),
    session: scene.session.id,
    original: scene.source,
  });
  console.log(
    name,
    tables.map((t) => ({
      id: t.artifact_id,
      name: t.name,
      keys: Object.keys(t),
      columns: Object.keys(t.columns ?? {}),
      rows: t.row_count,
    })),
    "surfaces",
    responses.length,
  );
}
const stormPath = path.join(
  product,
  "site/public/datasets/atlantic-hurricanes-noaa.csv",
);
const stormBytes = await fs.readFile(stormPath);
const csv = stormBytes
  .toString()
  .trim()
  .split(/\r?\n/)
  .map((l) => l.split(",").map((s) => s.replace(/^"|"$/g, "")));
const headers = csv.shift();
const storms = csv
  .map((row) =>
    Object.fromEntries(
      headers.map((h, i) => [
        h,
        ["wind_kt", "lat", "lon", "elapsed_hours", "year"].includes(h)
          ? Number(row[i])
          : row[i],
      ]),
    ),
  )
  .filter((r) => r.storm === "DORIAN");
await write("hurricane.json", storms);
ledger.sources.push({
  name: "hurricane",
  path: "clio-agent/site/public/datasets/atlantic-hurricanes-noaa.csv",
  sha256: hash(stormBytes),
  origin: "NOAA hurricane observations; retained CLIO documentation data",
});
await write("sources.json", ledger);
const assets = path.join(root, "public");
await fs.mkdir(assets, { recursive: true });
for (const name of ["clio-mark.svg", "grc-logo.png"])
  await fs.copyFile(
    path.join(repo, "composability/ad/public", name),
    path.join(assets, name),
  );
console.log("Prepared source data", out);
