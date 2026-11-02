import { writeFile as writeText } from "node:fs/promises";
import { format } from "prettier";
import path from "node:path";
import { assets } from "../src/assets.ts";
const root = path.resolve(import.meta.dirname, "..");
const writeFile = async (file, markup) =>
  writeText(file, await format(markup, { parser: "html" }));
const labels = {
  "many-agents": "So many agents.",
  "one-composable-agent": "Why not one?",
  "plugin-composition": "Build the agent you need.",
};
const summaries = {
  "many-agents": "A continuous cycle through twelve domains.",
  "one-composable-agent":
    "Many possibilities resolve into one composable agent.",
  "plugin-composition":
    "Plugins extend the prompt and bring skills, tools, MCP servers and hooks.",
};
for (const asset of assets) {
  await writeFile(
    path.join(root, asset.folder, "embed.html"),
    `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${labels[asset.folder]}</title>
<style>
body{margin:0;background:white}video,img{display:block;width:100%;height:auto}img{display:none}
@media(prefers-reduced-motion:reduce){video{display:none}img{display:block}}
</style>
<video autoplay loop muted playsinline preload="metadata" width="${asset.width}" height="${asset.height}" poster="output/poster.png" aria-label="${summaries[asset.folder]}">
  <source src="output/loop.webm" type="video/webm">
  <source src="output/loop.mp4" type="video/mp4">
</video>
<img src="output/poster.png" width="${asset.width}" height="${asset.height}" alt="${summaries[asset.folder]}">
<script>
const video=document.querySelector('video'),preference=matchMedia('(prefers-reduced-motion:reduce)');
function update(){if(preference.matches)video.pause();else video.play().catch(()=>{video.controls=true;});}
preference.addEventListener('change',update);update();
</script></html>
`,
  );
}
await writeFile(
  path.join(root, "preview.html"),
  `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Composability — website loops</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f5f8fa;color:#15364a;font:16px system-ui,sans-serif}
main{max-width:1280px;margin:48px auto;padding:0 28px}header{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:36px}
h1{font-size:28px;margin:0 0 8px}header p{color:#526c7c;margin:0}button{background:white;border:1px solid #bad0da;border-radius:10px;padding:11px 16px;color:inherit;font:inherit;cursor:pointer}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}section{background:white;border:1px solid #d8e5ea;border-radius:18px;margin:0;padding:20px}section:last-child{grid-column:1/-1}h2{margin:0 0 8px;font-size:22px}p{line-height:1.5;color:#526c7c}section p{font-size:14px}video,.poster{width:100%;height:auto;display:block}.poster{display:none}
@media(max-width:680px){.grid{grid-template-columns:1fr}header{align-items:flex-start}main{padding:0 16px}}
body[data-still="true"] video{display:none}body[data-still="true"] .poster{display:block}
nav{display:flex;gap:22px;margin-top:20px;flex-wrap:wrap}a{color:#176681;text-underline-offset:3px}small{font-size:14px;color:#526c7c}
</style>
<main><header><div><h1>Composability — website loops</h1><p>Three independent pieces. Use the videos, GIFs or static posters.</p></div><button id="motion">Pause animations</button></header><div class="grid">
${assets
  .map(
    (
      asset,
    ) => `<section><h2>${labels[asset.folder]}</h2><p>${summaries[asset.folder]} <small>${asset.frames / asset.fps} seconds</small></p>
<video autoplay loop muted playsinline preload="metadata" width="${asset.width}" height="${asset.height}" poster="${asset.folder}/output/poster.png" aria-label="${summaries[asset.folder]}"><source src="${asset.folder}/output/loop.webm" type="video/webm"><source src="${asset.folder}/output/loop.mp4" type="video/mp4"></video>
<img class="poster" src="${asset.folder}/output/poster.png" width="${asset.width}" height="${asset.height}" alt="${summaries[asset.folder]}">
<nav>${["gif", "webm", "mp4"].map((ext) => `<a href="${asset.folder}/output/loop.${ext}" download>${ext.toUpperCase()}</a>`).join("")}<a href="${asset.folder}/output/poster.png" download>Poster</a><a href="${asset.folder}/embed.html">Embed example</a></nav></section>`,
  )
  .join("\n")}
</div></main><script>
const videos=[...document.querySelectorAll('video')],button=document.querySelector('#motion'),preference=matchMedia('(prefers-reduced-motion:reduce)');
function setStill(still){document.body.dataset.still=String(still);button.textContent=still?'Play animations':'Pause animations';videos.forEach(v=>{if(still)v.pause();else v.play().catch(()=>{v.controls=true;});});}
button.addEventListener('click',()=>setStill(document.body.dataset.still!=='true'));
preference.addEventListener('change',()=>setStill(preference.matches));setStill(preference.matches);
</script></html>
`,
);
console.log("Updated three embed examples and preview.html");
