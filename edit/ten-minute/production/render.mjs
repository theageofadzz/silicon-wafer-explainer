import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {makeServer} from '../../../production/server.mjs';
import {flattenBeats,validateTimeline,syntheticTimeline} from '../model/timeline.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
const allowed=/^(--review|--render|--calibrate|--fixture|--family=(atomic|growth|finishing)|--only=[^=]+|--limit=\d+|--w=\d+|--h=\d+|--capture-fps=(12|24))$/;
for(const arg of args)if(!allowed.test(arg))throw new Error(`Unknown option ${arg}`);
if(args.includes('--review')&&args.includes('--render'))throw new Error('Choose --review or --render');
const mode=args.includes('--calibrate')?'calibrate':args.includes('--render')?'render':'review';
const option=(name,fallback)=>args.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const W=Number(option('w',1080)),H=Number(option('h',1920)),limit=Number(option('limit',Infinity));
const captureFps=Number(option('capture-fps',24)),repeatCount=24/captureFps;
assert(W>=64&&H>=64&&W%2===0&&H%2===0,'Dimensions must be even and >=64');
assert(limit>0,'Limit must be positive');
let fixture=args.includes('--fixture'),timeline;
try{if(!fixture)timeline=JSON.parse(await fs.readFile(path.join(root,'timeline.json'),'utf8'));}
catch(error){if(error.code==='ENOENT')fixture=true;else throw error;}
if(fixture){
  assert(mode==='review','Synthetic fixtures may only be reviewed');
  timeline=syntheticTimeline();
  console.log('Reviewing SYNTHETIC fixture; parent timeline remains untouched.');
}
validateTimeline(timeline);
const requested=option('only','').split(',').filter(Boolean),all=flattenBeats(timeline);
for(const id of requested)assert(all.some(b=>b.id===id),`Unknown --only beat ${id}`);
const beats=all.filter(b=>!requested.length||requested.includes(b.id)).slice(0,limit);
assert(beats.length,'No beats selected');
const outputDir=path.join(root,'model',mode==='review'?'review':'renders');
await fs.mkdir(outputDir,{recursive:true});
const server=makeServer();server.listen(0,'127.0.0.1');await once(server,'listening');
let browser;
const errors=[],results=[];
function hash(buffer){return createHash('sha256').update(buffer).digest('hex');}
const modelSources=Object.fromEntries(await Promise.all((await fs.readdir(path.join(root,'model')))
  .filter(name=>name.endsWith('.mjs')&&!name.startsWith('.')).sort().map(async name=>[
    `model/${name}`,hash(await fs.readFile(path.join(root,'model',name))),
  ])));
async function processOutput(command,commandArgs){
  const child=spawn(command,commandArgs,{stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';
  child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);
  const [code]=await once(child,'close');
  assert.equal(code,0,`${command}: ${stderr}`);return stdout;
}
function checkState(state,beat){
  assert(state.nonblank,`Blank/unlit ${beat.id} @ ${state.time}`);
  assert(state.anchors.length<=2,`Too many anchors ${beat.id}`);
  for(const a of state.anchors)assert(a.x>=0&&a.x<=1&&a.y>=0&&a.y<=1,`Off-frame anchor ${beat.id}`);
  const d=state.data;
  if(d.maxCoordination!==undefined)assert.equal(d.maxCoordination,4);
  if(d.nearestNeighbours!==undefined)assert.equal(d.nearestNeighbours,4);
  if(d.connectedToMelt!==undefined&&beat.visual!=='seed')assert(d.connectedToMelt,`Disconnected crystal ${beat.id}`);
  if(d.detectorTracksSpot)assert(Math.abs(d.spot[0]-d.detector[0])+Math.abs(d.spot[2]-d.detector[2])<1e-8);
}
function reviewTimes(b){
  if(b.semanticPlan?.length){
    return [...new Set([b.start,b.end-1/24,...b.semanticPlan.flatMap(event=>[
      Math.max(b.start,event.start-1/24),(event.start+event.end)/2,event.end,
    ])])].sort((a,b)=>a-b);
  }
  const frame=1/24,mid=(b.actionStart+b.actionEnd)/2;
  return [...new Set([b.start,Math.max(b.start,b.actionStart-frame),b.actionStart+frame,mid,
    b.actionEnd-frame,b.actionEnd,Math.max(b.actionEnd,b.end-frame)])].sort((a,b)=>a-b);
}
try{
  browser=await chromium.launch({
    ...(process.env.SILICON_CHROME_PATH?{executablePath:process.env.SILICON_CHROME_PATH}:{channel:'chrome'}),
    headless:true,args:[...(process.platform==='darwin'?['--use-angle=metal']:[]),'--disable-background-networking','--disable-extensions'],
  });
  const page=await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});
  page.on('pageerror',e=>{errors.push(String(e));console.error(`Browser: ${String(e)}`);});
  page.on('requestfailed',r=>errors.push(`${r.url()}: ${r.failure()?.errorText}`));
  if(fixture)await page.route('**/edit/ten-minute/timeline.json',route=>route.fulfill({json:timeline}));
  await page.goto(`http://127.0.0.1:${server.address().port}/edit/ten-minute/model/index.html?w=${W}&h=${H}&beat=${beats[0].id}&family=${option('family','all')}`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__ready===true,null,{timeout:60000});
  if(mode==='calibrate'){
    for(const beat of beats){
      const plan=await page.evaluate(id=>window.semanticPlanFor(id),beat.id),labels=new Set();
      const labelTimes=new Set([beat.start,beat.end,
        ...beat.words.flatMap(word=>[word.start,word.end]),
        ...plan.flatMap(event=>[event.start,(event.start+event.end)/2,event.end])]);
      for(const time of [...labelTimes].sort((a,b)=>a-b)){
        const state=await page.evaluate(([id,t])=>window.renderBeat(id,t),[beat.id,time]);
        state.extraAnchors.forEach(a=>labels.add(a.text));
      }
      const original=timeline.scenes.flatMap(s=>s.beats).find(b=>b.id===beat.id);
      Object.assign(original,{semanticVersion:3,semanticPlan:plan,
        actionStart:Math.min(...plan.map(p=>p.start)),actionEnd:Math.max(...plan.map(p=>p.end)),
        localLabels:[...labels]});
      original.actionAnchor=plan[0].phrase;
      original.readingHold=original.end-original.actionEnd;
      console.log(`calibrated ${beat.id}: ${plan.length} specific actions; ${original.readingHold.toFixed(3)}s final hold`);
    }
    const complete=timeline.scenes.every(s=>s.beats.every(b=>b.semanticVersion===3));
    timeline.semanticVersion=complete?3:'partial';
    timeline.timingMethod='Actual WordBoundary /1e7 + segment offset, then measured global tempo transform; each visual action separately bound to its spoken phrase';
    validateTimeline(timeline);
    await fs.writeFile(path.join(root,'timeline.json'),JSON.stringify(timeline,null,2)+'\n');
    const lines=['# 逐句画面执行表','',
      '每个动作使用独立的实际配音词组时间。此表是执行计划，不代替对最终编码逐句观看。','',
      '|节拍 / 时间|台词词组|画面对象|实际变化|解释的事实|',
      '|---|---|---|---|---|'];
    for(const scene of timeline.scenes)for(const beat of scene.beats)for(const event of beat.semanticPlan||[]){
      lines.push(`|${beat.id} / ${event.start.toFixed(3)}–${event.end.toFixed(3)}|${event.phrase}|${event.object}|${event.action}|${event.fact}|`);
    }
    await fs.writeFile(path.join(root,'SEMANTIC-STORYBOARD.md'),lines.join('\n')+'\n');
    console.log(`Saved ${beats.length} calibrated semantic storyboards`);
    process.exitCode=0;
  }else{
  async function seek(beat,time){
    const state=await page.evaluate(([id,t])=>window.renderBeat(id,t),[beat.id,time]);
    checkState(state,beat);return state;
  }
  for(const beat of beats){
    const frameCount=Math.round((beat.end-beat.start)*24),states=[];
    assert(frameCount>0,`Empty beat ${beat.id}`);
    const record={id:beat.id,visual:beat.visual,semanticVersion:3,semanticPlan:beat.semanticPlan,modelSources,
      synthetic:fixture,width:W,height:H,fps:24,
      start:beat.start,end:beat.end,frameCount,duration:frameCount/24,
      sourceDuration:beat.end-beat.start,captureFps:mode==='render'?captureFps:undefined,
      outputFps:24,duplicatedFrames:mode==='render'?captureFps!==24:undefined,states};
    if(mode==='review'){
      for(const [index,time]of reviewTimes(beat).entries()){
        const state=await seek(beat,time),file=`${beat.id}-${String(index).padStart(2,'0')}.jpg`;
        await page.screenshot({path:path.join(outputDir,file),type:'jpeg',quality:91,animations:'disabled'});
        states.push({...state,file});
      }
      const at=beat.actionEnd;
      const endA=await seek(beat,at),imageA=await page.screenshot({type:'png'});
      await seek(beat,beat.start);
      const endB=await seek(beat,at),imageB=await page.screenshot({type:'png'});
      assert.deepEqual(endA,endB,`State depends on seek order: ${beat.id}`);
      assert.equal(hash(imageA),hash(imageB),`Pixels depend on seek order: ${beat.id}`);
      record.seekDeterministic=true;
      const start=await seek(beat,beat.start),startImage=await page.screenshot({type:'png'});
      record.actionChangesPixels=hash(startImage)!==hash(imageA);
      assert(record.actionChangesPixels,`No explanatory change ${beat.id}`);
      await seek(beat,Math.max(beat.actionEnd,beat.end-1/24));
      const holdImage=await page.screenshot({type:'png'});
      record.holdStable=hash(holdImage)===hash(imageA);
      assert(record.holdStable,`Final action does not hold: ${beat.id}`);
      record.anchorWarnings=states.flatMap(s=>s.anchorWarnings);
      record.frameTouchesEdge=states.some(s=>s.metrics.bounds.left<4||s.metrics.bounds.right>W-5||s.metrics.bounds.top<4||s.metrics.bounds.bottom>H-5);
      await fs.writeFile(path.join(outputDir,`${beat.id}.json`),JSON.stringify(record,null,2));
    }else{
      const filename=path.join(outputDir,`${beat.id}.mp4`),sampleCount=Math.ceil(frameCount/repeatCount);
      record.capturedFrameCount=sampleCount;
      record.anchorFrames=[];
      const encoder=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate',String(captureFps),'-i','pipe:0',
        '-vf',`fps=24,tpad=stop_mode=clone:stop_duration=1,trim=end_frame=${frameCount},setpts=PTS-STARTPTS`,
        '-an','-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p','-frames:v',String(frameCount),
        '-r','24','-movflags','+faststart',filename],{stdio:['pipe','ignore','pipe']});
      let stderr='';encoder.stderr.on('data',d=>stderr+=d);
      const done=once(encoder,'close');done.catch(()=>{});
      // Sample native absolute times; only the explicit 12fps draft duplicates frames.
      try{
        for(let i=0;i<sampleCount;i++){
          const state=await seek(beat,beat.start+i/captureFps);
          if(i===0||i===sampleCount-1||i===Math.floor(sampleCount/2))states.push(state);
          for(let repeat=0;repeat<repeatCount&&i*repeatCount+repeat<frameCount;repeat++)record.anchorFrames.push({
            frame:i*repeatCount+repeat,time:beat.start+(i*repeatCount+repeat)/24,sourceTime:state.time,
            anchors:state.anchors,extraAnchors:state.extraAnchors||[],
            stage:state.stage,anchorWarnings:state.anchorWarnings,
          });
          const image=await page.screenshot({type:'jpeg',quality:93,animations:'disabled'});
          if(!encoder.stdin.write(image))await once(encoder.stdin,'drain');
        }
        encoder.stdin.end();const [code]=await done;assert.equal(code,0,stderr);
      }catch(error){encoder.stdin.destroy();encoder.kill();await done.catch(()=>{});throw error;}
      const probe=JSON.parse(await processOutput('ffprobe',['-v','error','-count_frames','-show_streams','-of','json',filename]));
      const video=probe.streams.find(s=>s.codec_type==='video');
      assert(video&&Number(video.nb_read_frames)===frameCount,`Frame count mismatch ${beat.id}`);
      assert.equal(video.width,W);assert.equal(video.height,H);assert.equal(video.r_frame_rate,'24/1');
      assert(!probe.streams.some(s=>s.codec_type==='audio'),'Clips must be silent');
      record.probe=probe;record.file=filename;
      await fs.writeFile(path.join(outputDir,`${beat.id}.json`),JSON.stringify(record,null,2));
    }
    results.push(record);
    console.log(`${mode} ${beat.id}: ${mode==='render'?frameCount+' frames; captured at '+captureFps+'fps':states.length+' frames; deterministic; hold stable'}`);
  }
  assert.deepEqual(errors,[]);
  const inventory=await page.evaluate(()=>window.__inventory);
  const report={mode,synthetic:fixture,errors,inventory,results,
    limits:'Engine geometry and seeking checks only. Narration synchrony and compositor text require parent audiovisual review.'};
  await fs.writeFile(path.join(outputDir,'last-run.json'),JSON.stringify(report,null,2));
  console.log(`Saved ${results.length} ${mode} records in ${outputDir}`);
  }
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
