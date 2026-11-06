import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {makeServer} from '../../server.mjs';

const edit=path.dirname(fileURLToPath(import.meta.url));
const {chromium}=await import('playwright').catch(()=>import('../../../anatomy/node_modules/playwright/index.mjs'));
const browser=await chromium.launch({channel:'chrome',headless:true,
  args:['--autoplay-policy=no-user-gesture-required']});
const mode=process.argv[2]??'workflow';
let server;
try{
  const page=await browser.newPage({viewport:{width:1800,height:1080}});
  if(mode==='workflow'){
    const ui=JSON.parse(await fs.readFile(path.join(edit,'workflows/all.json')));
    const api=JSON.parse(await fs.readFile(path.join(edit,'workflows/all-api.json')));
    await page.goto(process.env.WAFER_COMFY_URL??'http://127.0.0.1:8195',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>typeof window.app?.loadGraphData==='function');
    const result=await page.evaluate(async workflow=>{
      await window.app.loadGraphData(workflow,true,true,'wafer-v3.json',
        {skipAssetScans:true,silentAssetErrors:true});
      return(await window.app.graphToPrompt()).output;
    },ui);
    const differences=[];
    for(const[id,node]of Object.entries(api))for(const[key,value]of Object.entries(node.inputs)){
      const got=result[id]?.inputs[key];
      if(JSON.stringify(got)!==JSON.stringify(value))differences.push({id,key,expected:value,got});
    }
    await fs.writeFile(path.join(edit,'review/workflow-import.json'),
      JSON.stringify({nodes:ui.nodes.length,links:ui.links.length,differences},null,2));
    assert.deepEqual(differences,[]);
    await page.evaluate(()=>{
      window.app.canvas.ds.scale=.36;
      window.app.canvas.ds.offset=[35,40];
      window.app.canvas.draw(true,true);
    });
    await page.screenshot({path:path.join(edit,'review/comfyui-workflow.png')});
    console.log(`UI import preserved ${ui.nodes.length} nodes and ${ui.links.length} links.`);
  }else if(mode==='playback'){
    const videoFile=path.resolve(edit,'../../sample-9x16-v3.mp4');
    const videoSHA256=createHash('sha256').update(await fs.readFile(videoFile)).digest('hex');
    server=makeServer();server.listen(0,'127.0.0.1');await once(server,'listening');
    await page.goto(`http://127.0.0.1:${server.address().port}/`,
      {waitUntil:'networkidle'});
    await page.locator('video').evaluate(async video=>{
      if(video.readyState<2)await new Promise(resolve=>
        video.addEventListener('loadeddata',resolve,{once:true}));
      video.muted=true;
      await video.play();
    });
    const playback=[];
    let previous=-1;
    for(let i=0;i<33;i++){
      await page.waitForTimeout(1000);
      let state=await page.locator('video').evaluate(video=>({
        time:video.currentTime,ended:video.ended,error:video.error?.message,
        width:video.videoWidth,height:video.videoHeight,paused:video.paused}));
      // Some Chromium builds report one unchanged currentTime while the
      // media element transitions from metadata to active playback.
      if(!state.ended&&state.time<=previous){
        await page.waitForTimeout(500);
        state=await page.locator('video').evaluate(video=>({
          time:video.currentTime,ended:video.ended,error:video.error?.message,
          width:video.videoWidth,height:video.videoHeight,paused:video.paused}));
      }
      assert(!state.error);
      if(!state.ended)assert(state.time>previous);
      previous=state.time;playback.push(state);
      if(i%4===0)await page.screenshot({path:path.join(edit,`review/playback-${i}.png`)});
      if(state.ended)break;
    }
    assert(playback.at(-1).ended);
    const viewports=[];
    for(const viewport of[{width:1440,height:1000},{width:390,height:844}]){
      await page.setViewportSize(viewport);
      await page.locator('video').evaluate(video=>{video.currentTime=27.8;});
      await page.waitForTimeout(300);
      const bounds=await page.locator('video').boundingBox();
      assert(bounds.x>=0&&bounds.y>=0);
      assert(bounds.x+bounds.width<=viewport.width+1&&bounds.y+bounds.height<=viewport.height+1);
      await page.screenshot({path:path.join(edit,`review/player-${viewport.width}.png`)});
      viewports.push({viewport,bounds});
    }
    await fs.writeFile(path.join(edit,'review/playback.json'),
      JSON.stringify({videoSHA256,normalSpeedPlayback:true,playback,viewports,
        humanListening:false,limits:'Playback and screenshots do not substitute for human listening.'},null,2));
    assert.equal(createHash('sha256').update(await fs.readFile(videoFile)).digest('hex'),videoSHA256,
      'The video changed during playback.');
    console.log('Complete normal-speed playback passed; desktop/mobile player bounds passed.');
  }else throw new Error(mode);
}finally{
  await browser.close();
  if(server)await new Promise(resolve=>server.close(resolve));
}
