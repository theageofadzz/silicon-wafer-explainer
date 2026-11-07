// A real-time browser decode check. This does not grant human listening approval.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const url=process.env.SILICON_PREVIEW_URL??'http://127.0.0.1:60090/edit/ten-minute/watch.html';
const film=path.join(root,'output/silicon-wafer-10min-9x16.mp4');
const digest=async()=>createHash('sha256').update(await fs.readFile(film)).digest('hex');
const initialDigest=await digest();
const browser=await chromium.launch({
  ...(process.env.SILICON_CHROME_PATH?{executablePath:process.env.SILICON_CHROME_PATH}:{channel:'chrome'}),
  headless:true,args:['--autoplay-policy=no-user-gesture-required'],
});
const errors=[],samples=[],shots=[];
try{
  const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(url,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('video').readyState>=2);
  await page.evaluate(async()=>{await document.fonts.ready;});
  await page.screenshot({path:path.join(root,'review/player-desktop.jpg'),type:'jpeg',quality:88});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(root,'review/player-mobile.jpg'),type:'jpeg',quality:88});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile layout overflows');
  await page.evaluate(async()=>{
    const v=document.querySelector('video');
    v.currentTime=0;v.playbackRate=1;v.muted=false;
    window.__playback={started:Date.now(),stalls:[],events:[]};
    for(const name of ['waiting','stalled','error','ended'])v.addEventListener(name,()=>{
      window.__playback.events.push({event:name,time:v.currentTime,wall:Date.now()});
    });
    await v.play();
  });
  const limit=Date.now()+660000;
  let ended=false,last=-1;
  while(Date.now()<limit){
    await page.waitForTimeout(1000);
    const state=await page.evaluate(()=>{
      const v=document.querySelector('video');
      return {time:v.currentTime,duration:v.duration,paused:v.paused,ended:v.ended,
        rate:v.playbackRate,ready:v.readyState,error:v.error?.message,
        decoded:v.getVideoPlaybackQuality().totalVideoFrames};
    });
    assert(!state.error,state.error);assert.equal(state.rate,1);assert.equal(state.duration,598);
    samples.push(state);
    const minute=Math.floor(state.time/60);
    if(minute>last){
      last=minute;
      const file=`player-minute-${String(minute).padStart(2,'0')}.jpg`;
      await page.screenshot({path:path.join(root,'review',file),type:'jpeg',quality:88});
      shots.push(file);console.log(`Normal playback ${Math.floor(state.time)}/598s`,state.decoded);
    }
    if(state.ended){ended=true;break;}
  }
  assert(ended,'Normal-speed playback did not finish');
  assert.deepEqual(errors,[]);
  assert.equal(await digest(),initialDigest,'Film changed during browser playback');
  const events=await page.evaluate(()=>window.__playback);
  const report={status:'normal-speed-browser-playback-completed',url,duration:598,playbackRate:1,
    encodedSha256:initialDigest,
    wallSeconds:(Date.now()-events.started)/1000,events:events.events,samples,screenshots:shots,
    pageErrors:errors,audioReview:'Audio was decoded; no human listening approval is claimed.',
    limits:'Browser completion and screenshots do not certify scientific meaning, pronunciation or visual taste.'};
  await fs.writeFile(path.join(root,'review/playback.json'),JSON.stringify(report,null,2));
  console.log('Completed actual 1x browser playback');
}finally{await browser.close();}
