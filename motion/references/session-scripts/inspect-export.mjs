import {readFile} from 'node:fs/promises';
const html=await readFile(process.argv[2],'utf8');
const scripts=[];
let cursor=0;
while(true){const start=html.indexOf('<script',cursor);if(start<0)break;const endTag=html.indexOf('>',start);const end=html.indexOf('</script>',endTag);if(end<0)break;scripts.push({tag:html.slice(start,endTag+1).slice(0,400),length:end-endTag-1,prefix:html.slice(endTag+1,endTag+501)});cursor=end+9;}
console.log(JSON.stringify({title:html.match(/<title>([^<]*)/)?.[1],head:html.slice(0,650),scripts,headings:[...html.matchAll(/<h[12]\b[^>]*>([^<]*)/g)].slice(0,15).map(m=>m[1]),main:html.slice(html.indexOf('<body'),html.indexOf('<body')+3000)},null,2));
