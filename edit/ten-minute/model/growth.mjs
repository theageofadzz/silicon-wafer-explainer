import {T,M,group,box,cyl,ball,ring,segment,dynamicLine,setSegment,tube,arrow,lathe,openCup,marker,rigResult,mix,phase} from './core.mjs';

export const growthKeys=['furnace','distill','siemens','melt','seed','neck','shoulder','growth','support','magnetic','oxygen','segregation'];
function neckDetailRig(parent){
  const g=group(parent),radius=.475,top=.95;
  const shell=M.silicon.clone();shell.transparent=true;shell.opacity=.22;shell.depthWrite=false;shell.side=T.DoubleSide;
  const red=new T.MeshBasicMaterial({color:0xe34842,toneMapped:false});
  const neck=cyl(g,radius,1,shell),seed=cyl(g,.56,.65,shell,[0,top+.325,0]);
  const rim=ring(g,radius,M.silver,[0,top,0],.014),bottomRim=ring(g,radius,M.silver,undefined,.014);
  const melt=cyl(g,1.08,.07,M.hot),paths=[];
  for(const sign of [-1,1]){
    const lines=[dynamicLine(g,red,.026),dynamicLine(g,red,.026)];
    const end=ball(g,.05,red);
    paths.push({sign,lines,end});
  }
  const section=marker(g,[radius,0,0]),lineAnchor=marker(g,[0,top,.12]),exitAnchor=marker(g,[radius,0,0]);
  section.name='magnified-neck';section.userData.objectLabel='局部放大的细颈';
  lineAnchor.name='red-dislocation';lineAnchor.userData.objectLabel='红色位错示意线';
  exitAnchor.name='sidewall-termination';exitAnchor.userData.objectLabel='位错与细颈侧壁的交点';
  const result=rigResult(g,ctx=>{
    const u=ctx.a(.04,.86),length=mix(1.3,2.85,u),base=top-length;
    neck.scale.y=length;neck.position.y=(top+base)/2;
    bottomRim.position.y=base;melt.position.y=base-.035;
    const exit=ctx.a(.1,.78),endpoints=[];
    paths.forEach(({sign,lines,end})=>{
      const z=.18,x=sign*Math.sqrt(radius*radius-z*z);
      const start=[sign*.08,top+.48,.13],kink=[sign*.17,top-.1,.16];
      const endpoint=[mix(sign*.17,x,exit),mix(top-.28,top-.72,exit),mix(.16,z,exit)];
      setSegment(lines[0],start,kink);setSegment(lines[1],kink,endpoint);
      end.position.set(...endpoint);end.visible=exit>=1;endpoints.push(endpoint);
    });
    section.position.set(radius,(top+base)/2,.08);
    lineAnchor.position.set(.17,top-.1,.16);exitAnchor.position.set(...endpoints[1]);
    const first=ctx.beat.id==='12-neck-01',third=ctx.beat.id==='12-neck-03';
    result.anchors.splice(0,2,...(first?[lineAnchor,section]:third?[lineAnchor,exitAnchor]:[section,exitAnchor]));
    return {localNeckEnlargement:true,linearMagnification:5,geometryScaleIsSchematic:true,referenceFrame:'attached to seed',
      neckRadius:radius,neckHeight:length,solidBottom:base,meltSurface:base,connectedToMelt:true,
      dislocationColor:'#e34842',dislocationIsSchematic:true,notVisibleCracks:true,
      dislocationEndpoints:endpoints,endpointRadii:endpoints.map(p=>Math.hypot(p[0],p[2])),
      sidewallTerminationComplete:exit===1,lowerNeckFreeOfDislocationLines:true,
      defectTermination:exit===1?'actual neck sidewall; paths retained in upper crystal':'propagating toward neck sidewall',
      anchorRoles:result.anchors.map(o=>o.name),timeCompressed:true};
  },[lineAnchor,section],{view:{eye:[.65,.7,10],look:[0,-.1,0],span:6.8},
    detailView:{eye:[-.45,.4,10],look:[0,-.1,0],span:6.8}});
  return result;
}
function chemicalRig(key,parent){
  const g=group(parent);
  if(key==='furnace'){
    openCup(g,1.65,-.7);
    const melt=cyl(g,1.53,.06,M.hot,[0,-.36,0]),charge=[];
    for(let i=0;i<30;i++){
      const a=i*2.39996,r=1.28*Math.sqrt((i+.5)/30);
      const o=new T.Mesh(new T.IcosahedronGeometry(.14+(i%3)*.025,0),i%3?M.ceramic:M.dark);
      o.position.set(Math.cos(a)*r,-.03+(i%3)*.1,Math.sin(a)*r);g.add(o);charge.push(o);
    }
    for(const [x,z]of [[-.75,-.25],[.75,-.25],[0,.72]])cyl(g,.17,2.6,M.dark,[x,1.4,z]);
    const stream=dynamicLine(g,M.hot,.05),receiver=cyl(g,.47,.1,M.hot,[2.05,-1.63,.1]);
    tube(g,[[1.4,-.4,0],[1.8,-.5,0],[2.05,-.75,.1]],.09,M.dark);
    return rigResult(g,ctx=>{
      const heat=ctx.a(0,.55),pour=ctx.a(.55,.9);
      charge.forEach(o=>{o.scale.setScalar(1-.9*heat);o.position.y=-.03-.26*heat;});
      setSegment(stream,[2.05,-.75,.1],[2.05,mix(-.75,-1.58,pour),.1]);stream.visible=pour>0;
      receiver.scale.y=.1+.9*pour;melt.visible=true;
      return {heatedCharge:heat,pour,product:'metallurgical silicon, not yet electronic grade',timeCompressed:true};
    },[charge[14],receiver],{view:{eye:[4.5,3.3,9],look:[.3,.3,0],span:7.1}});
  }
  if(key==='distill'){
    const trays=[],molecules=[],towers=[];
    for(let j=0;j<2;j++){
      const tower=group(g);tower.position.x=(j-.5)*1.9;towers.push(tower);
      meshShell(tower,.52,4.3,0);
      for(let k=0;k<7;k++)trays.push(cyl(tower,.5,.035,M.silver,[0,-1.8+k*.6,0]));
      for(let i=0;i<12;i++)molecules.push({o:ball(tower,.052,i%4?M.green:M.amber),i,j});
      cyl(tower,.55,.1,M.dark,[0,-2.2,0]);cyl(tower,.52,.12,M.silver,[0,2.2,0]);
    }
    tube(g,[[-.95,2.25,0],[-.95,2.65,0],[.95,2.65,0],[.95,2.25,0]],.055);
    const out=marker(g,[1.65,-1.6,0]);tube(g,[[.95,-1.9,0],[1.65,-1.9,0],[1.65,-1.1,0]],.06);
    return rigResult(g,ctx=>{
      const u=ctx.a(.02,.88);
      molecules.forEach(({o,i,j})=>{
        const height=mix(-1.8+(i/12)*2,1.95,u);
        o.position.set(Math.sin(i*2.4)*.25,height-(i%4===0?u*2.8:0),.3+j*.01);
      });
      return {fractionation:u,schematic:true,separationByVolatility:true,noPurityMeasurement:true};
    },[towers[0],out],{view:{eye:[4,2.3,10],look:[0,.2,0],span:7.1}});
  }
  const rods=[],bridges=[];
  cyl(g,1.7,.18,M.dark,[0,-1.7,0]);
  for(const z of [-.45,.45]){
    for(const x of [-.58,.58])rods.push(cyl(g,.08,2.9,M.hot,[x,-.15,z]));
    const bridge=cyl(g,.08,1.16,M.hot,[0,1.3,z]);bridge.rotation.z=Math.PI/2;bridges.push(bridge);
    for(const x of [-.58,.58])cyl(g,.18,.25,M.ceramic,[x,-1.55,z]);
  }
  meshShell(g,1.62,3.5,.1);
  const inlet=arrow(g,[-2,-1.25,.3],[-1,-1.25,.3]);
  return rigResult(g,ctx=>{
    const u=ctx.a(.05,.88),r=1+u*2.9;
    rods.forEach(o=>o.scale.set(r,1,r));bridges.forEach(o=>o.scale.set(r,1,r));
    inlet.visible=ctx.raw<.9;
    return {depositionRadiusFactor:r,rodLengthConstant:true,timeCompressed:true};
  },[rods[0],inlet],{view:{eye:[4.5,2.4,8],look:[0,.1,0],span:6.3}});
}
function meshShell(parent,r,h,y){
  const o=new T.Mesh(new T.CylinderGeometry(r,r,h,64,1,true,Math.PI*.15,Math.PI*.95),M.dark);
  o.position.y=y;parent.add(o);return o;
}
export function growthRig(key,parent){
  if(['furnace','distill','siemens'].includes(key))return chemicalRig(key,parent);
  if(key==='neck')return neckDetailRig(parent);
  const g=group(parent),surface=-1,crystal=group(g);
  const cup=openCup(g,1.85,-1.42),melt=cyl(g,1.73,.055,M.hot,[0,surface-.0275,0]);
  const heater=ring(g,1.97,M.dark,[0,-1.8,0],.1);
  const body=cyl(crystal,.66,1,M.silicon),shoulder=cyl(crystal,.66,.48,M.silicon,undefined,.095);
  const shoulderPos=shoulder.geometry.attributes.position,shoulderOriginal=shoulderPos.array.slice();
  const neck=cyl(crystal,.095,1,M.silicon),seed=cyl(crystal,.13,.42,M.silver),chuck=cyl(crystal,.23,.25,M.dark);
  const cable=dynamicLine(g,M.silver,.025);
  const charge=[];
  for(let i=0;i<25;i++){
    const a=i*2.4,r=1.48*Math.sqrt((i+.5)/25),o=new T.Mesh(new T.IcosahedronGeometry(.16,0),M.silicon);
    o.position.set(Math.cos(a)*r,surface+.18+(i%3)*.08,Math.sin(a)*r);g.add(o);charge.push(o);
  }
  const arms=[];
  for(const sign of [-1,1]){
    const arm=box(g,.75,.12,.28,M.dark,[sign*1.3,0,.05]);arms.push(arm);
    segment(g,[sign*1.78,-1.95,-.1],[sign*1.78,2.5,-.1],.045);
  }
  const field=group(g),convection=[];
  for(const sign of [-1,1]){
    box(field,.16,2.3,.85,M.dark,[sign*2.22,-.6,0]);
  }
  for(let i=0;i<3;i++)arrow(field,[-2,-1.3+i*.55,.65],[2,-1.3+i*.55,.65],M.green,.012);
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2+.4,r=.95,x=Math.cos(a)*r,z=Math.sin(a)*r;
    const line=dynamicLine(g,M.green,.015),head=cyl(g,.055,.14,M.green,undefined,0);
    convection.push({line,head,x,z,i});
  }
  const oxygen=[],dopants=[];
  for(let i=0;i<9;i++){
    oxygen.push(ball(g,.043,M.green));dopants.push(ball(g,.04,M.green));
  }
  const meltAnchor=marker(g,[.95,surface,.25]),bodyAnchor=marker(crystal,[.66,.2,.1]);
  const interfaceAnchor=marker(crystal,[.5,surface,.2]);
  return rigResult(g,ctx=>{
    let height=2.15,radius=.66,neckHeight=.6,base=surface;
    const u=ctx.a(.03,.85);
    if(key==='melt'){height=0;}
    if(key==='seed'){height=0;neckHeight=.08;base=mix(surface+1.55,surface,u);}
    if(key==='shoulder'){height=0;radius=mix(.095,.66,u);neckHeight=.65;}
    if(['growth','support','segregation'].includes(key))height=mix(.25,2.25,u);
    const hasShoulder=!['melt','seed','neck'].includes(key);
    const shoulderH=hasShoulder?.48:0,top=base+height+shoulderH,neckTop=top+neckHeight;
    crystal.visible=key!=='melt';crystal.rotation.y=ctx.a(0,.9)*Math.PI*1.6;
    body.visible=height>0;body.scale.set(radius/.66,Math.max(.001,height),radius/.66);body.position.y=base+height/2;
    shoulder.visible=hasShoulder;shoulder.position.y=base+height+.24;
    for(let i=0;i<shoulderPos.count;i++){
      const t=(shoulderOriginal[i*3+1]+.24)/.48,originalRadius=mix(.66,.095,t),targetRadius=mix(radius,.095,t);
      shoulderPos.setX(i,shoulderOriginal[i*3]*targetRadius/originalRadius);
      shoulderPos.setZ(i,shoulderOriginal[i*3+2]*targetRadius/originalRadius);
    }
    shoulderPos.needsUpdate=true;shoulder.geometry.computeVertexNormals();
    neck.scale.y=neckHeight;neck.position.y=top+neckHeight/2;
    seed.position.y=neckTop+.21;chuck.position.y=neckTop+.54;
    setSegment(cable,[0,neckTop+.665,0],[0,5.1,0]);
    charge.forEach((o,i)=>{
      o.visible=key==='melt'&&u<.995;o.scale.setScalar(Math.max(.01,1-u));
      o.position.y=surface+.18+(i%3)*.08-u*.25;
    });
    const support=key==='support'?ctx.a(.45,.85):0;
    arms.forEach((o,i)=>{
      o.visible=key==='support';o.position.set((i?1:-1)*mix(1.65,1.0,support),base+height-.06,.05);
    });
    field.visible=key==='magnetic'&&ctx.raw>.08;
    convection.forEach(({line,head,x,z,i})=>{
      const visible=key==='magnetic';line.visible=head.visible=visible;
      const amplitude=mix(.58,.07,u),z1=z-.13,z2=z1+.26*amplitude/.58;
      setSegment(line,[x,surface+.06,z1],[x+amplitude,surface+.06,z2]);
      head.position.set(x+amplitude,surface+.06,z2);head.quaternion.copy(line.quaternion);head.scale.setScalar(amplitude/.58);
    });
    oxygen.forEach((o,i)=>{
      o.visible=key==='oxygen';
      const p=phase(ctx.raw,i*.035,.65+i*.025),a=i*2.4;
      o.position.set(mix(Math.cos(a)*1.7,.35*Math.cos(a),p),mix(surface-.15,base+height*(i+.5)/9,p),mix(Math.sin(a)*1.7,.35*Math.sin(a),p));
    });
    dopants.forEach((o,i)=>{
      o.visible=key==='segregation';
      const a=i*2.4;
      // Count and positions are illustrative, never a concentration profile.
      const incorporation=i<4?ctx.a(.12+i*.1,.4+i*.1):0;
      const r=mix(1.25,.48,incorporation);
      o.position.set(Math.cos(a)*r,mix(surface+.055,base+height*(i+1)/5,incorporation),Math.sin(a)*r);
    });
    bodyAnchor.position.set(radius,base+height*.6,.08);
    if(key==='shoulder')bodyAnchor.position.set(radius*.75,base+height+.24,.08);
    interfaceAnchor.position.set(radius*.85,base+.025,.1);
    return {meltSurface:surface,solidBottom:base,solidHeight:height,diameter:radius*2,neckHeight,
      rotation:crystal.rotation.y,connectedToMelt:Math.abs(base-surface)<1e-9,
      shoulderTopRadius:.095,shoulderBottomRadius:radius,
      convectionAmplitude:key==='magnetic'?mix(.58,.07,u):undefined,
      distributionSchematic:key==='segregation',oxygenTransfer:key==='oxygen'?u:undefined,
      noConcentrationMeasurement:true,timeCompressed:true};
  },key==='melt'?[meltAnchor,charge[12]]:key==='oxygen'?[cup,oxygen[4]]:key==='magnetic'?[field,meltAnchor]:
    ['growth','shoulder'].includes(key)?[bodyAnchor,interfaceAnchor]:
    key==='support'?[arms[0],bodyAnchor]:[seed,bodyAnchor],
  {view:{eye:[4,2.6,10],look:[0,.9,0],span:9.4},
    detailView:{eye:[2.5,1.4,8],look:[0,.9,0],span:9.4}});
}
