import {T,V,C,clamp,ease} from './core.mjs';
import {atomicKeys,atomicRig} from './atomic.mjs';
import {growthKeys,growthRig} from './growth.mjs';
import {finishingKeys,finishingRig} from './finishing.mjs';
import {validateTimeline,flattenBeats} from './timeline.mjs';

const query=new URLSearchParams(location.search);
const W=Number(query.get('w')||576),H=Number(query.get('h')||1024);
if(!Number.isInteger(W)||!Number.isInteger(H)||W<64||H<64)throw new Error('Invalid render dimensions');
const renderer=new T.WebGLRenderer({canvas:document.getElementById('world'),antialias:true,preserveDrawingBuffer:true,alpha:false});
renderer.setPixelRatio(1);renderer.setSize(W,H,false);
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;renderer.localClippingEnabled=true;
const world=new T.Scene();world.background=new T.Color(C.background);
const orthoCamera=new T.OrthographicCamera(-2,2,4,-4,.01,100);
const perspectiveCamera=new T.PerspectiveCamera(30,W/H,.01,100);
let camera=orthoCamera;
world.add(new T.HemisphereLight(0xf0f1ee,0x303233,2));
for(const [intensity,xyz]of [[3.8,[-4,7,7]],[2.7,[5,2,-4]],[1.3,[-3,-1,3]]]){
  const light=new T.DirectionalLight(0xffffff,intensity);light.position.set(...xyz);world.add(light);
}
const envCanvas=document.createElement('canvas');envCanvas.width=2048;envCanvas.height=1024;
const ec=envCanvas.getContext('2d');ec.fillStyle='#303437';ec.fillRect(0,0,2048,1024);
for(const [x,y,w,h]of [[0,130,2048,45],[0,202,2048,16],[0,280,2048,22],[0,670,2048,100],[330,0,60,1024],[1500,0,28,1024]]){
  const gradient=ec.createLinearGradient(x,y,x,y+h);
  gradient.addColorStop(0,'#a9afb2');gradient.addColorStop(.2,'#f7f8f6');
  gradient.addColorStop(.8,'#f7f8f6');gradient.addColorStop(1,'#a9afb2');
  ec.fillStyle=gradient;ec.fillRect(x,y,w,h);
}
const env=new T.CanvasTexture(envCanvas);env.mapping=T.EquirectangularReflectionMapping;
const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(env);
world.environment=environment.texture;pmrem.dispose();env.dispose();
const response=await fetch('../timeline.json');
if(!response.ok)throw new Error(`Timeline HTTP ${response.status}; provide ../timeline.json or use renderer --fixture`);
const timeline=await response.json();
validateTimeline(timeline);
const beats=flattenBeats(timeline),byId=new Map(beats.map(b=>[b.id,b]));
const keys=[...atomicKeys,...growthKeys,...finishingKeys],cache=new Map();
const frameCache=new Map();
const inventory={};
function getRig(key){
  if(cache.has(key))return cache.get(key);
  if(!keys.includes(key))throw new Error(`Unknown visual key: ${key}`);
  const rig=atomicKeys.includes(key)?atomicRig(key,world):growthKeys.includes(key)?growthRig(key,world):finishingRig(key,world);
  cache.set(key,rig);let meshes=0;rig.g.traverse(o=>{if(o.isMesh)meshes++;});
  inventory[key]={meshes,source:key,schematic:['purity','segregation','doping','kerf','wire','edge','lap','etch','polish','flatness','focus'].includes(key)};
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
    if(Math.max(Math.abs(r-background[0]),Math.abs(g-background[1]),Math.abs(b-background[2]))>22){
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
  for(const raw of [0,.125,.25,.5,.75,.875,1]){
    rig.update({...ctx,raw,p:ease(raw),a:(a,b)=>ease((raw-a)/(b-a))});
    rig.g.updateMatrixWorld(true);
    rig.g.traverse(o=>{
      if(!o.isMesh)return;
      for(let p=o;p;p=p.parent)if(!p.visible)return;
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
window.renderBeat=(id,absoluteTime)=>{
  const beat=byId.get(id);if(!beat)throw new Error(`Unknown beat: ${id}`);
  if(!Number.isFinite(absoluteTime))throw new Error('Time must be finite absolute seconds');
  for(const rig of cache.values())rig.g.visible=false;
  const rig=getRig(beat.visual);rig.g.visible=true;
  camera=['wafer','wafer-measure'].includes(beat.visual)?perspectiveCamera:orthoCamera;
  const time=Math.max(beat.start,Math.min(absoluteTime,beat.end));
  const raw=clamp((time-beat.actionStart)/(beat.actionEnd-beat.actionStart));
  const ctx={beat,time,raw,p:ease(raw),a:(a,b)=>ease((raw-a)/(b-a))};
  // Locked shot angles preserve measurements; cuts vary angles between beats.
  const variant=beat.index%3,view=variant===2&&rig.detailView?rig.detailView:rig.view;
  const eye=V(...view.eye),look=V(...view.look);
  if(variant===1)eye.x*=-.7;
  const aspect=W/H;
  camera.position.copy(look).add(eye.normalize().multiplyScalar(18));camera.lookAt(look);
  camera.updateMatrixWorld();
  const span=fittedSpan(rig,ctx,view.span,aspect,beat.id);
  const data=rig.update(ctx);
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
  const m=metrics(),state={id,visual:beat.visual,time,stage:time<beat.actionStart?'before':time>=beat.actionEnd?'hold':'action',
    progress:raw,nonblank:m.nonblank,metrics:m,anchors,extraAnchors,anchorWarnings,data,
    camera:{eye:camera.position.toArray(),look:look.toArray(),span,shot:variant,projection:camera.isPerspectiveCamera?'perspective':'orthographic'},
    action:{start:beat.actionStart,end:beat.actionEnd,anchor:beat.actionAnchor,hold:beat.end-beat.actionEnd},
    frame:{width:W,height:H},textBurnedIn:false};
  window.__state=state;return state;
};
window.__inventory=inventory;window.__visualKeys=keys;window.__timeline=timeline;
window.renderBeat(beats[0].id,beats[0].start);
window.__ready=true;
