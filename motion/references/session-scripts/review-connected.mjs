import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execute = promisify(execFile);
const base = 'D:/Libraries/Documents/projects/clio-exports/motion';
const video = `${base}/out/ndp-clio-connected-v1.mp4`;
const receipt = JSON.parse(await readFile(video + '.json', 'utf8'));
const metadata = `${base}/review/connected-all-frames.txt`;
await execute('ffmpeg', ['-y', '-v', 'error', '-i', video, '-vf',
  `scale=960:-1,signalstats,metadata=mode=print:file=review/connected-all-frames.txt`,
  '-f', 'null', '-'], {cwd:base,maxBuffer:8*1024*1024});
const rows = [...(await readFile(metadata, 'utf8')).matchAll(/frame:(\d+)[^\n]*pts_time:([\d.]+)[\s\S]*?lavfi.signalstats.YDIF=([\d.eE+-]+)/g)]
  .map(m => ({frame:Number(m[1]),seconds:Number(m[2]),difference:Number(m[3])}));
if(rows.length !== receipt.frames) throw new Error(`Incomplete frame scan ${rows.length}/${receipt.frames}`);
const top = [...rows].sort((a,b) => b.difference-a.difference).slice(0,50);
const report = {
  schema:'clio.connected-motion-review.v1',
  sha256:receipt.sha256,
  frames:rows.length,
  method:'Decoded every frame; adjacent-frame mean luma differences at 960px width identify inspection candidates. Large differences are not automatically defects.',
  timeline:receipt.timeline,
  candidates:top,
  review:'Pending visual inspection of candidate transitions, native control actions and their returns.'
};
await writeFile(`${base}/review/connected-motion-review.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({frames:rows.length,top:top.slice(0,15)},null,2));
