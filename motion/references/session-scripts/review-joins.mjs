import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execute = promisify(execFile);
const root = 'D:/Libraries/Documents/projects/clio-exports/motion';
const receipt = JSON.parse(await readFile(`${root}/out/ndp-clio-connected-v1.mp4.json`,'utf8'));
const metadata = await readFile(`${root}/review/connected-all-frames.txt`,'utf8');
const differences = new Map([...metadata.matchAll(/frame:(\d+)[^\n]*pts_time:([\d.]+)[\s\S]*?lavfi.signalstats.YDIF=([\d.eE+-]+)/g)].map(m=>[Number(m[1]),Number(m[3])]));
const joins = [];
const results = await Promise.allSettled(receipt.timeline.filter(s=>s.kind==='clip').map(async segment=>{
  const actor = JSON.parse(await readFile(`${root}/out/${segment.file}.json`,'utf8'));
  const frames = [];
  for(const shot of actor.replacements){
    for(const [boundary,at] of [['enter',shot.frameOffset],['leave',shot.frameOffset+shot.shotFrames]]){
      const frame = segment.start+at-segment.inFrame;
      frames.push(frame-1,frame);
      joins.push({campaign:segment.campaign,shot:shot.id,boundary,frame,seconds:frame/60,difference:differences.get(frame)});
    }
  }
  const select = frames.map(frame=>`eq(n,${frame})`).join('+');
  await execute('ffmpeg',['-y','-v','error','-i',`${root}/out/ndp-clio-connected-v1.mp4`,'-vf',`select='${select}',scale=640:-1,tile=4x${actor.replacements.length}`,'-frames:v','1',`${root}/review/connected-joins-${segment.campaign}.jpg`],{maxBuffer:1024*1024});
}));
for(const result of results) if(result.status==='rejected') throw result.reason;
await writeFile(`${root}/review/connected-joins.json`,JSON.stringify(joins,null,2)+'\n');
console.log(JSON.stringify(joins,null,2));
