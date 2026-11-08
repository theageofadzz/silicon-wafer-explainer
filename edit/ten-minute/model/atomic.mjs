import {T,V,M,group,box,ball,cyl,segment,dynamicLine,setSegment,arrow,wafer,marker,rigResult,buildDiamond,phase,mix} from './core.mjs';
import {atomicPlanFor,atomicWindow} from './atomic-plan.mjs';
import {fracturedQuartz,continueSilica,countRails,grainBackFaces,vacancyNeighborhood,meltCup,
  epitaxyChamber,interfaceSection,directAtomic} from './atomic-detail.mjs';

export const atomicKeys=['purity','lattice','silica','grains','doping','epitaxy','defects'];
const mint=M.atom.clone();mint.color.setHex(0x77d5aa);mint.emissive.setHex(0x16482d);mint.emissiveIntensity=.12;
const greenInk=new T.MeshBasicMaterial({color:0x74cda4,toneMapped:false});
const waterMaterial=M.liquid.clone();waterMaterial.color.setHex(0x9fcbd1);
const dirtMaterial=M.ceramic.clone();dirtMaterial.color.setHex(0x696156);

function named(o,name,label){
  o.name=name;o.userData.semantic=name;
  if(label)o.userData.objectLabel=label;
  return o;
}
const scope=(parent,name,label)=>named(group(parent),name,label);
const target=(parent,name,label,xyz=[0,0,0])=>named(marker(parent,xyz),name,label);
const lerpPoint=(a,b,u)=>V(...a).lerp(V(...b),u);
function circle(parent,r,xyz=[0,0,0]){
  const o=new T.Mesh(new T.TorusGeometry(r,.014,8,56),greenInk);o.position.set(...xyz);parent.add(o);return o;
}
function frame(parent,w,h,name,xyz=[0,0,0]){
  const g=scope(parent,name);g.position.set(...xyz);
  for(const [a,b]of [[[-w/2,-h/2,0],[w/2,-h/2,0]],[[-w/2,h/2,0],[w/2,h/2,0]],
    [[-w/2,-h/2,0],[-w/2,h/2,0]],[[w/2,-h/2,0],[w/2,h/2,0]]])segment(g,a,b,.012,greenInk);
  return g;
}
function diamond(parent,name,options={}){
  const l=buildDiamond(parent,{cells:2,spacing:1.35,atomRadius:.09,...options});named(l.g,name);return l;
}
function latticeFacts(l){
  return {structure:l.basis,maxCoordination:Math.max(...l.degree),atomicScale:true,distancesNotMeasured:true};
}
function locals(entries){
  return entries.filter(e=>e.object.visible).map(e=>({text:e.text,object:e.object,offset:e.offset||[0,-50]}));
}
function semanticRig(beat,g,animate,anchors,extra={}){
  const semanticPlan=atomicPlanFor(beat);
  const finalAt=Math.max(...semanticPlan.map(e=>atomicWindow(beat,e.phrase).start-e.lead+e.seconds));
  const timingWarnings=beat.end-finalAt<1?[{reason:'real phrase leaves less than one second',finalAt,hold:beat.end-finalAt}]:[];
  return rigResult(g,ctx=>{
    if(typeof ctx.q!=='function'||typeof ctx.window!=='function')throw new Error(`Atomic ctx.q/window required for ${beat.id}`);
    // Evaluate every declared action, including actions whose objects are not visible yet.
    const p=semanticPlan.map(e=>ctx.q(e.phrase,e.seconds,e.lead));
    const data=animate(p,ctx);
    return {...data,semanticBeat:beat.id,semanticProgress:semanticPlan.map((e,i)=>({phrase:e.phrase,progress:p[i]})),
      lastSemanticActionEnd:finalAt,finalReadingHold:beat.end-finalAt,timingWarnings};
  },anchors,{view:{eye:[1.2,1.2,10],look:[0,0,0],span:7.8},...extra,semanticPlan});
}
function centralSite(l,desired=[0,0,.5]){
  const indices=l.degree.map((n,i)=>n===4?i:-1).filter(i=>i>=0);
  return indices.reduce((best,i)=>V(...l.points[i]).distanceTo(V(...desired))<
    V(...l.points[best]).distanceTo(V(...desired))?i:best,indices[0]);
}
function showLattice(l,u,axis=1,min=0,max=1){
  const coordinates=l.points.map(p=>p[axis]),low=Math.min(...coordinates),high=Math.max(...coordinates);
  const sizes=l.points.map(p=>phase(u,min+(p[axis]-low)/(high-low||1)*(max-min)*.8,
    min+(p[axis]-low)/(high-low||1)*(max-min)*.8+.18));
  l.atoms.forEach((o,i)=>{o.visible=sizes[i]>.001;o.scale.setScalar(.09*sizes[i]);});
  l.bonds.forEach(({o,i,j})=>o.visible=sizes[i]>.99&&sizes[j]>.99);
}
function grid(parent,name,impurities=1,{square=false,step=.3,radius=.085}={}){
  const g=scope(parent,name),atoms=[];
  countRails(g,{step});
  for(let i=0;i<100;i++){
    const p=[(i%10-4.5)*step,(Math.floor(i/10)-4.5)*step,0];
    const o=square?box(g,radius*2,radius*2,.07,i>=100-impurities?M.green:M.atom,p):
      ball(g,radius,i>=100-impurities?M.green:M.atom,p);
    atoms.push(o);
  }
  return {g,atoms};
}

function purityHundred(parent,beat){
  const g=group(parent),units=grid(g,'hundred-unit-grid'),impurity=units.atoms[99];
  named(impurity,'impurity-unit','一百份中的一份异类示意单位');
  const count=frame(g,3.02,3.02,'count-bracket',[0,0,-.02]);
  const tether=dynamicLine(g,greenInk,.012);
  const gridAnchor=target(units.g,'hundred-unit-target','100份中的99份硅示意单位');
  const impurityAnchor=target(g,'impurity-target','一份异类示意单位');
  return semanticRig(beat,g,([percent,hundred,other])=>{
    units.atoms.forEach((o,i)=>{
      o.scale.setScalar(.085);
      o.material=i===99?(other>0?M.green:M.dark):percent>i/110?M.atom:M.dark;
    });
    impurity.position.set(1.35,1.35,.7*other);
    count.visible=hundred>0;count.scale.set(mix(.3,1,hundred),mix(.3,1,hundred),1);
    tether.visible=other>0;setSegment(tether,[1.35,1.35,0],impurity.position.toArray());
    impurityAnchor.position.copy(impurity.position);
    return {illustratedUnits:100,illustratedSiliconUnits:99,illustratedOtherUnits:1,schematic:true,noConcentrationMeasurement:true};
  },[gridAnchor,impurityAnchor],{view:{eye:[.7,.6,10],look:[0,0,0],span:6.9}});
}
function purityTenfold(parent,beat){
  const g=group(parent),notation=scope(g,'purity-notation'),extra=scope(g,'purity-extra-place');
  const benchmark=scope(g,'tenfold-benchmark','固定十份残余量基准'),remainder=scope(g,'tenfold-remainder','逐渐减少的残余杂质相对量');
  notation.position.y=1.7;extra.position.y=1.33;benchmark.position.y=.35;remainder.position.y=-1.1;
  const digits=[],parts=[];
  for(let i=0;i<11;i++){
    if(i<10)digits.push(box(notation,.18,.18,.1,M.dark,[(i-4.5)*.24,0,0]));
    const d=box(extra,.18,.18,.1,i===10?M.green:M.silver,[(i-5)*.24,0,0]);d.visible=i<10;
  }
  for(let i=0;i<10;i++){
    const x=-1.5+i*.3+.137;
    box(benchmark,.274,.26,.18,M.green,[x,0,0]);
    box(remainder,.282,.28,.13,M.dark,[x,0,-.025]);
    parts.push(box(remainder,.274,.26,.18,M.green,[x,0,.015]));
  }
  const comparison=scope(g,'tenfold-comparison'),link=dynamicLine(comparison,greenInk,.012);
  const baseAnchor=target(benchmark,'benchmark-target','固定十格基准',[0,0,.12]);
  const restAnchor=target(remainder,'remainder-target','实际剩余条的中心',[0,0,.12]);
  return semanticRig(beat,g,([ten,eleven,compare,shrink])=>{
    digits.forEach((o,i)=>{o.material=ten>i/10?M.silver:M.dark;});
    extra.children[10].visible=eleven>0;extra.children[10].scale.setScalar(Math.max(.001,eleven));
    comparison.visible=compare>0;setSegment(link,[1.62,.35,0],[1.62,mix(.35,-1.1,compare),0]);
    const remaining=mix(10,1,shrink);
    parts.forEach((o,i)=>{const f=Math.max(0,Math.min(1,remaining-i));o.visible=f>0;o.scale.x=Math.max(.00001,f);o.position.x=-1.5+i*.3+.137*f;});
    restAnchor.position.x=-1.5+(remaining*.3-.026)/2;
    return {notationPlaces:eleven===1?11:10,benchmarkCells:10,benchmarkUnits:10,remainingUnits:remaining,
      relativeImpurityRemainder:remaining/10,remainderCells:parts.map(o=>o.visible?o.scale.x:0),
      schematic:true,noConcentrationMeasurement:true};
  },[baseAnchor,restAnchor],{view:{eye:[.3,.5,10],look:[0,0,0],span:7},
    semanticAnchors:ctx=>ctx.time>=ctx.window('每多一个九').start?locals([
      {text:'剩余杂质相对量',object:baseAnchor,offset:[0,-45]},
      ...(ctx.time>=ctx.window('剩余杂质').start?[{text:'10 → 1',object:restAnchor,offset:[0,45]}]:[])]):[]});
}
function metallurgicalPurity(parent,beat){
  const g=group(parent),ingot=scope(g,'metallurgical-silicon','还原后的工业硅块');
  for(let i=0;i<5;i++){
    const o=new T.Mesh(new T.IcosahedronGeometry(.28+i*.025,0),M.silicon);
    o.position.set((i-2)*.48,-1.7,(i%2)*.2);o.rotation.set(i*.2,i*.4,.2);ingot.add(o);
  }
  const a=grid(g,'ninety-eight-case',2,{square:true,step:.17,radius:.066});
  const b=grid(g,'ninety-nine-case',1,{square:true,step:.17,radius:.066});
  a.g.position.set(0,1.3,0);b.g.position.set(0,-.55,0);
  const residues=scope(g,'remaining-impurities'),halos=[circle(residues,.11),circle(residues,.11),circle(residues,.11)];
  const cases=target(g,'range-case-target','工业硅98%与99%的两个固定比例案例',[0,.4,0]);
  const residueAnchor=target(g,'range-residue-target','两种案例均保留异类示意单位');
  return semanticRig(beat,g,([product,low,high,dirty])=>{
    ingot.scale.setScalar(.85+.15*product);
    a.g.visible=low>0;b.g.visible=high>0;
    a.g.scale.setScalar(Math.max(.001,low));b.g.scale.setScalar(Math.max(.001,high));
    residues.visible=dirty>0;
    const positions=[[.595,2.065,.08],[.765,2.065,.08],[.765,.215,.08]];
    halos.forEach((o,i)=>{o.position.set(...positions[i]);o.scale.setScalar(.6+.4*dirty);});
    residueAnchor.position.set(...positions[2]);
    return {purityRangePercent:[98,99],independentCases:true,caseCounts:[[98,2],[99,1]],schematic:true,noConcentrationMeasurement:true};
  },[cases,residueAnchor],{view:{eye:[.3,.4,10],look:[0,.1,0],span:7.6}});
}

function silicaNetwork(parent,name){
  const g=scope(parent,name,'延续的Si-O四面体网络'),centre=ball(g,.2,M.atom),oxygen=[],outer=[],bonds=[];
  named(centre,'network-silicon','网络中的硅原子');
  for(const q of [[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]]){
    const p=q.map(v=>v*.58),tangent=V(...q).cross(V(0,1,0)).normalize().multiplyScalar(.4);
    const end=V(...p).multiplyScalar(1.85).add(tangent).toArray();
    oxygen.push(ball(g,.155,M.green,p));outer.push(ball(g,.2,M.atom,end));
    bonds.push({o:segment(g,[0,0,0],p,.025,M.silver),i:oxygen.length-1,inner:true},
      {o:segment(g,p,end,.025,M.silver),i:oxygen.length-1,inner:false});
  }
  const n={g,centre,oxygen,outer,bonds,oxygenPoints:oxygen.map(o=>o.position.toArray())};
  n.boundary=continueSilica(n);return n;
}
function quartzSpecimen(parent,name,material,xyz){
  return fracturedQuartz(parent,name,material,xyz,{milky:name==='milky-quartz'});
}
function quartzAppearance(parent,beat){
  const g=group(parent),clearMaterial=M.glass.clone(),milkMaterial=M.ceramic.clone();
  clearMaterial.opacity=.22;clearMaterial.roughness=.12;
  milkMaterial.color.setHex(0xdde1df);milkMaterial.transparent=true;milkMaterial.opacity=.47;
  milkMaterial.side=T.DoubleSide;milkMaterial.depthWrite=false;
  const clear=quartzSpecimen(g,'clear-quartz',clearMaterial,[-.65,1.05,0]);
  const milky=quartzSpecimen(g,'milky-quartz',milkMaterial,[.65,1.05,0]);
  const n=silicaNetwork(g,'silica-network');n.g.position.y=-1.25;n.g.scale.setScalar(.6);
  const centreAnchor=target(n.g,'silica-composition-target','石英的Si-O网络');
  return semanticRig(beat,g,([transparent,white,composition],ctx)=>{
    clearMaterial.opacity=mix(.24,.32,transparent);
    milky.visible=ctx.time>=ctx.window('乳白').start;milky.scale.setScalar(.8+.2*white);
    n.g.visible=composition>0;n.g.scale.setScalar(.6*Math.max(.001,composition));
    return {material:'silica',localSiliconOxygenCoordination:4,oxygenBridgesTwoSilicon:true,networkContinuesBeyondView:true,
      appearanceDoesNotMeasurePurity:true,atomicScale:composition>0,scaleSeparatedSpecimenAndNetwork:true,
      shellFracture:true,internalInclusionsQualitative:true};
  },[centreAnchor,clear],{view:{eye:[1.5,1.6,10],look:[0,0,0],span:8}});
}
function quartzReaction(parent,beat){
  const g=group(parent),n=silicaNetwork(g,'reaction-network');
  named(n.centre,'reacting-silicon','反应形成的单质硅示意');
  const bondGroup=scope(n.g,'silicon-oxygen-bonds'),product=scope(g,'silicon-product','单质硅产物区');
  n.bonds.forEach(({o})=>bondGroup.add(o));
  cyl(product,.65,.09,M.dark,[0,-1.8,0]);
  const carbonGroup=scope(g,'reductant-carbon','参与还原的碳'),coGroup=scope(g,'carbon-monoxide-products','带走氧的CO产物');
  const carbons=[ball(carbonGroup,.16,M.dark),ball(carbonGroup,.16,M.dark)],coBonds=[dynamicLine(coGroup,M.silver,.022),dynamicLine(coGroup,M.silver,.022)];
  const chemicalAnchor=target(n.oxygen[2],'silica-reactant-target','硅氧网络中尚未反应的部分');
  const productAnchor=target(g,'silicon-output-target','单质硅产物位置',[0,-1.55,0]);
  return semanticRig(beat,g,([combine,element,react,separate])=>{
    product.visible=element>0;product.scale.x=product.scale.z=.4+.6*element;
    n.centre.position.copy(lerpPoint([0,0,0],[0,-1.55,0],react));
    n.centre.material=M.atom;
    n.bonds.forEach(({o,i,inner},k)=>{
      o.visible=combine>k/9&&(inner?react<.12:(i>=2||react<.35));
      o.material=combine<1?M.green:M.silver;
    });
    bondGroup.visible=combine>0;
    carbonGroup.visible=coGroup.visible=react>0;
    carbons.forEach((o,i)=>{
      const p=n.oxygenPoints[i],destination=[(i?1:-1)*1.55,1.6,0],oxygen=n.oxygen[i];
      const captured=phase(react,.25,.8);
      oxygen.position.copy(lerpPoint(p,destination,captured)).add(V(0,1.1*separate,0));
      const carbonStart=[(i?1:-1)*1.75,-.3,.1];
      o.position.copy(lerpPoint(carbonStart,[destination[0]+.26,destination[1],destination[2]],captured)).add(V(0,1.1*separate,0));
      coBonds[i].visible=captured>.9;setSegment(coBonds[i],oxygen.position.toArray(),o.position.toArray());
    });
    productAnchor.position.copy(n.centre.position);
    return {localSiliconOxygenCoordination:4,oxygenBridgesTwoSilicon:true,networkContinuesBeyondView:true,
      oxygenTransferredToCarbon:react===1,oxygenProduct:'CO',overallReaction:'SiO2 + 2C -> Si + 2CO',
      transferredOxygenAtoms:react===1?2:0,siliconProductAtoms:react===1?1:0,
      localNetworkFragment:true,notElementaryReactionPath:true,schematic:true,notWashing:true};
  },[chemicalAnchor,productAnchor],{view:{eye:[1.2,1.1,10],look:[0,.2,0],span:8.3}});
}
function quartzWash(parent,beat){
  const g=group(parent),sand=quartzSpecimen(g,'sand-grain',M.ceramic,[0,1.05,0]);sand.scale.set(.9,.65,.9);
  const n=silicaNetwork(g,'retained-silica-network');n.g.position.y=-1.1;n.g.scale.setScalar(.75);
  const unchanged=scope(g,'unchanged-si-o-bonds'),bondCues=n.bonds.map(({o})=>circle(unchanged,.065,o.position.toArray()));
  unchanged.position.copy(n.g.position);unchanged.scale.setScalar(.75);
  const water=scope(g,'wash-water'),drops=[];
  for(let i=0;i<9;i++)drops.push(ball(water,.055,waterMaterial,[-1.3+i*.28,2.1,0]));
  const dirt=scope(g,'external-dirt'),particles=[];
  for(let i=0;i<8;i++)particles.push(ball(dirt,.07,dirtMaterial,[(i%4-1.5)*.18,1.05+Math.floor(i/4)*.18,.4]));
  const dirtStart=particles.map(o=>o.position.toArray()),down=arrow(g,[1.3,1.3,.1],[1.3,.15,.1],waterMaterial,.02);
  const silicaAnchor=target(n.g,'wash-network-target','清洗后仍保持的硅氧网络');
  const soilAnchor=target(dirt,'dirt-target','随水离开的外来泥土');
  return semanticRig(beat,g,([wash,inside,remove,intact])=>{
    drops.forEach((o,i)=>{o.visible=wash>0;o.position.set(-1.2+i*.28,mix(2.1,1.05-(i%3)*.12,wash),.35);});
    down.visible=wash>0;n.g.visible=inside>0;
    particles.forEach((o,i)=>o.position.copy(lerpPoint(dirtStart[i],[1.45+i*.035,-.15-i*.12,.3],remove)));
    soilAnchor.position.copy(particles[3].position);unchanged.visible=intact>0;
    bondCues.forEach((o,i)=>o.visible=intact>i/bondCues.length);
    return {washedExternalDirt:remove,chemicalCompositionChanged:false,siOBondsBroken:0,
      originalNetworkCoordinatesUnchanged:true,localSiliconOxygenCoordination:4,oxygenStillChemicallyBound:true,schematic:true};
  },[soilAnchor,silicaAnchor],{view:{eye:[1.1,1,10],look:[0,.25,0],span:8.4}});
}

function grainSet(parent,name,spacing=1.65){
  const g=scope(parent,name),grains=[];
  for(let i=0;i<3;i++){
    const l=diamond(g,`grain-${i}`,{spacing:.78,atomRadius:.065});
    l.g.position.y=(i-1)*spacing;l.g.rotation.set(.12+i*.25,i*.47,.1-i*.16);
    l.back=grainBackFaces(l);grains.push(l);
  }
  return {g,grains};
}
function grainBoundaries(parent,beat){
  const g=group(parent),poly=grainSet(g,'polycrystal'),networks=scope(poly.g,'grain-networks');
  poly.grains.forEach(l=>{
    const patch=group(networks);patch.position.copy(l.g.position);patch.rotation.copy(l.g.rotation);
    l.bonds.forEach(({o})=>patch.add(o));
  });
  const boundaries=scope(g,'grain-boundaries','取向不同晶粒间的交界'),lines=[];
  for(const y of [-.825,.825]){
    const row=[];
    for(let i=0;i<5;i++)row.push(segment(boundaries,[-.88+i*.35,y+(i%2)*.09,.9],[-.53+i*.35,y+((i+1)%2)*.09,.9],.018,greenInk));
    lines.push(row);
  }
  return semanticRig(beat,g,([silicon,order,boundary])=>{
    poly.grains.forEach((l,j)=>{
      l.atoms.forEach(o=>o.scale.setScalar(.045+.02*silicon));
      l.bonds.forEach(({o},i)=>o.visible=phase(order,j*.17,j*.17+.5)>i/l.bonds.length);
    });
    networks.visible=order>0;boundaries.visible=boundary>0;
    lines.flat().forEach((o,i)=>o.visible=boundary>i/12);
    return {orientations:poly.grains.map(l=>l.g.rotation.toArray().slice(0,3)),orientationsStayDistinct:true,
      solidGrainsNeverRealign:true,grainBoundaryVisible:boundary>0,allHostAtomsSilicon:true};
  },[poly.grains[1].atoms[30],boundaries],{view:{eye:[1.8,1.3,10],look:[0,0,0],span:8.3}});
}
function grainDisorder(parent,beat){
  const g=group(parent),poly=grainSet(g,'pure-feedstock-grains',1.5);
  named(poly.g,'pure-feedstock-grains','高纯但多取向的硅原料');
  const orientation=scope(g,'different-orientations'),liquid=scope(g,'disordered-melt-atoms'),nucleus=diamond(g,'new-crystal-nucleus',{cells:1,spacing:.9});
  poly.grains.forEach(l=>{
    const patch=group(orientation);patch.position.copy(l.g.position);patch.rotation.copy(l.g.rotation);
    l.bonds.forEach(({o})=>patch.add(o));
  });
  nucleus.g.position.set(0,-1.8,.3);
  const particles=[],initial=[];
  poly.grains.forEach(l=>{
    l.atoms.forEach((o,i)=>{
      const p=V(...l.points[i]).applyEuler(l.g.rotation).add(l.g.position);initial.push(p.toArray());
      particles.push(ball(liquid,.036,M.atom,p.toArray()));
    });
  });
  const cup=cyl(g,1.3,.07,M.hot,[0,-.45,0]);
  return semanticRig(beat,g,([pure,directions,disorder,rebuild])=>{
    const moved=phase(disorder,.25,1);
    poly.grains.forEach((l,j)=>{
      l.back.visible=disorder<.25;
      l.atoms.forEach(o=>{o.visible=moved===0;o.scale.setScalar(.05+.015*pure);});
      l.bonds.forEach(({o},i)=>o.visible=disorder<.25&&directions>(i/l.bonds.length)*.7+j*.08);
    });
    orientation.visible=directions>0;liquid.visible=moved>0;cup.visible=disorder>.1;
    particles.forEach((o,i)=>{
      const a=i*2.39996,r=1.12*Math.sqrt((i+.5)/particles.length);
      o.position.copy(lerpPoint(initial[i],[Math.cos(a)*r,-.3+(i%5)*.045,Math.sin(a)*r],moved));
    });
    nucleus.g.visible=rebuild>0;showLattice(nucleus,rebuild);
    return {orientationsStayDistinct:true,grainRotations:poly.grains.map(l=>l.g.rotation.toArray().slice(0,3)),
      solidNetworkBondFraction:1-phase(disorder,0,.25),oldLatticeDestroyedBeforeNewGrowth:moved>0,
      liquidDisorder:disorder,newNucleusPreview:rebuild,notSolidStateRealignment:true,
      nucleusIsSeparateRecrystallizationPreview:true,schematic:true};
  },[poly.grains[1].atoms[30],nucleus.g],{view:{eye:[2.3,1.6,10],look:[0,-.2,0],span:8.6}});
}
function continuousLattice(parent,beat){
  const g=group(parent),l=diamond(g,'continuous-lattice',{cells:3,spacing:1});l.g.position.y=.8;
  const cross=scope(g,'cross-region-bonds'),crossLines=[];
  l.bonds.forEach(({i,j})=>{
    if((l.points[i][0]<0)!==(l.points[j][0]<0))crossLines.push(segment(cross,l.points[i],l.points[j],.024,greenInk));
  });
  cross.position.copy(l.g.position);
  const comparison=scope(g,'misoriented-comparison'),edges=scope(comparison,'unmatched-edges');
  const examples=[diamond(comparison,'misoriented-left',{cells:2,spacing:.7}),diamond(comparison,'misoriented-right',{cells:2,spacing:.7})];
  examples[0].g.rotation.y=.1;examples[1].g.rotation.set(.3,.75,.25);comparison.position.y=-1.65;
  const stopLines=[dynamicLine(edges,M.dark,.025),dynamicLine(edges,M.dark,.025)];
  const continuousTarget=target(l.g,'continuous-target','同一取向且近邻连接连续的单晶');
  const mismatchTarget=target(comparison,'mismatch-target','保持不同取向的比较晶粒');
  const depth=scope(l.g,'lattice-depth-direction');
  for(const x of [-1.45,1.45])arrow(depth,[x,-1.2,-1.25],[x,-1.2,1.25],M.silver,.012);
  return semanticRig(beat,g,([extend,connect,contrast,approach],ctx)=>{
    const compare=ctx.time>=ctx.window('而不是').start;
    l.g.visible=!compare;
    showLattice(l,.5+.5*extend,0);
    depth.visible=extend>0;
    cross.visible=!compare&&connect>0;crossLines.forEach((o,i)=>o.visible=connect>i/crossLines.length);
    comparison.visible=compare;comparison.scale.setScalar(.55+.2*contrast);
    examples.forEach((r,i)=>r.g.position.x=(i?1:-1)*mix(.9,.58,approach));
    edges.visible=approach>0;
    setSegment(stopLines[0],[-.23,0,.7],[-.08,0,.7]);setSegment(stopLines[1],[.08,0,.7],[.23,0,.7]);
    return {...latticeFacts(l),coherentOrientation:true,connectedCrossRegionBonds:Math.round(connect*crossLines.length),
      comparisonOrientations:examples.map(r=>r.g.rotation.toArray().slice(0,3)),comparisonRemainsMisoriented:true,
      latticeDepthCells:3,arrowsAreOrientationGuidesNotBonds:true};
  },[continuousTarget,mismatchTarget],{view:{eye:[2.7,1.8,10],look:[0,0,0],span:8}});
}

function purityVersusDoping(parent,beat){
  const g=group(parent),comparison=scope(g,'composition-comparison'),l=diamond(comparison,'feedstock-lattice',{spacing:1.05});
  l.g.position.y=1.05;l.g.scale.setScalar(.85);
  const site=centralSite(l),sitePoint=l.points[site],dopant=ball(l.g,.1,M.amber,[2,1,0]);
  target(l.g,'substitution-neighbourhood','受控替位位置及相邻晶格',sitePoint);
  named(dopant,'controlled-dopant','有意加入的掺杂原子');
  const pollutant=scope(comparison,'surface-contaminants'),surface=wafer(pollutant,1.12,[0,-1.3,0]);surface.g.rotation.x=.48;
  const dirt=[];for(let i=0;i<5;i++)dirt.push(ball(pollutant,.055,i%2?M.dark:M.green));
  const controlled=target(l.g,'controlled-dopant-target','受控替位掺杂的原子');
  const contaminant=target(pollutant,'contaminant-target','表面随机外来污染',[.3,-1.3,.2]);
  return semanticRig(beat,g,([pure,insert,contaminate,separate])=>{
    l.g.position.set(-.2*separate,1.05+.2*separate,0);pollutant.position.set(.2*separate,-.2*separate,0);
    l.atoms.forEach((o,i)=>{o.scale.setScalar(.07+.02*pure);o.visible=i!==site||insert<1;o.position.set(...l.points[i]);});
    l.atoms[site].position.copy(V(...sitePoint).add(V(-.7,.4,0).multiplyScalar(insert)));
    dopant.visible=insert>0;dopant.position.copy(lerpPoint([2,1,0],sitePoint,insert));
    l.bonds.forEach(({o,i,j})=>o.visible=(i!==site&&j!==site)||insert===0||insert===1);
    controlled.position.copy(insert>0?dopant.position:l.atoms[site].position);
    dirt.forEach((o,i)=>{o.visible=contaminate>0;const a=i*2.4;o.position.set(Math.cos(a)*.6,mix(-.5,-1.25,contaminate),Math.sin(a)*.6);});
    return {...latticeFacts(l),substitutional:insert===1,controlledDopingAndSurfaceContaminationSeparate:true,
      dopantIsOneIllustrativeSite:true,concentrationNotToScale:true,notAProcessSimulation:true};
  },[controlled,contaminant],{view:{eye:[2,2.5,10],look:[0,0,0],span:8.5},
    semanticAnchors:ctx=>ctx.time>=ctx.window('有意加入').start?locals([
      {text:'受控掺杂原子',object:controlled,offset:[95,-45]}]):[]});
}
function meltDoping(parent,beat){
  const g=group(parent),reservoir=scope(g,'melt-reservoir'),surface=cyl(reservoir,1.3,.1,M.hot,[0,.3,0]);
  meltCup(reservoir);
  const feed=scope(g,'dopant-feed');cyl(feed,.13,.6,M.dark,[0,2.1,0]);
  const dose=scope(g,'dose-control'),gate=box(dose,.25,.05,.3,M.silver,[.3,1.8,0]);
  const reserves=[ball(dose,.065,mint,[-.08,2.5,.05]),ball(dose,.065,mint,[.08,2.64,.05])];
  const distribution=scope(g,'melt-distribution'),dopants=[];
  for(let i=0;i<6;i++)dopants.push(ball(distribution,.065,mint));
  for(let i=0;i<30;i++){const a=i*2.4,r=1.12*Math.sqrt((i+.5)/30);ball(reservoir,.045,M.atom,[Math.cos(a)*r,.38,Math.sin(a)*r]);}
  const electrical=scope(g,'carrier-transport'),solid=diamond(electrical,'electrical-sample',{cells:2,spacing:.82});
  electrical.position.set(-.5,-1.65,0);solid.g.scale.setScalar(.72);
  const electricalDopant=centralSite(solid);
  const carriers=[],paths=[];
  for(let i=0;i<3;i++){
    paths.push(segment(electrical,[.45,-.3+i*.3,.4],[1.45,-.3+i*.3,.4],.012,M.green));
    carriers.push(ball(electrical,.045,M.green,[.45,-.3+i*.3,.4]));
  }
  const amountBracket=frame(dose,.65,.3,'dose-bound',[0,1.5,.25]);
  const atomAnchor=target(distribution,'melt-dopant-target','进入熔体并重新分布的掺杂示意原子');
  const electricAnchor=target(electrical,'electrical-target','电阻率的定性输运示意',[1,0,.4]);
  return semanticRig(beat,g,([add,resistivity,amount,spread],ctx)=>{
    const electricalCloseup=ctx.time>=ctx.window('调节电阻率').start&&ctx.time<ctx.window('加入多少').start;
    reservoir.visible=feed.visible=dose.visible=distribution.visible=!electricalCloseup;
    dopants.forEach((o,i)=>{
      const enter=phase(add,i*.1,i*.1+.45),a=i*2.4;
      const landing=[(i-2.5)*.075,.46,(i%2)*.12];
      const distributed=[Math.cos(a)*(.55+(i%2)*.35),.41,Math.sin(a)*(.55+(i%2)*.35)];
      o.visible=enter>0;o.position.copy(lerpPoint([0,1.8+i*.08,0],landing,enter)).lerp(V(...distributed),spread);
    });
    gate.position.x=mix(.3,0,amount);amountBracket.visible=amount>0;
    reserves.forEach((o,i)=>o.position.y=mix(2.5+i*.14,2.05+i*.15,amount));
    electrical.visible=electricalCloseup||resistivity>0;
    solid.atoms[electricalDopant].material=resistivity>0?M.amber:M.atom;
    paths.forEach((o,i)=>o.visible=resistivity>i/4);
    carriers.forEach((o,i)=>{o.visible=resistivity>i/4;o.position.x=mix(.45,1.45,phase(resistivity,i*.15,.6+i*.15));});
    atomAnchor.position.copy(dopants[2].position);
    return {additionProgress:add,doseControlClosed:amount===1,distributionProgress:spread,
      illustrativeDopantCount:6,retainedDoseUnits:2,closedGatePreventsFurtherAddition:amount===1,
      elementChoice:'boron OR phosphorus',dopantsInMelt:true,
      resistivityIllustrationSeparateFromMelt:true,qualitativeCarrierTransport:true,
      noResistivityMeasurement:true,noConcentrationMeasurement:true,uniformityNotGuaranteed:true,timeCompressed:true};
  },[atomAnchor,electricAnchor],{view:{eye:[1.2,4.3,10],look:[0,.1,0],span:8.4},
    semanticAnchors:ctx=>ctx.time>=ctx.window('加入极少量').start?locals([
      {text:'受控掺杂原子',object:atomAnchor,offset:[110,-50]}]):[]});
}

function defectLattice(parent,name){
  const l=diamond(parent,name,{spacing:1.5,atomRadius:.092}),vacancy=centralSite(l,[-.2,-.2,.6]);
  const gap=[.5625,-.1875,.5625];
  if(l.points.some(p=>V(...p).distanceTo(V(...gap))<1e-8))throw new Error('Interstitial is a regular site');
  const halo=circle(l.g,.145,l.points[vacancy]),extra=ball(l.g,.12,mint,gap);
  named(halo,'vacancy-halo','缺少正常位点原子的空位');named(extra,'interstitial-site','常规位点之间的额外原子');
  const a=target(l.g,'vacancy-target','实际缺失的正常位点',l.points[vacancy]);
  return {l,vacancy,gap,halo,extra,anchor:a};
}
function pointDefectCreation(parent,beat){
  const g=group(parent),d=defectLattice(g,'point-defect-network'),{l,vacancy,gap}=d;
  const neighbours=vacancyNeighborhood(l,vacancy);
  named(l.atoms[vacancy],'vacancy-site','正在离开正常位点的原子');
  const incoming=scope(g,'incoming-interstitial');incoming.add(d.extra);d.extra.position.set(1.8,1.2,.7);
  const impurityAnchor=target(g,'interstitial-target','实际额外原子的位置');
  return semanticRig(beat,g,([remove,vacancyCallout,arrive,insert])=>{
    l.atoms.forEach((o,i)=>{o.visible=true;o.position.set(...l.points[i]);});
    l.atoms[vacancy].position.copy(V(...l.points[vacancy]).add(V(-1.15,.5,.7).multiplyScalar(remove)));
    l.atoms[vacancy].visible=remove<1;
    l.bonds.forEach(({o,i,j})=>o.visible=(i!==vacancy&&j!==vacancy)||remove===0);
    d.halo.visible=vacancyCallout>0;d.halo.scale.setScalar(.65+.35*vacancyCallout);
    neighbours.visible=vacancyCallout>0;
    const wait=[1.35,.7,.85];d.extra.visible=arrive>0;
    d.extra.position.copy(lerpPoint([1.9,1.5,.8],wait,arrive)).lerp(V(...gap),insert);
    impurityAnchor.position.copy(d.extra.position);
    return {...latticeFacts(l),vacancyCount:remove===1?1:0,interstitialCount:insert===1?1:0,
      regularSiteRemoved:remove===1,vacancyPosition:l.points[vacancy],interstitialPosition:d.extra.position.toArray(),
      interstitialRegularSiteCoincidence:l.points.some(p=>V(...p).distanceTo(d.extra.position)<1e-8),
      initialLatticeIntact:remove===0&&arrive===0,pointDefects:true,atomicPositionsSchematic:true,
      vacancyNearestNeighbours:neighbours.userData.neighbourIndices,siteGuidesAreNotBonds:true};
  },[d.anchor,impurityAnchor],{view:{eye:[1,4.5,10],look:[0,0,0],span:8},
    semanticAnchors:ctx=>locals([
      ...(ctx.time>=ctx.window('形成空位').start?[{text:'空位',object:d.halo,offset:[-110,-40]}]:[]),
      ...(ctx.time>=ctx.window('挤进正常位置之间').start?[{text:'间隙原子',object:d.extra,offset:[110,35]}]:[])] )});
}
function vacancyPath(l,fixed){
  const adjacent=l.points.map(()=>[]);l.bonds.forEach(({i,j})=>{adjacent[i].push(j);adjacent[j].push(i);});
  const goal=adjacent[fixed].reduce((best,i)=>l.points[i][2]>l.points[best][2]?i:best);
  const routes=[[goal]],seen=new Set([fixed,goal]);
  for(let i=0;i<routes.length;i++){
    const route=routes[i],last=route.at(-1);
    if(route.length===4)return route.toReversed();
    for(const n of adjacent[last])if(!seen.has(n)){seen.add(n);routes.push([...route,n]);}
  }
  throw new Error('Cannot build adjacent-site vacancy migration');
}
function pointDefectClustering(parent,beat){
  const g=group(parent),d=defectLattice(g,'defect-cluster'),{l,vacancy}=d;l.g.position.y=.45;l.g.scale.setScalar(.88);
  const path=vacancyPath(l,vacancy),secondHalo=circle(l.g,.145,l.points[path[0]]);
  const neighbours=vacancyNeighborhood(l,vacancy,'cluster-local-neighbours');
  const extra2=ball(l.g,.12,mint,[-.1875,.5625,.5625]);
  const thermal=scope(g,'thermal-state'),temperature=cyl(thermal,.18,.12,M.hot,[-1.15,-2.1,0]);
  const growth=scope(g,'growth-rate-control'),front=box(growth,.4,.06,.25,M.green,[0,-2.1,0]);
  segment(growth,[0,-2.35,0],[0,-1.65,0],.018,M.silver);
  const gradient=scope(g,'temperature-gradient'),levels=[];
  for(let i=0;i<5;i++)levels.push(box(gradient,.2,.13,.16,M.dark,[1.1,-2.35+i*.17,0]));
  const treatment=frame(g,3.2,3.2,'thermal-treatment',[0,.45,-.1]);
  const startExtra=[[-.9375,.5625,-.1875],[1.3125,-.1875,-.1875]],endExtra=[d.gap,[-.1875,.5625,.5625]];
  return semanticRig(beat,g,([cool,cluster,speed,slope,anneal])=>{
    const occupancy=l.points.map((_,i)=>i);occupancy[vacancy]=null;occupancy[path[0]]=null;
    const step=cluster*(path.length-1),completed=Math.min(path.length-1,Math.floor(step));
    for(let i=0;i<completed;i++){occupancy[path[i]]=occupancy[path[i+1]];occupancy[path[i+1]]=null;}
    l.atoms.forEach(o=>o.visible=false);
    occupancy.forEach((atom,site)=>{if(atom!==null){l.atoms[atom].visible=true;l.atoms[atom].position.set(...l.points[site]);}});
    let moving=null,hole=l.points[path.at(-1)];
    if(completed<path.length-1){
      const from=path[completed],to=path[completed+1],p=phase(step-completed,0,1);moving=to;
      l.atoms[occupancy[to]].position.copy(lerpPoint(l.points[to],l.points[from],p));
      hole=lerpPoint(l.points[from],l.points[to],p).toArray();
    }
    l.atoms.forEach((o,i)=>{if(o.visible)o.position.add(V(Math.sin(i*2.3),Math.cos(i*1.7),Math.sin(i)).multiplyScalar(.025*(1-cool)));});
    l.bonds.forEach(({o,i,j})=>o.visible=occupancy[i]!==null&&occupancy[j]!==null&&i!==moving&&j!==moving);
    d.halo.visible=true;secondHalo.position.set(...hole);
    neighbours.visible=cluster>0;
    [d.extra,extra2].forEach((o,i)=>o.position.copy(lerpPoint(startExtra[i],endExtra[i],cluster)));
    temperature.material=cool<.5?M.hot:M.dark;temperature.scale.y=1-.7*cool;
    front.position.y=mix(-2.25,-1.7,speed);
    levels.forEach((o,i)=>o.material=slope>i/5?(i<2?M.green:M.hot):M.dark);
    treatment.visible=anneal>0;treatment.scale.setScalar(.7+.3*anneal);
    return {...latticeFacts(l),pointDefects:true,vacancyCount:2,interstitialCount:2,vacancyHopPath:path,
      vacancySites:[l.points[vacancy],hole],interstitialPositions:[d.extra.position.toArray(),extra2.position.toArray()],
      migrationIsSchematic:true,relaxedAtomistics:false,defectsRetainedAfterThermalTreatment:true,
      processControls:{growthSpeed:speed,temperatureGradient:slope,thermalTreatment:anneal},noMeasuredTemperature:true};
  },[d.anchor,d.extra],{view:{eye:[1,4,10],look:[0,0,0],span:8.3},
    semanticAnchors:ctx=>locals([
      {phrase:'可能聚集',text:'空位',object:d.halo,offset:[-110,-40]},
      {phrase:'可能聚集',text:'间隙原子',object:d.extra,offset:[110,35]},
      {phrase:'生长速度',text:'生长速度示意',object:front,offset:[0,80]},
      {phrase:'温度梯度',text:'温度梯度示意',object:levels[2],offset:[100,80]},
      {phrase:'后续热过程',text:'热过程示意',object:treatment,offset:[-110,-100]},
    ].filter(entry=>ctx.time>=ctx.window(entry.phrase).start).slice(-2))});
}
function singleCrystalQuality(parent,beat){
  const g=group(parent),a=defectLattice(g,'single-crystal-defects'),b=defectLattice(g,'quality-comparison');
  a.l.g.position.y=1.4;b.l.g.position.y=-1.4;a.l.g.scale.setScalar(.58);b.l.g.scale.setScalar(.58);
  a.l.atoms[a.vacancy].visible=false;b.l.atoms[b.vacancy].visible=false;
  for(const d of [a,b])d.l.bonds.forEach(({o,i,j})=>o.visible=i!==d.vacancy&&j!==d.vacancy);
  const another=a.l.degree.findIndex((n,i)=>n===4&&i!==a.vacancy);
  a.l.atoms[another].visible=false;a.l.bonds.forEach(({o,i,j})=>{if(i===another||j===another)o.visible=false;});
  const direction=scope(g,'common-orientation'),axes=[];
  for(const y of [-1.4,1.4])axes.push(arrow(direction,[-1.2,y-.4,0],[-1.2,y+.4,0],M.green,.015));
  const residual=scope(g,'residual-vacancy'),residualCue=circle(residual,.12);
  const primary=target(a.l.g,'single-quality-target','同一取向但含有点缺陷的单晶');
  const lower=target(b.l.g,'low-defect-target','缺陷更少但仍非绝对完美的比较样本');
  target(b.l.g,'low-quality-vacancy-focus','较低缺陷样本的残余空位',b.l.points[b.vacancy]);
  const upperNeighbours=vacancyNeighborhood(a.l,a.vacancy),lowerNeighbours=vacancyNeighborhood(b.l,b.vacancy);
  return semanticRig(beat,g,([orientation,quality,imperfection,perfect])=>{
    direction.visible=orientation>0;axes.forEach(o=>o.scale.setScalar(.5+.5*orientation));
    b.l.g.visible=quality>0;b.extra.visible=false;
    a.halo.visible=imperfection>0;a.extra.visible=imperfection>0;b.halo.visible=perfect>0;
    upperNeighbours.visible=imperfection>0;lowerNeighbours.visible=perfect>0;
    residual.visible=perfect>0;residual.position.copy(V(...b.l.points[b.vacancy]).multiplyScalar(.58).add(b.l.g.position));
    residualCue.scale.setScalar(.7+.3*perfect);
    return {...latticeFacts(a.l),coherentOrientation:true,comparisonOrientationsIdentical:true,
      upperIllustrativeVacancies:2,upperIllustrativeInterstitials:1,lowerIllustrativeVacancies:1,
      neitherSampleAbsolutelyPerfect:true,illustrativeCountsNotMeasured:true};
  },[primary,lower],{view:{eye:[1,4.5,10],look:[0,0,0],span:8.1},
    semanticAnchors:ctx=>ctx.time>=ctx.window('不能把单晶').start?locals([
      {text:'空位',object:a.halo,offset:[-105,-35]},{text:'间隙原子',object:a.extra,offset:[105,35]}]):[]});
}

function epitaxialNetwork(parent,name){
  const l=diamond(parent,name,{cells:3,spacing:.86,atomRadius:.075});
  const levels=[...new Set(l.points.map(p=>p[1]))].sort((a,b)=>a-b),base=levels[5],growth=levels.slice(6);
  const white=new T.MeshStandardMaterial({color:0xe0e4e4,metalness:.1,roughness:.44});
  l.atoms.forEach((o,i)=>o.material=l.points[i][1]>base?mint:white);
  l.bonds.forEach(({o,i,j})=>o.material=l.points[i][1]>base||l.points[j][1]>base?M.green:M.silver);
  const substrateIndex=l.points.reduce((best,p,i)=>p[1]<=base&&V(...p).distanceTo(V(-.7,base-.4,.9))<
    V(...l.points[best]).distanceTo(V(-.7,base-.4,.9))?i:best,0);
  const substrate=target(l.g,'substrate-target','白色衬底原子',l.points[substrateIndex]);
  const newLayer=target(l.g,'new-layer-target','已形成的新生外延层原子',l.points[substrateIndex]);
  box(l.g,2.65,.14,2.65,M.dark,[0,levels[0]-.17,0]);
  function updateLayers(count,connections=1){
    const boundary=mix(base,growth.at(-1),count/growth.length);
    const sizes=l.points.map(p=>p[1]<=base?1:phase(boundary,p[1]-.12,p[1]));
    l.atoms.forEach((o,i)=>{o.visible=sizes[i]>.001;o.scale.setScalar(.075*sizes[i]);});
    l.bonds.forEach(({o,i,j})=>{
      const crosses=(l.points[i][1]<=base)!==(l.points[j][1]<=base);
      o.visible=sizes[i]>.99&&sizes[j]>.99&&(!crosses||connections>0);
    });
    const candidates=l.points.map((p,i)=>({p,i})).filter(({p,i})=>p[1]>base&&sizes[i]>.99)
      .sort((a,b)=>b.p[1]-a.p[1]||b.p[2]-a.p[2]||Math.abs(a.p[0]-.5)-Math.abs(b.p[0]-.5));
    newLayer.visible=candidates.length>0;
    if(candidates.length)newLayer.position.set(...candidates[0].p);
    return {sizes,boundary,completeGrowthLevels:growth.filter(v=>v<=boundary).length};
  }
  return {l,levels,base,growth,substrate,newLayer,updateLayers};
}
function epitaxyGrowth(parent,beat){
  const g=group(parent),n=epitaxialNetwork(g,'epitaxial-growth');
  n.l.g.position.y=-2.6;
  const reactor=epitaxyChamber(g);reactor.g.position.y=1.7;
  const section=interfaceSection(n);
  const gas=scope(g,'gas-feed-atoms'),incoming=[],sites=n.l.points.map((p,i)=>({p,i})).filter(({p})=>p[1]===n.growth[0]).slice(0,8);
  gas.position.y=n.l.g.position.y;
  sites.forEach(()=>incoming.push(ball(gas,.065,mint)));
  const incorporation=scope(g,'surface-incorporation'),surfaceCue=frame(incorporation,2.55,2.55,'surface-plane');
  incorporation.rotation.x=-Math.PI/2;incorporation.position.y=n.base+n.l.g.position.y;
  const primary=target(n.l.g,'epitaxy-surface-target','即将生长的衬底表面',[.7,n.base,.8]);
  return semanticRig(beat,g,([conditions,feed,surface,grow],ctx)=>{
    const macro=ctx.time>=ctx.window('硅片表面').start;
    reactor.g.visible=!macro;n.l.g.visible=macro;gas.visible=macro;
    const equipment=reactor.update(conditions,feed);
    const state=n.updateLayers(surface+grow*3);
    section.update(state.boundary);
    incoming.forEach((o,i)=>{
      const p=sites[i].p,u=phase(feed,i*.045,.65+i*.045);
      o.visible=feed>0&&surface<1;o.position.copy(lerpPoint([p[0],1.9+i*.04,p[2]],p,u));
      if(state.sizes[sites[i].i]>.99)o.visible=false;
    });
    incorporation.visible=macro&&surface>0;surfaceCue.scale.setScalar(.6+.4*surface);
    primary.position.copy(n.newLayer.visible?n.newLayer.position:V(.7,n.base,.8));
    primary.userData.objectLabel=n.newLayer.visible?'已与衬底相干连接的新层':'即将生长的衬底表面';
    return {...latticeFacts(n.l),coherentDiamondSites:true,layerCount:state.completeGrowthLevels,
      substrateColor:'white',newLayerColor:'mint',interfaceY:n.base,gasPrecedesSolidGrowth:true,
      connectedToSubstrate:true,layerThicknessNotToScale:true,notFloatingPlates:true,
      separatePhysicalAndAtomicScales:true,equipment};
  },[n.substrate,primary],{view:{eye:[3.3,2.5,10],look:[0,.25,0],span:8.2},
    semanticAnchors:ctx=>{
      if(ctx.time>=ctx.window('硅片表面').start)return locals([
        {text:'衬底',object:n.substrate,offset:[-105,50]},
        {text:'新生外延层',object:n.newLayer,offset:[105,-55]}]);
      if(ctx.time>=ctx.window('气相原料').start)return locals([
        {text:'气相原料',object:reactor.manifold,offset:[-100,-65]},
        {text:'衬底',object:reactor.wafer.disk,offset:[95,50]}]);
      return ctx.time>=ctx.window('受控条件').start?locals([
        {text:'灯加热',object:reactor.lamps[10],offset:[-100,-65]},
        {text:'衬底基座',object:reactor.susceptor,offset:[110,65]}]):[];
    }});
}
function epitaxyProperties(parent,beat){
  const g=group(parent),n=epitaxialNetwork(g,'epilayer-property-network');
  const section=interfaceSection(n);
  const coherent=scope(n.l.g,'coherent-interface'),interfaceBonds=[];
  n.l.bonds.forEach(({i,j})=>{if((n.l.points[i][1]<=n.base)!==(n.l.points[j][1]<=n.base))
    interfaceBonds.push(segment(coherent,n.l.points[i],n.l.points[j],.025,greenInk));});
  const thickness=scope(n.l.g,'layer-thickness'),vertical=dynamicLine(thickness,greenInk,.012);
  segment(thickness,[1.4,n.base,.9],[1.65,n.base,.9],.012,greenInk);
  const tick=dynamicLine(thickness,greenInk,.012);
  const electrical=scope(n.l.g,'epilayer-electrical-control'),carriers=[];
  const dopantSites=n.l.points.map((p,i)=>({p,i})).filter(({p})=>p[1]===n.growth[0]&&p[2]>.5).slice(0,2);
  const dopants=dopantSites.map(({p})=>ball(electrical,.075,M.amber,p));
  for(let i=0;i<3;i++)carriers.push(ball(electrical,.035,M.green,[1.45,.3+i*.2,.9]));
  return semanticRig(beat,g,([direction,height,resistivity])=>{
    const state=n.updateLayers(2+height*3);
    section.update(state.boundary);
    coherent.visible=direction>0;interfaceBonds.forEach((o,i)=>o.visible=direction>i/interfaceBonds.length);
    const top=n.growth[Math.max(0,state.completeGrowthLevels-1)];
    thickness.visible=height>0;setSegment(vertical,[1.52,n.base,.9],[1.52,top,.9]);
    setSegment(tick,[1.4,top,.9],[1.65,top,.9]);
    electrical.visible=resistivity>0;
    dopants.forEach((o,i)=>{o.visible=resistivity>i*.2;n.l.atoms[dopantSites[i].i].visible=!o.visible;});
    carriers.forEach((o,i)=>o.position.x=mix(1.3,1.8,phase(resistivity,i*.12,.7+i*.12)));
    return {...latticeFacts(n.l),coherentDiamondSites:true,layersGrown:state.completeGrowthLevels,
      substrateColor:'white',newLayerColor:'mint',interfaceY:n.base,substrateUnmodified:true,
      electricalControlOnlyInNewLayer:true,qualitativeCarrierTransport:true,noResistivityMeasurement:true,layerThicknessNotToScale:true};
  },[n.substrate,n.newLayer],{view:{eye:[3.3,2.4,10],look:[0,0,0],span:8.4},
    semanticAnchors:ctx=>ctx.time>=ctx.window('延续下面的晶格取向').start?locals([
      {text:'衬底',object:n.substrate,offset:[-105,50]},{text:'新生外延层',object:n.newLayer,offset:[105,-55]}]):[]});
}
function epitaxyProducts(parent,beat){
  const g=group(parent),epi=scope(g,'epitaxial-product'),polished=scope(g,'polished-product');
  epi.position.y=-1.3;polished.position.y=1.3;
  const a=epitaxialNetwork(epi,'bonded-interface'),b=epitaxialNetwork(polished,'bare-silicon-section');
  a.l.g.scale.setScalar(.6);b.l.g.scale.setScalar(.6);
  a.l.g.position.x=b.l.g.position.x=-3.55;
  a.updateLayers(3);b.updateLayers(0);
  const aSection=interfaceSection(a),bSection=interfaceSection(b);
  aSection.update(a.growth[2]);bSection.update(b.base);
  const productSilicon=M.silicon.clone();productSilicon.metalness=.78;productSilicon.roughness=.16;
  const bare=wafer(polished,1.05,[0,0,0],productSilicon),grown=wafer(epi,1.05,[0,0,0],productSilicon);
  bare.g.rotation.x=grown.g.rotation.x=.5;
  const productPaths=scope(g,'product-routes'),routes=[dynamicLine(productPaths,M.green,.018),dynamicLine(productPaths,M.green,.018)];
  const direct=scope(g,'direct-polished-route'),directArrow=arrow(direct,[1.3,1.3,0],[1.9,1.3,0],M.green,.022);
  const connections=a.l.bonds.filter(({i,j})=>(a.l.points[i][1]<=a.base)!==(a.l.points[j][1]<=a.base));
  return semanticRig(beat,g,([bonded,bareReveal,epiReveal,uses,optional],ctx)=>{
    // Compare products without replaying the preceding beat's layer-growth action.
    epi.visible=true;polished.visible=ctx.time>=ctx.window('抛光片').start;
    a.l.g.visible=ctx.time<ctx.window('抛光片').start;b.l.g.visible=false;grown.g.visible=epiReveal>0;
    connections.forEach(({o},i)=>{o.material=bonded>i/connections.length?greenInk:M.green;});
    polished.position.x=-.15*uses;epi.position.x=.15*uses;
    productPaths.visible=uses>0;
    setSegment(routes[0],[1.05-.15*uses,1.3,0],[mix(1.05-.15*uses,1.9,uses),1.3,0]);
    setSegment(routes[1],[1.05+.15*uses,-1.3,0],[mix(1.05+.15*uses,1.9,uses),-1.3,0]);
    directArrow.position.x=1.05-.15*uses;
    direct.visible=optional>0;directArrow.scale.setScalar(Math.max(.001,optional));
    return {coherentDiamondSites:true,comparison:'polished wafer versus optional epitaxial wafer',
      polishedHasNewLayer:false,epitaxialHasNewLayer:true,existingLayerNeverFloats:true,independentProductRoutes:true,
      epitaxyOptional:optional===1,waferDiameterMm:300,waferThicknessMm:.775,atomicSectionsMagnified:true,noRequiredEpitaxySequence:true};
  },[b.substrate,a.newLayer],{view:{eye:[1.7,2.1,10],look:[.2,0,0],span:7.6},
    semanticAnchors:ctx=>locals([
      ...(ctx.time>=ctx.window('抛光片').start?[{text:'抛光片',object:bare.disk,offset:[-95,-50]}]:[]),
      ...(ctx.time>=ctx.window('外延片').start?[{text:'外延片',object:grown.disk,offset:[95,50]}]:[]),
    ])});
}

const factories={
  '02-purity-01':purityHundred,'02-purity-02':purityTenfold,'02-purity-03':purityVersusDoping,
  '03-order-01':grainBoundaries,'03-order-02':continuousLattice,
  '04-quartz-01':quartzAppearance,'04-quartz-02':quartzReaction,'04-quartz-03':quartzWash,
  '05-furnace-03':metallurgicalPurity,'09-feedstock-02':grainDisorder,'10-melt-03':meltDoping,
  '17-defects-01':pointDefectCreation,'17-defects-02':pointDefectClustering,'17-defects-03':singleCrystalQuality,
  '24-epitaxy-01':epitaxyGrowth,'24-epitaxy-02':epitaxyProperties,'24-epitaxy-03':epitaxyProducts,
};
export function atomicRig(key,parent,beat){
  if(!beat||beat.visual!==key||!atomicKeys.includes(key))throw new Error('atomicRig requires its actual beat as third argument');
  atomicPlanFor(beat);
  const factory=factories[beat.id];
  if(!factory)throw new Error(`No independent atomic mechanism for ${beat.id}`);
  return directAtomic(factory(parent,beat),beat);
}
