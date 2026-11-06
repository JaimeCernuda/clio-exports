/** Generate an editable entrypoint and integration example for every website asset. */
import fs from "node:fs/promises";
import path from "node:path";
import { format } from "prettier";
import { assets } from "./src/plan.ts";
const root = import.meta.dirname;
const imports = [],
  entries = [];
for (const [index, asset] of assets.entries()) {
  const folder = path.join(root, asset.id, asset.variant);
  await fs.mkdir(folder, { recursive: true });
  const scene = `import React from "react";\nimport {WebsiteLoop} from "../../src/WebsiteLoop";\n/** Editable ${asset.variant} website loop for ${asset.id}. Shared timing is in website/src/plan.ts. */\nexport function Scene({review=false}:{review?:boolean}) {return <WebsiteLoop assetKey="${asset.key}" review={review}/>;}\n`;
  await fs.writeFile(
    path.join(folder, "Scene.tsx"),
    await format(scene, { parser: "typescript" }),
  );
  imports.push(
    `import {Scene as Scene${index}} from "./${asset.id}/${asset.variant}/Scene";`,
  );
  entries.push(`"${asset.key}": Scene${index}`);
  const guide = `# ${asset.title} — ${asset.variant} website loop\n\n${asset.description}\n\n${asset.seconds.toFixed(2)} seconds, ${asset.width} × ${asset.height}, ${asset.fps} fps web video. GIF fallback: 960 px wide, 25 fps. Silent. No advertising intro, logo overlay, captions or closing card.\n\n- Editable entry: [Scene.tsx](Scene.tsx).\n- Timing, crop and source interval: [shared plan](../../src/plan.ts).\n- Ready-to-place example: [embed.html](embed.html).\n- Outputs: \`output/loop.gif\`, \`loop.mp4\`, \`loop.webm\`, \`poster.png\` and checksummed \`manifest.json\`.\n- Run from the campaign root: \`node website/render.mjs ${asset.key}\`, then \`node website/review.mjs ${asset.key}\`.\n\nSource interval ${asset.sourceStart}–${asset.sourceEnd}s at ${asset.speed}× editorial speed, followed by a hold and a soft reset. The source remains forward-only. Scientific assumptions and native receipts are in the campaign [source ledger](../../../SOURCES.md). The surrounding page supplies the heading; the on-screen controls and results are editable product components.\n\nUse WebM/MP4 for smaller, smoother website playback. Use GIF in image-only slots. Respect reduced-motion preferences using the supplied poster. The source lives in Git; generated media stay local for the website handoff.\n`;
  await fs.writeFile(
    path.join(folder, "README.md"),
    await format(guide, { parser: "markdown" }),
  );
  const embed = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${asset.title}</title><style>body{margin:0;background:#fbfdfd}video,img{display:block;width:100%;height:auto}img{display:none}@media(prefers-reduced-motion:reduce){video{display:none}img{display:block}}</style><video autoplay loop muted playsinline preload="metadata" width="${asset.width}" height="${asset.height}" poster="output/poster.png" aria-label="${asset.description}"><source src="output/loop.webm" type="video/webm"><source src="output/loop.mp4" type="video/mp4"></video><img src="output/poster.png" width="${asset.width}" height="${asset.height}" alt="${asset.description}"><script>const video=document.querySelector('video'),preference=matchMedia('(prefers-reduced-motion:reduce)');const visible=new IntersectionObserver(entries=>{if(entries[0].isIntersecting&&!preference.matches)video.play().catch(()=>{video.controls=true});else video.pause()});visible.observe(video);preference.addEventListener('change',()=>{if(preference.matches)video.pause();else video.play().catch(()=>{video.controls=true})});</script></html>`;
  await fs.writeFile(
    path.join(folder, "embed.html"),
    await format(embed, { parser: "html" }),
  );
}
await fs.writeFile(
  path.join(root, "generated-scenes.ts"),
  await format(
    `import type {ComponentType} from "react";\n${imports.join("\n")}\nexport const scenes:Record<string,ComponentType<{review?:boolean}>>={${entries.join(",")}};\n`,
    { parser: "typescript" },
  ),
);
console.log("Prepared 16 website entrypoints and integration examples");
