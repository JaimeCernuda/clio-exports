import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { selectAssets } from "../src/assets.ts";

/** Encode an image-slot fallback at the authored cadence with stable ordered dithering. */
export function encodeGif(asset, source, destination) {
  execFileSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-y",
      "-i",
      source,
      "-filter_complex",
      `fps=${asset.gifFps},scale=${asset.gifWidth}:-2:flags=lanczos,format=rgb24,lutrgb=r='if(gte(val,250),255,val)':g='if(gte(val,250),255,val)':b='if(gte(val,250),255,val)',split[frames][colors];[colors]palettegen=max_colors=192:reserve_transparent=0[palette];[frames][palette]paletteuse=dither=bayer:bayer_scale=4`,
      "-loop",
      "0",
      destination,
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const root = path.resolve(import.meta.dirname, "..");
  for (const asset of selectAssets(process.argv.slice(2))) {
    const folder = path.join(root, asset.folder, "output"),
      file = path.join(folder, "loop.gif");
    encodeGif(asset, path.join(folder, "loop.mp4"), file);
    const manifestPath = path.join(folder, "manifest.json"),
      manifest = JSON.parse(await readFile(manifestPath, "utf8")),
      data = await readFile(file);
    Object.assign(
      manifest.files.find((item) => item.name === "loop.gif"),
      {
        bytes: data.length,
        sha256: createHash("sha256").update(data).digest("hex"),
      },
    );
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    console.log(`${asset.folder}: ${data.length} bytes`);
  }
}
