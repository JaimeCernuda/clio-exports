/** Website cache keys include both the shared product scenes and the website adaptation. */
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { buildKey } from "../scripts/build-key.mjs";
export async function websiteKey(root) {
  const parent = path.resolve(root, ".."),
    hash = createHash("sha256").update(await buildKey(parent));
  const files = [];
  async function walk(folder) {
    for (const item of await fs.readdir(folder, { withFileTypes: true })) {
      if (["output", "review", ".cache", "node_modules"].includes(item.name))
        continue;
      const file = path.join(folder, item.name);
      if (item.isDirectory()) await walk(file);
      else if (
        /\.tsx?$/.test(item.name) ||
        ["encode.mjs", "render.mjs"].includes(item.name)
      )
        files.push(file);
    }
  }
  await walk(root);
  for (const file of files.sort())
    hash.update(path.relative(root, file)).update(await fs.readFile(file));
  return hash.digest("hex");
}
