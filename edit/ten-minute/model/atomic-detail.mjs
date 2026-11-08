import {T,V,M,group,box,ball,cyl,ring,segment,tube,wafer,phase,mix} from './core.mjs';

export const atomicDetailSources=[
  {url:'https://www.sumcosi.com/english/products/process/',use:'Single-wafer epitaxy: heated wafer, process gas, surface incorporation; optional product route.'},
  {url:'https://www.siltronic.com/fileadmin/investorrelations/2026/Q1/20260429_Siltronic_InvestorPresentation__.pdf',
    page:14,use:'Epitaxy: lamp heating above/below, wafer supported by a susceptor, process gas across the wafer.'},
];
export const atomicScientificBoundaries=[
  'Specimen, physical wafer, magnified section and atomic network are separate scales; camera cuts do not imply equal dimensions.',
  'Quartz fracture and milky internal scatterers are qualitative specimen features, never a purity test or a quartz unit-cell reconstruction.',
  'Si-O tetrahedra show a continued local network. Reduction shows the overall oxygen transfer, not an elementary reaction trajectory.',
  'Diamond-cubic nearest-neighbour connectivity is retained. Vacancy guides indicate an absent regular site, not bonds to a missing atom.',
  'Interstitial positions, thermal motion, migration, dopant numbers and carrier transport are qualitative, not relaxed atomistics or measured concentrations.',
  'The epitaxy chamber is a generic cutaway based on supplier process diagrams, not a dimensioned replica. Gas markers are transport tracers, not pure silicon gas molecules.',
  'Magnified epitaxy thickness and atom colours are illustrative. The physical wafer retains its diameter/thickness ratio; no separate film is glued onto it.',
  'Purity counts remain exactly 99+1, 98+2 and 99+1; the tenfold reference stays fixed while the remainder decreases from ten units to one.',
];

const tag=(o,name)=>{o.name=name;return o;};
const context=(parent,name)=>{const g=tag(group(parent),name);g.userData.contextOnly=true;return g;};
const pearl=new T.MeshStandardMaterial({color:0xdce3e1,metalness:.05,roughness:.34,transparent:true,opacity:.36,depthWrite:false});
const faint=new T.MeshStandardMaterial({color:0x8ea49b,metalness:.05,roughness:.6,transparent:true,opacity:.17,depthWrite:false,side:T.DoubleSide});

// A closed fragment with a curved shell fracture, rather than a crystal-shaped cone.
function fractureGeometry(){
  const positions=[],count=40,rings=7,front=[],back=[];
  const point=(u,a,rear=false)=>{
    const hex=Math.cos(Math.PI/6)/Math.cos(((a+Math.PI*4)%(Math.PI/3))-Math.PI/6);
    const edge=hex*(1+.055*Math.sin(a*3+.4)+.035*Math.sin(a*7));
    const x=.48*u*Math.cos(a)*edge+(rear?.12:0),y=.72*u*Math.sin(a)*edge+(rear?-.06:0);
    const z=rear?-.62+.045*Math.cos(a*3)*u:
      .16+.25*(1-u*u)+.014*Math.sin(u*27+a*.35)*u*(1-u);
    return [x,y,z];
  };
  const tri=(a,b,c)=>positions.push(...a,...b,...c);
  for(let j=0;j<=rings;j++){
    front[j]=[];back[j]=[];
    for(let i=0;i<count;i++){
      front[j].push(point(j/rings,i/count*Math.PI*2));
      back[j].push(point(j/rings,i/count*Math.PI*2,true));
    }
  }
  for(let j=0;j<rings;j++)for(let i=0;i<count;i++){
    const k=(i+1)%count;
    tri(front[j][i],front[j+1][i],front[j+1][k]);tri(front[j][i],front[j+1][k],front[j][k]);
    tri(back[j][i],back[j+1][k],back[j+1][i]);tri(back[j][i],back[j][k],back[j+1][k]);
  }
  for(let i=0;i<count;i++){
    const k=(i+1)%count;
    tri(front[rings][i],back[rings][i],back[rings][k]);
    tri(front[rings][i],back[rings][k],front[rings][k]);
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.computeVertexNormals();return geometry;
}
export function fracturedQuartz(parent,name,material,xyz,{milky=false}={}){
  const g=tag(group(parent),name);g.position.set(...xyz);g.userData.objectLabel='石英断口标本';
  const shell=new T.Mesh(fractureGeometry(),material);shell.castShadow=true;g.add(shell);
  const inclusions=tag(group(g),'internal-inclusions'),n=milky?72:4;
  for(let i=0;i<n;i++){
    const a=i*2.399963,r=Math.sqrt((i+.5)/n),o=ball(inclusions,.027+(i%4)*.009,pearl,
      [.3*r*Math.cos(a),.48*r*Math.sin(a),-.34+(i%7)*.075]);
    o.scale.multiply(V(1.7,.7,1));o.rotation.z=a;
  }
  // Arrest ridges follow the actual curved fracture face; they are not cleavage planes.
  const ridgeMaterial=material.clone();ridgeMaterial.opacity=.17;
  ridgeMaterial.transparent=true;ridgeMaterial.depthWrite=false;
  for(const u of [.59,.8]){
    const points=[];
    for(let i=0;i<=24;i++){
      const a=.15+i/24*1.9,hex=Math.cos(Math.PI/6)/Math.cos(((a+Math.PI*4)%(Math.PI/3))-Math.PI/6);
      const edge=hex*(1+.055*Math.sin(a*3+.4)+.035*Math.sin(a*7));
      points.push([.48*u*Math.cos(a)*edge,.72*u*Math.sin(a)*edge,
        .165+.25*(1-u*u)+.014*Math.sin(u*27+a*.35)*u*(1-u)]);
    }
    tube(g,points,.0025,ridgeMaterial);
  }
  g.userData.detail={fracture:'curved shell-like surface',milkyInternalScatterers:milky,
    appearanceDoesNotMeasurePurity:true,qualitativeInclusions:true};
  return g;
}

export function continueSilica(n){
  const boundary=tag(group(n.g),'continued-si-o-network');
  n.outer.forEach((silicon,i)=>{
    const inward=V(...n.oxygenPoints[i]).sub(silicon.position).normalize();
    const tangent=inward.clone().cross(V(0,1,0)).normalize(),normal=inward.clone().cross(tangent).normalize();
    for(let j=0;j<3;j++){
      const a=j*Math.PI*2/3,d=inward.clone().multiplyScalar(-1/3)
        .addScaledVector(tangent,Math.sqrt(8/9)*Math.cos(a))
        .addScaledVector(normal,Math.sqrt(8/9)*Math.sin(a));
      const oxygen=silicon.position.clone().addScaledVector(d,.4),next=silicon.position.clone().addScaledVector(d,.79);
      segment(boundary,silicon.position.toArray(),oxygen.toArray(),.012,M.silver);
      ball(boundary,.065,M.green,oxygen.toArray());
      segment(boundary,oxygen.toArray(),next.toArray(),.012,M.silver);
      ball(boundary,.085,M.atom,next.toArray());
    }
  });
  return boundary;
}

export function countRails(parent,{step=.3,z=-.11}={}){
  const g=tag(group(parent),'counting-row-guides'),width=step*10;
  for(let row=0;row<=10;row++){
    const y=(row-5)*step;
    segment(g,[-width/2,y,z],[width/2,y,z],.006,M.dark);
  }
  for(const x of [-width/2,width/2])segment(g,[x,-width/2,z],[x,width/2,z],.008,M.silver);
  g.userData.countingAidOnly=true;return g;
}

export function grainBackFaces(l){
  const bounds=new T.Box3().setFromPoints(l.points.map(p=>V(...p))),size=bounds.getSize(V()),center=bounds.getCenter(V());
  const g=tag(group(l.g),'grain-section-back');
  const cutMaterial=M.silicon.clone();cutMaterial.roughness=.38;cutMaterial.metalness=.6;
  const shape=new T.Shape(),outline=[[-.56,-.56],[.45,-.61],[.61,-.16],[.55,.46],[.15,.61],[-.48,.54],[-.62,.05]];
  outline.forEach(([x,y],i)=>{
    const p=[x*(size.x+.16),y*(size.y+.16)];
    if(i)shape.lineTo(...p);else shape.moveTo(...p);
  });
  shape.closePath();
  const geometry=new T.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:1,steps:1});
  const fragment=new T.Mesh(geometry,cutMaterial);
  fragment.position.set(center.x,center.y,bounds.min.z-.28);g.add(fragment);
  g.userData.sectionedMaterial=true;g.userData.notEquipment=true;
  return g;
}

export function vacancyNeighborhood(l,site,name='vacancy-neighbours'){
  const g=tag(group(l.g),name),p=V(...l.points[site]),neighbours=[];
  l.bonds.forEach(({i,j})=>{
    if(i===site)neighbours.push(j);else if(j===site)neighbours.push(i);
  });
  for(const i of neighbours){
    const a=V(...l.points[i]);
    // Separated short marks show the ideal site direction without inventing a bond.
    for(const u of [.27,.57,.82]){
      segment(g,a.clone().lerp(p,u).toArray(),a.clone().lerp(p,u+.075).toArray(),.008,M.silver);
    }
  }
  g.userData={idealSiteGuide:true,neighbourIndices:neighbours,notPhysicalBonds:true};
  return g;
}

export function meltCup(parent){
  const g=tag(group(parent),'melt-vessel-cutaway');
  const profile=[[1.3,.33],[1.43,.33],[1.43,-.5],[1.2,-.68],[0,-.68],[0,-.56],[1.19,-.56],[1.3,-.42],[1.3,.33]];
  const wall=new T.Mesh(new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),56,.48,Math.PI*1.5),M.ceramic);
  g.add(wall);
  const support=context(g,'melt-vessel-support');
  cyl(support,1.5,.13,M.dark,[0,-.76,0]);
  for(const x of [-1.1,1.1])box(support,.16,.3,.5,M.dark,[x,-.96,0]);
  return g;
}

export function epitaxyChamber(parent){
  const g=tag(group(parent),'epitaxy-environment'),housing=context(g,'reactor-cutaway-housing');
  const base=box(housing,3.75,.18,2.85,M.dark,[0,-.62,0]);
  const quartz=M.glass.clone();quartz.opacity=.2;
  box(housing,3.4,.06,2.5,quartz,[0,.72,0]);
  box(housing,3.4,1.25,.05,quartz,[0,.08,-1.24]);
  for(const x of [-1.72,1.72]){
    box(housing,.12,1.3,.1,M.silver,[x,.05,-1.3]);
    box(housing,.18,.09,2.55,M.silver,[x,.76,0]);
  }
  const pedestal=tag(group(g),'susceptor-assembly');
  cyl(pedestal,.17,.5,M.dark,[0,-.39,0]);
  const susceptor=tag(cyl(pedestal,1.22,.16,M.black,[0,-.1,0]),'epitaxy-susceptor');
  ring(pedestal,1.16,M.dark,[0,-.012,0],.018);
  const specimen=wafer(g,1.12,[0,-.012,0]);tag(specimen.disk,'reactor-wafer');specimen.disk.userData.objectLabel='基座上的硅片';
  const manifold=tag(group(g),'process-gas-manifold'),outlet=tag(group(g),'process-gas-exhaust');
  for(const [root,x]of [[manifold,-1.56],[outlet,1.56]]){
    box(root,.2,.32,2.1,M.dark,[x,.22,0]);
    for(let i=0;i<7;i++){
      const nozzle=cyl(root,.042,.14,M.silver,[x+(x<0?.14:-.14),.22,(i-3)*.28]);
      nozzle.rotation.z=Math.PI/2;
    }
    tube(root,[[x,.22,-.82],[x*1.17,.22,-.82],[x*1.17,-.32,-.82]],.085,M.silver);
  }
  const heating=tag(group(g),'infrared-lamp-banks'),lamps=[];
  for(const y of [-.46,1.02]){
    if(y<0)box(heating,2.9,.1,2.5,M.silver,[0,y-.08,0]);
    else{
      for(const x of [-1.35,1.35])box(heating,.14,.12,2.5,M.silver,[x,y,0]);
      box(heating,2.7,.12,.12,M.silver,[0,y,-1.19]);
    }
    for(let i=0;i<7;i++){
      const lamp=segment(heating,[-1.28,y,(i-3)*.31],[1.28,y,(i-3)*.31],.038,M.ceramic);
      lamps.push(lamp);
    }
  }
  const gas=tag(group(g),'reactor-gas-transport'),paths=[],tracers=[];
  const pathMaterial=M.liquid.clone();pathMaterial.opacity=.18;
  for(let lane=0;lane<7;lane++){
    const z=(lane-3)*.28,points=[[-1.42,.22,z],[-.9,.2,z],[0,.16,z],[.9,.2,z],[1.42,.22,z]];
    const curve=new T.CatmullRomCurve3(points.map(p=>V(...p)));paths.push(curve);
    tube(gas,points,.012,pathMaterial);
    const laneTracers=[];
    for(let i=0;i<3;i++)laneTracers.push(ball(gas,.03,M.green));
    tracers.push(laneTracers);
  }
  return {g,base,susceptor,wafer:specimen,manifold,outlet,lamps,gas,
    update(conditions,feed){
      lamps.forEach((lamp,i)=>lamp.material=conditions>(i%7)/9?M.hot:M.ceramic);
      gas.visible=feed>0;
      tracers.forEach((lane,j)=>lane.forEach((o,i)=>{
        const u=phase(feed,i*.15+j*.018,.65+i*.15+j*.018);
        o.visible=feed>i*.15+j*.018;o.position.copy(paths[j].getPoint(u));
      }));
      return {lampHeating:conditions,gasTransport:feed,physicalWaferSupported:true,
        genericCutaway:true,frontWallRemovedForViewing:true,gasMarkersNotMolecularFormula:true};
    }};
}

export function interfaceSection(n){
  const g=tag(group(n.l.g),'magnified-material-section'),bottom=n.levels[0]-.13;
  const substrate=M.ceramic.clone();substrate.transparent=true;substrate.opacity=.18;substrate.depthWrite=false;
  const film=faint.clone();film.color.setHex(0x75cba1);film.opacity=.18;
  box(g,2.55,n.base-bottom,.1,substrate,[0,(bottom+n.base)/2,-1.22]);
  const top=box(g,2.55,1,.1,film,[0,n.base,-1.22]);
  return {g,update(boundary){
    const h=Math.max(.00001,boundary-n.base);top.visible=h>.0001;top.scale.y=h;top.position.y=n.base+h/2;
  }};
}

function shot(phrase,eye,span,focus,kind='overview',projection='perspective'){
  const tracking=focus?.isObject3D?{object:focus,look:[0,0,0]}:{look:focus};
  return {phrase,eye,span,...tracking,kind,projection,fit:false};
}
export function directAtomic(rig,beat){
  const find=name=>{
    const o=rig.g.getObjectByName(name);
    if(!o)throw new Error(`Atomic shot target missing: ${beat.id}/${name}`);
    return o;
  };
  const eye=[1.3,1.5,10],front=[0,.25,10],angle=[4,2.3,10];
  const configurations={
    '02-purity-01':()=>[
      shot('百分之九十九',eye,7,[0,0,0],'overview','orthographic'),
      shot('一份别的东西',front,3.2,find('impurity-target'),'macro','orthographic')],
    '02-purity-02':()=>[
      shot('十个',front,6.2,[0,1.5,0],'overview','orthographic'),
      shot('每多一个九',front,6.8,[0,-.3,0],'section','orthographic')],
    '02-purity-03':()=>[
      shot('高纯原料',angle,8,[0,0,0]),
      shot('有意加入',angle,4.2,find('substitution-neighbourhood'),'macro'),
      shot('失控的污染',[1,4.2,10],8.3,[0,-.1,0],'section')],
    '03-order-01':()=>[
      shot('全是硅',angle,8.6,[0,0,0]),
      shot('各排各的',[4,1.5,10],5.1,[0,.7,.25],'section'),
      shot('交界处',[1.8,1.2,10],3.8,[0,.825,.7],'macro')],
    '03-order-02':()=>[
      shot('同一套晶格取向',[5,2.5,10],8,[0,.8,0]),
      shot('连续的网',[6,2,10],5.2,[0,.8,.15],'macro'),
      shot('而不是',[2,3,10],4.6,[0,-1.65,.1],'section')],
    '04-quartz-01':()=>[
      shot('透明',[4.2,2.7,10],5.7,[0,1.1,0]),
      shot('乳白',[5.5,2.6,10],3.5,find('milky-quartz'),'macro'),
      shot('主要成分',angle,5.6,find('silica-composition-target'),'section')],
    '04-quartz-02':()=>[
      shot('硅与氧结合在一起',angle,8.4,[0,0,0]),
      shot('单质硅',[1,2.5,10],5,[0,-1.05,0],'macro'),
      shot('化学反应',[1.2,1.2,10],10,[0,.35,0],'section')],
    '04-quartz-03':()=>[
      shot('洗得再干净',[1.2,2,10],5.9,[.15,1.1,0]),
      shot('不能直接做芯片',angle,5.9,find('wash-network-target'),'macro'),
      shot('洗掉泥土',eye,8.6,[.2,.15,0],'section')],
    '05-furnace-03':()=>[
      shot('工业硅',[1,4,10],5.7,[0,-1.7,0]),
      shot('百分之九十八',front,7.6,[0,.5,0],'section','orthographic')],
    '09-feedstock-02':()=>[
      shot('很纯',angle,8.6,[0,0,0]),
      shot('取向不同的晶粒',[4,2,10],5.4,[0,.6,.3],'macro'),
      shot('打散原来的排列',[1.5,5,10],8,[0,-.35,0],'section')],
    '10-melt-03':()=>[
      shot('加入极少量',[2,5,10],8.3,[0,.65,0]),
      shot('调节电阻率',[3,2,10],4.8,[-.25,-1.65,.2],'macro'),
      shot('加入多少',[1.3,5.5,10],8.1,[0,.7,0],'section')],
    '17-defects-01':()=>[
      shot('少一个原子',[1,2.5,10],6.7,[0,0,0]),
      shot('形成空位',[1.8,2,10],3.2,find('vacancy-target'),'macro'),
      shot('多一个原子',[3,2.5,10],3.8,[.25,-.12,.48],'section')],
    '17-defects-02':()=>[
      shot('冷却',[1.5,3,10],7.9,[0,-.3,0]),
      shot('可能聚集',[2,3,10],4.3,[.1,.5,.35],'macro'),
      shot('生长速度',[1.5,3,10],8.2,[0,-.35,0],'section')],
    '17-defects-03':()=>[
      shot('取向',[1.3,2.5,10],4.1,[0,1.4,.1]),
      shot('低缺陷',[1.3,3,10],7.9,[0,0,0],'section'),
      shot('绝对完美',[-4,3,10],3.1,find('low-quality-vacancy-focus'),'macro')],
    '24-epitaxy-01':()=>[
      shot('受控条件',[2.2,4.8,10],9.5,[0,1.6,0]),
      shot('气相原料',[1.1,5,10],7.2,[0,1.8,.1],'section'),
      shot('硅片表面',[3,2.6,10],5.8,[0,-2.6,.1],'macro')],
    '24-epitaxy-02':()=>[
      shot('延续下面的晶格取向',[3.8,2.3,10],6.3,[0,-.15,0],'section'),
      shot('厚度',[1.4,1.8,10],4.9,[.5,.2,.6],'macro'),
      shot('电阻率',[3,3,10],4.9,[.2,.3,.45],'macro')],
    '24-epitaxy-03':()=>[
      shot('不是贴一层膜',[3,2.5,10],3.9,[-3.55,-1.3,0],'macro'),
      shot('抛光片',[1.3,5,10],5.6,[0,1.3,0],'overview','orthographic'),
      shot('外延片',[1.3,5,10],8.9,[.3,0,0],'section','orthographic')],
  };
  rig.storyShots=configurations[beat.id]();
  for(const s of rig.storyShots)if(!rig.semanticPlan.some(p=>p.phrase===s.phrase))
    throw new Error(`Atomic shot has an undeclared cue: ${beat.id}/${s.phrase}`);
  rig.detailSources=atomicDetailSources;
  rig.scientificBoundaries=atomicScientificBoundaries;
  rig.detailRevision=4;
  return rig;
}
