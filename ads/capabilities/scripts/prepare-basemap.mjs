/** Pin Natural Earth's public-domain geography and retain only the campaign region. */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "..");
const output = path.join(root, "evidence/atlantic-basemap.json");
const sourcePath = "geojson/ne_50m_admin_0_countries.geojson";
let previous;
try {
  previous = JSON.parse(await readFile(output, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
async function get(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} fetching ${url}`);
  return response;
}
const commit =
  previous?.source.commit ??
  (
    await (
      await get(
        `https://api.github.com/repos/nvkelso/natural-earth-vector/commits?path=${sourcePath}&per_page=1`,
      )
    ).json()
  )[0].sha;
const url = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${commit}/${sourcePath}`;
const bytes = Buffer.from(await (await get(url)).arrayBuffer());
const sha256 = createHash("sha256").update(bytes).digest("hex");
if (previous && previous.source.sha256 !== sha256)
  throw new Error("Pinned geography checksum mismatch");
const bounds = [-96, 17, -58, 37];
function clip(ring) {
  let points = ring;
  for (const [axis, limit, sign] of [
    [0, bounds[0], 1],
    [0, bounds[2], -1],
    [1, bounds[1], 1],
    [1, bounds[3], -1],
  ]) {
    const next = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i],
        b = points[(i + 1) % points.length];
      const ain = sign * (a[axis] - limit) >= 0,
        bin = sign * (b[axis] - limit) >= 0;
      if (ain) next.push(a);
      if (ain !== bin) {
        const p = (limit - a[axis]) / (b[axis] - a[axis]);
        next.push([a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p]);
      }
    }
    points = next;
  }
  return points.map(([x, y]) => [Number(x.toFixed(5)), Number(y.toFixed(5))]);
}
const features = JSON.parse(bytes).features.flatMap((feature) => {
  const polygons =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
  const clipped = polygons
    .map((polygon) => polygon.map(clip).filter((ring) => ring.length > 2))
    .filter((polygon) => polygon.length);
  return clipped.length
    ? [{ name: feature.properties.ADMIN, polygons: clipped }]
    : [];
});
await writeFile(
  output,
  JSON.stringify({
    source: {
      url,
      commit,
      sha256,
      license: "Public domain",
      terms: "https://www.naturalearthdata.com/about/terms-of-use/",
    },
    bounds,
    features,
  }) + "\n",
);
console.log(
  `Prepared regional basemap: ${features.length} countries; ${sha256}`,
);
