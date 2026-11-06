import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const edit=path.dirname(fileURLToPath(import.meta.url));
const endpoint=process.env.WAFER_COMFY_URL??'http://127.0.0.1:8195';
const names=process.argv.length>2?process.argv.slice(2):['quartz','quartz-macro','chip','blank','boule'];
const jobs=await Promise.all(names.map(async name=>({
  name,...JSON.parse(await fs.readFile(path.join(edit,`workflows/${name}-job.json`),'utf8')),
})));
const complete=new Set();
let report='';
for(;;){
  for(const job of jobs){
    if(complete.has(job.name))continue;
    const data=await(await fetch(endpoint+'/history/'+job.prompt_id)).json();
    const result=data[job.prompt_id];
    if(!result)continue;
    await fs.writeFile(path.join(edit,`workflows/${job.name}-history.json`),JSON.stringify(result,null,2));
    if(result.status?.status_str==='error')throw new Error(JSON.stringify(result.status));
    if(result.status?.completed)complete.add(job.name);
  }
  const current=[...complete].join(', ');
  if(current!==report){console.log('Completed shots:',current);report=current;}
  if(complete.size===jobs.length)break;
  await new Promise(resolve=>setTimeout(resolve,5000));
}
console.log('All native I2V shots completed.');
