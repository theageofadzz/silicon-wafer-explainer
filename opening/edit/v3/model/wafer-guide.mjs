import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn, execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {makeServer, modelRoot, modelURL} from './server.mjs';

const {chromium}=await import('playwright');
const server=makeServer();
server.listen(0,'127.0.0.1');
await once(server,'listening');
const browser=await chromium.launch({channel:'chrome',headless:true,
  args:['--use-angle=metal','--renderer-process-limit=1','--js-flags=--max-old-space-size=384']});
const output=path.join(modelRoot,'wafer-guide.mp4');
let encoder;
try{
  const page=await browser.newPage({viewport:{width:576,height:1024},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${server.address().port}${modelURL}`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__modelReady===true);
  await page.locator('#model-annotations').evaluate(element=>element.style.display='none');
  encoder=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate','24','-i','pipe:0',
    '-an','-c:v','libx264','-preset','fast','-crf','16','-pix_fmt','yuv420p',
    '-threads','2','-frames:v','81','-movflags','+faststart',output],
    {stdio:['pipe','ignore','inherit']});
  const done=once(encoder,'exit');
  for(let index=0;index<81;index++){
    const sourceFrame=115+39*index/80;
    await page.evaluate(frame=>window.renderModelAtFrame(frame),sourceFrame);
    assert((await page.evaluate(()=>window.__modelPixelCheck())).brightSamples>30);
    const image=await page.screenshot({type:'jpeg',quality:97});
    if(!encoder.stdin.write(image))await once(encoder.stdin,'drain');
  }
  encoder.stdin.end();
  const[code]=await done;
  assert.equal(code,0);
  assert.deepEqual(errors,[]);
  const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0',
    '-show_entries','stream=width,height,nb_frames','-of','json',output],{encoding:'utf8'}));
  assert.equal(Number(probe.streams[0].nb_frames),81);
  await fs.writeFile(path.join(modelRoot,'wafer-guide.json'),JSON.stringify({
    file:'wafer-guide.mp4',method:'Precise 3D motion guide, not a real photograph',
    frames:81,fps:24,width:576,height:1024,sourceGlobalFrames:[115,154],
    annotations:false,modelSourceSHA256:createHash('sha256')
      .update(await fs.readFile(path.join(modelRoot,'model.mjs'))).digest('hex'),
    sha256:createHash('sha256').update(await fs.readFile(output)).digest('hex'),
    purpose:'Constrain the blank wafer plane and reflection during native ComfyUI diffusion.',
  },null,2));
  console.log(output);
}catch(error){
  encoder?.kill('SIGTERM');
  throw error;
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
