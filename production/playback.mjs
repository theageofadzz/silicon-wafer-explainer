import fs from 'node:fs/promises';
import path from 'node:path';
import {once} from 'node:events';
import {chromium} from 'playwright';
import {makeServer,root} from './server.mjs';

const server=makeServer();server.listen(0,'127.0.0.1');await once(server,'listening');
const browser=await chromium.launch({
 ...(process.env.SILICON_CHROME_PATH?{executablePath:process.env.SILICON_CHROME_PATH}:{channel:'chrome'}),
 headless:true,args:['--autoplay-policy=no-user-gesture-required',
  '--disable-features=HardwareMediaKeyHandling,MediaSessionService']
});
const errors=[];
const page=await browser.newPage({viewport:{width:1280,height:960}});
page.on('pageerror',error=>errors.push(String(error)));
page.on('requestfailed',request=>{if(!request.failure()?.errorText.includes('ERR_ABORTED'))errors.push(request.url());});
try{
 await page.goto(`http://127.0.0.1:${server.address().port}/watch.html`,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelector('video').readyState>=2);
 const info=await page.evaluate(()=>{
  const video=document.querySelector('video');
  window.__playback={events:[],startedAt:performance.now(),checkpoints:[]};
  for(const event of ['playing','pause','waiting','stalled','error','ended']){
   video.addEventListener(event,()=>window.__playback.events.push({event,time:video.currentTime,wallTime:performance.now()}));
  }
  video.volume=1;video.muted=false;video.playbackRate=1;
  return {duration:video.duration,width:video.videoWidth,height:video.videoHeight};
 });
 await page.evaluate(()=>document.querySelector('video').play());
 for(let checkpoint=0;;checkpoint++){
  await page.waitForTimeout(15000);
  const state=await page.evaluate(()=>{
   const v=document.querySelector('video');
   const point={time:v.currentTime,ended:v.ended,paused:v.paused,readyState:v.readyState,muted:v.muted,rate:v.playbackRate};
   window.__playback.checkpoints.push(point);return point;
  });
  await fs.writeFile(path.join(root,'review/playback-live.json'),JSON.stringify(state,null,2));
  await page.screenshot({path:path.join(root,`review/playback-${checkpoint}.jpg`),type:'jpeg',quality:87});
  console.log(JSON.stringify(state));
  if(state.ended)break;
  if(state.paused||state.readyState===0||state.rate!==1)throw new Error('Playback interrupted');
 }
 const report=await page.evaluate(()=>({
  ...window.__playback,elapsed:(performance.now()-window.__playback.startedAt)/1000,
  quality:document.querySelector('video').getVideoPlaybackQuality().toJSON?.()??{
   totalVideoFrames:document.querySelector('video').getVideoPlaybackQuality().totalVideoFrames,
   droppedVideoFrames:document.querySelector('video').getVideoPlaybackQuality().droppedVideoFrames
  }
 }));
 report.info=info;report.errors=errors;
 const viewports=[];
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  await page.setViewportSize(viewport);
  await page.locator('video').evaluate(video=>{video.currentTime=128;});
  await page.waitForTimeout(300);
  const bounds=await page.locator('video').boundingBox();
  if(bounds.x<0||bounds.y<0||bounds.x+bounds.width>viewport.width+1||bounds.y+bounds.height>viewport.height+1)throw new Error('Player exceeds viewport');
  await page.screenshot({path:path.join(root,`review/player-${viewport.width}.jpg`),type:'jpeg',quality:90});
  viewports.push({viewport,bounds});
 }
 report.viewports=viewports;
 report.scope='Full normal-speed browser playback with audio enabled; no claim of human listening approval.';
 if(errors.length)throw new Error(errors.join('\n'));
 await fs.writeFile(path.join(root,'review/playback.json'),JSON.stringify(report,null,2));
 const verify=path.join(root,'review/verification.json');
 const data=JSON.parse(await fs.readFile(verify,'utf8'));
 data.normalSpeedPlayback={status:'completed',rate:1,audioEnabled:true,report:'review/playback.json'};
 await fs.writeFile(verify,JSON.stringify(data,null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
