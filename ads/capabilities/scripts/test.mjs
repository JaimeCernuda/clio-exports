/** Start the test runner only after giving its loaders a cache on the project drive. */
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, ".."),
  tmp = path.join(root, ".cache/tmp");
await mkdir(tmp, { recursive: true });
const files = (await readdir(path.join(root, "tests")))
  .filter((name) => /\.test\.(ts|mjs)$/.test(name))
  .map((name) => path.join(root, "tests", name));
const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", ...files],
  {
    cwd: root,
    env: { ...process.env, TEMP: tmp, TMP: tmp, TMPDIR: tmp },
    stdio: "inherit",
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
