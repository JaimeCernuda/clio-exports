import {createRequire} from 'node:module';
const motion='D:/Libraries/Documents/projects/clio-exports/motion';
const require=createRequire(motion+'/package.json');
const {openBrowser,renderStill,selectComposition}=require('@remotion/renderer');
const start=performance.now();
const browser=await openBrowser('chrome',{browserExecutable:motion+'/node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe',chromiumOptions:{gl:'angle'}});
try {
 const composition=await selectComposition({serveUrl:motion+'/bundle',id:'ClioNativePromo',inputProps:{},puppeteerInstance:browser});
 await renderStill({serveUrl:motion+'/bundle',composition,puppeteerInstance:browser,inputProps:{},frame:750,scale:2,output:'C:/Users/jaime/Documents/Codex/2026-10-27/i-found-the-earlier-session-on/work/native-hardware-check.png',imageFormat:'png',logLevel:'error'});
 console.log(JSON.stringify({seconds:(performance.now()-start)/1000,gl:'angle',frame:750,scale:2}));
}finally{await browser.close({silent:true})}

