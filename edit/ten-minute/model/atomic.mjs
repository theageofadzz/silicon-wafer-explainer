import {T,V,M,group,box,ball,segment,marker,rigResult,buildDiamond,phase,mix} from './core.mjs';

export const atomicKeys=['purity','lattice','silica','grains','doping','epitaxy','defects'];
function semanticObject(object,name,label){
  object.name=name;object.userData.semantic=name;object.userData.objectLabel=label;return object;
}
function phraseWindow(beat,phrase){
  const words=beat.words||[],text=words.map(w=>w.text).join(''),start=text.indexOf(phrase);
  if(start<0)throw new Error(`Missing word-timed phrase "${phrase}" in ${beat.id}`);
  let cursor=0,first,last;
  for(const word of words){
    const end=cursor+word.text.length;
    if(cursor<start+phrase.length&&end>start){first??=word;last=word;}
    cursor=end;
  }
  return [first.start,last.end];
}
function pointDefectRig(parent){
  const g=group(parent),l=buildDiamond(g,{cells:2,spacing:1.5,atomRadius:.092});
  const adjacency=l.points.map(()=>[]);
  l.bonds.forEach(({i,j})=>{adjacency[i].push(j);adjacency[j].push(i);});
  const vacancy=l.points.reduce((best,p,i)=>l.degree[i]===4&&V(...p).distanceTo(V(-.25,0,.6))<
    V(...l.points[best]).distanceTo(V(-.25,0,.6))?i:best,l.degree.findIndex(n=>n===4));
  const finalSite=adjacency[vacancy].reduce((best,i)=>l.points[i][2]>l.points[best][2]?i:best);
  const startSite=l.points.reduce((best,p,i)=>i!==vacancy&&i!==finalSite&&p[2]>0&&
    V(...p).distanceTo(V(...l.points[finalSite]))>V(...l.points[best]).distanceTo(V(...l.points[finalSite]))?i:best,finalSite);
  const queue=[[startSite]],visited=new Set([vacancy,startSite]);
  let path=[startSite];
  for(let q=0;q<queue.length;q++){
    const route=queue[q],last=route.at(-1);
    if(last===finalSite){path=route;break;}
    for(const next of adjacency[last])if(!visited.has(next)){visited.add(next);queue.push([...route,next]);}
  }
  const vacancyMaterial=new T.MeshBasicMaterial({color:0x74cda4,toneMapped:false,depthTest:false});
  const vacancies=[0,1].map(()=>{
    const halo=new T.Mesh(new T.TorusGeometry(.145,.018,8,48),vacancyMaterial);
    halo.renderOrder=5;g.add(halo);return halo;
  });
  const toPoint=q=>q.map(v=>(v-3.5)*1.5/4);
  const interstitialSites=[toPoint([5,3,5]),toPoint([3,5,5])];
  for(const p of interstitialSites)if(l.points.some(q=>V(...q).distanceTo(V(...p))<1e-8))throw new Error('Interstitial coincides with a regular site');
  const extraMaterial=M.atom.clone();extraMaterial.color.setHex(0x63c99a);extraMaterial.emissive.setHex(0x17462e);
  const extras=interstitialSites.map(p=>ball(g,.12,extraMaterial,p));
  const departingMaterial=M.atom.clone();departingMaterial.transparent=true;
  const departing=ball(g,.092,departingMaterial,l.points[vacancy]);
  const vacancyAnchor=semanticObject(marker(g,l.points[vacancy]),'vacancy','空位');
  const interstitialAnchor=semanticObject(marker(g,interstitialSites[0]),'interstitial','间隙原子');
  const localLabels=[
    {text:'空位',object:vacancies[0],offset:[-110,-35]},
    {text:'间隙原子',object:extras[0],offset:[110,35]},
  ];
  const result=rigResult(g,ctx=>{
    const clustered=ctx.beat.id==='17-defects-02',introducing=ctx.beat.id==='17-defects-01';
    const u=ctx.a(.04,.88),occupancy=l.points.map((_,i)=>i);
    const timedProgress=phrase=>phase(Math.min(ctx.time,ctx.beat.actionEnd),...phraseWindow(ctx.beat,phrase));
    const removal=introducing?timedProgress('少一个原子'):1;
    const emergence=introducing?timedProgress('多一个原子'):ctx.a(.15,.88);
    if(removal>0)occupancy[vacancy]=null;
    let movingHole=l.points[vacancy],movingAtom=null,hop=null;
    if(clustered){
      occupancy[startSite]=null;
      const step=u*(path.length-1),completed=Math.min(path.length-1,Math.floor(step));
      for(let i=0;i<completed;i++){occupancy[path[i]]=occupancy[path[i+1]];occupancy[path[i+1]]=null;}
      if(completed<path.length-1){
        const from=path[completed],to=path[completed+1],p=phase(step-completed,0,1);
        movingAtom=occupancy[to];hop={from,to,p};
        movingHole=V(...l.points[from]).lerp(V(...l.points[to]),p).toArray();
      }else movingHole=l.points[path.at(-1)];
    }
    l.atoms.forEach(o=>{o.visible=false;o.scale.setScalar(.092);});
    occupancy.forEach((atom,site)=>{
      if(atom===null)return;
      l.atoms[atom].visible=true;l.atoms[atom].position.set(...l.points[site]);
    });
    if(hop)l.atoms[movingAtom].position.copy(V(...l.points[hop.to]).lerp(V(...l.points[hop.from]),hop.p));
    l.bonds.forEach(({o,i,j})=>{
      o.visible=occupancy[i]!==null&&occupancy[j]!==null&&(!hop||![i,j].includes(hop.to));
    });
    departing.visible=introducing&&removal>0&&removal<1;
    departing.position.copy(V(...l.points[vacancy]).add(V(-1.15,.45,1).multiplyScalar(removal)));
    departingMaterial.opacity=1-phase(removal,.55,1);
    vacancies[0].position.set(...l.points[vacancy]);vacancies[0].visible=removal>.5;
    vacancies[0].scale.setScalar(1+u*.12);
    vacancies[1].visible=clustered;vacancies[1].position.set(...movingHole);
    vacancies[1].scale.setScalar(1+u*.12);
    extras.forEach((o,i)=>{
      o.visible=clustered||(i===0&&emergence>0);
      const target=V(...interstitialSites[i]);
      if(clustered){
        const initial=V(...toPoint(i?[7,3,3]:[1,5,3]));
        o.position.copy(initial.lerp(target,u));o.position.z+=Math.sin(u*Math.PI)*.35;
        o.scale.setScalar(.12);
      }else{
        o.position.copy(target.add(V(.65,.4,.45).multiplyScalar(1-emergence)));
        o.scale.setScalar(.12*emergence);
      }
    });
    vacancyAnchor.position.copy(V(...l.points[vacancy]));
    if(clustered)vacancyAnchor.position.lerp(V(...movingHole),.5);
    interstitialAnchor.position.copy(extras[0].position);
    if(clustered)interstitialAnchor.position.lerp(extras[1].position,.5);
    vacancyAnchor.userData.semantic=clustered?'vacancy-cluster':'vacancy';
    interstitialAnchor.userData.semantic=clustered?'interstitial-cluster':'interstitial';
    return {pointDefects:true,structure:l.basis,coherentOrientation:true,
      vacancyCount:clustered?2:Number(removal>0),interstitialCount:clustered?2:Number(emergence>0),
      atomRemovalProgress:removal,interstitialEmergenceProgress:emergence,
      initialLatticeIntact:introducing&&removal===0&&emergence===0,
      wordActions:introducing?{vacancy:phraseWindow(ctx.beat,'少一个原子'),interstitial:phraseWindow(ctx.beat,'多一个原子')}:undefined,
      missingRegularSites:occupancy.map((atom,site)=>atom===null?site:null).filter(v=>v!==null),
      vacancySites:clustered?[l.points[vacancy],movingHole]:removal>0?[l.points[vacancy]]:[],
      interstitialPositions:extras.filter(o=>o.visible).map(o=>o.position.toArray()),
      interstitialRegularSiteCoincidence:extras.some(o=>o.visible&&l.points.some(p=>V(...p).distanceTo(o.position)<1e-8)),
      clustering:clustered,clusterProgress:clustered?u:undefined,
      vacancyHopPath:clustered?path:undefined,migrationIsSchematic:clustered,relaxedAtomistics:false,
      atomicScale:true,anchorRoles:[vacancyAnchor.userData.semantic,interstitialAnchor.userData.semantic]};
  },[vacancyAnchor,interstitialAnchor],{view:{eye:[1,4.5,10],look:[0,0,0],span:7.5},
    semanticAnchors:ctx=>{
      if(ctx.beat.id==='17-defects-01'){
        const end=Math.min(ctx.time,ctx.beat.actionEnd);
        return localLabels.filter((_,i)=>end>=phraseWindow(ctx.beat,i?'多一个原子':'少一个原子')[1]);
      }
      return localLabels.filter(entry=>entry.object.visible);
    }});
  return result;
}
export function atomicRig(key,parent){
  if(key==='defects')return pointDefectRig(parent);
  const g=group(parent);
  if(key==='silica'){
    const centre=ball(g,.23,M.atom),oxygen=[],bonds=[];
    for(const q of [[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]]){
      const p=q.map(v=>v*.65),tangent=V(...q).cross(V(0,1,0)).normalize().multiplyScalar(.65);
      const outer=V(...q).multiplyScalar(1.17).add(tangent).toArray();
      oxygen.push(ball(g,.18,M.green,p));
      bonds.push(segment(g,[0,0,0],p,.035),segment(g,p,outer,.035));
      ball(g,.23,M.atom,outer);
    }
    return rigResult(g,ctx=>{
      bonds.forEach((o,i)=>o.visible=ctx.raw>=i/12);
      return {coordination:4,structure:'local corner-sharing Si-O tetrahedron; network continues',atomicScale:true};
    },[centre,oxygen[0]],{view:{eye:[4,2.7,8],look:[0,0,0],span:8.2}});
  }
  if(key==='purity'){
    const units=group(g),atoms=[];
    for(let i=0;i<100;i++){
      const x=(i%10-4.5)*.32,y=(Math.floor(i/10)-4.5)*.32;
      atoms.push(ball(units,.09,i===55?M.green:M.atom,[x,y,0]));
    }
    const comparison=group(g),benchmark=group(comparison),remainder=group(comparison),parts=[];
    benchmark.position.y=.8;remainder.position.y=-.65;
    for(let i=0;i<10;i++){
      box(benchmark,.274,.26,.2,M.green,[-1.5+i*.3+.137,0,0]);
      box(remainder,.282,.28,.16,M.dark,[-1.5+i*.3+.137,0,-.035]);
      parts.push(box(remainder,.274,.26,.2,M.green,[-1.5+i*.3+.137,0,.015]));
    }
    const impurity=atoms[55],impurityAnchor=semanticObject(marker(g,[.14,.14,.08]),'impurity-unit','示意杂质单位');
    const unitsAnchor=semanticObject(marker(g,[0,0,0]),'hundred-units','100份示意单位');
    const benchmarkAnchor=semanticObject(marker(benchmark,[0,0,.1]),'tenfold-benchmark','固定基准：10份');
    const remainderAnchor=semanticObject(marker(remainder,[0,0,.12]),'tenfold-remainder','残余杂质相对量');
    const locals=[{text:'剩余杂质相对量',object:benchmarkAnchor,offset:[0,-45]},
      {text:'10 → 1',object:remainderAnchor,offset:[0,45]}];
    const result=rigResult(g,ctx=>{
      const u=ctx.a(.04,.94),tenfold=ctx.beat.id==='02-purity-02';
      units.visible=!tenfold;comparison.visible=tenfold;
      impurity.scale.setScalar(.09*(1+u*.5));impurity.position.z=u*.4;
      const remaining=mix(10,1,u);
      parts.forEach((o,i)=>{
        const fraction=Math.max(0,Math.min(1,remaining-i));
        o.visible=fraction>0;o.scale.x=Math.max(.00001,fraction);
        o.position.x=-1.5+i*.3+.137*fraction;
      });
      remainderAnchor.position.x=-1.5+(remaining*.3-.026)/2;
      impurityAnchor.position.copy(impurity.position);
      result.anchors.splice(0,2,...(tenfold?[benchmarkAnchor,remainderAnchor]:[unitsAnchor,impurityAnchor]));
      return {schematic:true,notAConcentrationMeasurement:true,
        illustratedUnits:tenfold?undefined:100,illustratedOtherUnits:tenfold?undefined:1,
        comparisonUnits:tenfold?'relative remaining impurity':undefined,
        benchmarkUnits:tenfold?10:undefined,remainingUnits:tenfold?remaining:undefined,
        relativeImpurityRemainder:tenfold?remaining/10:undefined,
        benchmarkCells:tenfold?10:undefined,remainderCells:tenfold?parts.map(o=>o.visible?o.scale.x:0):undefined,
        anchorRoles:tenfold?['tenfold-benchmark','tenfold-remainder']:['hundred-units','impurity-unit']};
    },[unitsAnchor,impurityAnchor],{view:{eye:[1.1,1,10],look:[0,0,0],span:6.8},
      semanticAnchors:ctx=>ctx.beat.id==='02-purity-02'?locals:[]});
    return result;
  }
  if(key==='grains'){
    const grains=[];
    for(let i=0;i<3;i++){
      const l=buildDiamond(g,{cells:2,spacing:.85,atomRadius:.067});
      l.g.position.set(0,(i-1)*1.85,0);
      l.g.rotation.set(.15+i*.31,i*.53,.12-i*.23);grains.push(l);
    }
    const boundary=box(g,1.9,.022,1.9,M.green,[0,.9,0]);
    return rigResult(g,ctx=>{
      const u=ctx.a(.05,.8);
      grains.forEach((l,i)=>l.g.position.y=(i-1)*mix(2.25,1.72,u));
      boundary.position.y=grains[2].g.position.y/2;
      boundary.visible=ctx.raw>.6;
      return {orientations:grains.map(l=>l.g.rotation.toArray().slice(0,3)),orientationsStayDistinct:true,grainBoundaryVisible:boundary.visible};
    },[grains[0].atoms[30],boundary],{view:{eye:[3,2,10],look:[0,0,0],span:7.8}});
  }
  const l=buildDiamond(g,{cells:key==='epitaxy'?3:2,spacing:key==='epitaxy'?.86:1.5,atomRadius:.1});
  if(key==='epitaxy'){
    // Reveal only complete crystallographic levels from the same diamond network.
    const levels=[...new Set(l.points.map(p=>p[1]))].sort((a,b)=>a-b);
    const substrateTop=levels[5],growthLevels=levels.slice(6);
    box(g,2.7,.22,2.7,M.dark,[0,levels[0]-.22,0]);
    const newMaterial=M.atom.clone();newMaterial.color.setHex(0x77d5aa);
    newMaterial.emissive.setHex(0x16482d);newMaterial.emissiveIntensity=.12;
    l.atoms.forEach((o,i)=>o.material=l.points[i][1]>substrateTop?newMaterial:M.atom);
    l.bonds.forEach(({o,i,j})=>o.material=l.points[i][1]>substrateTop||l.points[j][1]>substrateTop?M.green:M.silver);
    const substrateIndex=l.points.reduce((best,p,i)=>p[1]<=substrateTop&&V(...p).distanceTo(V(-.7,substrateTop-.4,.9))<
      V(...l.points[best]).distanceTo(V(-.7,substrateTop-.4,.9))?i:best,0);
    const substrateAnchor=semanticObject(marker(g,l.points[substrateIndex]),'substrate','衬底');
    const newLayerAnchor=semanticObject(marker(g,[.6,growthLevels[0],.8]),'new-layer','新生外延层');
    const thickness=segment(g,[1.43,substrateTop,.8],[1.43,levels.at(-1),.8],.012,M.green);
    const tick0=segment(g,[1.33,substrateTop,.8],[1.53,substrateTop,.8],.012,M.green);
    const tick1=segment(g,[1.33,levels.at(-1),.8],[1.53,levels.at(-1),.8],.012,M.green);
    return rigResult(g,ctx=>{
      const front=mix(growthLevels[0]+.001,levels.at(-1)+.001,ctx.a(.08,.86));
      const size=i=>l.points[i][1]<=substrateTop?1:phase(front,l.points[i][1]-.11,l.points[i][1]);
      l.atoms.forEach((o,i)=>{o.visible=size(i)>.001;o.scale.setScalar(.1*size(i));});
      l.bonds.forEach(({o,i,j})=>o.visible=size(i)>.99&&size(j)>.99);
      const topLevel=growthLevels.filter(v=>v<=front).at(-1);
      const visibleTop=l.points.map((p,i)=>({p,i})).filter(({p})=>Math.abs(p[1]-topLevel)<1e-8)
        .sort((a,b)=>b.p[2]-a.p[2]||Math.abs(a.p[0]-.5)-Math.abs(b.p[0]-.5))[0];
      newLayerAnchor.position.set(...visibleTop.p);
      const h=Math.max(.001,topLevel-substrateTop),originalHeight=levels.at(-1)-substrateTop;
      thickness.position.y=(substrateTop+topLevel)/2;thickness.scale.y=h/originalHeight;tick1.position.y=topLevel;
      return {coherentDiamondSites:true,layersGrown:growthLevels.filter(v=>v<=front).length,substrateTop,front,atomicScale:true,
        substrateColor:'white',newLayerColor:'mint',interfaceY:substrateTop,newLayerAnchorSite:visibleTop.i,
        initialCoherentGrowthLevels:1,layerThicknessNotToScale:true,anchorRoles:['substrate','new-layer']};
    },[substrateAnchor,newLayerAnchor],{view:{eye:[4.7,3.1,8],look:[0,0,0],span:8.0},
      semanticAnchors:[{text:'衬底',object:substrateAnchor,offset:[-110,45]},
        {text:'新生外延层',object:newLayerAnchor,offset:[110,-45]}]});
  }
  const qualityDefects=key==='lattice'?pointDefectRig(g):null;
  if(qualityDefects)qualityDefects.g.visible=false;
  const centre=l.points.reduce((best,p,i)=>l.degree[i]===4&&V(...p).length()<V(...l.points[best]).length()?i:best,l.degree.findIndex(n=>n===4));
  const site=l.atoms[centre],target=l.points[centre];
  const neighbours=l.bonds.filter(b=>b.i===centre||b.j===centre).map(b=>b.i===centre?b.j:b.i);
  // Retain the tetrahedron and remove foreground clutter around the site.
  const normal=V(4,2,8).normalize(),origin=V(...target),keep=new Set([centre,...neighbours]);
  l.atoms.forEach((o,i)=>o.visible=key==='lattice'||keep.has(i)||V(...l.points[i]).sub(origin).dot(normal)<-.16);
  l.bonds.forEach(({o,i,j})=>o.visible=l.atoms[i].visible&&l.atoms[j].visible);
  const incoming=ball(g,.1,M.amber,[2.8,1,0]),highlight=marker(g,target);
  semanticObject(highlight,key==='doping'?'substitutional-site':'crystal-site',key==='doping'?'受控掺杂原子':'单晶晶格位点');
  const result=rigResult(g,ctx=>{
    const pointQuality=key==='lattice'&&ctx.beat.id==='17-defects-03';
    if(qualityDefects)qualityDefects.g.visible=pointQuality;
    l.g.visible=!pointQuality;
    if(pointQuality){
      incoming.visible=false;result.anchors.splice(0,2,...qualityDefects.anchors);
      return qualityDefects.update(ctx);
    }
    result.anchors.splice(0,2,highlight,l.atoms[neighbours[0]]);
    const u=ctx.a(.1,.7);
    if(key==='doping'){
      incoming.visible=u<1;incoming.position.set(mix(2.8,target[0],u),mix(1,target[1],u),mix(0,target[2],u));
      site.material=u>=1?M.amber:M.atom;
      site.visible=true;highlight.position.copy(u<1?incoming.position:site.position);
    }else{
      incoming.visible=false;site.visible=true;site.material=M.atom;highlight.position.set(...target);
      l.bonds.forEach(({o,i,j},k)=>{o.visible=l.atoms[i].visible&&l.atoms[j].visible&&ctx.raw>=k/l.bonds.length*.7;});
    }
    return {structure:l.basis,nearestNeighbours:neighbours.length,maxCoordination:Math.max(...l.degree),
      nearestDistance:l.nearestDistance,substitutional:key==='doping',concentrationNotToScale:key==='doping',atomicScale:true};
  },[highlight,l.atoms[neighbours[0]]],{view:{eye:[3.2,2,7],look:[0,0,0],span:6.3},
    semanticAnchors:ctx=>key==='lattice'&&ctx.beat.id==='17-defects-03'?qualityDefects.semanticAnchors(ctx):
      key==='doping'?[{text:'受控掺杂原子',object:highlight,offset:[90,-35]}]:[]});
  return result;
}
