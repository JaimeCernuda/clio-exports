import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDemoSpec, type DemoScene } from "../native/current/demo-model";
import { sceneAssetPath } from "../native/scene-selection";

const [sceneFile, id, seconds = "120", turns] = process.argv.slice(2);
if (!sceneFile || !id)
  throw new Error(
    "Usage: npm run demo:create -- scene.native.json film-id [seconds=120] [turns=all]",
  );
sceneAssetPath(sceneFile);
const publicDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../native/public",
);
const scene = JSON.parse(
  await readFile(path.join(publicDir, sceneFile), "utf8"),
) as DemoScene;
const spec = createDemoSpec(
  scene,
  sceneFile,
  id,
  Number(seconds),
  turns === undefined ? undefined : Number(turns),
);
await mkdir(path.join(publicDir, "demos"), { recursive: true });
const output = path.join(publicDir, "demos", `${id}.json`);
await writeFile(output, JSON.stringify(spec, null, 2) + "\n", { flag: "wx" });
console.log(output);
