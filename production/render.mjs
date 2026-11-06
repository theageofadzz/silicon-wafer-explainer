import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {makeServer,root} from './server.mjs';
const timeline=JSON.parse(await fs.readFile(path.join(root,'timeline.json'),'utf8'));
const mode=process.argv.includes('--render')?'render':'review';
const selection=process.argv.find(s=>s.startsWith('--scenes='))?.split('=')[1]?.split(',');
const scenes=timeline.scenes.filter(s=>!selection||selection.includes(s.id));
await fs.mkdir(path.join(root,'model/guides'),{recursive:true});
const server=makeServer();server.listen(0,'127.0.0.1');await once(server,'listening');
const browser=await chromium.launch({
 ...(process.env.SILICON_CHROME_PATH?{executablePath:process.env.SILICON_CHROME_PATH}:{channel:'chrome'}),
 headless:true,args:[...(process.platform==='darwin'?['--use-angle=metal']:[]),'--disable-background-networking','--disable-extensions']
});
const page=await browser.newPage({viewport:{width:576,height:1024},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
page.on('requestfailed',r=>errors.push(`${r.url()} ${r.failure()?.errorText}`));
try{
 await page.goto(`http://127.0.0.1:${server.address().port}/model/index.html`,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.__ready===true,null,{timeout:60000});
 const inventory=await page.evaluate(()=>window.__inventory);
 await fs.writeFile(path.join(root,'model/inventory.json'),JSON.stringify(inventory,null,2));
 const results=[];
 for(const s of scenes){
  const duration=s.end-s.start,fps=65/duration,output=path.join(root,`model/guides/${s.id}.mp4`);
  let encoder,done;
  if(mode==='render'){
   encoder=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate',String(fps),'-i','pipe:0',
    '-an','-c:v','libx264','-preset','fast','-crf','15','-pix_fmt','yuv420p',
    '-frames:v','65','-movflags','+faststart',output],{stdio:['pipe','ignore','inherit']});
   done=once(encoder,'exit');
  }
  const states=[];
  const points=mode==='render'?Array.from({length:65},(_,i)=>s.start+Math.min(duration-1/24,i/65*duration)):
   [...new Set([s.start+.1,...s.captions.flatMap(c=>[c.start,Math.min(s.end-.1,c.start+.4),c.end]),s.end-.15])];
  for(const[i,t]of points.entries()){
   const state=await page.evaluate(([id,t])=>window.renderScene(id,t),[s.id,t]);
   assert(state.bright>40&&state.max-state.min>70,`Blank or unlit frame ${s.id} ${t}`);
   if(mode==='render'){
    const image=await page.screenshot({type:'jpeg',quality:95});
    if(!encoder.stdin.write(image))await once(encoder.stdin,'drain');
   }else{
    const file=`model-${s.id}-${String(i).padStart(2,'0')}.jpg`;
    await page.screenshot({path:path.join(root,'review',file),type:'jpeg',quality:92});
    state.file=file;
   }
   states.push(state);
  }
  if(encoder){encoder.stdin.end();const[code]=await done;assert.equal(code,0);}
  results.push({id:s.id,duration,fps,frames:mode==='render'?65:points.length,states});
  console.log(mode,s.id,mode==='render'?'65 frames':points.length+' review frames');
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(root,`review/model-${mode}${selection?'-'+selection.join(','):''}.json`),
  JSON.stringify({errors,results,inventory,limits:'Rendered mechanisms are educational 3D; neither factory footage nor human audiovisual approval.'},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
