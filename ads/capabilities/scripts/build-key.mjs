/** Hash render inputs so a compiled bundle can only be reused for unchanged scenes. */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
export async function buildKey(root) {
  const files = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (e) {
      if (e.code === "ENOENT") return;
      throw e;
    }
    for (const entry of entries) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (/\.(tsx?|json|svg|png)$/.test(entry.name)) files.push(file);
    }
  }
  for (const dir of ["src", "films", "public"])
    await walk(path.join(root, dir));
  for (const file of [
    "render.mjs",
    "scripts/sound.mjs",
    "tsconfig.json",
    "package-lock.json",
    "evidence/science.json",
    "evidence/beam.json",
    "evidence/genomics.json",
    "evidence/hurricane.json",
    "evidence/atlantic-basemap.json",
  ])
    files.push(path.join(root, file));
  const hash = createHash("sha256");
  for (const file of files.sort()) {
    hash.update(path.relative(root, file));
    hash.update(await readFile(file));
  }
  return hash.digest("hex");
}
