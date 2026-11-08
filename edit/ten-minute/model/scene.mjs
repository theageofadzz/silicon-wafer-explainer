import {T,V,C,clamp,ease} from './core.mjs';
import {validateTimeline,flattenBeats} from './timeline.mjs';
import {makeContext,compilePlan} from './semantic.mjs';
import {cameraPlanFor,directedView} from './cinematography.mjs';

const query=new URLSearchParams(location.search);
const family=query.get('family')||'all';
const {atomicKeys,atomicRig}=family==='all'||family==='atomic'?await import('./atomic.mjs'):{atomicKeys:[]};
const {growthKeys,growthRig}=family==='all'||family==='growth'?await import('./growth-semantic.mjs'):{growthKeys:[]};
const {finishingKeys,finishingRig}=family==='all'||family==='finishing'?await import('./finishing.mjs'):{finishingKeys:[]};
const W=Number(query.get('w')||576),H=Number(query.get('h')||1024);
if(!Number.isInteger(W)||!Number.isInteger(H)||W<64||H<64)throw new Error('Invalid render dimensions');
const renderer=new T.WebGLRenderer({canvas:document.getElementById('world'),antialias:true,preserveDrawingBuffer:true,alpha:false});
renderer.setPixelRatio(1);renderer.setSize(W,H,false);
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;renderer.localClippingEnabled=true;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const world=new T.Scene();world.background=new T.Color(C.background);
const orthoCamera=new T.OrthographicCamera(-2,2,4,-4,.01,100);
const perspectiveCamera=new T.PerspectiveCamera(30,W/H,.01,100);
let camera=orthoCamera;
world.add(new T.HemisphereLight(0xf0f1ee,0x242a2d,.95));
for(const [i,[intensity,xyz]]of [[4.2,[-4,7,7]],[2.5,[5,2,-4]],[.8,[-3,-1,3]]].entries()){
  const light=new T.DirectionalLight(0xffffff,intensity);light.position.set(...xyz);world.add(light);
  if(i===0){
    light.castShadow=true;light.shadow.mapSize.set(1024,1024);
    Object.assign(light.shadow.camera,{left:-7,right:7,top:8,bottom:-7,near:.5,far:35});
    light.shadow.normalBias=.035;light.shadow.bias=-.00015;
  }
}
const backdrop=document.createElement('canvas');backdrop.width=16;backdrop.height=1024;
const bc=backdrop.getContext('2d'),bg=bc.createLinearGradient(0,0,0,1024);
for(const [position,color]of [[0,'#111619'],[.34,'#252c30'],[.7,'#1c2327'],[1,'#111619']])bg.addColorStop(position,color);
bc.fillStyle=bg;bc.fillRect(0,0,16,1024);
const backdropTexture=new T.CanvasTexture(backdrop);backdropTexture.colorSpace=T.SRGBColorSpace;
world.background=backdropTexture;
const envCanvas=document.createElement('canvas');envCanvas.width=2048;envCanvas.height=1024;
const ec=envCanvas.getContext('2d');ec.fillStyle='#303437';ec.fillRect(0,0,2048,1024);
for(const [x,y,w,h]of [[0,130,2048,45],[0,202,2048,16],[0,280,2048,22],[0,670,2048,100],[330,0,60,1024],[1500,0,28,1024]]){
  const gradient=ec.createLinearGradient(x,y,x,y+h);
  gradient.addColorStop(0,'#a9afb2');gradient.addColorStop(.2,'#f7f8f6');
  gradient.addColorStop(.8,'#f7f8f6');gradient.addColorStop(1,'#a9afb2');
  ec.fillStyle=gradient;ec.fillRect(x,y,w,h);
}
const env=new T.CanvasTexture(envCanvas);env.colorSpace=T.SRGBColorSpace;
env.mapping=T.EquirectangularReflectionMapping;
const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(env);
world.environment=environment.texture;pmrem.dispose();env.dispose();
renderer.render(world,orthoCamera);
const backdropPixels=new Uint8Array(W*H*4);
renderer.getContext().readPixels(0,0,W,H,renderer.getContext().RGBA,renderer.getContext().UNSIGNED_BYTE,backdropPixels);
const response=await fetch('../timeline.json');
if(!response.ok)throw new Error(`Timeline HTTP ${response.status}; provide ../timeline.json or use renderer --fixture`);
const timeline=await response.json();
validateTimeline(timeline);
const beats=flattenBeats(timeline),byId=new Map(beats.map(b=>[b.id,b]));
const keys=[...atomicKeys,...growthKeys,...finishingKeys],cache=new Map();
const frameCache=new Map();
const inventory={};
function getRig(beat){
  const key=beat.visual;
  if(cache.has(beat.id))return cache.get(beat.id);
  if(!keys.includes(key))throw new Error(`Unknown visual key: ${key}`);
  const rig=atomicKeys.includes(key)?atomicRig(key,world,beat):growthKeys.includes(key)?growthRig(key,world,beat):finishingRig(key,world,beat);
  compilePlan(beat,rig.semanticPlan);
  cache.set(beat.id,rig);let meshes=0;rig.g.traverse(o=>{if(o.isMesh)meshes++;});
  inventory[beat.id]={meshes,source:key,semanticPlan:rig.semanticPlan,
    cameraPlan:cameraPlanFor(beat,rig),
    schematic:['purity','segregation','doping','kerf','wire','edge','lap','etch','polish','flatness','focus'].includes(key)};
  return rig;
}
function project(o){
  for(let p=o;p;p=p.parent)if(!p.visible)return null;
  const pos=o.getWorldPosition(V()),q=pos.clone().project(camera),x=(q.x+1)/2,y=(1-q.y)/2;
  if(q.z< -1||q.z>1||x<.025||x>.975||y<.025||y>.975)return null;
  return {x,y,depth:q.z,world:pos.toArray()};
}
function metrics(){
  const gl=renderer.getContext(),pixels=new Uint8Array(W*H*4);
  gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  const background=Array.from(pixels.slice(0,3));
  let foreground=0,bright=0,min=255,max=0,samples=0,sum=0;
  const bounds={left:W,right:0,top:H,bottom:0};
  for(let y=0;y<H;y+=4)for(let x=0;x<W;x+=4){
    const i=(y*W+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2],v=Math.max(r,g,b);
    min=Math.min(min,v);max=Math.max(max,v);sum+=v;samples++;if(v>100)bright++;
    if(Math.max(Math.abs(r-backdropPixels[i]),Math.abs(g-backdropPixels[i+1]),Math.abs(b-backdropPixels[i+2]))>22){
      foreground++;bounds.left=Math.min(bounds.left,x);bounds.right=Math.max(bounds.right,x);
      bounds.top=Math.min(bounds.top,H-1-y);bounds.bottom=Math.max(bounds.bottom,H-1-y);
    }
  }
  return {nonblank:foreground>samples*.012&&max-min>45,foregroundFraction:foreground/samples,
    bright,min,max,mean:sum/samples,samples,bounds,background};
}
function fittedSpan(rig,ctx,minimum,aspect,cacheKey){
  if(frameCache.has(cacheKey))return frameCache.get(cacheKey);
  let span=minimum;
  // Fit the complete action envelope once, rather than resizing with each frame.
  for(const fraction of [0,.125,.25,.5,.75,.875,1]){
    rig.update(makeContext(ctx.beat,ctx.beat.start+fraction*(ctx.beat.end-ctx.beat.start),rig.semanticPlan));
    rig.g.updateMatrixWorld(true);
    rig.g.traverse(o=>{
      if(!o.isMesh)return;
      for(let p=o;p;p=p.parent)if(!p.visible)return;
      for(let p=o;p;p=p.parent)if(p.userData.contextOnly)return;
      o.geometry.computeBoundingBox();
      const b=o.geometry.boundingBox;
      for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){
        const p=V(x,y,z).applyMatrix4(o.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
        span=Math.max(span,Math.abs(p.y)*2.2,Math.abs(p.x)*2.2/aspect);
      }
    });
  }
  frameCache.set(cacheKey,span);return span;
}
window.renderBeat=(id,absoluteTime,{measure=true}={})=>{
  const beat=byId.get(id);if(!beat)throw new Error(`Unknown beat: ${id}`);
  if(!Number.isFinite(absoluteTime))throw new Error('Time must be finite absolute seconds');
  for(const rig of cache.values())rig.g.visible=false;
  const rig=getRig(beat);rig.g.visible=true;
  const time=Math.max(beat.start,Math.min(absoluteTime,beat.end));
  const ctx=makeContext(beat,time,rig.semanticPlan),raw=ctx.raw;
  const data=rig.update(ctx);rig.g.updateMatrixWorld(true);
  const direction=directedView(beat,rig,ctx),look=direction.look;
  camera=direction.projection==='perspective'?perspectiveCamera:orthoCamera;
  const aspect=W/H;
  camera.position.copy(look).add(direction.direction.clone().multiplyScalar(18));camera.lookAt(look);
  camera.updateMatrixWorld();
  const span=direction.fit?fittedSpan(rig,ctx,direction.span,aspect,`${beat.id}/${direction.index}`):direction.span;
  if(direction.fit)rig.update(ctx);
  for(const event of ctx.events)if(!ctx.used.has(event.phrase))throw new Error(`Planned action never evaluated: ${beat.id}/${event.phrase}`);
  camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;
  if(camera.isPerspectiveCamera)camera.fov=T.MathUtils.radToDeg(2*Math.atan(span*1.08/36));
  camera.updateProjectionMatrix();camera.updateMatrixWorld();world.updateMatrixWorld(true);
  renderer.render(world,camera);
  const anchorWarnings=[],anchors=[];
  for(const [i,text]of (beat.labels||[]).slice(0,2).entries()){
    const target=rig.anchors[i],position=target&&project(target);
    if(position)anchors.push({
      text:beat.visual==='wafer-measure'&&i===1?`厚度截面放大 · ${text}`:text,...position,
      ...(target.userData.objectLabel?{objectLabel:target.userData.objectLabel}:{}),
      ...(beat.visual==='wafer-measure'&&i===1?{sectionMagnified:true}:{}),
    });
    else anchorWarnings.push({text,reason:'object hidden or outside safe frame'});
  }
  const extraAnchors=[];
  const semantic=typeof rig.semanticAnchors==='function'?rig.semanticAnchors(ctx):rig.semanticAnchors||[];
  for(const entry of semantic){
    const qualityPhrases={'杂质':'杂质','原子排列':'原子的排列','表面高低':'表面的高低'};
    if(beat.visual==='recap'&&qualityPhrases[entry.text]){
      const joined=beat.words.map(w=>w.text).join(''),index=joined.indexOf(qualityPhrases[entry.text]);
      let cursor=0;
      const word=beat.words.find(w=>{cursor+=w.text.length;return cursor>index;});
      if(index<0||!word)throw new Error(`Missing local label word: ${beat.id}/${entry.text}`);
      if(time<word.start)continue;
    }
    const position=project(entry.object);
    if(position)extraAnchors.push({text:entry.text,...position,
      offset:entry.offset||[0,-65],...(entry.visibleFrom!==undefined?{visibleFrom:entry.visibleFrom}:{})});
  }
  const actionStart=Math.min(...ctx.events.map(e=>e.start)),actionEnd=Math.max(...ctx.events.map(e=>e.end));
  const m=measure?metrics():{},state={id,visual:beat.visual,time,stage:time<actionStart?'before':time>=actionEnd?'hold':'action',
    progress:raw,nonblank:m.nonblank,metrics:m,anchors,extraAnchors,anchorWarnings,data,
    camera:{eye:camera.position.toArray(),look:look.toArray(),span,shot:direction.index,kind:direction.kind,
      phrase:direction.phrase,projection:camera.isPerspectiveCamera?'perspective':'orthographic'},
    cameraPlan:direction.plan,visualRevision:4,
    action:{start:actionStart,end:actionEnd,anchor:beat.actionAnchor,hold:beat.end-actionEnd},
    semanticEvents:ctx.events.map(e=>({...e,progress:ease((time-e.start)/(e.end-e.start))})),
    semanticVersion:3,
    frame:{width:W,height:H},textBurnedIn:false};
  window.__state=state;return state;
};
window.__inventory=inventory;window.__visualKeys=keys;window.__timeline=timeline;
window.semanticPlanFor=id=>{
  const beat=byId.get(id),rig=getRig(beat);
  return compilePlan(beat,rig.semanticPlan);
};
window.cameraPlanFor=id=>{
  const beat=byId.get(id);return cameraPlanFor(beat,getRig(beat));
};
window.releaseBeat=id=>{
  const rig=cache.get(id);if(!rig)return;
  rig.g.removeFromParent();rig.g.traverse(object=>object.geometry?.dispose());
  cache.delete(id);
  for(const key of frameCache.keys())if(key.startsWith(`${id}/`))frameCache.delete(key);
};
const initial=byId.get(query.get('beat'))||beats[0];
window.renderBeat(initial.id,initial.start);
window.__ready=true;
