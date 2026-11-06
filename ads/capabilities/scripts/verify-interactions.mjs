/** Test pointer hotspots against measured render geometry at every authored press. */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { films } from "../src/registry.ts";
import { clickFrames } from "./interactions.mjs";
const root = path.resolve(import.meta.dirname, ".."),
  records = [];
for (const film of films) {
  const stem = `${String(film.number).padStart(2, "0")}-${film.id}`;
  const source = await readFile(
    path.join(root, `films/${stem}/scene.tsx`),
    "utf8",
  );
  const frames = clickFrames(source);
  if (!frames.length) continue;
  const measured = JSON.parse(
    await readFile(path.join(root, `review/${stem}-geometry.json`), "utf8"),
  );
  for (const frame of frames) {
    const snapshot = measured.find((s) => Math.abs(s.t - frame / 60) < 0.00001);
    if (!snapshot)
      throw new Error(
        `Missing measured press ${film.id} frame ${frame}; render stills with --interactions`,
      );
    const pointer = snapshot.elements.find((e) => e.kind === "cursor");
    if (!pointer)
      throw new Error(`Invisible pointer at ${film.id} ${snapshot.t}s`);
    const x = pointer.x + 3,
      y = pointer.y + 2;
    const target = snapshot.elements.find(
      (e) =>
        ["button", "selection-surface"].includes(e.kind) &&
        x >= e.x &&
        x <= e.x + e.width &&
        y >= e.y &&
        y <= e.y + e.height,
    );
    if (!target)
      throw new Error(
        `Pointer misses an interactive target: ${film.id} ${snapshot.t}s at ${x},${y}`,
      );
    records.push({
      film: film.id,
      frame,
      t: snapshot.t,
      x,
      y,
      target: target.text || target.kind,
      bounds: target,
    });
  }
}
await writeFile(
  path.join(root, "review/interaction-checks.json"),
  JSON.stringify(records, null, 2) + "\n",
);
console.log(
  `Verified ${records.length} authored presses against measured controls`,
);
