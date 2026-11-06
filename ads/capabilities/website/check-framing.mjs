/** Detect accidentally sliced controls/cards and missed pointer targets in website crops. */
import fs from "node:fs/promises";
import path from "node:path";
import { assets } from "./src/plan.ts";
import { films } from "../src/registry.ts";
import { clickFrames } from "../scripts/interactions.mjs";
const root = import.meta.dirname,
  records = [],
  problems = [];
for (const asset of assets) {
  const snapshots = JSON.parse(
    await fs.readFile(
      path.join(root, "review", `${asset.key}-geometry.json`),
      "utf8",
    ),
  );
  const film = films.find((f) => f.id === asset.id);
  const source = await fs.readFile(
    path.join(
      root,
      "..",
      "films",
      `${String(film.number).padStart(2, "0")}-${film.id}`,
      "scene.tsx",
    ),
    "utf8",
  );
  const presses = clickFrames(source)
    .map((f) => f / 60)
    .filter((t) => t >= asset.sourceStart && t <= asset.sourceEnd);
  for (const shot of snapshots) {
    if (asset.id === "method") {
      const payload = shot.elements.find((e) => e.kind === "result-payload");
      if (payload) {
        const lane =
          ((220 + 460 - asset.crop.y) * asset.width) / asset.crop.width;
        if (Math.abs(payload.y + payload.height / 2 - lane) > 0.1)
          throw new Error(
            `Result leaves route in rendered website frame ${asset.key} ${shot.t}`,
          );
      }
    }
    const seen = shot.elements.filter((e) =>
      ["button", "node", "selection-surface"].includes(e.kind),
    );
    for (const e of seen) {
      const intersection =
        Math.max(0, Math.min(asset.width, e.x + e.width) - Math.max(0, e.x)) *
        Math.max(0, Math.min(asset.height, e.y + e.height) - Math.max(0, e.y));
      if (intersection < 4) continue;
      if (
        e.x < -0.8 ||
        e.y < -0.8 ||
        e.x + e.width > asset.width + 0.8 ||
        e.y + e.height > asset.height + 0.8
      )
        problems.push({ key: asset.key, t: shot.t, text: e.text, bounds: e });
    }
    records.push({
      key: asset.key,
      t: shot.t,
      sourceTime: shot.sourceTime,
      visibleControls: seen.length,
    });
  }
  for (const press of presses) {
    const shot = snapshots.find(
      (s) =>
        Math.abs(s.sourceTime - press) <= asset.speed / asset.fps / 2 + 0.00001,
    );
    if (!shot)
      throw new Error(`Missing website press frame ${asset.key} ${press}`);
    const cursor = shot.elements.find((e) => e.kind === "cursor"),
      scale = asset.width / asset.crop.width;
    if (!cursor)
      throw new Error(`Invisible website pointer ${asset.key} ${press}`);
    const x = cursor.x + 3 * scale,
      y = cursor.y + 2 * scale;
    const target = shot.elements.find(
      (e) =>
        ["button", "selection-surface"].includes(e.kind) &&
        x >= e.x &&
        x <= e.x + e.width &&
        y >= e.y &&
        y <= e.y + e.height,
    );
    if (!target || x < 0 || x > asset.width || y < 0 || y > asset.height)
      throw new Error(
        `Website press misses visible target ${asset.key} ${press}: ${x},${y}`,
      );
    records.push({
      key: asset.key,
      press,
      sourceTime: shot.sourceTime,
      target: target.text || target.kind,
      x,
      y,
    });
  }
}
await fs.writeFile(
  path.join(root, "review/framing.json"),
  JSON.stringify({ records, problems }, null, 2),
);
if (problems.length)
  throw new Error(
    `Sliced website controls/cards: ${problems.map((p) => p.key + " " + p.text).join("; ")}`,
  );
console.log("Website framing passed", records.length, "measured frames");
