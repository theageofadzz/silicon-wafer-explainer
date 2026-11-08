import {T,M,group,box,cyl,ball,ring,segment,dynamicLine,setSegment,tube,arrow,wafer,marker,rigResult,mix,buildDiamond} from './core.mjs';
import {finishingPlan,phraseWindow} from './finishing-plan.mjs';
import {named,context,axisCylinder,machineBed,saddle,chuckX,toolSpindle,guideBearing,sectionSeat,
  vacuumStage,openTank,filterHousing,opticalHead,recordPlate,terminal,fabBuilding,cassetteDock,
  edgeNest,planetaryPlate,finishingShots} from './finishing-detail.mjs';

export const finishingKeys=['wafer','wafer-measure','trim','wire','kerf','edge','lap','etch','polish','flatness','focus','wash','scan','cassette','industry','recap'];
const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const at=(parent,xyz)=>{const g=group(parent);g.position.set(...xyz);return g;};
const target=(parent,xyz,text)=>{const o=marker(parent,xyz);if(text)o.userData.objectLabel=text;return o;};
const label=(text,object,phrase,offset=[0,-75])=>({text,object,phrase,offset});
const active=u=>u>1e-7;
const scaleReveal=(o,u)=>{o.visible=active(u);o.scale.setScalar(Math.max(.001,u));};
const polishedSilicon=M.silicon.clone();
polishedSilicon.metalness=.82;
function bracket(parent,a,b,material=M.green,r=.012){
  const g=group(parent),line=dynamicLine(g,material,r);
  setSegment(line,a,b);
  const d=v(...b).sub(v(...a)).normalize(),tick=Math.abs(d.y)>.8?v(.14,0,0):v(0,.13,0);
  for(const p of [v(...a),v(...b)])segment(g,p.clone().sub(tick).toArray(),p.clone().add(tick).toArray(),r,material);
  return {g,line,anchor:target(g,v(...a).add(v(...b)).multiplyScalar(.5).toArray())};
}
function surface(parent,{length=3,depth=1.2,bottom=-.48,height=x=>.1*Math.cos(x*5),material=M.silicon}={}){
  const shape=new T.Shape();shape.moveTo(-length/2,bottom);shape.lineTo(length/2,bottom);
  for(let i=64;i>=0;i--){const x=-length/2+length*i/64;shape.lineTo(x,height(x));}shape.closePath();
  const geo=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,steps:1});
  geo.translate(0,0,-depth/2);
  const mesh=new T.Mesh(geo,material);parent.add(mesh);
  const pos=geo.attributes.position,original=pos.array.slice();
  return {mesh,height,length,depth,
    deform(fn){
      for(let i=0;i<pos.count;i++)if(original[i*3+1]>bottom+1e-5)pos.setY(i,fn(original[i*3]));
      pos.needsUpdate=true;geo.computeVertexNormals();
    },
    anchor:(x,text)=>target(parent,[x,height(x),depth/2+.01],text),
  };
}
function rod(parent,r=.65,length=2.2,xyz=[0,0,0]){
  const o=cyl(parent,r,length,M.silicon,xyz);o.rotation.z=Math.PI/2;return o;
}
function mineral(parent,xyz=[0,0,0],r=.6){
  const o=new T.Mesh(new T.IcosahedronGeometry(r,0),M.ceramic);o.position.set(...xyz);o.rotation.set(.3,.6,.2);parent.add(o);return o;
}
function particles(parent,n=12,material=M.green,r=.055){
  return Array.from({length:n},(_,i)=>ball(parent,r,material,[(i%4-1.5)*.35,.1+Math.floor(i/4)*.12,Math.sin(i*2.4)*.35]));
}
function plant(parent,xyz=[0,0,0]){
  return fabBuilding(parent,xyz);
}
function carrier(parent,{n=7,scale=1}={}){
  const g=group(parent),body=group(g),disks=[];
  box(body,2.9,.12,2.5,M.dark,[0,-1.1,0]);box(body,2.9,.12,2.5,M.dark,[0,1.1,0]);
  for(const x of [-1.4,1.4])box(body,.1,2.2,2.5,M.ceramic,[x,0,0]);
  box(body,2.9,2.2,.08,M.dark,[0,0,-1.24]);
  box(body,.8,.1,.42,M.dark,[0,1.22,0]);
  for(const x of [-1.48,1.48])box(body,.12,.55,.25,M.dark,[x,0,.65]);
  for(let i=0;i<n;i++){
    const y=(i-(n-1)/2)*1.8/Math.max(1,n-1),w=wafer(body,1.22,[0,y,0]);
    disks.push(w);
    for(const x of [-1.25,1.25])box(body,.16,.035,1.8,M.dark,[x,y-.04,0]);
  }
  const cover=box(g,2.9,2.2,.09,M.glass,[0,0,1.3]);
  for(const x of [-1.22,1.22])box(cover,.13,.5,.08,M.ceramic,[x,0,.06]);
  recordPlate(body,[-1.1,.7,1.27],{w:.45,h:.28});
  const anchor=target(body,[-1.4,.6,.8],'专用洁净运输盒');
  g.scale.setScalar(scale);return {g,body,disks,cover,anchor};
}
function finish(g,beat,kind,update,anchors,labels=[],view={}){
  const semanticPlan=finishingPlan(beat);
  // These exact declarations are the only clocks allowed to drive explanatory actions.
  for(const entry of semanticPlan)phraseWindow(beat,entry.phrase);
  const rig=rigResult(g,ctx=>{
    if(ctx.beat.id!==beat.id)throw new Error(`Finishing rig reused across beats: ${beat.id}/${ctx.beat.id}`);
    const progress={},timing=[];
    for(const entry of semanticPlan){
      progress[entry.phrase]=ctx.q(entry.phrase);
      const window=ctx.window(entry.phrase);
      timing.push({...entry,start:window.start-entry.lead,end:window.start-entry.lead+entry.seconds});
    }
    const data=update(progress,ctx);
    const lastActionEnd=Math.max(...timing.map(t=>t.end));
    return {...data,semanticScene:kind,beatId:beat.id,progress,semanticTiming:timing,lastActionEnd,
      readingHold:beat.end-lastActionEnd,
      holdLimitation:lastActionEnd>beat.end-1?'Real spoken anchor leaves less than one second; narration was not moved.':null};
  },anchors,{semanticPlan,view:{eye:[2.6,2.4,10],look:[0,0,0],span:8.3,...view}});
  rig.semanticAnchors=ctx=>{
    const entries=typeof labels==='function'?labels(ctx):labels;
    return entries.filter(entry=>{
      const w=ctx.window(entry.phrase);
      if(ctx.time<w.start)return false;
      for(let o=entry.object;o;o=o.parent)if(!o.visible)return false;
      return true;
    }).sort((a,b)=>ctx.window(a.phrase).start-ctx.window(b.phrase).start).slice(-2)
      .map(({phrase,...entry})=>({...entry,visibleFrom:ctx.window(phrase).start}));
  };
  return rig;
}

function openingWafer(parent,beat){
  const g=group(parent),w=wafer(g,1.65),edge=target(w.g,[-1.5,.01,.5],'空白硅片');
  edgeNest(w.g,1.62,-.025);
  return finish(g,beat,'blank-material-introduction',p=>{
    w.g.rotation.set(.18+p['一片薄薄的硅']*.18, -.32+p['表面亮得像镜子']*.55,0);
    return {...w.g.userData,blank:true,patterned:false,reflectionOnly:true};
  },[edge,w.g],[label('空白硅片',edge,'一片薄薄的硅',[-90,-80])],
  {eye:[3,5.7,9],span:7.5});
}
function dimensions(parent,beat){
  const g=group(parent),w=wafer(g,1.65,[0,.6,0]);w.g.rotation.x=.3;
  const d=bracket(w.g,[-1.65,.025,0],[1.65,.025,0]),line=dynamicLine(w.g,M.green,.015);
  const plate=ring(g,1.75,M.ceramic,[0,.54,0],.035);plate.rotation.x=Math.PI/2+.3;
  const section=at(g,[0,-1.6,0]),s=surface(section,{length:2.4,depth:.65,bottom:-.09,height:()=>.09});
  const t=bracket(section,[1.4,-.09,0],[1.4,.09,0]);
  edgeNest(w.g,1.61,-.03);
  sectionSeat(section,{y:-.16,width:2.4,depth:.65});
  const micrometer=at(section,[1.65,0,-.25]);
  box(micrometer,.15,.62,.22,M.dark,[.24,0,0]);
  for(const sign of [-1,1]){
    box(micrometer,.35,.1,.22,M.dark,[.1,sign*.26,0]);
    cyl(micrometer,.055,.12,M.bright,[-.05,sign*.15,0]);
  }
  return finish(g,beat,'diameter-versus-magnified-thickness',p=>{
    const a=p['三百毫米'],b=p['厚度'];d.g.visible=active(a);line.visible=active(a);
    setSegment(line,[-1.65,.025,0],[mix(-1.65,1.65,a),.025,0]);
    d.line.visible=false;plate.visible=active(p['餐盘']);
    section.visible=active(b);
    return {...w.g.userData,physicalWaferScale:true,sectionSchematic:true,
      sectionExaggeration:.18/w.h,diameterProgress:a,thicknessProgress:b,materialRemoval:0};
  },[d.anchor,t.anchor],[
    label('直径 300 mm',d.anchor,'三百毫米',[0,-85]),
    label('截面放大 · 0.775 mm',t.anchor,'厚度',[-80,-40]),
  ],{eye:[2,5.2,10],look:[0,-.2,0],span:8.1});
}
function quality(parent,beat){
  const g=group(parent),sample=at(g,[0,2.1,0]),lattice=buildDiamond(g,{cells:2,spacing:1.03,atomRadius:.07});
  for(let i=0;i<18;i++)ball(sample,.075,M.atom,[(i%6-2.5)*.33,(Math.floor(i/6)-1)*.33,0]);
  const foreign=ball(sample,.11,M.green,[.3,0,.1]),highlight=ring(sample,.19,M.green,[.3,0,.1],.015);highlight.rotation.x=Math.PI/2;
  const latticeTarget=target(lattice.atoms[58],[0,0,0],'原子排列');
  const patch=at(g,[0,-1.9,0]),s=surface(patch,{length:2.8,depth:.9,height:x=>.16*Math.cos(x*5),bottom:-.25});
  const probe=ball(patch,.055,M.green),surfaceTarget=target(patch,[0,0,.46],'表面高低');
  const limits=[segment(patch,[-1.4,.19,.48],[1.4,.19,.48],.012,M.green),
    segment(patch,[-1.4,-.19,.48],[1.4,-.19,.48],.012,M.green)];
  sectionSeat(patch,{y:-.33,width:2.8,depth:.9});
  const probeHead=opticalHead(patch,[0,.6,.35],{r:.12});
  const probeArm=dynamicLine(patch,M.bright,.045);
  box(patch,3.2,.12,.22,M.dark,[0,.95,-.35]);
  for(const x of [-1.5,1.5])box(patch,.12,1.4,.22,M.dark,[x,.2,-.35]);
  return finish(g,beat,'three-independent-quality-controls',p=>{
    highlight.visible=active(p['杂质']);highlight.scale.setScalar(1+.2*p['杂质']);
    lattice.bonds.forEach(({o},i)=>o.visible=p['原子的排列']>i/lattice.bonds.length);
    const x=mix(-1.2,1.2,p['表面的高低']);probe.position.set(x,s.height(x)+.04,.35);
    probe.visible=active(p['表面的高低']);surfaceTarget.position.set(x,s.height(x),.46);
    probeHead.visible=probe.visible;probeHead.position.x=x;
    probeArm.visible=probe.visible;setSegment(probeArm,[x,.94,-.35],[x,.75,.35]);
    limits.forEach(o=>o.visible=active(p['控制']));
    return {qualityControls:true,surfaceGeometryFixed:true,surfaceAmplitude:.16,materialRemoval:0,
      impurityControl:p['杂质'],latticeProgress:p['原子的排列'],surfaceProgress:p['表面的高低']};
  },[foreign,surfaceTarget],[
    label('杂质',foreign,'杂质',[115,-65]),label('原子排列',latticeTarget,'原子的排列',[190,-70]),
    label('表面高低',surfaceTarget,'表面的高低',[-100,-85]),
  ],{eye:[1.5,1.5,10],look:[0,.1,0],span:8.5});
}
function roadmap(parent,beat){
  const g=group(parent),rock=mineral(g,[0,2.1,0],.65),silicon=at(g,[0,.7,0]);
  for(let i=0;i<5;i++)mineral(silicon,[(i-2)*.28,0,Math.sin(i)*.15],.2);
  const foreign=particles(silicon,4,M.amber,.05),crystal=rod(g,.45,2,[0,-.7,0]);
  const w=wafer(g,1.05,[0,-2,0]),pad=cyl(g,.4,.15,M.ceramic,[0,-1.7,0]);
  const links=[arrow(g,[.95,1.8,0],[.95,1,0]),arrow(g,[-.95,.35,0],[-.95,-.4,0]),arrow(g,[1,-1,0],[1,-1.75,0])];
  const rockRing=ring(g,.82,M.green,[0,2.1,0]);rockRing.rotation.x=Math.PI/2;
  const sampleTray=at(g,[0,1.43,0]);box(sampleTray,1.5,.12,1.2,M.dark);
  for(const z of [-.6,.6])box(sampleTray,1.5,.18,.06,M.ceramic,[0,.12,z]);
  const feedBin=at(silicon,[0,-.22,0]);box(feedBin,1.7,.1,.85,M.dark);
  for(const x of [-.85,.85])box(feedBin,.06,.22,.85,M.ceramic,[x,.12,0]);
  saddle(g,-.6,.45,-.7);saddle(g,.6,.45,-.7);
  edgeNest(w.g,1.02,-.025);toolSpindle(pad,{axis:'y',side:1});
  return finish(g,beat,'material-route-and-return-to-quartz',p=>{
    silicon.visible=links[0].visible=active(p['从石头中取出硅']);
    foreign.forEach((o,i)=>o.position.x=(i-1.5)*.35+p['提纯']*1.2);
    crystal.visible=links[1].visible=active(p['长成单晶']);crystal.scale.y=Math.max(.001,p['长成单晶']);
    w.g.visible=pad.visible=links[2].visible=active(p['加工表面']);pad.position.x=mix(-.6,.6,p['加工表面']);
    rockRing.visible=active(p['石英开始']);
    return {route:['quartz','purified-feedstock','single-crystal','surface-processing'],finalAttention:'quartz'};
  },[rock,w.g],[label('石英',rock,'石英开始',[140,-65]),label('单晶',crystal,'长成单晶',[-130,-65])],
  {eye:[1.4,1.8,10],span:8.9});
}
function endTrimming(parent,beat){
  const g=group(parent),body=rod(g,.72,2.3),ends=[rod(g,.72,.5,[-1.4,0,0]),rod(g,.72,.5,[1.4,0,0])];
  const blades=[cyl(g,.85,.045,M.ceramic,[-1.17,1.2,0]),cyl(g,.85,.045,M.ceramic,[1.17,1.2,0])];
  blades.forEach(o=>o.rotation.z=Math.PI/2);
  const wheel=cyl(g,.43,.35,M.ceramic,[0,1.1,0]);wheel.rotation.z=Math.PI/2;
  const tray=box(g,3.8,.12,1.6,M.dark,[0,-1.25,0]),debris=particles(g,16,M.silver,.035);
  const outline=ring(g,.72,M.green,[1.16,0,0]);outline.rotation.z=Math.PI/2;
  machineBed(g,{length:5.4,y:-1.55,depth:2.25});
  saddle(g,-.7);saddle(g,.7);
  const chucks=[chuckX(g,-1.78,{face:1}),chuckX(g,1.78,{face:-1})];
  blades.forEach(o=>toolSpindle(o,{axis:'y',side:-1,r:.2}));
  // The wheel spindle and cross-slide travel with the existing contact action.
  named(wheel,'trimContact');toolSpindle(wheel,{axis:'y',side:1,r:.23});
  const slide=box(g,.8,.2,.68,M.dark,[0,1.5,-.6]);
  box(g,3.6,.18,.35,M.dark,[0,1.85,-.7]);
  for(const x of [-1.8,1.8])box(g,.2,3.3,.35,M.dark,[x,.2,-.7]);
  const coolant=dynamicLine(g,M.liquid,.022);
  const toolMount=dynamicLine(g,M.dark,.1),toolFeed=dynamicLine(g,M.bright,.08);
  const coolantPort=ball(g,.055,M.dark);
  return finish(g,beat,'end-removal-then-cylindrical-grinding',p=>{
    const cut=p['切去'],grind=p['外圆加工'],loss=p['材料也在这里损耗'];
    blades.forEach(o=>{o.visible=cut>0&&cut<1;o.position.y=mix(1.2,-1,cut);});
    ends.forEach((o,i)=>{o.position.x=(i?1:-1)*(1.4+.5*cut);o.position.y=-.9*loss;});
    body.scale.x=body.scale.z=mix(1,.9,grind);
    wheel.visible=grind>0&&grind<1;wheel.position.set(mix(-1.1,1.1,grind),mix(1.1,.65,grind),0);wheel.rotation.y=grind*12;
    chucks.forEach((o,i)=>{o.position.x=(i?1:-1)*mix(1.78,1.27,cut);o.rotation.x=grind*Math.PI*3;});
    slide.position.x=wheel.position.x;slide.position.y=wheel.position.y+.72;
    setSegment(toolMount,[wheel.position.x-1.05,wheel.position.y,0],[wheel.position.x-1.05,slide.position.y,-.6]);
    setSegment(toolFeed,[wheel.position.x,1.76,-.7],[wheel.position.x,slide.position.y,-.6]);
    toolMount.visible=toolFeed.visible=wheel.visible;
    coolantPort.position.set(wheel.position.x+.25,wheel.position.y+.2,-.35);coolantPort.visible=wheel.visible;
    coolant.visible=wheel.visible;setSegment(coolant,[wheel.position.x+.25,wheel.position.y+.2,-.35],
      [wheel.position.x,.72*mix(1,.9,grind),0]);
    debris.forEach((o,i)=>{o.visible=active(loss);o.position.set((i%8-3.5)*.35,-1.12+(i%2)*.08,Math.sin(i)*.5);});
    outline.visible=active(grind);outline.scale.setScalar(mix(1,.9,grind));
    return {operation:'end-trimming-and-outer-grinding',offcutRelease:cut,outerRadius:.72*mix(1,.9,grind),removedMaterialInTray:loss};
  },[body,ends[1]],[label('外圆加工',body,'外圆加工',[0,-100]),label('材料损耗',tray,'材料也在这里损耗',[0,-75])],
  {span:7.5});
}
function notch(parent,beat){
  const g=group(parent),radius=.72,length=2.5,depth=.23,angle=2.42,opening=.24;
  const original=rod(g,radius,length),shape=new T.Shape();
  for(let i=0;i<=96;i++){
    const a=angle+opening+(Math.PI*2-2*opening)*i/96;
    if(!i)shape.moveTo(radius*Math.cos(a),radius*Math.sin(a));else shape.lineTo(radius*Math.cos(a),radius*Math.sin(a));
  }
  shape.lineTo((radius-depth)*Math.cos(angle),(radius-depth)*Math.sin(angle));shape.closePath();
  const cut=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:length,bevelEnabled:false}),M.silicon.clone());
  cut.rotation.y=Math.PI/2;cut.position.x=-length/2;g.add(cut);original.material=M.silicon.clone();
  const radial=[0,Math.sin(angle),-Math.cos(angle)],end=beat.index%3===1?-1:1;
  const direction=arrow(g,[end*1.35,0,0],[end*1.35,radial[1]*1.1,radial[2]*1.1],M.amber,.028);
  const wheel=cyl(g,.34,.1,M.ceramic);wheel.rotation.z=Math.PI/2;
  const floor=target(g,[0,radial[1]*(radius-depth),radial[2]*(radius-depth)],'定位缺口');
  const floorLine=dynamicLine(g,M.green,.01),relation=dynamicLine(g,M.amber,.012),probe=ball(g,.06,M.green);
  machineBed(g,{length:4.9,y:-1.45,depth:2.05});
  saddle(g,-.65);saddle(g,.65);
  chuckX(g,-1.37,{face:1});chuckX(g,1.37,{face:-1});
  toolSpindle(wheel,{axis:'y',side:-1,r:.17});named(wheel,'notchContact');
  const carriage=box(g,.4,.3,.55,M.dark,[0,1.1,.8]);
  box(g,3.3,.16,.25,M.bright,[0,1.35,1.1]);
  for(const x of [-1.65,1.65])box(g,.13,2.7,.25,M.dark,[x,0,1.1]);
  const probeBody=opticalHead(g,[.8,1.1,.65],{r:.12});
  const probeRay=dynamicLine(g,M.green,.009);
  const toolMount=dynamicLine(g,M.dark,.085);
  segment(g,[.8,1.33,1.1],[.8,1.25,.65],.05,M.bright);
  return finish(g,beat,'orientation-groove-machining-and-recognition',p=>{
    const u=p['制作定位缺口'],front=mix(-length/2,length/2,u),r=radius-depth;
    direction.visible=active(p['确定晶向']);original.visible=u<1;
    original.material.clippingPlanes=u>1e-7&&u<1?[new T.Plane(v(1,0,0),-front)]:[];
    cut.visible=active(u);cut.material.clippingPlanes=u<1?[new T.Plane(v(-1,0,0),front)]:[];
    wheel.visible=u>0&&u<1;wheel.position.set(front,radial[1]*(r+.34),radial[2]*(r+.34));wheel.rotation.y=u*18;
    floor.visible=active(u);floor.position.x=Math.min(.8,front-.04);
    floorLine.visible=active(u);setSegment(floorLine,[-1.25,radial[1]*(r+.006),radial[2]*(r+.006)],
      [front,radial[1]*(r+.006),radial[2]*(r+.006)]);
    relation.visible=active(p['晶格方向']);
    setSegment(relation,[end*1.35,radial[1]*.95,radial[2]*.95],[.8,radial[1]*r,radial[2]*r]);
    probe.visible=active(p['识别参照']);probe.position.set(.8,radial[1]*(r+.3*(1-p['识别参照'])),radial[2]*(r+.3*(1-p['识别参照'])));
    carriage.position.x=front;carriage.visible=wheel.visible;
    toolMount.visible=wheel.visible;
    setSegment(toolMount,[front+.9,wheel.position.y,wheel.position.z],[front,1.1,.8]);
    probeBody.visible=probeRay.visible=probe.visible;
    setSegment(probeRay,[.8,.88,.65],probe.position.toArray());
    return {operation:'orientation-groove',grooveAxis:[1,0,0],grooveLength:length*u,notchDepth:depth,
      notchDepthExaggerated:true,crystalDirection:radial,noMillerIndexImplied:true,materialRemoval:u*depth};
  },[floor,direction],[
    label('定位缺口',floor,'制作定位缺口',[-100,-85]),label('晶向参照',direction,'确定晶向',[80,-80]),
  ],{span:7.1});
}
function multiwire(parent,beat){
  const g=group(parent),axis=group(g),r=.76,n=8,pitch=.25,gap=.04;axis.rotation.z=Math.PI/2;
  const stock=cyl(axis,r,n*pitch-gap,M.silicon),pieces=[];
  stock.material=M.silicon.clone();
  for(let i=0;i<n;i++)pieces.push(cyl(axis,r,pitch-gap,M.silicon.clone(),[0,(i-(n-1)/2)*pitch,0]));
  const web=group(g),beads=[];
  for(let i=0;i<n-1;i++){
    const x=-(i-(n-2)/2)*pitch;
    segment(web,[x,-1.8,-1.1],[x,-1.8,1.1],.009,M.bright);
    beads.push(ball(web,.025,M.green,[x,-1.8,-.8]));
  }
  for(const z of [-1.15,1.15]){const o=cyl(web,.15,2.4,M.dark,[0,-1.8,z]);o.rotation.z=Math.PI/2;}
  const wireTarget=target(web,[0,-1.8,.65],'多线切割');
  named(wireTarget,'wireWeb');
  machineBed(g,{length:4.6,y:-2.1,depth:3.15});
  for(const x of [-1.38,1.38]){
    for(const z of [-1.15,1.15])guideBearing(web,x,-1.8,z);
    box(g,.2,3.75,.24,M.dark,[x,-.15,-1.48]);
  }
  const feed=at(axis,[0,0,0]);
  // Local X becomes the vertical feed axis after the stock group's rotation.
  box(feed,.16,2.3,.42,M.ceramic,[.94,0,0]);
  box(feed,.45,2.6,.58,M.dark,[1.18,0,0]);
  const feedBridge=box(g,2.8,.22,.6,M.dark,[0,2.2,-.2]);
  const feedRam=dynamicLine(g,M.bright,.1);
  segment(g,[-1.38,2.2,-1.48],[-1.38,2.2,-.2],.1,M.dark);
  segment(g,[1.38,2.2,-1.48],[1.38,2.2,-.2],.1,M.dark);
  const webSupports=[];
  for(const x of [-1.38,1.38])for(const z of [-1.15,1.15]){
    webSupports.push({object:dynamicLine(g,M.dark,.075),x,z});
  }
  const rollerDrives=[];
  for(const z of [-1.15,1.15]){
    const rotor=axisCylinder(web,.2,.38,[1.66,-1.8,z],'x',M.dark);
    rollerDrives.push(rotor);
    for(let i=0;i<7;i++)axisCylinder(web,.157,.009,[(i-3)*pitch,-1.8,z],'x',M.bright);
  }
  for(let i=0;i<n-1;i++){
    const x=-(i-(n-2)/2)*pitch;
    tube(web,[[x,-1.8,-1.3],[x,-2.05,-1.15],[x,-2.05,1.15],[x,-1.8,1.3]],.007,M.dark);
  }
  const manifold=at(web,[0,-1.4,-1.05]);
  axisCylinder(manifold,.065,2.3,[0,0,0],'x',M.bright);
  const jets=Array.from({length:7},(_,i)=>segment(manifold,[(i-3)*.25,-.05,0],
    [(i-3)*.25,-.4,.45],.014,M.liquid));
  return finish(g,beat,'rod-feed-and-simultaneous-wire-cuts',p=>{
    const feed=p['送向'],run=p['运动的线网'],cut=p['同时加工许多平行切面'],front=mix(-r,r,cut);
    axis.position.y=mix(.6,0,feed);
    web.position.y=(1.8-r)*run+2*r*cut;
    setSegment(feedRam,[0,2.1,0],[0,axis.position.y+.95,0]);feedBridge.visible=true;
    webSupports.forEach(({object,x,z})=>setSegment(object,[x,-2,z],[x,web.position.y-2.1,z]));
    rollerDrives.forEach(o=>o.rotation.x=run*Math.PI*4);
    jets.forEach(o=>o.visible=active(run)||active(cut));
    beads.forEach((o,i)=>o.position.z=mix(-.8,.8,run)+(i%2)*.08);
    stock.visible=cut<1;stock.material.clippingPlanes=active(cut)?[new T.Plane(v(0,1,0),-front)]:[];
    pieces.forEach(o=>{o.visible=active(cut);o.material.clippingPlanes=cut<1?[new T.Plane(v(0,-1,0),front)]:[];});
    return {operation:'multiwire-overview',feed,wireMotion:run,cutFront:front,
      wireContactHeight:-1.8+web.position.y,cutFollowsWireContact:!active(cut)||
        Math.abs((-1.8+web.position.y)-(axis.position.y+front))<1e-6,
      simultaneousSections:n,pitch,gap,spacingExaggerated:true};
  },[wireTarget,pieces[0]],[label('运动线网',wireTarget,'运动的线网',[120,-70]),label('平行切面',pieces[0],'同时加工许多平行切面',[-100,-80])],
  {eye:[3,2.5,9],span:7.8});
}
function abrasiveCut(parent,beat){
  const g=group(parent),left=box(g,1.5,1.1,1.15,M.silicon,[-.82,-.4,0]),right=box(g,1.5,1.1,1.15,M.silicon,[.82,-.4,0]);
  const removed=box(g,.14,1.1,1.15,M.silicon,[0,-.4,0]);
  const wire=cyl(g,.075,2.9,M.bright,[0,1,0]);wire.rotation.x=Math.PI/2;
  const grains=Array.from({length:14},(_,i)=>ball(g,.105,M.ceramic,[0,1,-1.3+i*.2]));
  const chips=particles(g,12,M.silver,.035),diameter=bracket(g,[-.075,.65,1.1],[.075,.65,1.1]);
  const pitch=bracket(g,[-1.55,-1.2,.65],[1.55,-1.2,.65]);
  const contact=target(g,[0,.1,.6],'金刚线');
  named(contact,'grainContact');
  sectionSeat(g,{y:-1.02,width:3.1,depth:1.15});
  const rollerEnds=[-1.68,1.68].map(z=>{
    const o=axisCylinder(g,.21,.46,[0,1,z],'x',M.dark);
    axisCylinder(o,.11,.65,[0,0,0],'y',M.bright);return o;
  });
  const coolant=dynamicLine(g,M.liquid,.023);
  const delivery=tube(g,[[1.8,1.5,-.9],[.5,1.5,-.9],[.15,1.3,-.7]],.04,M.bright);
  box(g,.45,.28,.45,M.dark,[1.8,1.5,-.9]);
  const trough=openTank(g,{width:3.4,depth:1.65,height:.35,y:-1.43});
  const rollerPosts=rollerEnds.map((o,i)=>dynamicLine(g,M.dark,.075));
  const fluidLine=tube(g,[[1.8,1.5,-.9],[1.8,.4,-.9],[1.8,-1.3,-.9]],.04,M.dark);
  return finish(g,beat,'magnified-abrasive-grain-removal',p=>{
    const u=p['逐步去除硅'],y=mix(1,-.8,u);wire.position.y=y;
    grains.forEach((o,i)=>o.position.set(.025*Math.sin(i*2),y,(-1.3+i*.2+p['金刚线']*.18)));
    removed.scale.y=Math.max(.001,1-u);removed.position.y=-.95+.55*(1-u);
    chips.forEach((o,i)=>{o.visible=u>0;o.position.set(Math.sin(i*2.4)*u*.65,y-u*(i%4)*.12,.65+(i%3)*u*.15);});
    contact.position.y=y;diameter.g.visible=active(p['线径']);diameter.g.position.y=y-.65;
    rollerEnds.forEach(o=>{o.position.y=y;o.rotation.x=p['金刚线']*7;});
    rollerPosts.forEach((o,i)=>setSegment(o,[.34,-1.3,i?1.68:-1.68],[.34,y,i?1.68:-1.68]));
    fluidLine.visible=active(p['逐步去除硅']);
    delivery.visible=coolant.visible=active(p['逐步去除硅']);
    setSegment(coolant,[.15,1.3,-.7],[0,y,-.4]);trough.visible=true;
    pitch.g.visible=active(p['片间距']);
    return {operation:'abrasive-wire-closeup',removedDepth:1.1*u,grainContact:true,wireDiameterExaggerated:true,pitchExaggerated:true};
  },[contact,left],[label('金刚线',contact,'金刚线',[130,-85]),label('片间距示意',pitch.anchor,'片间距',[0,-80])],
  {eye:[2,2,10],span:7.6});
}
function kerfAccounting(parent,beat){
  const g=group(parent),solids=[],waste=[],n=5,w=.47,gap=.12;
  for(let i=0;i<n;i++){
    solids.push(box(g,w,.85,1.2,M.silicon,[(i-(n-1)/2)*(w+gap),.4,0]));
    if(i<n-1)waste.push(box(g,gap,.85,1.2,M.silicon.clone(),[(i-(n-2)/2)*(w+gap),.4,0]));
  }
  const original=bracket(g,[-1.45,1.2,.65],[1.45,1.2,.65]),tray=box(g,3.2,.1,1.5,M.dark,[0,-1.4,0]);
  const accounting=group(g);
  arrow(accounting,[-1.55,.3,.65],[-1.55,1.12,.65],M.green,.014);
  arrow(accounting,[1.6,-1.25,.65],[1.6,1.12,.65],M.amber,.014);
  const kerfTarget=target(waste[1],[0,.45,.61],'切缝材料');
  for(const x of [-1.64,1.64]){
    box(g,.12,.9,1.5,M.ceramic,[x,-.08,0]);
    box(g,.24,.12,1.55,M.dark,[x,-.6,0]);
  }
  box(g,3.4,.12,.3,M.dark,[0,-.6,-.65]);
  for(let i=0;i<n;i++)box(g,.07,.18,.28,M.ceramic,[(i-(n-1)/2)*(w+gap),-.18,-.65]);
  const collectionWalls=[-1.6,1.6].map(x=>box(g,.06,.3,1.5,M.ceramic,[x,-1.2,0]));
  recordPlate(tray,[0,-.06,.77],{w:.56,h:.16});
  return finish(g,beat,'product-plus-kerf-volume-accounting',p=>{
    const remove=p['消耗材料'],spread=p['切缝损耗'];
    waste.forEach((o,i)=>{
      o.material.color.copy(M.silicon.color).lerp(M.amber.color,p['切口']);
      o.position.y=mix(.4,-1.15,remove);o.position.z=remove*(i%2?.3:-.3);
    });
    solids.forEach((o,i)=>o.position.x=(i-(n-1)/2)*(w+gap+.08*spread));
    original.g.visible=accounting.visible=active(p['原料用量']);
    collectionWalls.forEach(o=>o.visible=active(remove));
    return {operation:'kerf-volume-conservation',solidPerPitch:w,removedPerPitch:gap,pitch:w+gap,
      productVolume:n*w*.85*1.2,kerfVolume:(n-1)*gap*.85*1.2,removedMaterialRetainedInTray:true};
  },[solids[2],kerfTarget],[label('成品薄片',solids[2],'切缝损耗',[0,-90]),label('切缝材料',kerfTarget,'消耗材料',[90,-80]),
    label('原料用量',original.anchor,'原料用量',[0,-75])],
  {span:7.6});
}
function asSawn(parent,beat){
  const g=group(parent),s=surface(g,{height:x=>.08*Math.cos(x*2)+.035*Math.cos(x*23),bottom:-.55});
  const reference=segment(g,[-1.5,.19,.63],[1.5,.19,.63],.012,M.green);
  const grooves=[];
  for(let i=0;i<13;i++){
    const x=-1.4+i*.22;grooves.push(segment(g,[x,s.height(x)+.008,-.5],[x,s.height(x)+.008,.5],.01,M.dark));
  }
  const damage=box(g,3,.13,.035,M.amber,[0,-.17,.62]),cracks=[];
  for(let i=0;i<10;i++){const x=-1.3+i*.29;cracks.push(segment(g,[x,-.08,.65],[x+.08,-.27,.65],.012,M.dark));}
  const sawTarget=s.anchor(.44,'锯痕'),damageTarget=target(damage,[.5,0,.025],'受损层');
  const next=arrow(g,[0,-1,.5],[0,-1.7,.5],M.green,.025);
  sectionSeat(g,{y:-.63,width:3,depth:1.2});
  const head=opticalHead(g,[0,1,.05],{r:.23});
  const opticalArm=dynamicLine(g,M.dark,.07);
  box(g,3.4,.12,.3,M.dark,[0,1.27,-.35]);
  for(const x of [-1.65,1.65])box(g,.14,2.1,.3,M.dark,[x,.15,-.35]);
  const sampleCradle=box(g,3.2,.15,1.45,M.dark,[0,-.92,0]);
  recordPlate(sampleCradle,[-1,-.01,.74],{w:.44,h:.12});
  return finish(g,beat,'as-sawn-damage-diagnosis-without-removal',p=>{
    reference.visible=active(p['不够平']);damage.visible=active(p['受损层']);cracks.forEach(o=>o.visible=active(p['受损层']));
    grooves.forEach(o=>o.material=active(p['锯痕'])?M.green:M.dark);next.visible=active(p['继续加工']);
    head.position.x=mix(-1.1,1.1,p['不够平']);
    setSegment(opticalArm,[head.position.x,1.26,-.35],[head.position.x,1.16,.05]);
    return {surfaceGeometryFixed:true,materialRemoval:0,sawGroovesRemain:true,damageLayerRemains:true,futureProcessingOnly:true};
  },[sawTarget,damageTarget],[label('锯痕',sawTarget,'锯痕',[-95,-75]),label('受损层',damageTarget,'受损层',[100,-75])],
  {eye:[2.4,2.5,10],look:[0,-.1,0],span:7.3});
}
function edgeRounding(parent,beat){
  const g=group(parent),bad=at(g,[0,1.2,0]),good=at(g,[0,-1.1,0]);
  box(bad,2.1,.24,.75,M.silicon,[-.2,0,0]);
  const shard=box(bad,.23,.19,.75,M.silver,[.965,0,0]),debris=particles(bad,6,M.silver,.025);
  const shape=new T.Shape();shape.moveTo(-1.2,-.16);shape.lineTo(.7,-.16);
  shape.quadraticCurveTo(1.12,-.16,1.12,0);shape.quadraticCurveTo(1.12,.16,.7,.16);shape.lineTo(-1.2,.16);shape.closePath();
  const geo=new T.ExtrudeGeometry(shape,{depth:.75,bevelEnabled:false});geo.translate(0,0,-.375);
  const rounded=new T.Mesh(geo,M.silicon);good.add(rounded);
  const pos=geo.attributes.position,original=pos.array.slice(),wheel=cyl(good,.4,.5,M.ceramic,[1.45,.5,0]);wheel.rotation.x=Math.PI/2;
  const edgeTarget=target(good,[1.12,0,.4],'边缘倒圆');
  sectionSeat(bad,{y:-.26,width:2,depth:.75});
  sectionSeat(good,{y:-.26,width:2,depth:.75});
  // Separate sharp-edge specimen and machining fixture; the chipped sample is never repaired.
  box(good,2.1,.22,.95,M.dark,[-.25,-.48,0]);
  box(good,.25,.75,.95,M.dark,[-1.12,-.14,0]);
  const spindle=toolSpindle(wheel,{axis:'y',side:-1,r:.19,length:.6});
  const wheelSlide=box(good,.5,.3,.48,M.dark,[1.45,.5,-.7]);
  const spindleMount=dynamicLine(good,M.dark,.085);
  const feedMount=dynamicLine(good,M.bright,.06);
  box(good,.15,1.7,.2,M.bright,[1.65,0,-.7]);
  const edgeWater=dynamicLine(good,M.liquid,.018);
  return finish(g,beat,'brittle-edge-example-versus-rounded-production-edge',p=>{
    shard.position.set(.965+.3*p['崩缺'],-.45*p['崩缺'],.12*p['崩缺']);
    debris.forEach((o,i)=>{o.visible=active(p['颗粒']);o.position.set(1.05+.08*i,-.3-p['颗粒']*.1*i,.2);});
    const u=p['加工成圆滑轮廓'];
    for(let i=0;i<pos.count;i++)if(original[i*3]>.69){
      pos.setX(i,mix(1.12,original[i*3],u));pos.setY(i,mix(Math.sign(original[i*3+1])*.16,original[i*3+1],u));
    }
    pos.needsUpdate=true;geo.computeVertexNormals();
    wheel.visible=u>0&&u<1;wheel.position.y=mix(.6,-.6,u);wheel.rotation.z=u*10;
    spindle.visible=wheel.visible;wheelSlide.position.y=wheel.position.y;wheelSlide.visible=wheel.visible;
    spindleMount.visible=feedMount.visible=wheel.visible;
    setSegment(spindleMount,[1.45,wheel.position.y,-1.05],[1.45,wheel.position.y,-.7]);
    setSegment(feedMount,[1.65,wheel.position.y,-.7],[1.45,wheel.position.y,-.7]);
    edgeWater.visible=wheel.visible;setSegment(edgeWater,[1.3,.8,-.4],[1.1,wheel.position.y,0]);
    return {comparisonSpecimensSeparate:true,sharpEdgeChipped:p['崩缺'],roundedEdge:u,edgeScaleExaggerated:true};
  },[edgeTarget,shard],[label('崩边示意',shard,'崩缺',[100,-80]),label('边缘倒圆',edgeTarget,'加工成圆滑轮廓',[-80,-80])],
  {look:[0,.1,0],span:7.7});
}
function doubleLapping(parent,beat){
  const g=group(parent),section=box(g,3,.5,1.25,M.silicon),pos=section.geometry.attributes.position,original=pos.array.slice();
  const top=box(g,3.3,.14,1.5,M.ceramic,[0,.55,0]),bottom=box(g,3.3,.14,1.5,M.ceramic,[0,-.55,0]);
  const gauge=bracket(g,[1.8,-.25,.65],[1.8,.25,.65]);
  const footprint=ring(g,1.65,M.green,[0,0,0]);
  const targetLimits=group(g);
  for(const y of [-.23,.23])segment(targetLimits,[1.62,y,.68],[1.95,y,.68],.012,M.amber);
  const lap=planetaryPlate(g,{r:1.62,y:-.77});lap.g.position.z=-.7;
  const upper=new T.Mesh(new T.CylinderGeometry(1.62,1.62,.16,64),M.dark);
  upper.position.set(0,1.03,-.7);g.add(upper);
  cyl(g,.18,.63,M.bright,[0,1.42,-.7]);
  box(g,3.55,.18,.5,M.dark,[0,1.83,-.7]);
  for(const x of [-1.75,1.75]){
    cyl(g,.1,2.9,M.bright,[x,.28,-.7]);
    box(g,.4,.3,.55,M.dark,[x,-1.28,-.7]);
  }
  cyl(g,1.7,.22,M.dark,[0,-1.03,-.7]);
  box(g,2.8,.38,2.2,M.dark,[0,-1.32,-.7]);
  const platenLinks=[-1.25,1.25].map(x=>({x,
    upper:dynamicLine(g,M.bright,.045),lower:dynamicLine(g,M.dark,.045)}));
  const slurry=tube(g,[[1.45,1.6,-.9],[1.3,.6,-.9],[.9,.4,-.8]],.04,M.bright);
  const drops=dynamicLine(g,M.liquid,.022);
  return finish(g,beat,'opposed-lapping-parallelism-and-thickness',p=>{
    const parallel=p['两面更平行'],thickness=p['厚度接近目标'],h=mix(.36,.23,thickness);
    for(let i=0;i<pos.count;i++){
      const x=original[i*3],sign=Math.sign(original[i*3+1]);
      pos.setY(i,sign*h+(sign>0?.10:-.07)*x*(1-parallel));
    }
    pos.needsUpdate=true;section.geometry.computeVertexNormals();
    top.position.set(.1*Math.sin(parallel*8),h+.1,0);bottom.position.set(-.1*Math.sin(parallel*8),-h-.1,0);
    top.rotation.z=.1*(1-parallel);bottom.rotation.z=-.07*(1-parallel);
    for(const link of platenLinks){
      const upperEnd=v(link.x,.07,-.48).applyQuaternion(top.quaternion).add(top.position);
      const lowerEnd=v(link.x,-.07,-.48).applyQuaternion(bottom.quaternion).add(bottom.position);
      setSegment(link.upper,[link.x,.95,-.48],upperEnd.toArray());
      setSegment(link.lower,[link.x,-.68,-.48],lowerEnd.toArray());
    }
    gauge.g.visible=targetLimits.visible=active(thickness);gauge.g.scale.y=h/.25;footprint.visible=active(p['整片几何']);
    lap.orbit.rotation.y=parallel*2;lap.carriers.forEach(o=>o.rotation.y=-parallel*5);
    upper.rotation.y=0;
    slurry.visible=drops.visible=active(parallel);setSegment(drops,[.9,.4,-.8],[.7,-.56,-.7]);
    return {materialRemoval:.26*thickness,parallelismError:.17*(1-parallel),sectionThickness:2*h,
      targetThickness:.46,bothFacesProcessed:true,upperAndLowerWorkingPlatesConnected:true};
  },[gauge.anchor,section],[label('厚度',gauge.anchor,'厚度接近目标',[-90,-65]),label('两面平行度',section,'两面更平行',[0,-115])],
  {span:7.7});
}
function chemicalEtching(parent,beat){
  const g=group(parent),body=box(g,3,.4,1.3,M.silicon,[0,-.2,0]);
  const shells=[box(g,3,.13,1.3,M.amber,[0,.065,0]),box(g,3,.13,1.3,M.amber,[0,-.465,0])];
  const cracks=Array.from({length:12},(_,i)=>segment(g,[(i%6-2.5)*.45,i<6?.11:-.51,.66],
    [(i%6-2.5)*.45+.06,i<6?.015:-.415,.66],.012,M.dark));
  const bath=box(g,3.6,.95,1.8,M.liquid,[0,-.15,0]),removed=particles(g,14,M.amber,.035);
  const damageTarget=target(shells[0],[.7,0,.66],'受损层');
  openTank(g,{width:3.65,depth:1.9,height:1.35,y:-.28});
  for(const x of [-1.55,1.55]){
    box(g,.08,1.55,.12,M.ceramic,[x,.05,-.35]);
    box(g,.25,.08,.8,M.ceramic,[x,-.57,0]);
  }
  box(g,3.3,.12,.18,M.dark,[0,.87,-.35]);
  const hanger=box(g,.22,.6,.18,M.bright,[0,1.2,-.35]);
  box(g,3.7,.16,.4,M.dark,[0,1.58,-.35]);
  for(const x of [-1.9,1.9])box(g,.16,2.9,.4,M.dark,[x,.05,-.35]);
  const processHood=context(g,'etch-exhaust-context');
  box(processHood,4,.35,1.9,M.dark,[0,2.1,-.6]);
  tube(processHood,[[0,2.25,-.6],[0,2.75,-.6],[1.5,2.75,-.6]],.17,M.dark);
  return finish(g,beat,'chemical-removal-of-damaged-shells',p=>{
    bath.visible=active(p['化学蚀刻']);
    hanger.visible=active(p['化学蚀刻']);
    const u=.75*p['移除一定材料']+.25*p['去掉受损层'];
    shells.forEach((o,i)=>{o.scale.y=Math.max(.001,1-u);o.position.y=i?-.4-.065*(1-u):.065*(1-u);o.visible=u<1;});
    cracks.forEach(o=>{o.visible=p['留下损伤']>0&&u<1;o.scale.y=Math.max(.001,1-u);});
    removed.forEach((o,i)=>{o.visible=active(u);o.position.set((i%7-3)*.4,(i<7?.25:-.65)+u*.1,Math.sin(i)*.55);});
    return {chemicalEtch:true,removedTopDepth:.13*u,removedBottomDepth:.13*u,
      substrateGeometryFixed:true,damagedLayerRemaining:.13*(1-u),flattening:false};
  },[bath,body],[label('受损层',damageTarget,'留下损伤',[90,-85]),label('化学蚀刻',bath,'化学蚀刻',[-130,-85])],
  {span:7.9});
}
function cmpContact(parent,beat){
  const g=group(parent),s=surface(g,{height:x=>.08+.025*Math.cos(x*9),bottom:-.5});
  const pad=new T.Mesh(new T.CylinderGeometry(1,1,.22,64,1,false,Math.PI/2,Math.PI),M.ceramic);
  g.add(pad);pad.position.y=1;
  box(pad,2,.22,.006,M.ceramic);
  pad.userData.section='front half removed to expose slurry and contact';
  const reaction=box(g,2.8,.035,1,M.amber,[0,.12,0]);
  const nozzle=tube(g,[[1.7,1.2,0],[1.7,.8,0],[.9,.65,0]],.04),drops=particles(g,12,M.liquid,.035),chips=particles(g,10,M.silver,.028);
  const slurryStream=dynamicLine(g,M.liquid,.018);
  const face=s.anchor(.7,'化学作用区');
  sectionSeat(g,{y:-.59,width:3,depth:1.2});
  toolSpindle(pad,{axis:'y',side:1,r:.27,length:.5});
  const headArm=box(g,2.4,.18,.45,M.dark,[.2,1.9,-.65]);
  box(g,.3,2.7,.45,M.dark,[1.3,.45,-.65]);
  const pressureRam=dynamicLine(g,M.bright,.1);
  const ramMount=dynamicLine(g,M.dark,.1);
  const reservoir=at(g,[1.7,1.55,-.7]);cyl(reservoir,.22,.45,M.ceramic);
  tube(g,[[1.7,1.4,-.7],[1.7,1.2,-.7],[1.7,1.2,0]],.035,M.dark);
  const platen=cyl(g,1.6,.18,M.dark,[0,-.82,0]);
  cyl(g,.27,.42,M.bright,[0,-1.12,0]);box(g,2.3,.28,1.9,M.dark,[0,-1.47,0]);
  for(let i=0;i<5;i++){
    const groove=new T.Mesh(new T.TorusGeometry(.25+i*.15,.008,8,48,Math.PI),M.dark);
    groove.rotation.x=-Math.PI/2;groove.position.y=-.112;pad.add(groove);
  }
  return finish(g,beat,'pad-slurry-reaction-and-material-transport',p=>{
    pad.position.y=mix(1,.23,p['抛光垫']);pad.position.x=mix(-.5,.5,p['移走材料']);
    setSegment(pressureRam,[pad.position.x,1.8,0],[pad.position.x,pad.position.y+.9,0]);
    setSegment(ramMount,[pad.position.x,1.86,-.65],[pad.position.x,1.8,0]);
    headArm.visible=true;platen.rotation.y=-p['移走材料']*3;
    const slurry=p['抛光液'],outlet=v(.9,.65,.025),
      landing=v(pad.position.x+.7,.108,.05);
    nozzle.visible=slurryStream.visible=active(slurry);
    setSegment(slurryStream,outlet.toArray(),outlet.clone().lerp(landing,Math.max(.001,slurry)).toArray());
    drops.forEach((o,i)=>{
      const fraction=(i+.5)/drops.length;
      o.visible=active(slurry)&&fraction<=slurry;
      o.position.copy(outlet).lerp(landing,fraction);
    });
    reaction.visible=active(p['化学作用']);reaction.scale.y=Math.max(.001,1-p['移走材料']);
    chips.forEach((o,i)=>{o.visible=active(p['移走材料']);o.position.set(mix(.2,1.7,p['移走材料']),.17+(i%3)*.04,(i%5-2)*.19);});
    return {padContact:p['抛光垫']===1,slurry,surfaceReaction:p['化学作用'],
      removedMaterial:p['移走材料'],slurryFromOutletToContact:true,
      contactSectionExposed:true,contactSchematic:true};
  },[face,pad],[label('抛光垫',pad,'抛光垫',[-130,-90]),label('化学作用区',face,'化学作用',[130,-75])],
  {look:[0,.3,0],span:7.8});
}
function asperityPolish(parent,beat){
  const g=group(parent),height=x=>.04+.2*(.5+.5*Math.cos(x*7))**3,s=surface(g,{height,bottom:-.35});
  const pad=box(g,2.2,.22,1,M.ceramic,[0,.38,0]),load=arrow(g,[0,1.7,0],[0,.65,0],M.amber,.03);
  const nozzle=tube(g,[[1.7,1.2,0],[1.7,.7,.65],[1,.45,.65]],.045),drops=particles(g,9,M.liquid,.035);
  const slurryStream=dynamicLine(g,M.liquid,.022);
  const peak=target(g,[0,.24,.62],'表面突起');
  const result=bracket(g,[-1.4,-.6,.7],[1.4,-.6,.7]);
  const conditions=[arrow(g,[-1.5,.4,.7],[-1.5,-.4,.7],M.green,.014),
    arrow(g,[0,-.36,.7],[0,-.5,.7],M.green,.014),
    arrow(g,[1.5,.4,.7],[1.5,-.4,.7],M.green,.014)];
  sectionSeat(g,{y:-.43,width:3,depth:1.2});
  const carrierHead=at(pad,[0,.28,0]);box(carrierHead,2,.3,1.2,M.dark);
  cyl(carrierHead,.18,.45,M.bright,[0,.37,0]);
  const normalRam=dynamicLine(g,M.bright,.12);
  const loadSlide=dynamicLine(g,M.dark,.09);
  box(g,3.5,.16,.45,M.dark,[0,1.75,-.55]);
  for(const x of [-1.65,1.65])box(g,.2,2.25,.45,M.dark,[x,.55,-.55]);
  for(let i=0;i<6;i++)box(pad,.018,.025,.85,M.dark,[(i-2.5)*.32,-.113,0]);
  const supplyValve=axisCylinder(g,.1,.22,[1.7,1.2,-.12],'z',M.dark);
  const dial=axisCylinder(supplyValve,.075,.05,[0,0,.14],'z',M.ceramic);
  segment(dial,[0,0,.03],[.045,.025,.03],.007,M.green);
  return finish(g,beat,'asperity-removal-and-three-process-variables',p=>{
    const u=p['突起逐渐被削低'];
    s.deform(x=>mix(height(x),Math.min(height(x),.07),u));peak.position.y=mix(.24,.07,u);
    pad.position.set(mix(-.4,.4,p['运动']),mix(.38,.2,u),0);load.visible=active(p['压力']);
    setSegment(normalRam,[pad.position.x,1.7,0],[pad.position.x,pad.position.y+.85,0]);
    setSegment(loadSlide,[pad.position.x,1.74,-.55],[pad.position.x,1.7,0]);
    const supply=p['供液'],outlet=v(1,.45,.65),landing=v(pad.position.x+.75,.10,.56);
    nozzle.visible=slurryStream.visible=active(supply);
    setSegment(slurryStream,outlet.toArray(),outlet.clone().lerp(landing,Math.max(.001,supply)).toArray());
    drops.forEach((o,i)=>{
      const fraction=(i+.5)/drops.length;o.visible=active(supply)&&fraction<=supply;
      o.position.copy(outlet).lerp(landing,fraction);
    });
    const values=[p['压力'],p['运动'],p['供液']];
    conditions.forEach((o,i)=>o.visible=active(values[i]));result.g.visible=values.every(active);
    return {asperityHeight:.2*(1-u)+.03,materialRemovedFromPeaks:true,pressure:p['压力'],relativeMotion:p['运动'],slurrySupply:p['供液'],
      jointConditions:values.every(active),slurryContactMarginVisible:true};
  },[peak,pad],[label('表面突起',peak,'突起逐渐被削低',[110,-75]),label('供液',nozzle,'供液',[110,-85]),
    label('加工结果',result.anchor,'供液',[0,-65])],
  {look:[0,.4,0],span:7.5});
}
function finalPolish(parent,beat){
  const g=group(parent),section=box(g,2.4,.2,1.1,M.silicon,[0,.8,0]);
  const pads=[box(g,2.7,.13,1.3,M.ceramic,[0,1.15,0]),box(g,2.7,.13,1.3,M.ceramic,[0,.45,0])];
  const fine=cyl(g,.35,.14,M.ceramic,[0,1.35,0]),w=wafer(g,1.25,[0,-1.1,0]);w.g.rotation.x=.25;
  const gauge=box(g,.35,.25,.35,M.dark,[-1,-.1,0]),beam=dynamicLine(g,M.green,.012),spot=target(w.g,[0,.02,0],'测量点');
  pads.forEach((o,i)=>toolSpindle(o,{axis:'y',side:i?-1:1,r:.2,length:.3}));
  toolSpindle(fine,{axis:'y',side:1,r:.14,length:.34});
  for(const x of [-1.6,1.6])box(g,.14,1.75,.4,M.dark,[x,1,-.4]);
  box(g,3.3,.16,.4,M.dark,[0,1.94,-.4]);
  const supply=tube(g,[[1.5,1.7,-.3],[1.15,1.6,-.3],[.85,1.05,0]],.035,M.bright);
  const supplyFlow=dynamicLine(g,M.liquid,.018);
  const gaugeRail=box(g,2.8,.1,.24,M.bright,[0,.12,-.4]);
  for(const x of [-1.4,1.4])box(g,.1,1.2,.24,M.dark,[x,-.43,-.4]);
  edgeNest(w.g,1.22,-.025);
  opticalHead(gauge,[0,-.2,0],{r:.1});
  const gaugeArm=dynamicLine(g,M.dark,.055),fineMount=dynamicLine(g,M.dark,.065);
  const padMounts=pads.map(()=>dynamicLine(g,M.dark,.075));
  return finish(g,beat,'double-polish-fine-pass-and-independent-metrology',p=>{
    pads.forEach((o,i)=>{o.position.x=(i?-1:1)*.25*Math.sin(p['双面抛光']*6);o.visible=p['精抛']<1;});
    fine.visible=active(p['精抛']);fine.position.x=mix(-.9,.9,p['精抛']);fine.position.y=1.02;
    padMounts.forEach((o,i)=>{
      o.visible=pads[i].visible;
      setSegment(o,i?[1.6,.02,-.4]:[pads[i].position.x,1.85,-.4],
        [pads[i].position.x,i?.02:1.7,0]);
    });
    fineMount.visible=fine.visible;setSegment(fineMount,[fine.position.x,1.87,-.4],[fine.position.x,1.6,0]);
    supply.visible=supplyFlow.visible=p['镜面反光']<1;
    setSegment(supplyFlow,[.85,1.05,0],[.65,.93,0]);
    gaugeRail.visible=active(p['实际测量']);
    w.g.rotation.y=mix(-.3,.4,p['镜面反光']);
    const x=mix(-1,1,p['实际测量']);gauge.visible=beam.visible=active(p['实际测量']);gauge.position.x=x;
    gaugeArm.visible=gauge.visible;setSegment(gaugeArm,[x,.12,-.4],[x,.025,0]);
    setSegment(beam,[x,-.25,0],[x,-1.05,0]);spot.position.x=x;
    return {doubleSidedTreatment:true,finePass:p['精抛'],mirrorAppearance:p['镜面反光'],measurement:p['实际测量'],measurementDoesNotChangeSurface:true};
  },[section,spot],[label('精抛',fine,'精抛',[90,-80]),label('实际测量',spot,'实际测量',[100,-75])],
  {span:8.3});
}
function scaleComparison(parent,beat){
  const g=group(parent),whole=at(g,[0,1.7,0]),local=at(g,[0,0,0]),micro=at(g,[0,-1.6,0]);
  const bow=surface(whole,{length:2.8,depth:1.1,bottom:-.25,height:x=>.12*x*x-.12});
  const patch=surface(local,{length:2,depth:.85,bottom:-.22,height:x=>.055*Math.cos(x*4)});
  const rough=surface(micro,{length:2.8,depth:.75,bottom:-.25,height:x=>.1*Math.cos(x*24)+.025*Math.cos(x*41)});
  const refs=[segment(whole,[-1.4,.25,.6],[1.4,.25,.6],.012,M.green),
    bracket(local,[-.9,.15,.5],[.9,.15,.5]).g,segment(micro,[-1.4,.18,.45],[1.4,.18,.45],.012,M.green)];
  sectionSeat(whole,{y:-.33,width:2.8,depth:1.1});
  sectionSeat(local,{y:-.30,width:2,depth:.85});
  sectionSeat(micro,{y:-.33,width:2.8,depth:.75});
  const window=ring(whole,.25,M.amber,[.3,.19,.15],.012);
  const localWindow=box(local,.5,.012,.4,M.glass,[.15,.13,.2]);
  const objective=opticalHead(micro,[.35,.55,0],{r:.13});
  const cantilever=segment(micro,[-.45,.25,.2],[.12,.18,.2],.023,M.bright);
  segment(micro,[.12,.18,.2],[.13,.04,.2],.012,M.bright);
  const microFrame=at(micro,[-1.5,0,-.35]);
  box(microFrame,.1,1,.2,M.dark,[0,.16,0]);box(microFrame,1.95,.1,.2,M.dark,[.92,.7,0]);
  segment(micro,[.35,.7,-.35],[.35,.7,0],.04,M.bright);
  segment(micro,[-1.45,.42,-.35],[-.45,.25,.2],.045,M.dark);
  return finish(g,beat,'global-bow-local-flatness-micro-roughness',p=>{
    refs[0].visible=active(p['整片翘曲']);refs[1].visible=active(p['局部平坦度']);refs[2].visible=active(p['微观粗糙度']);
    window.visible=active(p['局部平坦度']);localWindow.visible=active(p['微观粗糙度']);
    objective.visible=cantilever.visible=active(p['微观粗糙度']);
    return {surfaceGeometryFixed:true,materialRemoval:0,scales:['whole-wafer','local-area','microscopic'],
      heightExaggerated:true,oneNumericScaleWouldBeInvalid:true};
  },[bow.mesh,rough.mesh],[
    label('整片翘曲',bow.anchor(.6),'整片翘曲',[100,-75]),label('局部平坦度',patch.anchor(.4),'局部平坦度',[-110,-75]),
    label('微观粗糙度',rough.anchor(.35),'微观粗糙度',[100,-75]),
  ],{eye:[1.6,2,10],span:8.5});
}
function opticalFocus(parent,beat){
  const g=group(parent),height=x=>.22*Math.cos(x*2.8),s=surface(g,{height,bottom:-.4});
  const plane=box(g,3.3,.012,1.4,M.glass),edge=segment(g,[-1.6,0,.75],[1.6,0,.75],.012,M.green);
  const lens=cyl(g,.36,.17,M.ceramic,[0,1.9,0]),beams=[dynamicLine(g,M.green,.012),dynamicLine(g,M.green,.012)];
  const spot=ball(g,.06,M.green),errors=[bracket(g,[0,0,.78],[0,height(0),.78]),bracket(g,[1.1,0,.78],[1.1,height(1.1),.78])];
  const focus=target(g,[0,0,.75],'焦平面');
  sectionSeat(g,{y:-.49,width:3,depth:1.2});
  box(g,3.5,.24,1.75,M.dark,[0,-.82,0]);
  for(const x of [-1.8,1.8])box(g,.18,3.45,.5,M.dark,[x,.74,-.7]);
  box(g,3.78,.2,.5,M.dark,[0,2.56,-.7]);
  const optics=at(lens,[0,.35,0]);
  cyl(optics,.4,.4,M.dark);ring(optics,.34,M.bright,[0,.21,0],.025);
  cyl(optics,.28,.1,M.glass,[0,-.23,0]);
  box(optics,.85,.08,.75,M.ceramic,[0,.4,0]);
  const reticle=box(optics,.6,.018,.52,M.amber,[0,.35,0]);
  for(let i=0;i<4;i++)box(reticle,.055,.02,.42,M.dark,[(i-1.5)*.12,.018,0]);
  const lensMount=dynamicLine(g,M.dark,.085);
  return finish(g,beat,'fixed-focal-plane-versus-unequal-heights',p=>{
    const optical=p['光刻需要清楚成像'],high=p['有些地方高'],low=p['有些地方低'];
    const x=mix(-.5,0,high)+1.1*low,h=height(x);
    plane.visible=edge.visible=lens.visible=active(optical);beams.forEach((o,i)=>{
      o.visible=active(optical);const a=i?.3:-.3;
      setSegment(o,[x+a,1.8,0],[x+a*h/1.8,h,0]);
    });
    lens.position.x=x;spot.visible=active(optical);
    lensMount.visible=active(optical);
    setSegment(lensMount,[x,2.55,-.7],[x,2.5,0]);
    spot.position.set(x,h+.018,0);spot.scale.set(.045+Math.abs(h)*.6,.025,.045+Math.abs(h)*.6);
    focus.position.x=x;errors.forEach(o=>o.g.visible=active(p['同时处在合适的焦点']));
    return {surfaceGeometryFixed:true,surfaceAmplitude:.22,focalPlaneY:0,probeX:x,surfaceHeight:h,focusError:h,
      heightExaggerated:true,qualitativeOptics:true,materialRemoval:0};
  },[focus,spot],[label('焦平面',focus,'光刻需要清楚成像',[-120,-75]),label('表面高度差',errors[0].anchor,'同时处在合适的焦点',[90,-90])],
  {look:[0,.65,0],span:7.7});
}
function productTolerance(parent,beat){
  const g=group(parent),samples=[],limits=[],targets=[];
  for(let i=0;i<2;i++){
    const row=at(g,[0,1.2-i*2.1,0]),s=surface(row,{length:2.6,depth:.8,bottom:-.24,height:x=>.13*Math.cos(x*3)});
    samples.push(s);targets.push(s.anchor(.35));
    sectionSeat(row,{y:-.32,width:2.6,depth:.8});
    recordPlate(row,[-1.2,-.42,.47],{w:.38,h:.17});
    const band=group(row),half=i?.11:.22;
    for(const y of [-half,half])segment(band,[-1.4,y,.5],[1.4,y,.5],.013,i?M.amber:M.green);
    limits.push(band);
  }
  const downstream=group(g);cyl(downstream,.3,.15,M.ceramic,[0,-2.15,0]);
  const link=arrow(g,[1.2,-1.2,0],[1.2,-2.2,0],M.green,.02);
  opticalHead(downstream,[0,-2.05,0],{r:.26});
  const targetStage=vacuumStage(downstream,{r:.6,y:-2.67});
  const downstreamFrame=box(downstream,.12,1.15,.25,M.dark,[-.7,-2.27,-.45]);
  box(downstream,1.4,.1,.25,M.dark,[0,-1.7,-.45]);
  targetStage.userData.specificationFixture=true;downstreamFrame.name='downstream-optics-frame';
  return finish(g,beat,'identical-surfaces-different-product-specifications',p=>{
    limits[0].visible=active(p['容许多少起伏']);limits[1].visible=active(p['器件和产品规格']);
    downstream.visible=link.visible=active(p['下一阶段的加工']);
    return {surfaceGeometryFixed:true,identicalProfiles:true,toleranceExamples:[.22,.11],
      numericUnitsNotImplied:true,productDependent:true,materialRemoval:0};
  },targets,[label('产品规格示意',targets[1],'器件和产品规格',[100,-80])],{span:8.2});
}
function contamination(parent,beat){
  const g=group(parent),rows=[],objects=[],collectors=[];
  for(let i=0;i<3;i++){
    const row=at(g,[0,1.8-i*1.8,0]);box(row,2.2,.12,.9,M.silicon);
    rows.push(row);collectors.push(box(row,.45,.3,.55,M.glass,[1.5,-.2,0]));
    openTank(row,{width:2.5,depth:1.2,height:.65,y:-.42});
    for(const x of [-1.07,1.07])box(row,.1,.28,.8,M.ceramic,[x,-.1,0]);
    const supply=axisCylinder(row,.06,.8,[-.5,.65,-.4],'x',M.bright);
    box(row,.22,.36,.2,M.dark,[-1.15,.57,-.4]);
    tube(row,[[-1.15,.5,-.4],[-1,.65,-.4],[-.9,.65,-.4]],.03,M.dark);
    box(row,.1,.9,.18,M.dark,[-1.15,.08,-.4]);
    if(i===0){
      // Megasonic transducer below the particle bath; no face-contact scrubber.
      box(row,1.7,.1,.65,M.bright,[0,-.82,0]);
      for(let j=0;j<3;j++)ring(row,.16+j*.15,M.glass,[0,-.08,0],.008);
    }
    if(i===1)box(row,1.9,.06,.9,M.liquid,[0,-.1,0]);
    if(i===2)for(let j=0;j<3;j++)cyl(row,.045,.24,M.ceramic,[(j-1)*.6,-.67,-.35]);
    supply.userData.treatment=['particle-release','film-removal','metal-removal'][i];
  }
  const grains=particles(rows[0],8,M.ceramic,.07),film=box(rows[1],1.5,.045,.7,M.amber,[0,.1,0]);
  const ions=particles(rows[2],7,M.amber,.04);objects.push(grains[3],film,ions[3]);
  const routes=rows.map(row=>arrow(row,[.7,.22,.2],[1.35,-.02,.2],M.green,.018));
  return finish(g,beat,'three-contaminant-types-and-distinct-removal-paths',p=>{
    const u=p['清洗'],finish=p['分别解决'];
    grains.forEach((o,i)=>{o.visible=active(p['磨粒']);o.position.set((i%4-1.5)*.3+u*1.5,.12-u*.2,(i%2-.5)*.4);});
    film.visible=active(p['有机残留'])&&u<.995;film.scale.set(Math.max(.001,1-u),Math.max(.001,1-u),1);
    ions.forEach((o,i)=>{o.visible=active(p['金属污染']);o.position.set((i%4-1.5)*.3+u*1.3,.13-u*.35,(i%2-.5)*.3);});
    routes.forEach(o=>o.visible=active(u));collectors.forEach(o=>o.visible=active(finish));
    return {contaminantTypes:['abrasive-particles','organic-film','metal-sites'],distinctTreatmentPaths:true,
      particlesRemoved:u,filmDissolved:u,metalSitesTransported:u,scaleSchematic:true};
  },objects.slice(0,2),[
    label('磨粒',objects[0],'磨粒',[110,-75]),label('有机残留',objects[1],'有机残留',[-110,-75]),
    label('金属污染',objects[2],'金属污染',[110,-75]),
  ],{eye:[1.2,3,10],span:8.8});
}
function rinseDry(parent,beat){
  const g=group(parent),w=wafer(g,1.3),film=cyl(g,1.28,.025,M.liquid,[0,.03,0]);
  const nozzle=tube(g,[[-1.7,1.5,0],[-.9,1.5,0],[-.5,1.1,0]],.045),water=dynamicLine(g,M.liquid,.035);
  const drain=box(g,3.1,.25,1.9,M.dark,[0,-.5,0]),residue=particles(g,12,M.amber,.035);
  const air=Array.from({length:3},(_,i)=>arrow(g,[-.8+i*.8,1.2,.2],[-.8+i*.8,.35,.2],M.green,.018));
  const boundary=ring(g,1.46,M.green,[0,.03,0]);
  const spindle=vacuumStage(g,{r:.5,y:-.058});
  // A sectioned catch bowl routes used rinse below the clean wafer.
  for(const x of [-1.58,1.58])box(g,.07,.62,2,M.ceramic,[x,-.23,0]);
  box(g,3.2,.62,.07,M.ceramic,[0,-.23,-1.01]);
  tube(g,[[0,-.65,-.55],[0,-.95,-.55],[1,-.95,-.55]],.07,M.dark);
  box(g,1.1,.42,.7,M.dark,[1.05,-1.13,-.55]);
  const purityFilter=axisCylinder(nozzle,.11,.38,[-1.72,1.5,-.24],'z',M.ceramic);
  tube(nozzle,[[-1.7,1.5,0],[-1.9,1.5,-.25],[-1.9,.65,-.65]],.035,M.bright);
  const gasManifold=axisCylinder(g,.065,2.2,[0,1.45,.2],'x',M.bright);
  const gasTips=air.map((_,i)=>cyl(g,.055,.2,M.ceramic,[-.8+i*.8,1.31,.2]));
  box(g,.2,1.6,.3,M.dark,[-1.2,.7,-.4]);
  segment(g,[-1.2,1.45,-.4],[-1.1,1.45,.2],.05,M.bright);
  return finish(g,beat,'high-purity-rinse-then-liquid-removal',p=>{
    const rinse=p['高纯水漂洗'],dry=p['干燥'];
    nozzle.visible=water.visible=rinse>0&&!active(dry);setSegment(water,[-.5,1.1,0],[0,.04,0]);
    w.g.rotation.y=dry*8;film.visible=dry<1;film.scale.y=Math.max(.001,1-dry);film.scale.x=film.scale.z=1+.15*dry;
    residue.forEach((o,i)=>o.position.set((i%4-1.5)*.4, mix(.07,-.32,rinse),(i%3-1)*.35));
    air.forEach(o=>o.visible=active(dry));boundary.visible=active(p['避免新的残留']);
    gasManifold.visible=active(dry);gasTips.forEach(o=>o.visible=active(dry));
    spindle.rotation.y=dry*8;purityFilter.visible=true;
    drain.material=active(p['去掉旧污染'])?M.green:M.dark;
    return {rinseProgress:rinse,dryProgress:dry,waterFilmRemaining:1-dry,usedWaterIsolated:true,
      oldResidueInDrain:p['去掉旧污染'],newResidueAvoidance:p['避免新的残留']};
  },[w.g,drain],[label('高纯水漂洗',nozzle,'高纯水漂洗',[0,-100]),label('干燥',air[1],'干燥',[100,-75])],
  {eye:[2.6,4.5,10],span:7.8});
}
function cleanHandling(parent,beat){
  const g=group(parent),moving=group(g),w=wafer(moving,1.2),grips=[];
  for(const sign of [-1,1])grips.push(box(moving,.16,.18,.5,M.ceramic,[sign*1.4,0,0]));
  const air=Array.from({length:4},(_,i)=>arrow(g,[-1.2+i*.8,1.8,0],[-1.2+i*.8,.6,0],M.green,.015));
  box(g,3,.13,1.5,M.ceramic,[0,1.95,0]);
  const enclosure=group(g);box(enclosure,3.2,.12,2,M.dark,[0,-.5,0]);
  for(const x of [-1.55,1.55])box(enclosure,.08,2,2,M.glass,[x,.4,0]);
  const face=target(w.g,[.4,.025,.4],'清洁表面');
  const endEffector=at(moving,[0,-.28,0]);
  box(endEffector,2.45,.1,.2,M.dark,[0,0,-.55]);
  for(const x of [-1.2,1.2])segment(endEffector,[x,0,-.55],[x,.2,0],.045,M.bright);
  segment(endEffector,[0,-.08,-.55],[0,-.08,-1.5],.1,M.dark);
  const robot=at(g,[0,-.8,-1.6]);
  cyl(robot,.3,.45,M.dark);box(robot,.2,.8,.25,M.ceramic,[0,.45,0]);
  const wrist=dynamicLine(g,M.bright,.085);
  filterHousing(g,[0,2.17,0],3);
  for(const x of [-1.65,1.65])box(g,.12,3,.15,M.dark,[x,.55,-.95]);
  const receiver=edgeNest(g,1.2,-.035);
  segment(g,[-1.65,2.17,-.75],[-1.35,2.17,-.75],.07,M.dark);
  segment(g,[1.65,2.17,-.75],[1.35,2.17,-.75],.07,M.dark);
  const gripLinks=grips.map(()=>dynamicLine(moving,M.bright,.045));
  return finish(g,beat,'edge-only-handling-filtered-air-and-protection',p=>{
    grips.forEach((o,i)=>o.position.x=(i?1:-1)*mix(1.4,1.2,p['夹具']));
    air.forEach(o=>o.visible=active(p['空气']));enclosure.visible=active(p['包装']);
    moving.position.z=mix(.7,-.4,p['每一次接触']);
    setSegment(wrist,[0,-.08,-1.6],[0,-.36,moving.position.z-1.5]);
    endEffector.visible=active(p['夹具']);receiver.visible=p['每一次接触']===1;
    gripLinks.forEach((o,i)=>{
      const x=grips[i].position.x;setSegment(o,[x,0,0],[i?1.2:-1.2,-.28,-.55]);o.visible=endEffector.visible;
    });
    return {edgeContactOnly:true,faceContact:false,filteredAir:p['空气'],enclosure:p['包装'],
      cleanSurfaceRetained:true,transfer:p['每一次接触'],washing:false};
  },[grips[1],face],[label('边缘夹持',grips[1],'夹具',[100,-75]),label('清洁表面',face,'清洁表面能否保住',[-100,-80])],
  {eye:[2.3,3,10],look:[0,.5,0],span:8});
}
function inspectionTypes(parent,beat){
  const g=group(parent),specimens=[],instruments=[],targets=[],phrases=['颗粒','缺陷','厚度','平整度','电学性质'];
  for(let i=0;i<5;i++){
    const row=at(g,[i%2?.9:-.9,1.7-Math.floor(i/2)*1.6,0]);
    const pit=i===1?surface(row,{length:1.25,depth:.7,bottom:-.14,
      height:x=>.07-.15*Math.max(0,1-Math.abs(x-.2)/.18)}):null;
    const sample=pit?.mesh||box(row,1.25,.14,.7,M.silicon);
    specimens.push(sample);
    sectionSeat(row,{y:-.22,width:1.25,depth:.7});
    const post=box(row,.09,.95,.17,M.dark,[-.74,.15,-.4]);
    if(i!==2)box(row,1.4,.09,.17,M.dark,[-.08,.66,-.4]);
    if(i===0){
      targets.push(ball(row,.065,M.amber,[.2,.14,.1]));
      instruments.push(segment(row,[0,.8,0],[.2,.18,.1],.012,M.green));
      opticalHead(row,[0,.9,0],{r:.12});
      segment(row,[-.7,.66,-.4],[0,1.04,0],.035,M.dark);
    }
    if(i===1){
      targets.push(pit.anchor(.2,'表面缺陷'));
      const inspection=group(row);
      segment(inspection,[-.25,.65,.4],[.2,-.08,.4],.012,M.amber);
      segment(inspection,[.2,-.08,.4],[.5,.55,.4],.012,M.amber);
      instruments.push(inspection);
      opticalHead(inspection,[-.25,.76,.4],{r:.11});
      opticalHead(inspection,[.5,.65,.4],{r:.1});
      segment(inspection,[-.7,.66,-.4],[-.25,.89,.4],.035,M.dark);
      segment(inspection,[-.25,.89,.4],[.5,.78,.4],.035,M.dark);
    }
    if(i===2){
      const gauge=bracket(row,[.75,-.1,0],[.75,.1,0]);instruments.push(gauge.g);targets.push(gauge.anchor);
      for(const y of [-.35,.35])opticalHead(row,[0,y,0],{r:.13});
      box(row,.1,.9,.3,M.dark,[-.8,0,-.35]);
      for(const y of [-.5,.5])box(row,.9,.1,.3,M.dark,[-.4,y,-.35]);
      for(const y of [-.5,.5])segment(row,[0,y,-.35],[0,y,0],.04,M.dark);
    }
    if(i===3){
      const reference=segment(row,[-.6,.3,.4],[.6,.3,.4],.013,M.green);
      instruments.push(reference);targets.push(target(row,[0,.3,.4]));
      opticalHead(row,[0,.66,.05],{r:.13});
      segment(row,[0,.72,-.4],[0,.81,.05],.04,M.dark);
    }
    if(i===4){
      const contacts=group(row);for(let j=0;j<4;j++)segment(contacts,[(j-1.5)*.2,.7,0],[(j-1.5)*.2,.08,0],.02,M.bright);
      box(contacts,.95,.2,.4,M.dark,[0,.8,0]);instruments.push(contacts);targets.push(target(contacts,[0,.08,.12]));
      for(let j=0;j<4;j++)ring(contacts,.045,M.dark,[(j-1.5)*.2,.58,0],.008);
      tube(contacts,[[.42,.8,0],[.7,.8,-.2],[.7,.3,-.45]],.018,M.dark);
      segment(row,[-.74,.66,-.4],[-.74,1.2,-.4],.045,M.dark);
      segment(row,[-.74,1.2,-.4],[0,1.2,-.4],.045,M.dark);
      segment(contacts,[0,.9,0],[0,.98,-.4],.06,M.dark);
    }
    post.userData.instrument=phrases[i];
  }
  return finish(g,beat,'separate-particle-defect-geometry-and-electrical-instruments',p=>{
    instruments.forEach((o,i)=>o.visible=active(p[phrases[i]]));
    instruments[4].position.y=.22*(1-p['电学性质']);
    return {independentMeasurements:phrases,appearanceIsNotApproval:true,noSingleUniversalScan:true};
  },[specimens[0],specimens[4]],phrases.map((text,i)=>label(text,targets[i],text,[i%2?100:-100,-75])),
  {eye:[1.3,2.7,10],span:8.5});
}
function opticalScan(parent,beat){
  const g=group(parent),w=wafer(g,1.45,[0,-.65,0]),detector=group(g);
  box(detector,.42,.28,.42,M.dark,[0,1.1,0]);cyl(detector,.13,.15,M.bright,[0,.87,0]);
  const beam=dynamicLine(g,M.green,.012),spot=ball(g,.045,M.green),particle=ball(w.g,.04,M.amber,[.4,.03,.25]);
  const collector=box(g,.3,.3,.3,M.dark,[1.7,.55,.3]),scatter=dynamicLine(g,M.amber,.013);
  const path=[];for(let i=0;i<18;i++)path.push(ball(w.g,.015,M.green,[0,.025,0]));
  const point=target(g,[0,-.62,0],'光点');
  vacuumStage(w.g,{r:1.35,y:-.059});
  const rail=at(g,[0,0,-1.65]);
  for(const x of [-1.85,1.85])box(rail,.18,2.6,.35,M.dark,[x,.1,0]);
  box(rail,3.9,.18,.35,M.dark,[0,1.5,0]);
  const cross=box(g,3.5,.12,.2,M.bright,[0,1.32,0]);
  for(const x of [-1.75,1.75]){
    box(g,.12,.12,3.35,M.bright,[x,1.44,-.05]);
    box(g,.14,2.6,.25,M.dark,[x,.1,1.62]);
  }
  const detectorSlide=box(detector,.65,.15,.5,M.ceramic,[0,1.27,0]);
  const receiver=opticalHead(collector,[0,0,.1],{r:.12,axis:'z'});
  receiver.lookAt(.4,-.62,.25);
  const collectorStem=segment(g,[1.7,-.9,.3],[1.7,.35,.3],.07,M.bright);
  box(g,.4,.2,.5,M.dark,[1.7,-1.02,.3]);
  const specular=dynamicLine(g,M.green,.008);
  const scanCabinet=context(g,'optical-inspection-enclosure');
  box(scanCabinet,4.2,2.8,.1,M.dark,[0,.1,-2.15]);
  return finish(g,beat,'linked-light-probe-and-anomalous-scattering',p=>{
    const first=p['扫描表面'],linked=p['关联运动'],coverage=p['覆盖检查区域'];
    let x=mix(-1,.4,first),z=mix(-.4,.25,first);
    if(active(linked)){
      const u=.55*linked+.45*coverage,a=u*11,r=.5+.7*u;
      x=mix(.4,Math.cos(a)*r,linked);z=mix(.25,Math.sin(a)*r,linked);
    }
    detector.position.set(x,0,z);spot.position.set(x,-.61,z);point.position.copy(spot.position);
    cross.position.z=z;detectorSlide.visible=true;collectorStem.visible=true;
    setSegment(beam,[x,.8,z],[x,-.62,z]);scatter.visible=active(p['异常散射'])&&!active(linked);
    setSegment(scatter,[.4,-.62,.25],[1.7,.55,.3]);
    specular.visible=active(first);setSegment(specular,[x,-.62,z],[x+.12,.8,z]);
    path.forEach((o,i)=>{const u=i/17,a=u*11,r=.5+.7*u;o.position.set(Math.cos(a)*r,.03,Math.sin(a)*r);o.visible=coverage>u;});
    return {spot:[x,-.62,z],detector:[x,1.1,z],detectorTracksSpot:true,anomalousScattering:p['异常散射'],
      scanProgress:.5*first+.3*linked+.2*coverage,defectSizesExaggerated:true,geometryUnchanged:true};
  },[point,detector],[label('异常散射',particle,'异常散射',[-110,-80]),label('关联运动',point,'关联运动',[100,-80])],
  {eye:[2.8,3,10],span:8.3});
}
function geometricMeasurement(parent,beat){
  const g=group(parent),rows=[at(g,[0,1.6,0]),at(g,[0,0,0]),at(g,[0,-1.6,0])];
  const thickness=box(rows[0],2.5,.28,.85,M.silicon),gauge=bracket(rows[0],[1.45,-.14,.5],[1.45,.14,.5]);
  const local=surface(rows[1],{length:2.6,depth:.8,bottom:-.22,height:x=>.07*Math.cos(x*5)});
  const probe=ball(rows[1],.045,M.green),localRef=segment(rows[1],[-1.3,.2,.5],[1.3,.2,.5],.012,M.green);
  const bowed=surface(rows[2],{length:2.6,depth:.8,bottom:-.23,height:x=>.12*x*x-.1});
  const globalRef=segment(rows[2],[-1.3,.25,.5],[1.3,.25,.5],.012,M.green);
  const optical=at(g,[0,-3.15,0]),opticalSample=wafer(optical,.65);
  const particle=ball(opticalSample.g,.04,M.amber,[.15,.045,.1]);
  segment(optical,[-.5,.7,0],[.15,.06,.1],.012,M.green);
  segment(optical,[.15,.06,.1],[.6,.6,.1],.012,M.amber);
  rows.forEach((row,i)=>{
    sectionSeat(row,{y:-.32,width:2.6,depth:.8});
    const gantry=at(row,[-1.55,0,-.45]);
    box(gantry,.12,1.1,.22,M.dark);
    box(gantry,3.1,.1,.22,M.dark,[1.5,.59,0]);
    if(i===0){
      opticalHead(row,[.2,.45,0],{r:.12});
      const lower=opticalHead(row,[.2,-.48,0],{r:.12});lower.rotation.z=Math.PI;
      for(const y of [-.65,.6])segment(row,[-1.45,y,-.45],[.2,y,0],.04,M.dark);
    }
    if(i===1){
      const sensor=opticalHead(row,[0,.48,.25],{r:.12});
      row.userData.scanningSensor=sensor;
      const mount=dynamicLine(row,M.dark,.045);row.userData.sensorMount=mount;
    }
    if(i===2)for(const x of [-1,0,1])opticalHead(row,[x,.5,0],{r:.095});
    if(i===2)for(const x of [-1,0,1])segment(row,[x,.59,-.45],[x,.65,0],.04,M.dark);
  });
  vacuumStage(optical,{r:.58,y:-.08});
  opticalHead(optical,[-.5,.82,0],{r:.14});
  opticalHead(optical,[.6,.72,.1],{r:.12});
  for(const x of [-.8,.8])box(optical,.1,1.15,.2,M.dark,[x,.2,-.4]);
  box(optical,1.7,.1,.2,M.dark,[0,.82,-.4]);
  segment(optical,[-.5,.82,-.4],[-.5,.96,0],.04,M.dark);
  segment(optical,[.6,.82,-.4],[.6,.87,.1],.04,M.dark);
  return finish(g,beat,'fixed-thickness-local-flatness-and-global-bow-metrology',p=>{
    gauge.g.visible=active(p['厚不厚']);localRef.visible=probe.visible=active(p['平不平']);
    const x=mix(-1.2,1.2,p['平不平']);probe.position.set(x,local.height(x)+.03,.25);
    rows[1].userData.scanningSensor.position.x=x;
    setSegment(rows[1].userData.sensorMount,[x,.59,-.45],[x,.63,.25]);
    globalRef.visible=active(p['有没有翘曲']);optical.visible=active(p['颗粒检查']);
    return {surfaceGeometryFixed:true,sectionThickness:.28,materialRemoval:0,
      separateTasks:['thickness','local-flatness','global-bow','particle-inspection']};
  },[gauge.anchor,bowed.mesh],[
    label('厚度',gauge.anchor,'厚不厚',[-95,-65]),label('局部平坦度',probe,'平不平',[105,-75]),
    label('整片翘曲',bowed.anchor(.4),'有没有翘曲',[100,-70]),
    label('颗粒检查',particle,'颗粒检查',[100,-70]),
  ],{eye:[1.6,2.4,10],look:[0,-.6,0],span:9.6});
}
function traceability(parent,beat){
  const g=group(parent),r=rod(g,.45,1.9,[0,1.8,0]),w=wafer(g,1.1,[0,-1.3,0]);
  const batch=at(g,[0,.4,0]);for(let i=0;i<3;i++)box(batch,.65,.12,.65,M.ceramic,[(i-1)*.8,0,0]);
  const identity=box(g,.4,.06,.27,M.amber,[1,-1.25,.5]);
  const raw=mineral(g,[-1.3,2.9,0],.32),process=box(g,.7,.4,.65,M.dark,[1.25,2.9,0]);
  const paths=[dynamicLine(g,M.green,.015),dynamicLine(g,M.green,.015),dynamicLine(g,M.amber,.015),dynamicLine(g,M.amber,.015)];
  const ends=[[[.7,-1.3,.2],[.7,1.8,.2]],[[0,1.8,.2],[0,.4,.2]],
    [[0,1.8,.2],[-1.3,2.9,.2]],[[0,1.8,.2],[1.25,2.9,.2]]];
  saddle(g,-.6,.45,1.8);saddle(g,.6,.45,1.8);
  edgeNest(w.g,1.07,-.025);
  recordPlate(identity,[0,.05,0],{w:.35,h:.2,face:'up'});
  for(let i=0;i<3;i++){
    const card=recordPlate(batch,[(i-1)*.8,.08,.2],{w:.56,h:.36});
    box(card,.62,.04,.15,M.dark,[0,-.2,0]);
  }
  const recordReader=opticalHead(g,[1,-.55,.5],{r:.11});
  const readerBeam=dynamicLine(g,M.green,.009);
  const rawBin=box(raw,1.5,.16,1.3,M.dark,[0,-.8,0]);
  recordPlate(rawBin,[0,0,.68],{w:.65,h:.4});
  const processRecord=terminal(process,[0,.3,.45],{scale:.75});
  recordPlate(processRecord,[0,-.04,.37],{w:.45,h:.18});
  const history=context(g,'traceability-record-rack');
  box(history,2.8,3,.12,M.dark,[0,1,-1.2]);
  for(const y of [-.2,.8,1.8])box(history,2.8,.06,.5,M.ceramic,[0,y,-.95]);
  return finish(g,beat,'identity-to-rod-lot-feedstock-and-process-records',p=>{
    identity.visible=active(p['身份记录']);
    const values=[p['追溯到晶棒'],p['批次'],p['回查原料'],p['加工环节']];
    paths.forEach((o,i)=>{const [a,b]=ends[i];o.visible=active(values[i]);setSegment(o,a,a.map((q,j)=>mix(q,b[j],values[i])));});
    raw.visible=active(p['回查原料']);process.visible=active(p['加工环节']);
    recordReader.visible=readerBeam.visible=active(p['身份记录']);
    setSegment(readerBeam,[1,-.75,.5],[1,-1.2,.5]);
    return {operation:'record-traceability',machining:false,sourceRodLinked:p['追溯到晶棒'],batchLinked:p['批次'],
      feedstockRecord:p['回查原料'],processRecord:p['加工环节'],identityTokenIsSchematic:true};
  },[identity,r],[label('批次记录',batch,'批次',[120,-70]),label('原料记录',raw,'回查原料',[90,-70]),
    label('加工记录',process,'加工环节',[-90,-70])],
  {eye:[1.3,2.7,10],look:[0,.6,0],span:9.3});
}
function protectedTransport(parent,beat){
  const g=group(parent),c=carrier(g),cart=box(g,3.2,.2,2.6,M.dark,[0,-1.35,0]);
  const dust=particles(g,9,M.amber,.035),receiver=plant(g,[0,-2.65,-.4]);
  const travel=arrow(g,[1.7,-1.1,.5],[1.7,-2.7,.5],M.green,.025);
  const cartAssembly=group(g);cartAssembly.position.y=-1.35;
  for(const x of [-1.2,1.2])for(const z of [-.9,.9]){
    const wheel=axisCylinder(cartAssembly,.19,.12,[x,-.43,z],'x',M.dark);
    box(cartAssembly,.13,.22,.12,M.bright,[x,-.2,z]);
    wheel.userData.transportWheel=true;
  }
  const handle=tube(cartAssembly,[[-1.4,0,-1],[-1.4,.6,-1],[1.4,.6,-1],[1.4,0,-1]],.055,M.bright);
  const docking=cassetteDock(g,[0,-3.1,-.45],{scale:.55});
  const latches=[-1.47,1.47].map(x=>box(c.g,.08,.4,.15,M.dark,[x,0,1.2]));
  const doorSeal=ring(c.cover,1,M.dark,[0,0,.06],.018);doorSeal.scale.set(1.25,.92,1);
  handle.name='transport-cart-handle';
  return finish(g,beat,'slotted-container-protection-and-sealed-delivery',p=>{
    c.cover.position.set(mix(2.3,0,p['保护硅片']),0,1.3);c.cover.visible=active(p['专用运输盒']);
    dust.forEach((o,i)=>{o.visible=active(p['减少颗粒和接触污染']);o.position.set(1.8+(i%3)*.1,.8-Math.floor(i/3)*.5,.5);});
    const move=p['送往后续工厂'];c.g.position.y=-.5*move;cart.position.y=-1.35-.5*move;
    cartAssembly.position.y=cart.position.y;docking.visible=active(move);
    latches.forEach(o=>o.rotation.z=p['保护硅片']*Math.PI/2);
    receiver.visible=travel.visible=active(move);
    return {slotSupportsOnly:true,waferFacesSeparated:true,coverClosed:p['保护硅片']===1,
      externalParticlesBlocked:true,sealedDelivery:move,waferCount:7,countSchematic:true};
  },[c.anchor,c.disks[3].g],[label('专用洁净运输盒',c.anchor,'专用运输盒',[90,-80]),
    label('送往后续工厂',receiver,'送往后续工厂',[0,-75])],
  {eye:[2.7,2,10],look:[0,-.4,0],span:9.5});
}
function deviceFabrication(parent,beat){
  const g=group(parent),input=wafer(g,1.1,[0,1.85,0]),detail=at(g,[0,-.7,0]);
  const base=box(detail,3,.4,1.15,M.silicon,[0,-.3,0]),ridges=[],etched=[],mask=[],coating=[],metal=[];
  for(let i=0;i<6;i++){
    const x=(i-2.5)*.5;
    ridges.push(box(detail,.27,.18,1.15,M.silicon,[x,-.01,0]));
    etched.push(box(detail,.23,.18,1.15,M.silicon,[x+.25,-.01,0]));
    mask.push(box(detail,.27,.055,1.15,M.amber,[x,.11,0]));
    coating.push(box(detail,.27,.035,1.15,M.ceramic,[x,.095,0]));
    coating.push(box(detail,.23,.035,1.15,M.ceramic,[x+.25,-.09,0]));
    coating.push(box(detail,.025,.18,1.15,M.ceramic,[x+.145,0,0]));
    metal.push(box(detail,.2,.05,.8,M.bright,[x,.17,.1]));
  }
  const bridge=box(detail,2.9,.05,.12,M.bright,[0,.2,.43]);
  const lens=cyl(g,.4,.16,M.ceramic,[0,.8,0]),exposure=[dynamicLine(g,M.green,.015),dynamicLine(g,M.green,.015)];
  const material=target(input.g,[.4,.01,.5],'空白硅片'),pattern=target(detail,[.5,.15,.58],'后续器件制造');
  edgeNest(input.g,1.07,-.025);
  sectionSeat(detail,{y:-.59,width:3,depth:1.15});
  toolSpindle(lens,{axis:'y',side:1,r:.23,length:.3});
  const exposureFrame=at(g,[0,0,-.8]);
  for(const x of [-1.72,1.72])box(exposureFrame,.15,2.6,.25,M.dark,[x,.1,0]);
  box(exposureFrame,3.6,.15,.25,M.dark,[0,1.35,0]);
  const reticle=box(g,1.2,.055,.9,M.dark,[0,1.13,0]);
  for(let i=0;i<6;i++)box(reticle,.07,.012,.65,M.amber,[(i-2.5)*.16,-.032,0]);
  const etchPort=at(detail,[1.7,.65,-.48]);
  axisCylinder(etchPort,.11,.32,[0,0,0],'y',M.ceramic);
  box(etchPort,.3,.12,.4,M.dark,[0,.23,0]);
  const gas=dynamicLine(detail,M.glass,.025);
  const depositPort=tube(detail,[[-1.65,.55,-.4],[-1.65,.85,-.4],[0,.85,-.4]],.035,M.bright);
  const deposition=dynamicLine(detail,M.glass,.018);
  return finish(g,beat,'blank-input-then-lithography-etch-deposition-interconnect',p=>{
    const photo=p['光刻'],etch=p['刻蚀'],deposit=p['沉积'],interconnect=p['互连'];
    detail.visible=active(photo);lens.visible=active(photo)&&etch<1;
    exposureFrame.visible=reticle.visible=lens.visible;
    etchPort.visible=gas.visible=active(etch)&&deposit<1;
    setSegment(gas,[1.7,.55,-.48],[.35,.08,-.15]);
    depositPort.visible=deposition.visible=active(deposit)&&interconnect<1;
    setSegment(deposition,[0,.85,-.4],[0,.12,-.2]);
    exposure.forEach((o,i)=>{o.visible=active(photo)&&etch<1;setSegment(o,[i?.28:-.28,.72,0],[i?.9:-.9,-.45,0]);});
    mask.forEach(o=>{o.visible=active(photo)&&deposit<1;o.scale.y=Math.max(.001,photo);});
    etched.forEach(o=>{o.scale.y=Math.max(.001,1-etch);o.position.y=-.1+.09*(1-etch);o.visible=etch<1;});
    coating.forEach(o=>o.visible=active(deposit));metal.forEach(o=>o.visible=active(interconnect));bridge.visible=active(interconnect);
    return {blankInputAlwaysUnpatterned:true,deviceDetailIsSeparateMagnification:true,
      lithography:photo,etchRemoval:etch,deposition:deposit,interconnect,patternAppearsOnlyAtLithography:true};
  },[material,pattern],[label('空白硅片',material,'材料起点',[-100,-70]),label('后续器件制造',pattern,'光刻',[0,-90])],
  {eye:[2,2.7,10],look:[0,.2,0],span:8.9});
}
function repeatedProduction(parent,beat){
  const g=group(parent),sample=wafer(g,1.05,[0,2,0]),batches=[],gauges=[];
  for(let i=0;i<3;i++){
    const row=at(g,[(i-1)*.9,0,0]);
    for(let j=0;j<4;j++)wafer(row,.38,[0,(j-1.5)*.15,0]);
    batches.push(row);gauges.push(bracket(row,[-.45,.65,.3],[.45,.65,.3]).g);
  }
  const receiving=at(g,[0,-1.8,0]);box(receiving,2.4,.14,1.5,M.dark);
  const fixture=ring(receiving,.85,M.green,[0,.12,0],.025),incoming=wafer(receiving,.8,[0,1,0]);
  edgeNest(sample.g,1.02,-.025);
  for(const batch of batches){
    for(const x of [-.4,.4]){
      box(batch,.1,.9,.7,M.ceramic,[x,-.05,0]);
      for(let i=0;i<4;i++)box(batch,.08,.03,.65,M.dark,[x,(i-1.5)*.15-.04,0]);
    }
    box(batch,.88,.1,.8,M.dark,[0,-.56,0]);
    recordPlate(batch,[0,-.43,.42],{w:.42,h:.15});
  }
  const customer=vacuumStage(receiving,{r:.78,y:.02});
  opticalHead(receiving,[0,1.6,0],{r:.2});
  box(receiving,.15,1.8,.3,M.dark,[1,.5,-.5]);
  box(receiving,1.2,.12,.3,M.dark,[.45,1.48,-.5]);
  const control=terminal(g,[1.68,-1.5,-.55],{scale:.65});
  customer.userData.customerFixture=true;
  return finish(g,beat,'single-sample-repeated-batches-and-customer-interface',p=>{
    batches.forEach((o,i)=>scaleReveal(o,Math.max(0,Math.min(1,p['持续量产']*3-i))));
    gauges.forEach(o=>o.visible=active(p['每批都稳定']));
    receiving.visible=active(p['适配自己的工艺']);incoming.g.position.y=mix(1,.14,p['适配自己的工艺']);
    control.visible=active(p['每批都稳定']);
    return {sampleCount:1,batchCount:3,batchSizeSchematic:true,stableComparison:p['每批都稳定'],
      customerCompatibility:p['适配自己的工艺'],waferGeometryUnchanged:true};
  },[batches[1],fixture],[label('样品',sample.g,'样品',[-100,-75]),
    label('批次一致性',batches[1],'每批都稳定',[100,-80]),
    label('客户工艺适配',fixture,'适配自己的工艺',[-100,-75])],{eye:[2.6,4,10],span:8.6});
}
function supplierExamples(parent,beat){
  const g=group(parent),names=['信越','胜高','环球晶圆','世创','爱思开矽特隆','国内发展'];
  const phrases=['信越','胜高','环球晶圆','世创','爱思开矽特隆','国内也在发展'],stations=[];
  const common=wafer(g,1.1);
  edgeNest(common.g,1.07,-.025);
  for(let i=0;i<6;i++){
    const station=at(g,[i%2?.9:-.9,1.9-Math.floor(i/2)*1.8,0]);
    const factory=fabBuilding(station,[0,0,0],{variant:i,scale:.85});
    const w=wafer(station,.45,[0,.55,.1]);stations.push({g:station,target:w.g});
    edgeNest(w.g,.43,-.03);
    recordPlate(factory,[-.35,.04,.49],{w:.35,h:.2});
  }
  return finish(g,beat,'equal-scale-named-supplier-examples',p=>{
    stations.forEach((o,i)=>scaleReveal(o.g,p[phrases[i]]));
    common.g.visible=p['信越']<1;
    return {supplierExamples:names,equalSymbolArea:true,marketShareEncoded:false,capacityEncoded:false};
  },[stations[0].target,stations[4].target],
  names.map((text,i)=>label(text,stations[i].target,phrases[i],[i%2?80:-80,-70])),
  {eye:[1.3,2,10],look:[0,.2,0],span:8.8});
}
function productionCapability(parent,beat){
  const g=group(parent),factory=plant(g,[0,2.3,0]),planning=box(g,2.5,.08,1,M.glass,[0,1.7,0]);
  const quality=at(g,[-.95,.3,0]),validation=at(g,[.95,.3,0]),delivery=at(g,[0,-1.6,0]);
  box(quality,1.1,.18,.85,M.silicon);const qg=bracket(quality,[-.6,-.1,.5],[-.6,.1,.5]);
  const socket=ring(validation,.55,M.green,[0,0,0]),tested=wafer(validation,.5,[0,.8,0]);
  const parcels=Array.from({length:3},(_,i)=>box(delivery,.55,.35,.65,M.ceramic,[(i-1)*.75,0,0]));
  const links=[arrow(g,[-.9,-.2,0],[0,-.9,0]),arrow(g,[.9,-.2,0],[0,-.9,0])];
  sectionSeat(quality,{y:-.17,width:1.1,depth:.85});
  opticalHead(quality,[0,.55,0],{r:.13});
  for(const y of [-.23,.6])box(quality,.8,.08,.22,M.dark,[-.3,y,-.35]);
  box(quality,.1,.9,.22,M.dark,[-.7,.18,-.35]);
  vacuumStage(validation,{r:.48,y:-.08});
  const client=terminal(validation,[.72,.12,-.5],{scale:.65});
  parcels.forEach(o=>{
    recordPlate(o,[0,.025,.335],{w:.4,h:.22});
    box(o,.06,.24,.04,M.dark,[-.2,0,.35]);box(o,.06,.24,.04,M.dark,[.2,0,.35]);
  });
  const loadBay=box(delivery,2.4,.14,.9,M.dark,[0,-.3,0]);
  for(const x of [-1.1,1.1])box(delivery,.1,.4,.9,M.ceramic,[x,-.04,0]);
  const plannedUnits=Array.from({length:4},(_,i)=>box(planning,.35,.06,.45,M.dark,[(i-1.5)*.5,.06,0]));
  return finish(g,beat,'quality-customer-validation-and-repeatable-delivery',p=>{
    planning.visible=active(p['厂房和规划产能']);qg.g.visible=quality.visible=active(p['量产质量']);
    validation.visible=active(p['客户验证']);tested.g.position.y=mix(.8,.08,p['客户验证']);
    parcels.forEach((o,i)=>o.visible=p['稳定交付']>(i/3));
    delivery.visible=active(p['稳定交付']);links.forEach(o=>o.visible=active(p['共同决定生产能力']));
    plannedUnits.forEach(o=>o.visible=active(p['厂房和规划产能']));client.visible=true;loadBay.visible=true;
    return {plannedFactoryIsNotCapacityProof:true,quality:p['量产质量'],customerValidation:p['客户验证'],
      repeatableDelivery:p['稳定交付'],allConditionsRequired:true};
  },[quality,delivery],[label('量产质量',qg.anchor,'量产质量',[-80,-75]),
    label('客户验证',socket,'客户验证',[85,-75]),label('稳定交付',delivery,'稳定交付',[0,-85])],
  {look:[0,.3,0],span:9});
}
function chemicalRecap(parent,beat){
  const g=group(parent),reaction=at(g,[0,1.9,0]),si=ball(reaction,.22,M.atom);
  reaction.scale.setScalar(1.35);
  const oxygen=[ball(reaction,.13,M.amber,[-.38,0,0]),ball(reaction,.13,M.amber,[.38,0,0])];
  const carbon=[ball(reaction,.12,M.dark,[-.85,.2,0]),ball(reaction,.12,M.dark,[.85,.2,0])];
  const carrierGroup=at(g,[0,.35,0]);ball(carrierGroup,.2,M.atom);
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;ball(carrierGroup,.14,M.green,[Math.cos(a)*.38,Math.sin(a)*.38,0]);segment(carrierGroup,[0,0,0],[Math.cos(a)*.38,Math.sin(a)*.38,0],.015,M.dark);}
  ball(carrierGroup,.075,M.bright,[0,0,.35]);
  const clean=box(g,.65,.35,.6,M.glass,[-.8,-1,0]),reject=box(g,.65,.35,.6,M.glass,[.8,-1,0]);
  const foreign=ball(g,.09,M.amber,[.1,.35,0]),separated=ball(g,.08,M.amber,[.45,.45,0]);
  const core=cyl(g,.07,1.3,M.silicon,[0,-2.3,0]);
  const deposit=cyl(g,.28,1.3,M.silicon,[0,-2.3,0]);
  const branches=[arrow(g,[-.2,.05,0],[-.8,-.65,0]),arrow(g,[.2,.05,0],[.8,-.65,0],M.amber,.025)];
  const reductionVessel=at(g,[0,1.9,-.3]);
  for(const x of [-1.24,1.24])box(reductionVessel,.12,.95,.8,M.ceramic,[x,-.35,0]);
  box(reductionVessel,2.6,.16,.9,M.dark,[0,-.9,0]);
  for(const x of [-.8,.8])axisCylinder(reductionVessel,.07,.5,[x,.2,-.45],'y',M.dark);
  const separation=group(g);separation.name='recap-separation-column';
  cyl(separation,.24,2.2,M.dark,[1.75,.1,-.8]);
  for(let i=0;i<6;i++)ring(separation,.25,M.ceramic,[1.75,-.8+i*.34,-.8],.018);
  tube(separation,[[1.75,1.2,-.8],[1.75,1.5,-.8],[1.25,1.5,-.8]],.05,M.bright);
  for(const collector of [clean,reject]){
    const neck=cyl(collector,.23,.22,M.ceramic,[0,.23,0]);
    neck.userData.collectionVessel=true;
  }
  const reactor=at(g,[0,-2.3,-.1]);
  cyl(reactor,.55,.12,M.ceramic,[0,-.75,0]);
  for(const x of [-.55,.55])box(reactor,.08,1.45,.7,M.dark,[x,0,0]);
  cyl(reactor,.55,.1,M.dark,[0,.75,0]);
  tube(reactor,[[-.65,-.5,0],[-.45,-.5,0],[-.38,-.35,0]],.035,M.bright);
  tube(reactor,[[.4,.5,0],[.75,.5,0],[.75,.8,0]],.035,M.bright);
  return finish(g,beat,'chemical-reduction-carrier-separation-and-redeposition',p=>{
    oxygen.forEach((o,i)=>{const sign=i?1:-1;o.position.set(sign*mix(.38,.85,p['还原']),mix(0,.45,p['还原']),0);});
    carbon.forEach((o,i)=>o.position.y=mix(.2,.22,p['还原']));
    carrierGroup.visible=active(p['转化']);branches.forEach(o=>o.visible=active(p['分离']));
    carrierGroup.position.set(-.8*p['分离'],mix(.35,-.8,p['分离']),0);
    carrierGroup.scale.setScalar(mix(1,.55,p['分离']));
    separated.visible=active(p['转化']);separated.position.set(mix(.45,.8,p['分离']),mix(.45,-.8,p['分离']),.2);
    clean.visible=reject.visible=active(p['分离']);foreign.position.set(mix(.1,.8,p['降低不需要的杂质']),mix(.35,-.8,p['降低不需要的杂质']),0);
    const u=p['沉积'];deposit.visible=active(u);deposit.scale.x=deposit.scale.z=mix(.25,1,u);
    reactor.visible=active(u);reductionVessel.visible=true;
    return {molecularSymbolsQualitative:true,oxygenLeavesWithCarbon:p['还原'],chemicalCarrier:p['转化'],
      separation:p['分离'],depositedSilicon:p['沉积'],unwantedSpeciesRejected:p['降低不需要的杂质']};
  },[si,deposit],[label('化学转化',carrierGroup,'转化',[130,-75]),label('硅沉积',deposit,'沉积',[-100,-75])],
  {eye:[1.4,1.8,10],look:[0,-.1,0],span:9.3});
}
function manufacturingRecap(parent,beat){
  const g=group(parent),seed=cyl(g,.34,.95,M.silicon,[0,2.1,0]),lattice=buildDiamond(g,{cells:2,spacing:.65,atomRadius:.045});
  lattice.g.position.y=1.25;
  const interfaceRing=ring(g,.52,M.green,[0,.7,0]),defect=ball(g,.07,M.amber,[.35,1.3,.4]);
  const slices=at(g,[0,-.3,0]),sliceObjects=[];
  for(let i=0;i<5;i++)sliceObjects.push(wafer(slices,.65,[0,(i-2)*.13,0]));
  const pad=cyl(g,.4,.12,M.ceramic,[.9,-.1,0]),rinse=dynamicLine(g,M.liquid,.035),gauge=box(g,.3,.2,.3,M.dark,[0,-1.1,0]);
  const residue=particles(slices,7,M.amber,.035),drain=box(g,.5,.14,.7,M.dark,[-1.2,-.9,0]);
  const beam=dynamicLine(g,M.green,.012),checkPoint=target(slices,[0,.29,.3]);
  const output=wafer(g,1.05,[0,-2.15,0]),cleanTarget=target(slices,[.4,.3,.2]);
  cyl(g,.15,.4,M.dark,[0,2.78,0]);
  const thermalShield=ring(g,.7,M.ceramic,[0,.55,0],.08);
  for(const x of [-.78,.78])box(g,.08,1.6,.2,M.dark,[x,1.23,-.5]);
  const cassette=slices;
  for(const x of [-.7,.7]){
    box(cassette,.1,.72,.95,M.ceramic,[x,0,0]);
    for(let j=0;j<5;j++)box(cassette,.1,.025,.85,M.dark,[x,(j-2)*.13-.035,0]);
  }
  box(cassette,1.55,.08,1,M.dark,[0,-.44,0]);
  toolSpindle(pad,{axis:'y',side:1,r:.14,length:.3});
  const rinseArm=tube(g,[[-1.3,.7,-.4],[-1.3,.5,-.4],[-1,.5,0]],.04,M.bright);
  const sensorFrame=box(g,1.7,.12,.2,M.dark,[0,.95,-.5]);
  for(const x of [-.85,.85])box(g,.1,1.2,.2,M.dark,[x,.4,-.5]);
  opticalHead(gauge,[0,-.12,0],{r:.1});
  edgeNest(output.g,1.02,-.025);
  return finish(g,beat,'seed-growth-defect-control-and-finished-wafer-route',p=>{
    lattice.g.scale.y=Math.max(.001,p['籽晶建立取向']);interfaceRing.visible=defect.visible=active(p['生长与缺陷']);
    interfaceRing.scale.setScalar(mix(.6,1,p['生长与缺陷']));
    slices.visible=pad.visible=active(p['切磨抛']);pad.position.x=mix(-.7,.7,p['切磨抛']);
    sliceObjects.forEach((o,i)=>o.g.position.y=(i-2)*mix(.03,.13,p['切磨抛']));
    rinse.visible=active(p['清洗']);setSegment(rinse,[-1,.5,0],[-.3,-.1,0]);
    rinseArm.visible=active(p['清洗']);sensorFrame.visible=active(p['检测']);thermalShield.visible=active(p['生长与缺陷']);
    residue.forEach((o,i)=>o.position.set(mix((i-3)*.13,-1.2,p['清洗']),mix(.3,-.52,p['清洗']),(i%3-1)*.17));
    drain.visible=active(p['清洗']);
    const scanX=mix(-.45,.45,p['检测']);gauge.visible=beam.visible=active(p['检测']);gauge.position.set(scanX,.65,0);
    checkPoint.position.x=scanX;setSegment(beam,[scanX,.55,0],[scanX,0,0]);
    output.g.visible=active(p['得到合格硅片']);output.g.position.y=mix(-1.3,-2.15,p['得到合格硅片']);
    return {orientationFromSeed:p['籽晶建立取向'],defectControlIsSeparate:p['生长与缺陷'],
      cuttingAndFinishing:p['切磨抛'],cleaning:p['清洗'],inspection:p['检测'],qualifiedOutput:p['得到合格硅片']};
  },[seed,output.g],[label('清洗',cleanTarget,'清洗',[100,-70]),label('检测',checkPoint,'检测',[-100,-75]),
    label('合格硅片',output.g,'得到合格硅片',[-100,-75])],
  {eye:[1.5,2,10],look:[0,0,0],span:9.2});
}
function materialFoundation(parent,beat){
  const g=group(parent),w=wafer(g,1.4,[0,-.9,0]),chain=group(g);
  mineral(chain,[-1.2,1.7,0],.32);rod(chain,.25,.85,[0,1.7,0]);wafer(chain,.45,[1.2,1.7,0]);
  const paths=[arrow(chain,[-.85,1.7,.1],[-.5,1.7,.1],M.green,.018),arrow(chain,[.5,1.7,.1],[.8,1.7,.1],M.green,.018)];
  const computers=group(g);
  box(computers,1.5,.85,.15,M.dark,[0,2.95,0]);box(computers,1.25,.6,.02,M.glass,[0,2.95,.09]);
  box(computers,.25,.35,.2,M.ceramic,[0,2.35,0]);box(computers,1,.1,.6,M.dark,[0,2.15,.15]);
  const chips=Array.from({length:4},(_,i)=>box(computers,.28,.1,.28,M.bright,[(i-1.5)*.35,3.6,0]));
  const link=arrow(g,[0,-.3,.2],[0,1.2,.2],M.green,.025);
  const face=target(w.g,[.5,.02,.6],'一片硅');
  edgeNest(w.g,1.37,-.025);
  const display=computers.children[1];
  for(let i=0;i<5;i++)box(display,.8-i*.08,.018,.008,i===0?M.green:M.ceramic,[0,.2-i*.085,.02]);
  const tower=at(computers,[1.15,2.55,-.15]);box(tower,.45,1.2,.55,M.dark);
  for(let i=0;i<6;i++)box(tower,.3,.025,.015,M.ceramic,[0,-.35+i*.12,.29]);
  box(tower,.08,.08,.02,M.green,[.12,.45,.29]);
  const phone=at(computers,[-1.1,2.6,.25]);box(phone,.42,.78,.08,M.dark);
  box(phone,.34,.62,.012,M.glass,[0,.02,.05]);
  const rack=at(computers,[0,4.05,-.65]);
  for(const x of [-1.15,1.15])box(rack,.09,.92,.5,M.dark,[x,0,0]);
  for(let i=0;i<3;i++){
    const server=box(rack,2.15,.22,.5,M.dark,[0,(i-1)*.29,0]);
    for(let j=0;j<4;j++)box(server,.25,.09,.02,M.ceramic,[(j-1.5)*.45,0,.265]);
    box(server,.06,.05,.02,M.green,[.9,0,.265]);
  }
  const mineralTray=box(chain,.8,.1,.8,M.dark,[-1.2,1.35,0]);
  saddle(chain,-.22,.25,1.7);saddle(chain,.22,.25,1.7);
  edgeNest(chain,.44,1.67).position.x=1.2;
  mineralTray.userData.materialSpecimen=true;
  return finish(g,beat,'material-chain-to-separate-computing-world',p=>{
    chain.visible=active(p['一整条精密制造链']);computers.visible=active(p['计算世界']);link.visible=active(p['材料上开始搭建']);
    chips.forEach((o,i)=>o.visible=p['材料上开始搭建']>i/4);
    return {waferRemainsUnpatterned:true,upstreamChain:p['一整条精密制造链'],downstreamComputing:p['计算世界'],
      materialFoundation:p['材料上开始搭建'],computingDevicesAreSeparateSchematic:true};
  },[face,chain],[label('精密制造链',chain,'一整条精密制造链',[0,-95]),label('材料起点',face,'材料上开始搭建',[100,-80])],
  {eye:[2,3.4,10],look:[0,.7,0],span:10});
}

const builders={
  '01-start-01':openingWafer,'01-start-02':dimensions,'01-start-03':quality,'03-order-03':roadmap,
  '18-trim-01':endTrimming,'18-trim-02':notch,'18-trim-03':multiwire,
  '19-slice-01':abrasiveCut,'19-slice-02':kerfAccounting,'19-slice-03':asSawn,
  '20-edge-01':edgeRounding,'20-edge-02':doubleLapping,'20-edge-03':chemicalEtching,
  '21-polish-01':cmpContact,'21-polish-02':asperityPolish,'21-polish-03':finalPolish,
  '22-flatness-01':scaleComparison,'22-flatness-02':opticalFocus,'22-flatness-03':productTolerance,
  '23-clean-01':contamination,'23-clean-02':rinseDry,'23-clean-03':cleanHandling,
  '25-inspect-01':inspectionTypes,'25-inspect-02':opticalScan,'25-inspect-03':geometricMeasurement,
  '26-shipping-01':traceability,'26-shipping-02':protectedTransport,'26-shipping-03':deviceFabrication,
  '27-industry-01':repeatedProduction,'27-industry-02':supplierExamples,'27-industry-03':productionCapability,
  '28-recap-01':chemicalRecap,'28-recap-02':manufacturingRecap,'28-recap-03':materialFoundation,
};
export function finishingRig(key,parent,beat){
  if(!beat?.id)throw new Error('finishingRig requires the actual beat; key-only caching is unsupported');
  const build=builders[beat.id];
  if(!build)throw new Error(`No independent finishing scene for ${beat.id} (${key})`);
  const rig=build(parent,beat);
  // Retain mirror highlights while keeping the thin substrate legible in the studio.
  rig.g.traverse(o=>{
    if(!o.isMesh||o.material!==M.silicon)return;
    for(let p=o.parent;p&&p!==rig.g;p=p.parent)if(p.userData.diameterMm){
      o.material=polishedSilicon;break;
    }
  });
  rig.storyShots=finishingShots(beat,rig.g);
  const phrases=new Set(rig.semanticPlan.map(event=>event.phrase));
  for(const shot of rig.storyShots)if(!phrases.has(shot.phrase)){
    throw new Error(`Finishing camera phrase is not an existing action: ${beat.id}/${shot.phrase}`);
  }
  return rig;
}
