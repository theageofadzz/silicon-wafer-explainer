import {T,M,group,box,cyl,ball,ring,segment,dynamicLine,setSegment,tube,arrow,wafer,lathe,marker,rigResult,mix,phase,buildDiamond} from './core.mjs';

export const finishingKeys=['wafer','wafer-measure','trim','wire','kerf','edge','lap','etch','polish','flatness','focus','wash','scan','cassette','industry','recap'];
const phraseCache=new WeakMap();
function wordWindow(beat,text){
  let cache=phraseCache.get(beat);
  if(!cache){cache=new Map();phraseCache.set(beat,cache);}
  if(cache.has(text))return cache.get(text);
  const normalize=s=>s.replace(/[\s、，。！？；：,.!?;:]/g,'');
  let offset=0;
  const words=beat.words.map(word=>{
    const value=normalize(word.text),entry={...word,from:offset,to:offset+value.length};
    offset+=value.length;return entry;
  });
  const joined=beat.words.map(word=>normalize(word.text)).join(''),at=joined.indexOf(normalize(text));
  if(at<0)throw new Error(`Missing real word anchor ${beat.id}: ${text}`);
  const matched=words.filter(word=>word.to>at&&word.from<at+normalize(text).length);
  const window={text,start:matched[0].start,end:matched.at(-1).end};
  cache.set(text,window);return window;
}
function waferRig(key,parent){
  const g=group(parent),w=wafer(g,1.65),lift=group(g);
  w.g.rotation.x=.24;
  const diameter=dynamicLine(w.g,M.green,.013);
  const tickA=segment(w.g,[-1.65,-.04,-.13],[-1.65,-.04,.13],.013,M.green);
  const tickB=segment(w.g,[1.65,-.04,-.13],[1.65,-.04,.13],.013,M.green);
  const endA=marker(w.g,[-1.65,0,0]),endB=marker(w.g,[1.65,0,0]);
  const diameterAnchor=marker(w.g,[0,.13,.12]),sectionHalf=.09;
  const edgeShape=new T.Shape();
  edgeShape.moveTo(-1.1,-sectionHalf);edgeShape.lineTo(.72,-sectionHalf);
  edgeShape.quadraticCurveTo(.88,-sectionHalf,.88,0);edgeShape.quadraticCurveTo(.88,sectionHalf,.72,sectionHalf);
  edgeShape.lineTo(-1.1,sectionHalf);edgeShape.closePath();
  const section=new T.Mesh(new T.ExtrudeGeometry(edgeShape,{depth:.38,bevelEnabled:false}),M.silicon);
  section.position.set(0,-1.6,-.19);lift.add(section);
  const sectionAnchor=marker(lift,[1.15,-1.6,0]);
  const thick=dynamicLine(lift,M.green,.013);
  setSegment(thick,[1.15,-1.6-sectionHalf,0],[1.15,-1.6+sectionHalf,0]);
  for(const y of [-1.6-sectionHalf,-1.6+sectionHalf])segment(lift,[1.03,y,0],[1.27,y,0],.009,M.green);
  lift.position.y=-.85;
  return rigResult(g,ctx=>{
    const u=ctx.a(.03,.85);
    w.g.rotation.y=mix(-.35,.45,u);
    w.g.rotation.x=key==='wafer'?mix(.2,.9,u):.35;
    setSegment(diameter,[-1.65,.02,0],[mix(-1.65,1.65,u),.02,0]);
    diameterAnchor.position.x=mix(-1.65,0,u);
    const measure=key==='wafer-measure';
    diameter.visible=tickA.visible=tickB.visible=measure;
    lift.visible=measure;
    return {...w.g.userData,sectionExaggeration:measure?(2*sectionHalf/w.h):undefined,
      sectionSchematic:measure,diameterEndpoints:[[-1.65,.02,0],[1.65,.02,0]],
      thicknessEndpoints:[[1.15,-1.6-sectionHalf,0],[1.15,-1.6+sectionHalf,0]],
      measurementTargets:{diameter:'midpoint of the drawn diameter line',thickness:'midpoint of the magnified section dimension'},
      action:'orient wafer and extend physical diameter measure'};
  },key==='wafer-measure'?[diameterAnchor,sectionAnchor]:[endA,endB],
  {view:{eye:[3,5.7,9],look:[0,-.5,0],span:8.0},
    semanticAnchors:key==='wafer-measure'?[
      {text:'直径 300 mm',object:diameterAnchor,offset:[0,-80]},
      {text:'截面放大 · 0.775 mm',object:sectionAnchor,offset:[-80,-30]},
    ]:[]});
}
function sawRig(key,parent){
  const g=group(parent),axis=group(g);axis.rotation.z=Math.PI/2;
  const n=key==='kerf'?5:9,r=.95,pitch=.24,kerf=.055,thickness=pitch-kerf;
  const pieces=[],web=group(g),wires=[];
  // All sections share the original cylinder axis; gaps are removed material.
  for(let i=0;i<n;i++){
    const o=cyl(axis,r,thickness,M.silicon,[0,(i-(n-1)/2)*pitch,0]);pieces.push(o);
    if(i<n-1){
      const x=-(i-(n-1)/2+.5)*pitch;
      const line=segment(web,[x,-1.65,-1.35],[x,-1.65,1.35],.009,M.bright);wires.push(line);
    }
  }
  const original=cyl(axis,r,n*pitch-kerf,M.silicon);
  for(const z of [-1.4,1.4]){
    const roller=cyl(web,.19,n*pitch+.7,M.dark,[0,-1.65,z]);roller.rotation.z=Math.PI/2;
  }
  const debris=[];
  for(let i=0;i<20;i++)debris.push(ball(g,.025,M.silver));
  const kerfMarker=marker(axis,[0,thickness/2+kerf/2,r*.75]);
  return rigResult(g,ctx=>{
    const cut=ctx.a(.02,.65),release=ctx.a(.66,.89);
    web.position.y=2.9*cut;
    // A rising cut front separates lower cut disks from the remaining connected cap.
    const front=mix(-r,r,cut);
    const plane=new T.Plane(new T.Vector3(0,1,0),-front);
    const reverse=new T.Plane(new T.Vector3(0,-1,0),front);
    if(!original.material.userData.saw){
      original.material=M.silicon.clone();original.material.userData.saw=true;
      for(const o of pieces){o.material=M.silicon.clone();o.material.clippingPlanes=[reverse];}
    }
    original.material.clippingPlanes=[plane];
    original.visible=cut<.999;
    pieces.forEach((o,i)=>{
      o.visible=cut>0;o.position.y=(i-(n-1)/2)*(pitch+release*.075);
      o.material.clippingPlanes=cut<.999?[reverse]:[];
      o.position.x=-release*.18;
    });
    debris.forEach((o,i)=>{
      o.visible=cut>.02&&cut<.98;
      o.position.set((i%(n-1)-(n-2)/2)*pitch,mix(front-.1,-1.8,(i%5)/5),Math.sin(i*2.4)*.5);
    });
    return {cutFront:front,release,separateDisks:cut===1?n:0,kerf,sectionThickness:thickness,pitch,
      conservation:{pitch,solid:thickness,removed:kerf},thicknessAndKerfExaggerated:true,physicalWaferScale:false};
  },[pieces[0],kerfMarker],{view:{eye:[4,3,8],look:[0,-.1,0],span:6.9}});
}
function trimRig(parent){
  const g=group(parent),rod=cyl(g,.7,2.5,M.silicon);rod.rotation.z=Math.PI/2;
  const ends=[];
  for(const sign of [-1,1]){
    const end=cyl(g,.7,.55,M.silicon,[sign*1.525,0,0],.18);end.rotation.z=sign*Math.PI/2;ends.push(end);
    box(g,.4,.35,1.2,M.dark,[sign*.8,-.9,0]);
  }
  const blade=cyl(g,.85,.035,M.ceramic);blade.rotation.z=Math.PI/2;
  const radius=.7,length=2.5,notchDepth=.23,angle=2.42,opening=.22,shape=new T.Shape();
  for(let i=0;i<=96;i++){
    const a=angle+opening+(Math.PI*2-2*opening)*i/96;
    if(i===0)shape.moveTo(radius*Math.cos(a),radius*Math.sin(a));
    else shape.lineTo(radius*Math.cos(a),radius*Math.sin(a));
  }
  shape.lineTo((radius-notchDepth)*Math.cos(angle),(radius-notchDepth)*Math.sin(angle));shape.closePath();
  const grooved=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:length,bevelEnabled:false,steps:1}),M.silicon.clone());
  grooved.rotation.y=Math.PI/2;grooved.position.x=-length/2;g.add(grooved);
  const radial=[0,Math.sin(angle),-Math.cos(angle)];
  const machining=group(g),wheelHub=group(machining);
  wheelHub.rotation.z=Math.PI/2;
  const wheel=cyl(wheelHub,.34,.1,M.ceramic);
  segment(wheel,[.05,0,0],[.29,0,0],.012,M.dark);
  const direction=arrow(g,[length/2+.06,0,0],
    [length/2+.06,radial[1]*1.02,radial[2]*1.02],M.amber,.028);
  const notchTarget=marker(g,[0,0,0]),directionTarget=marker(g,[length/2+.06,radial[1]*.72,radial[2]*.72]);
  const grooveLine=dynamicLine(g,M.green,.009);
  rod.material=M.silicon.clone();
  return rigResult(g,ctx=>{
    const notch=/定位缺口/.test(ctx.beat.text)||ctx.beat.id==='18-trim-02';
    grooved.visible=machining.visible=direction.visible=grooveLine.visible=notch;
    ends.forEach(o=>o.visible=!notch);blade.visible=!notch&&ctx.raw<.9;
    if(notch){
      const u=ctx.a(.03,.83),front=mix(-length/2,length/2,u);
      const referenceEnd=ctx.beat.index%3===1?-1:1;
      direction.position.x=referenceEnd*(length/2+.08);
      rod.visible=u<1;
      rod.material.clippingPlanes=u>1e-7&&u<1?[new T.Plane(new T.Vector3(1,0,0),-front)]:[];
      grooved.visible=u>0;
      grooved.material.clippingPlanes=u<1?[new T.Plane(new T.Vector3(-1,0,0),front)]:[];
      machining.position.set(front,radial[1]*(radius-notchDepth+.34),radial[2]*(radius-notchDepth+.34));
      machining.visible=u>0&&u<1;wheel.rotation.y=u*22;
      const targetX=Math.max(-length/2,Math.min(.85,front-.06)),root=radius-notchDepth;
      notchTarget.position.set(targetX,radial[1]*root,radial[2]*root);
      notchTarget.visible=u>0;notchTarget.userData.objectLabel='定位缺口';
      directionTarget.position.set(direction.position.x,radial[1]*.72,radial[2]*.72);
      grooveLine.visible=u>0;
      setSegment(grooveLine,[-length/2,radial[1]*(root+.006),radial[2]*(root+.006)],
        [front,radial[1]*(root+.006),radial[2]*(root+.006)]);
      return {operation:'orientation-groove',removedSeedAndTail:0,notchDepth,notchDepthExaggerated:true,
        grooveAxis:[1,0,0],grooveLength:length*u,cutFront:front,notchWorld:notchTarget.position.toArray(),
        crystalDirection:radial,orientationSchematic:true,
        orientationConvention:'Geometric reference only; no particular Miller index or notch specification implied'};
    }
    rod.visible=true;rod.material.clippingPlanes=[];notchTarget.visible=true;
    delete notchTarget.userData.objectLabel;
    notchTarget.position.set(0,0,0);
    const pass=ctx.a(.03,.65),release=ctx.a(.65,.9),side=pass<.5?-1:1;
    blade.position.set(side*1.26,mix(1.65,-.9,phase(pass,side<0?0:.5,side<0?.5:1)),0);
    blade.visible=ctx.raw<.9;
    ends.forEach((o,i)=>o.position.x=(i?1:-1)*(1.525+.5*release));
    directionTarget.position.copy(ends[1].position);
    return {removedSeedAndTail:release,retainedCylinderLength:2.5};
  },[notchTarget,directionTarget],{view:{eye:[3,2.8,9],look:[0,0,0],span:6.8},
    semanticAnchors:ctx=>/定位缺口/.test(ctx.beat.text)?[
      {text:'定位缺口',object:notchTarget,offset:[-90,-80]},
      {text:'晶向参照',object:directionTarget,offset:[0,-80]},
    ]:[]});
}
function surfaceRig(key,parent){
  const g=group(parent),section=group(g),length=3.1,depth=1.5;
  const substrate=box(section,length,.46,depth,M.silver,[0,-.23,0]);
  const resolution=64,geo=new T.PlaneGeometry(length,depth,resolution,12);geo.rotateX(-Math.PI/2);
  const top=new T.Mesh(geo,M.silicon);section.add(top);
  const bottomGeo=geo.clone(),bottom=new T.Mesh(bottomGeo,M.silicon);bottom.material=M.silicon.clone();bottom.material.side=T.DoubleSide;section.add(bottom);
  const topPos=geo.attributes.position,bottomPos=bottomGeo.attributes.position,original=topPos.array.slice();
  const damageTop=box(section,length,.11,depth,M.dark,[0,.045,0]);
  const damageBottom=box(section,length,.11,depth,M.dark,[0,-.505,0]);
  const cracks=[];
  for(let i=0;i<12;i++){
    const x=-1.4+i*.25,z=.76,sign=i%2?1:-1;
    cracks.push(segment(section,[x,.08,z],[x+.08,-.04,z],.009,M.green));
    cracks.push(segment(section,[x,-.54,z],[x-.06,-.43,z],.009,M.green));
  }
  const upper=box(g,3.5,.18,1.8,M.ceramic,[0,.44,0]),lower=box(g,3.5,.18,1.8,M.ceramic,[0,-.88,0]);
  const pad=cyl(g,1.05,.18,M.ceramic,[0,.35,0]);
  const nozzle=tube(g,[[1.85,1.35,0],[1.85,.8,0],[1.2,.6,0]],.045);
  const drops=Array.from({length:12},()=>ball(g,.03,M.liquid));
  const bath=box(g,3.6,.68,1.9,M.liquid,[0,-.2,0]);
  const removed=[];
  for(let i=0;i<16;i++)removed.push(ball(g,.023,M.green));
  const surfaceMarker=marker(section,[.65,.1,.76]),padMarker=marker(pad,[.8,.1,.1]);
  return rigResult(g,ctx=>{
    const u=ctx.a(.04,.86),isLap=key==='lap',isEtch=key==='etch',isCmp=key==='polish';
    upper.visible=lower.visible=isLap;pad.visible=nozzle.visible=isCmp;bath.visible=isEtch;
    const surfaceHeight=isCmp?.1-.1*u:.09-.09*u;
    upper.position.set(.13*Math.sin(u*8),surfaceHeight+.09,0);
    lower.position.set(-.13*Math.sin(u*8),-.46-surfaceHeight-.09,0);
    pad.position.set(mix(-.65,.65,u),surfaceHeight+.09,0);pad.rotation.y=u*9;
    for(let i=0;i<topPos.count;i++){
      const x=original[i*3],z=original[i*3+2],wave=(Math.sin(x*7+z*2)*.043+Math.cos(x*14)*.014);
      const topY=surfaceHeight+wave*(1-u);
      topPos.setY(i,topY);bottomPos.setY(i,-.46-surfaceHeight-wave*(1-u));
    }
    topPos.needsUpdate=bottomPos.needsUpdate=true;geo.computeVertexNormals();bottomGeo.computeVertexNormals();
    damageTop.visible=damageBottom.visible=isEtch;
    damageTop.scale.y=damageBottom.scale.y=Math.max(.001,1-u);
    damageTop.position.y=.055*(1-u);damageBottom.position.y=-.46-.055*(1-u);
    cracks.forEach(o=>{o.visible=isEtch&&u<.999;o.scale.y=Math.max(.001,1-u);});
    drops.forEach((o,i)=>{
      o.visible=isCmp&&ctx.raw<.94;
      const p=(i/12+u*2)%1;
      o.position.set(mix(1.2,pad.position.x,p),mix(.6,surfaceHeight+.025,p),.2+Math.sin(i)*.35);
    });
    removed.forEach((o,i)=>{
      o.visible=isEtch&&u>.03&&u<.97;
      o.position.set((i%8-3.5)*.39,(i<8?.1:-.58)+(i<8?1:-1)*u*.3,depth/2+u*.22);
    });
    surfaceMarker.position.y=surfaceHeight;
    return {sectionExaggerated:true,surfaceHeight,topAmplitude:.057*(1-u),bottomAmplitude:isLap?.057*(1-u):undefined,
      topAndBottomLevelled:isLap,damageLayerRemaining:isEtch?.11*(1-u):undefined,
      materialRemoval:isEtch?u*.11:u*.09,padContact:isCmp,slurry:isCmp};
  },key==='polish'?[surfaceMarker,padMarker]:[surfaceMarker,substrate],
  {view:{eye:[3.2,2.4,8],look:[0,-.1,0],span:8.4}});
}
function edgeRig(parent){
  const g=group(parent),w=wafer(g,1.45,[0,.85,0]);
  const section=group(g);section.position.y=-1.1;
  const rounded=lathe(section,[[1.1,-.19],[1.55,-.19],[1.64,-.14],[1.68,-.06],[1.69,0],[1.68,.06],[1.64,.14],[1.55,.19],[1.1,.19]]);
  rounded.geometry.dispose();
  const shape=new T.Shape();
  shape.moveTo(-1.35,-.19);shape.lineTo(.8,-.19);shape.quadraticCurveTo(1.15,-.19,1.15,0);
  shape.quadraticCurveTo(1.15,.19,.8,.19);shape.lineTo(-1.35,.19);shape.closePath();
  rounded.geometry=new T.ExtrudeGeometry(shape,{depth:.85,bevelEnabled:false});rounded.position.z=-.425;
  const edgePos=rounded.geometry.attributes.position,edgeOriginal=edgePos.array.slice();
  const wheel=cyl(section,.44,.6,M.ceramic,[1.57,.7,0]);wheel.rotation.x=Math.PI/2;
  return rigResult(g,ctx=>{
    const u=ctx.a(.05,.87);
    w.g.rotation.y=u*1.5;
    for(let i=0;i<edgePos.count;i++){
      const x=edgeOriginal[i*3],y=edgeOriginal[i*3+1];
      edgePos.setX(i,x>.79?mix(1.15,x,u):x);
      edgePos.setY(i,x>.79?mix(Math.sign(y)*.19,y,u):y);
    }
    edgePos.needsUpdate=true;rounded.geometry.computeVertexNormals();
    wheel.position.set(1.55,mix(.65,-.65,u),0);wheel.rotation.z=u*8;
    return {edgeSectionExaggerated:true,physicalWafer:w.g.userData,roundedEdge:u>=.5};
  },[w.g,rounded],{view:{eye:[2.5,2.6,8],look:[0,0,0],span:8.0}});
}
function diagramRig(key,parent){
  const g=group(parent),geo=new T.PlaneGeometry(3.2,1.45,100,12);geo.rotateX(-Math.PI/2);
  const surface=new T.Mesh(geo,M.silicon);g.add(surface);
  box(g,3.2,.16,1.45,M.dark,[0,-.4,0]);
  const amplitude=.22,focalPlaneY=0,heightAt=x=>amplitude*Math.cos(x*2.8);
  const pos=geo.attributes.position;
  // Metrology does not remove material: this geometry is constructed only once.
  for(let i=0;i<pos.count;i++)pos.setY(i,heightAt(pos.getX(i)));
  geo.computeVertexNormals();
  const reference=box(g,3.45,.012,.045,M.green,[0,.31,.78]);
  const focalPlane=box(g,3.45,.012,1.6,M.glass,[0,focalPlaneY,0]);
  const focalEdge=segment(g,[-1.72,focalPlaneY,.8],[1.72,focalPlaneY,.8],.012,M.green);
  const probes=[dynamicLine(g,M.green,.013),dynamicLine(g,M.green,.013)];
  const lens=cyl(g,.4,.16,M.ceramic,[0,2.25,0]),beams=[];
  for(const x of [-.3,.3])beams.push(dynamicLine(g,M.green,.012));
  const spot=ball(g,.045,M.green),detector=box(g,.4,.16,.4,M.dark,[0,.52,0]);
  const focalTarget=marker(g,[0,focalPlaneY,.8]),differenceTarget=marker(g,[0,0,.8]);
  focalTarget.userData.objectLabel='焦平面';
  return rigResult(g,ctx=>{
    const u=ctx.a(.04,.85),x=mix(-1.3,1.3,u),focus=key==='focus';
    const h=heightAt(x);
    reference.visible=!focus;lens.visible=focus;detector.visible=!focus;
    focalPlane.visible=focalEdge.visible=focus;
    detector.position.set(x,.62,.25);spot.position.set(x,h,.25);
    const referenceY=focus?focalPlaneY:.31,spotRadius=focus?.045+.12*Math.abs(h-focalPlaneY)/amplitude:.045;
    spot.scale.set(spotRadius,.025,spotRadius);
    setSegment(probes[0],[x,referenceY,.78],[x,h,.78]);probes[0].visible=true;
    setSegment(probes[1],[x,.62,.25],[x,h,.25]);probes[1].visible=key==='flatness';
    beams.forEach((o,i)=>{
      const aperture=i?.3:-.3;o.visible=focus;
      setSegment(o,[x+aperture,2.17,.25],[x+aperture*(h-focalPlaneY)/(2.17-focalPlaneY),h,.25]);
    });
    lens.position.x=x;
    focalTarget.position.x=x;differenceTarget.position.set(x,(referenceY+h)/2,.78);
    return {heightExaggerated:true,qualitativeDiagram:true,surfaceGeometryFixed:true,materialRemoval:0,
      surfaceAmplitude:amplitude,surfaceSamples:[-1.3,-.65,0,.65,1.3].map(q=>[q,heightAt(q)]),
      probeX:x,surfaceHeight:h,referenceHeight:referenceY,heightDifference:referenceY-h,
      focalPlaneY,focusError:focus?h-focalPlaneY:undefined,spotRadius,
      opticalModel:focus?'Fixed focal plane; changing local surface height changes defocus footprint':undefined};
  },key==='focus'?[focalTarget,differenceTarget]:[spot,reference],
  {view:{eye:[2.3,1.9,8],look:[0,.75,0],span:7.0}});
}
function cleaningRig(parent){
  const g=group(parent),w=wafer(g,1.35);w.g.rotation.x=Math.PI/2;
  const tank=box(g,3.2,1.55,1.1,M.liquid,[0,-.9,0]);
  const nozzles=[];
  for(const sign of [-1,1]){
    tube(g,[[sign*1.8,1.8,.2],[sign*1.1,1.8,.2],[sign*.95,1.35,.2]],.045);
    nozzles.push(segment(g,[sign*.95,1.35,.2],[sign*.7,.55,.05],.022,M.liquid));
  }
  const particles=[];
  for(let i=0;i<18;i++){
    const a=i*2.4,r=1.1*Math.sqrt((i+.5)/18);
    particles.push({o:ball(g,.032,M.green),x:Math.cos(a)*r,y:Math.sin(a)*r,i});
  }
  const grips=[box(g,.13,.3,.3,M.ceramic,[-1.4,0,0]),box(g,.13,.3,.3,M.ceramic,[1.4,0,0])];
  return rigResult(g,ctx=>{
    const u=ctx.a(.04,.85);
    particles.forEach(({o,x,y,i})=>{
      o.position.set(x+u*(i%2?.6:-.6),y-u*1.6,.04+u*.25);
      o.visible=u<.95;
    });
    return {particlesRemoved:u,edgeHandling:true,cleaningSchematic:true};
  },[w.g,tank],{view:{eye:[3,1.8,8],look:[0,.15,0],span:7.0}});
}
function scanRig(parent){
  const g=group(parent),w=wafer(g,1.6,[0,-.7,0]);
  cyl(g,1.45,.18,M.dark,[0,-.81,0]);
  const detector=group(g);box(detector,.55,.35,.55,M.dark,[0,1.1,0]);cyl(detector,.16,.16,M.bright,[0,.85,0]);
  const beam=dynamicLine(g,M.green,.012),spot=ball(g,.035,M.green);
  box(g,.18,2.5,.3,M.dark,[-1.95,.35,-.8]);box(g,3.8,.18,.3,M.silver,[-.1,1.65,-.8]);
  const marks=[];
  for(const [x,z]of [[.5,.4],[-.75,-.3],[.1,-.95]])marks.push(ball(w.g,.018,M.amber,[x,w.h/2+.005,z]));
  return rigResult(g,ctx=>{
    const u=ctx.a(.04,.88),angle=u*18,r=1.4*Math.sqrt(u),x=Math.cos(angle)*r,z=Math.sin(angle)*r,y=-.7+w.h/2;
    detector.position.set(x,0,z);spot.position.set(x,y+.02,z);setSegment(beam,[x,.77,z],[x,y,z]);
    return {spot:[x,y,z],detector:[x,1.1,z],detectorTracksSpot:true,defectSizesExaggerated:true,scanProgress:u};
  },[spot,detector],{view:{eye:[3.6,3.4,8],look:[0,.3,0],span:8.8}});
}
function cassetteRig(key,parent){
  const g=group(parent),disks=[];
  box(g,3.1,.16,2.8,M.dark,[0,-2,0]);box(g,3.1,.16,2.8,M.dark,[0,2,0]);
  for(const x of [-1.48,1.48])box(g,.12,4,2.5,M.ceramic,[x,0,-.1]);
  box(g,3.1,4,.1,M.dark,[0,0,-1.4]);
  for(let i=0;i<25;i++){
    const y=-1.8+i*.15,w=wafer(g,1.35,[0,y,0]);disks.push(w);
    for(const x of [-1.4,1.4])box(g,.16,.035,2.25,M.dark,[x,y-.03,0]);
  }
  const arm=box(g,.22,.07,1.2,M.ceramic,[0,.0,2.2]);
  const stations=[],links=[],transfer=wafer(g,.6);
  transfer.g.visible=false;
  if(key==='industry'||key==='recap'){
    // Functional input/output stations, shown sequentially along a material path.
    for(let i=0;i<3;i++){
      const station=group(g);station.position.set(0,3.3-i*3.3,0);
      box(station,2.6,.15,2.1,M.dark);
      if(i===0)cyl(station,.65,.85,M.silicon,[0,.5,0]);
      if(i===1)wafer(station,1.05,[0,.15,0]);
      if(i===2)for(let j=0;j<3;j++)box(station,.5,.1,.5,M.silver,[(j-1)*.7,.15,0]);
      stations.push(station);
    }
    for(let i=0;i<2;i++)links.push(arrow(g,[1.1,2.1-i*2.6,.25],[1.1,.65-i*2.6,.25],M.green,.018));
  }
  return rigResult(g,ctx=>{
    const u=ctx.a(.04,.87),cassette=key==='cassette';
    for(const o of g.children)o.visible=cassette;
    if(cassette){
      disks[12].g.position.z=mix(1.5,0,u);arm.position.z=mix(2.2,.6,u);
    }else{
      stations.forEach((s,i)=>{s.visible=ctx.raw>=i*.28;s.position.y=(1-i)*2.6;});
      links.forEach((o,i)=>o.visible=ctx.raw>=.22+i*.3);
      arm.visible=false;transfer.g.visible=true;transfer.g.position.set(0,mix(2.8,-2.4,u),.85);
    }
    return {waferCount:cassette?25:undefined,edgeSlotHandling:cassette,materialPath:!cassette?u:undefined,
      industrySchematic:!cassette,physicalWaferScale:true};
  },key==='cassette'?[disks[12].g,arm]:[stations[1],transfer.g],
  {view:{eye:[3,1.8,9],look:[0,0,0],span:key==='cassette'?7.5:9.0}});
}
function recapRig(parent){
  const g=group(parent),quality=group(g),process=cassetteRig('industry',g);
  const sample=group(quality);sample.position.y=2.05;
  for(let i=0;i<24;i++)ball(sample,.085,M.silver,[(i%6-2.5)*.36,(Math.floor(i/6)-1.5)*.36,0]);
  const impurity=ball(sample,.11,M.green,[.18,.18,.12]);
  const crystal=buildDiamond(quality,{cells:2,spacing:1.12,atomRadius:.072});
  const latticeTarget=marker(crystal.g,crystal.points[58]);
  const geo=new T.PlaneGeometry(2.8,1.35,48,8);geo.rotateX(-Math.PI/2);
  const surface=new T.Mesh(geo,M.silicon);surface.position.y=-1.95;quality.add(surface);
  const pos=geo.attributes.position,original=pos.array.slice();
  const surfaceTarget=marker(quality,[0,-1.77,.5]),surfaceProbe=ball(quality,.055,M.green);
  const qualityAnchor=marker(quality,[0,1.95,0]),processAnchor=marker(g,[0,0,0]);
  return rigResult(g,ctx=>{
    const isQuality=/杂质.*原子.*表面/.test(ctx.beat.text);
    quality.visible=isQuality;process.g.visible=!isQuality;
    if(!isQuality){
      const data=process.update(ctx);
      qualityAnchor.position.set(0,0,0);processAnchor.position.set(0,0,0);
      return {...data,qualityControls:false,schematic:true};
    }
    const impurityWords=wordWindow(ctx.beat,'杂质'),latticeWords=wordWindow(ctx.beat,'原子的排列');
    const surfaceWords=wordWindow(ctx.beat,'表面的高低'),controlWords=wordWindow(ctx.beat,'控制');
    const impurityProgress=phase(ctx.time,impurityWords.start,impurityWords.end);
    const latticeProgress=phase(ctx.time,latticeWords.start,latticeWords.end);
    const surfaceProgress=phase(ctx.time,surfaceWords.start,surfaceWords.end);
    const surfaceControl=phase(ctx.time,controlWords.start,controlWords.end),amplitude=.18*(1-surfaceControl);
    impurity.position.set(.18+impurityProgress*.78,.18,.12+impurityProgress*.45);
    crystal.atoms.forEach((o,i)=>{
      const target=crystal.points[i],scatter=.17*(1-latticeProgress);
      o.position.set(target[0]+Math.sin(i*2.1)*scatter,target[1]+Math.cos(i*1.7)*scatter,
        target[2]+Math.sin(i*3.4)*scatter);
    });
    latticeTarget.position.copy(crystal.atoms[58].position);
    crystal.bonds.forEach(({o},i)=>o.visible=latticeProgress>=.6+.4*(i+1)/crystal.bonds.length);
    for(let i=0;i<pos.count;i++)pos.setY(i,amplitude*Math.cos(original[i*3]*5));
    pos.needsUpdate=true;geo.computeVertexNormals();
    const probeX=mix(-1.2,1.2,surfaceProgress);
    surfaceTarget.position.set(probeX,-1.95+amplitude*Math.cos(probeX*5),.5);
    surfaceProbe.position.copy(surfaceTarget.position);surfaceProbe.visible=ctx.time>=surfaceWords.start;
    const active=ctx.time<latticeWords.start?'impurity':ctx.time<surfaceWords.start?'lattice':'surface';
    if(active==='impurity')qualityAnchor.position.copy(impurity.position).add(sample.position);
    else if(active==='lattice')qualityAnchor.position.copy(latticeTarget.position);
    else qualityAnchor.position.copy(surfaceTarget.position);
    processAnchor.position.copy(surfaceTarget.position);
    return {qualityControls:true,schematic:true,activeQuality:active,impurityControl:impurityProgress,
      latticeProgress,surfaceProgress,surfaceControl,surfaceAmplitude:amplitude,lattice:'coherent diamond cubic',
      subactions:{
        impurity:{...impurityWords,progress:impurityProgress},
        lattice:{...latticeWords,progress:latticeProgress},
        surface:{...surfaceWords,progress:surfaceProgress},
        surfaceControl:{...controlWords,progress:surfaceControl},
      },localActionEnd:controlWords.end,
      semanticTargets:{impurity:impurity.getWorldPosition(new T.Vector3()).toArray(),
        lattice:latticeTarget.getWorldPosition(new T.Vector3()).toArray(),
        surface:surfaceTarget.getWorldPosition(new T.Vector3()).toArray()}};
  },[qualityAnchor,processAnchor],{view:{eye:[1.5,1.4,10],look:[0,.15,0],span:8.6},
    semanticAnchors:ctx=>/杂质.*原子.*表面/.test(ctx.beat.text)?[
      {text:'杂质',object:impurity,offset:[120,-65]},
      {text:'原子排列',object:latticeTarget,offset:[210,-65]},
      {text:'表面高低',object:surfaceTarget,offset:[-150,-85]},
    ]:[]});
}
export function finishingRig(key,parent){
  if(['wafer','wafer-measure'].includes(key))return waferRig(key,parent);
  if(['wire','kerf'].includes(key))return sawRig(key,parent);
  if(key==='trim')return trimRig(parent);
  if(key==='edge')return edgeRig(parent);
  if(['lap','etch','polish'].includes(key))return surfaceRig(key,parent);
  if(['flatness','focus'].includes(key))return diagramRig(key,parent);
  if(key==='wash')return cleaningRig(parent);
  if(key==='scan')return scanRig(parent);
  if(key==='recap')return recapRig(parent);
  return cassetteRig(key,parent);
}
