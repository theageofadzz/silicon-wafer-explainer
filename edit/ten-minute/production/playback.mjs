// A real-time browser decode check. This does not grant human listening approval.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const url=process.env.SILICON_PREVIEW_URL??'http://127.0.0.1:60090/edit/ten-minute/watch.html';
const assemblyPath=path.join(root,'output/full-assembly.json');
const assemblyBytes=await fs.readFile(assemblyPath);
const assembly=JSON.parse(assemblyBytes);
assert.equal(typeof assembly.file,'string','Assembly must name the encoded film');
const film=path.resolve(root,assembly.file);
const relative=path.relative(root,film);
assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative),'Assembly film must be inside the ten-minute project');
const expectedURL=new URL(relative.split(path.sep).map(encodeURIComponent).join('/'),url).href;
const digest=async()=>createHash('sha256').update(await fs.readFile(film)).digest('hex');
const initialDigest=await digest();
assert.equal(initialDigest,assembly.sha256,'Assembly SHA does not match its film');
const duration=Number(assembly.duration);
assert(Number.isFinite(duration)&&duration>0,'Assembly duration must be positive');
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
  const loadedURL=await page.evaluate(()=>document.querySelector('video').currentSrc);
  assert.equal(loadedURL,expectedURL,'Browser loaded a different film from full-assembly.json');
  assert.equal(await page.locator('#version').inputValue(),'full','Playback must use the corrected full version');
  const response=await page.request.get(loadedURL);
  assert.equal(response.status(),200,'Cannot hash the browser film response');
  const servedSha256=createHash('sha256').update(await response.body()).digest('hex');
  await response.dispose();
  assert.equal(servedSha256,initialDigest,'Browser URL serves different bytes from the assembly film');
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
  const eventsStarted=Date.now(),limit=eventsStarted+(duration+62)*1000;
  let ended=false,last=-1,lastTrace=-1,previousTime=-1,advancedAt=Date.now();
  while(Date.now()<limit){
    await page.waitForTimeout(1000);
    const state=await page.evaluate(()=>{
      const v=document.querySelector('video');
      return {time:v.currentTime,duration:v.duration,paused:v.paused,ended:v.ended,
        rate:v.playbackRate,ready:v.readyState,error:v.error?.message,
        decoded:v.getVideoPlaybackQuality().totalVideoFrames,src:v.currentSrc};
    });
    assert(!state.error,state.error);assert.equal(state.rate,1);
    assert(Math.abs(state.duration-duration)<1/24,'Browser duration differs from assembly');
    assert.equal(state.src,expectedURL,'Browser film changed during playback');
    if(state.time>previousTime+.01){previousTime=state.time;advancedAt=Date.now();}
    assert(state.ended||!state.paused,`Browser paused unexpectedly at ${state.time}s`);
    assert(state.ended||Date.now()-advancedAt<30000,`No playback progress for 30s: ${JSON.stringify(state)}`);
    samples.push(state);
    const trace=Math.floor((Date.now()-eventsStarted)/30000);
    if(trace>lastTrace){lastTrace=trace;console.log(`Playback clock ${state.time.toFixed(2)}/${duration}s; ready=${state.ready}`);}
    const minute=Math.floor(state.time/60);
    if(minute>last){
      last=minute;
      const file=`player-minute-${String(minute).padStart(2,'0')}.jpg`;
      await page.screenshot({path:path.join(root,'review',file),type:'jpeg',quality:88});
      shots.push(file);console.log(`Normal playback ${Math.floor(state.time)}/${duration}s`,state.decoded);
    }
    if(state.ended){ended=true;break;}
  }
  assert(ended,'Normal-speed playback did not finish');
  assert.deepEqual(errors,[]);
  assert.equal(await digest(),initialDigest,'Film changed during browser playback');
  assert((await fs.readFile(assemblyPath)).equals(assemblyBytes),'Assembly changed during browser playback');
  const events=await page.evaluate(()=>window.__playback);
  const report={status:'normal-speed-browser-playback-completed',url,file:film,
    loadedURL,servedSha256,duration,playbackRate:1,encodedSha256:initialDigest,
    wallSeconds:(Date.now()-events.started)/1000,events:events.events,samples,screenshots:shots,
    pageErrors:errors,audioReview:'Audio was decoded; no human listening approval is claimed.',
    limits:'Browser completion and screenshots do not certify scientific meaning, pronunciation or visual taste.'};
  await fs.writeFile(path.join(root,'review/playback.json'),JSON.stringify(report,null,2));
  console.log('Completed actual 1x browser playback');
}finally{await browser.close();}
