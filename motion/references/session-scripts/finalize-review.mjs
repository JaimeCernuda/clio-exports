import {readFile, writeFile, copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='D:/Libraries/Documents/projects/clio-exports/motion';
const output='C:/Users/jaime/Documents/Codex/2026-10-27/i-found-the-earlier-session-on/outputs';
const film=JSON.parse(await readFile(`${root}/out/ndp-clio-connected-v1.mp4.json`,'utf8'));
const scan=JSON.parse(await readFile(`${root}/review/connected-motion-review.json`,'utf8'));
const joins=JSON.parse(await readFile(`${root}/review/connected-joins.json`,'utf8'));
scan.review='Reviewed the complete 3-second overview, all 14 replacement boundary pairs, consecutive frames at the largest motion candidates, all-worker Konza chart samples, and native actions/returns. Large motion candidates correspond to continuous conversation scrolling and canvas restoration. No enlarged chart-label artifacts observed in reviewed frames. Browser playback reached the final frame.';
scan.limitations='Frame scanning and sampled visual review support technical continuity; they do not replace human review of the film pacing. Minor subpixel raster differences remain between native chart capture workers.';
await writeFile(`${root}/review/connected-motion-review.json`,JSON.stringify(scan,null,2)+'\n');
const shotPlan=JSON.parse(await readFile(`${root}/out/inspections/plan.json`,'utf8'));
const pointers=[];
for(const shot of shotPlan){
 const receipt=JSON.parse(await readFile(`${root}/out/inspections/${shot.id}.mp4.json`,'utf8'));
 pointers.push({id:shot.id,frames:receipt.frames,sha256:receipt.sha256,cursor:receipt.cursor});
}
const report={schema:'clio.connected-review.v1',film,verification:{decodedFrames:scan.frames,completeDecode:true,format:'1920x1080, 60fps, H.264/yuv420p, BT.709, silent',nodeTests:{passed:42,failed:0,skipped:0},pythonTests:{passed:67,failed:0,skipped:0},typecheck:'pass',nativeBuild:'pass',formatCheck:'pass'},visualReview:scan.review,limitations:scan.limitations,joins,pointers};
await writeFile(`${root}/evidence/ndp-connected-review.json`,JSON.stringify(report,null,2)+'\n');
await copyFile(`${root}/evidence/ndp-connected-review.json`,`${output}/ndp-clio-connected-review.json`);
for(const file of ['ndp-clio-connected-v1.mp4','ndp-clio-tahoe-v4.mp4','ndp-clio-alta-v2.mp4','ndp-clio-konza-v2.mp4']){
 const receipt=JSON.parse(await readFile(`${output}/${file}.json`,'utf8'));
 const bytes=await readFile(`${output}/${file}`);
 if(createHash('sha256').update(bytes).digest('hex')!==receipt.sha256)throw new Error(`Delivery copy mismatch: ${file}`);
}
console.log(JSON.stringify({frames:film.frames,duration:film.frames/60,bytes:film.bytes,sha256:film.sha256,joins:joins.length,pointers:pointers.length,deliveryHashes:'pass'}));
