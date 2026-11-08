import {T,V,M,group,box,cyl,ring,segment,dynamicLine,setSegment,tube,marker,openCup} from './core.mjs';

const named=(o,name)=>{o.name=name;return o;};
const context=parent=>{
  const g=named(group(parent),'surrounding equipment cutaway');
  g.userData.contextOnly=true;return g;
};
function shell(parent,inner,outer,bottom,top,material=M.silver,arc=Math.PI){
  const g=group(parent),start=(Math.PI*2-arc)/2;
  const surface=new T.Mesh(new T.CylinderGeometry(outer,outer,top-bottom,64,1,true,start,arc),material);
  surface.position.y=(bottom+top)/2;g.add(surface);
  const insideMaterial=material.clone();insideMaterial.side=T.BackSide;
  const inside=new T.Mesh(new T.CylinderGeometry(inner,inner,top-bottom,64,1,true,start,arc),insideMaterial);
  inside.position.y=surface.position.y;g.add(inside);
  for(const [y,flip]of [[top,-1],[bottom,1]]){
    const rimMaterial=material.clone();rimMaterial.side=T.DoubleSide;
    const rim=new T.Mesh(new T.RingGeometry(inner,outer,64,1,start-Math.PI/2,arc),rimMaterial);
    rim.rotation.x=-Math.PI/2;rim.position.y=y;g.add(rim);
  }
  for(const angle of [start,start+arc]){
    const cap=box(g,outer-inner,top-bottom,.012,material,
      [Math.sin(angle)*(inner+outer)/2,(bottom+top)/2,Math.cos(angle)*(inner+outer)/2]);
    cap.rotation.y=angle-Math.PI/2;
  }
  return g;
}
function flange(parent,a,b,r=.11,material=M.silver){
  const g=group(parent),direction=V(...b).sub(V(...a));
  segment(g,a,b,r*.55,material);
  const axis=direction.clone().normalize();
  for(const p of [V(...a),V(...b)]){
    const disk=cyl(g,r,.045,material,p.toArray());
    disk.quaternion.setFromUnitVectors(V(0,1,0),axis);
  }
  return g;
}
function feet(parent,radius,y,top,material=M.dark){
  for(const angle of [.8,2.35,3.93,5.48]){
    const x=Math.sin(angle)*radius,z=Math.cos(angle)*radius;
    cyl(parent,.105,top-y,material,[x,(y+top)/2,z]);
    box(parent,.36,.1,.38,M.silver,[x,y-.05,z]);
  }
}
function bearing(parent,y,r=.22){
  cyl(parent,r,.22,M.dark,[0,y,0]);
  ring(parent,r+.035,M.silver,[0,y+.11,0],.025);
  ring(parent,r+.035,M.silver,[0,y-.11,0],.025);
}
const shot=(phrase,kind,eye,look,span,object)=>({
  phrase,kind,eye,look,span,projection:kind==='overview'?'perspective':'orthographic',
  fit:false,...(object?{object}:{}),
});

export function trayDeck(parent,y){
  const g=named(group(parent),'perforated tray with downcomer');g.position.y=y;
  const shape=new T.Shape();shape.absarc(0,0,.535,0,Math.PI*2,false);
  for(const x of [-.28,-.12,.04])for(const z of [-.29,-.08,.13,.35]){
    const hole=new T.Path();hole.absarc(x,z,.048,0,Math.PI*2,true);shape.holes.push(hole);
  }
  const downcomer=new T.Path();
  downcomer.moveTo(.19,.25);downcomer.lineTo(.38,.25);downcomer.lineTo(.38,.43);
  downcomer.lineTo(.19,.43);downcomer.closePath();shape.holes.push(downcomer);
  const deck=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:false,curveSegments:16}),M.silver);
  deck.rotation.x=Math.PI/2;deck.position.y=.018;g.add(deck);
  for(const x of [.185,.385])box(g,.025,.32,.2,M.silver,[x,-.14,.34]);
  box(g,.22,.32,.025,M.silver,[.285,-.14,.24]);
  box(g,.025,.11,.2,M.silver,[.155,.065,.34]);
  ring(g,.54,M.dark,[0,-.035,0],.025);
  return g;
}

export function furnaceDetails(g,{electrodes,receiver}){
  const housing=context(g);
  named(shell(housing,1.54,1.83,-1.64,.24,M.ceramic),'refractory furnace lining cutaway');
  named(shell(housing,1.85,2.01,-1.76,.32,M.dark),'furnace steel shell cutaway');
  cyl(housing,1.68,.13,M.ceramic,[0,-1.64,0]);
  cyl(housing,1.89,.16,M.dark,[0,-1.79,0]);
  feet(housing,1.55,-2.49,-1.85);
  const holders=group(g);
  for(const electrode of electrodes){
    const {x,z}=electrode.position;
    cyl(holders,.25,.2,M.silver,[x,1.94,z]);
    for(const y of [1.82,2.06])cyl(holders,.28,.07,M.ceramic,[x,y,z]);
    const rear=[x,1.94,-1.15];
    segment(holders,[x,1.94,z-.24],rear,.065,M.dark);
    tube(housing,[[x+.2,1.94,z],[x+.33,2.14,z],[x+.33,2.14,-1.55]],.045,M.dark);
  }
  box(holders,2.3,.18,.25,M.dark,[0,1.94,-1.15]);
  for(const x of [-1.85,1.85]){
    segment(housing,[x,-2.45,-1.2],[x,2.35,-1.2],.09,M.dark);
    box(housing,.42,.11,.48,M.silver,[x,-2.5,-1.2]);
  }
  segment(housing,[-1.85,1.94,-1.2],[1.85,1.94,-1.2],.1,M.silver);
  const hood=shell(housing,.91,1.02,2.26,2.52,M.dark);
  hood.position.z=-.18;
  tube(housing,[[0,2.52,-.8],[0,2.95,-.8],[1.15,2.95,-.8]],.18,M.dark);
  flange(housing,[1.15,2.95,-.8],[1.36,2.95,-.8],.25);
  const tap=group(g);
  flange(tap,[1.4,-.55,0],[1.78,-.58,0],.15,M.ceramic);
  openReceiver(tap,[1.95,-1.52,0],.57,.37);
  const yoke=segment(tap,[1.55,-1.69,0],[2.35,-1.69,0],.045,M.dark);
  for(const x of [1.57,2.33])segment(tap,[x,-1.7,0],[x,-2.02,0],.045,M.dark);
  const reaction=marker(g,[0,-.18,.35]),gas=marker(g,[.25,2.22,.2]);
  return {housing,holders,tap,reaction,gas,receiver,yoke};
}

function openReceiver(parent,xyz,r=.45,h=.65){
  const g=group(parent);g.position.set(...xyz);
  const wallMaterial=M.silver.clone();wallMaterial.side=T.DoubleSide;
  const wall=new T.Mesh(new T.CylinderGeometry(r,r*.85,h,48,1,true,Math.PI/2,Math.PI),wallMaterial);
  wall.position.y=h/2;g.add(wall);
  cyl(g,r*.85,.05,M.silver,[0,0,0]);return g;
}
function condenser(parent,xyz,length=.9){
  const g=named(group(parent),'condenser shell and cooling passages');g.position.set(...xyz);
  const jacket=cyl(g,.19,length,M.dark);jacket.rotation.z=Math.PI/2;
  for(const x of [-length/2,length/2]){
    const cap=cyl(g,.23,.065,M.silver,[x,0,0]);cap.rotation.z=Math.PI/2;
  }
  for(const x of [-length*.3,length*.3])
    flange(g,[x,.19,0],[x,.38,0],.075,M.silver);
  return g;
}
export function conversionDetails(g,{chunk,molecule,pots,cold,out}){
  if(pots){
    const equipment=group(g);
    for(const [i,pot]of pots.entries()){
      const x=pot.position.x;
      shell(equipment,.48,.52,-1.52,-.64,M.silver).position.x=x;
      cyl(equipment,.41,.06,M.dark,[x,-1.56,0]);
      feet(equipment,.32,-1.92,-1.58);
      // Local support legs belong to each vessel, not to a shared display table.
      const legs=equipment.children.slice(-8);
      for(const part of legs)part.position.x+=x;
      flange(equipment,[x,-.64,0],[x,-.5,0],.09);
      if(i===0){
        for(const y of [-1.42,-1.32,-1.22])ring(equipment,.48,M.dark,[x,y,0],.027);
        box(equipment,.7,.12,.68,M.dark,[x,-1.67,0]);
      }
    }
    const cooler=condenser(equipment,[.2,.5,0],.9);
    cooler.rotation.z=Math.PI/2;
    tube(equipment,[[.2,-.2,0],[.2,-.45,.22],[-.2,-1.65,.2],[-.2,-1.75,.2]],.04,M.silver);
    openReceiver(equipment,[-.2,-2.36,.2],.43,.6);
    return {equipment,cooler,phase:pots[0],collection:out};
  }
  const sidecar=context(g),reactor=group(sidecar);reactor.position.set(-1.2,.5,-.65);
  shell(reactor,.68,.73,-.7,.7,M.silver);
  cyl(reactor,.68,.08,M.dark,[0,-.74,0]);
  for(const sign of [-1,1])segment(reactor,[sign*.45,-.75,-.15],[sign*.45,-1.15,-.15],.05,M.dark);
  flange(reactor,[-.73,.1,0],[-1.04,.1,0],.1);
  flange(reactor,[.73,.15,0],[1.04,.15,0],.1);
  tube(sidecar,[[-2.24,.6,-.65],[-2.48,.6,-.65],[-2.48,1.2,-.65]],.04,M.silver);
  tube(sidecar,[[-.16,.65,-.65],[.35,.65,-.65],[.35,1.15,-.65],[1.15,1.15,-.65]],.04,M.silver);
  return {equipment:sidecar,phase:chunk,composition:molecule.centre};
}
export function distillationDetails(g,{tower,trays,collector,stages,unit,clean,waste}){
  const equipment=context(g);
  if(tower){
    const casing=shell(tower,.565,.615,-2.16,2.16,M.silver);
    named(casing,'distillation column cutaway');
    for(const y of [-2.15,2.15])ring(tower,.62,M.dark,[0,y,0],.035);
    const reboiler=group(equipment);reboiler.position.set(-.4,-2.72,0);
    cyl(reboiler,.49,.55,M.dark);
    ring(reboiler,.5,M.hot,[0,-.1,0],.026);
    tube(equipment,[[-.4,-2.16,0],[-.4,-2.42,0]],.09,M.silver);
    tube(equipment,[[.02,-2.72,0],[.4,-2.72,0],[.4,-1.82,0],[-.02,-1.82,0]],.05,M.silver);
    condenser(equipment,[.92,2.5,-.16],.95);
    tube(equipment,[[-.4,2.16,0],[-.4,2.5,-.16],[.445,2.5,-.16]],.055,M.silver);
    cyl(equipment,.28,.62,M.silver,[1.63,2.08,-.16]);
    tube(equipment,[[1.395,2.5,-.16],[1.63,2.5,-.16],[1.63,2.39,-.16]],.05,M.silver);
    tube(equipment,[[1.63,1.77,-.16],[.8,1.77,-.16],[.8,1.6,-.16],[.13,1.6,-.16]],.045,M.silver);
    tube(equipment,[[1.63,1.77,-.16],[2.1,1.77,-.16],[2.1,-1.59,0],[1.55,-1.59,0]],.045,M.silver);
    for(const x of [-.88,.08])segment(equipment,[x,-2.1,-.3],[x,-3.18,-.3],.055,M.dark);
    box(equipment,1.3,.12,.9,M.dark,[-.4,-3.24,-.1]);
    return {equipment,tray:trays[2],reboiler,collector};
  }
  for(const stage of stages){
    const frame=group(stage);
    for(const sign of [-1,1])box(frame,.07,.95,.85,M.dark,[sign*.75,0,0]);
    box(frame,1.55,.065,.87,M.silver,[0,.47,0]);
    for(const x of [-.42,0,.42])box(frame,.18,.045,.5,M.silver,[x,-.28,0]);
  }
  for(const x of [-1.42,.12])segment(equipment,[x,-2.05,-.32],[x,1.65,-.32],.055,M.dark);
  box(equipment,1.85,.12,1.1,M.dark,[-.65,-2.12,0]);
  tube(equipment,[[-.65,1.62,-.1],[-.65,1.93,-.1],[.65,1.93,-.1],[1.2,.8,0]],.045,M.silver);
  shell(unit,.42,.46,-.75,.75,M.silver);
  cyl(unit,.43,.08,M.dark,[0,-.8,0]);
  const product=openReceiver(equipment,[1.2,-2.1,0],.46,.68);
  const reject=openReceiver(equipment,[-1.95,-2.1,0],.39,.68);
  return {equipment,tray:stages[1],unit,product,reject,collector:clean,waste};
}

export function siemensDetails(g,{base,rods,recycle,byproduct}){
  const bell=context(g),points=[[1.38,-1.42],[1.38,.7],[1.34,1.04],[1.14,1.3],[.72,1.48],[0,1.53]];
  const cover=new T.Mesh(new T.LatheGeometry(points.map(p=>new T.Vector2(...p)),64,Math.PI/2,Math.PI),M.silver);
  const inside=cover.clone();inside.material=M.dark.clone();inside.material.side=T.BackSide;
  bell.add(cover,inside);
  shell(bell,1.26,1.45,-1.46,-1.34,M.dark);
  const terminals=group(g),power=group(g);
  for(const x of [-.55,.55]){
    cyl(terminals,.16,.45,M.ceramic,[x,-1.79,0]);
    cyl(terminals,.065,.7,M.silver,[x,-1.77,0]);
    for(const y of [-1.61,-1.96])cyl(terminals,.21,.05,M.dark,[x,y,0]);
    tube(power,[[x,-2.12,0],[x,-2.23,-.35],[x*2,-2.23,-.55]],.045,M.silver);
    segment(bell,[x*2,-1.58,-.55],[x*2,-2.23,-.55],.045,M.dark);
  }
  box(power,2.5,.22,.38,M.dark,[0,-2.25,-.55]);
  feet(bell,1.08,-2.55,-1.58);
  const ports=group(g);
  for(const [x,y]of [[-1.35,-1.1],[1.35,1]])
    flange(ports,[x-.13,y,0],[x+.13,y,0],.095);
  const treatment=context(g);
  condenser(treatment,[1.7,1.4,0],.45).rotation.z=Math.PI/2;
  const pump=cyl(treatment,.14,.38,M.dark,[-1.7,-.3,0]);
  flange(treatment,[-1.7,-.53,0],[-1.7,-.08,0],.17);
  segment(treatment,[-1.7,-.3,-.14],[-1.35,-.3,-.3],.045,M.dark);
  segment(treatment,[-1.35,-.3,-.3],[-1.35,-1.44,-.3],.045,M.dark);
  tube(treatment,[[1.1,1,0],[1.9,1,.3],[1.9,-1.3,.3]],.04,M.silver);
  openReceiver(treatment,[1.9,-1.93,0],.39,.64);
  return {bell,terminals,power,ports,treatment,pump,base,rods,recycle,byproduct};
}

export function polycrystalProduct(rods,bridge,material){
  material.metalness=.75;material.roughness=.32;
  material.clearcoat=.12;material.clearcoatRoughness=.3;
  for(const [index,part]of [...rods,bridge].entries()){
    const height=part.geometry.parameters.height;
    const geometry=new T.CylinderGeometry(.08,.08,height,72,48);
    const positions=geometry.attributes.position,normals=geometry.attributes.normal;
    for(let i=0;i<positions.count;i++){
      if(Math.abs(normals.getY(i))>.5)continue;
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
      const angle=Math.atan2(z,x),envelope=Math.sin(Math.PI*(y/height+.5));
      const relief=.0045*envelope*(.55*Math.sin(angle*19+y*41+index)+
        .3*Math.cos(angle*31-y*57)+.15*Math.sin(angle*43+y*29));
      const scale=(.08+relief)/.08;
      positions.setX(i,x*scale);positions.setZ(i,z*scale);
    }
    geometry.computeVertexNormals();geometry.computeBoundingSphere();
    part.geometry.dispose();part.geometry=geometry;part.scale.set(3.5,1,3.5);
    part.userData.surface='continuous deposited polycrystal with schematic grain relief';
  }
}

export function magneticDetails(magnets){
  for(const sign of [-1,1]){
    const coil=group(magnets);coil.position.set(sign*2.8,-.8,0);
    for(const x of [-.15,-.05,.05,.15]){
      const winding=ring(coil,.76,M.silver,[x,0,0],.045);
      winding.rotation.set(0,Math.PI/2,0);
    }
    const bobbin=ring(coil,.81,M.dark,[0,0,0],.08);bobbin.rotation.set(0,Math.PI/2,0);
    for(const x of [-.24,.24]){
      const flangeRing=ring(coil,.78,M.dark,[x,0,0],.055);
      flangeRing.rotation.set(0,Math.PI/2,0);
    }
    box(coil,.58,.16,1.5,M.dark,[0,-.86,0]);
    for(const z of [-.58,.58])box(coil,.14,1.05,.16,M.dark,[0,-1.46,z]);
    box(coil,.7,.14,1.55,M.silver,[0,-2.05,0]);
    tube(coil,[[.13,.72,-.1],[.4,.72,-.1],[.4,-1.85,-.35]],.035,M.dark);
    box(coil,.2,.26,.24,M.silver,[.4,-1.89,-.35]);
  }
}

function resistanceHeater(parent,radius){
  const material=M.dark.clone();
  material.emissive=new T.Color(0x8a481c);material.emissiveIntensity=.22;
  const count=12,bottom=-1.8,top=-.7,step=Math.PI/(count-1);
  for(let i=0;i<count;i++){
    const angle=Math.PI/2+i*step,x=Math.sin(angle)*radius,z=Math.cos(angle)*radius;
    const strip=box(parent,.26,top-bottom,.09,material,[x,(top+bottom)/2,z]);
    strip.rotation.y=angle;
    if(i<count-1){
      const next=angle+step,y=i%2?bottom+.055:top-.055;
      const bridge=box(parent,2*radius*Math.sin(step/2)+.26,.11,.09,material,
        [(x+Math.sin(next)*radius)/2,y,(z+Math.cos(next)*radius)/2]);
      bridge.rotation.y=angle+step/2;
    }
  }
  // Alternating end bridges form one resistive path, exposed by the front cutaway.
  for(const sign of [-1,1]){
    segment(parent,[sign*radius,bottom,0],[sign*2.18,bottom,0],.055,M.dark);
    segment(parent,[sign*2.18,bottom,0],[sign*2.18,-1.55,0],.055,M.dark);
  }
  for(const angle of [Math.PI/2,Math.PI,Math.PI*1.5]){
    const x=Math.sin(angle)*radius,z=Math.cos(angle)*radius;
    cyl(parent,.08,.34,M.ceramic,[x,-1.97,z]);
    cyl(parent,.13,.06,M.dark,[x,-2.14,z]);
  }
  parent.userData.heating='graphite electrical resistance; sectioned slotted cylinder';
  return progress=>{material.emissiveIntensity=.22+.33*progress;};
}

export function crucibleDetails(a){
  const {g,graphite,heat}=a,outer=context(g);
  named(shell(graphite,1.61,1.79,-1.94,-.74,M.dark),'graphite crucible susceptor section');
  const loadBearing=named(group(g),'permanent crucible seat and load path');
  cyl(loadBearing,1.61,.14,M.dark,[0,-1.94,0]);
  const spindle=named(cyl(loadBearing,.23,.9,M.dark,[0,-2.46,0]),'crucible load and rotation shaft');
  cyl(loadBearing,.48,.16,M.dark,[0,-2.09,0]);
  bearing(outer,-2.83,.34);
  cyl(outer,.43,.46,M.silver,[0,-3.15,0]);
  box(outer,1.05,.18,.95,M.dark,[0,-3.47,0]);
  named(shell(outer,2.04,2.25,-2.17,.78,M.ceramic),'thermal insulation cutaway');
  named(shell(outer,2.28,2.39,-2.27,1.12,M.silver),'water cooled chamber cutaway');
  const floorShape=new T.Shape();floorShape.absarc(0,0,2.39,0,Math.PI*2,false);
  const shaftOpening=new T.Path();shaftOpening.absarc(0,0,.38,0,Math.PI*2,true);
  floorShape.holes.push(shaftOpening);
  const floor=new T.Mesh(new T.ExtrudeGeometry(floorShape,
    {depth:.12,bevelEnabled:false,curveSegments:48}),M.dark);
  floor.rotation.x=Math.PI/2;floor.position.y=-2.17;outer.add(floor);
  named(floor,'chamber bottom flange with spindle opening');
  for(const y of [-2.22,1.06])shell(outer,2.25,2.46,y-.045,y+.045,M.dark);
  feet(outer,1.96,-3.38,-2.22);
  const setHeat=resistanceHeater(heat,1.94);
  for(const sign of [-1,1]){
    flange(heat,[sign*2.18,-1.55,0],[sign*2.48,-1.55,0],.13,M.dark);
    cyl(heat,.15,.28,M.ceramic,[sign*2.3,-1.55,0]).rotation.z=Math.PI/2;
    tube(outer,[[sign*2.48,-1.55,0],[sign*2.63,-1.55,0],
      [sign*2.63,-2.4,-.3]],.045,M.dark);
    box(outer,.5,.08,.38,M.dark,[sign*2.44,-2.25,-.3]);
    box(outer,.28,.32,.28,M.silver,[sign*2.63,-2.45,-.3]);
  }
  const shield=group(outer);
  const cone=new T.Mesh(new T.CylinderGeometry(.55,1.47,.65,64,1,true,Math.PI/2,Math.PI),M.dark);
  cone.position.y=-.04;shield.add(cone);
  for(const sign of [-1,1])segment(shield,[sign*1.45,-.35,0],[sign*2.2,-.35,-.15],.035,M.dark);
  const gas=context(g);
  named(tube(gas,[[-2.85,1.55,-.6],[-1.5,1.55,.1],[-1.5,.85,.1]],.055,M.silver),'gas inlet to chamber');
  named(tube(gas,[[1.5,.85,.1],[1.5,1.55,.1],[2.8,1.55,-.6],[2.8,.9,-.6]],.055,M.silver),'chamber gas outlet');
  for(const x of [-2.85,2.8])flange(gas,[x,1.48,-.6],[x,1.65,-.6],.12);
  box(gas,.46,.5,.48,M.dark,[2.8,.63,-.6]);
  const pull=context(g),continuation=dynamicLine(pull,M.silver,.02);
  for(const x of [-.9,.9]){
    segment(pull,[x,1.12,-.65],[x,4.55,-.65],.075,M.silver);
    box(pull,.32,.13,.42,M.dark,[x,1.12,-.65]);
  }
  box(pull,2.05,.17,.9,M.dark,[0,4.55,-.32]);
  bearing(pull,4.43);
  const drum=cyl(pull,.3,.7,M.dark,[0,4.84,0]);drum.rotation.z=Math.PI/2;
  for(const x of [-.37,.37]){
    const end=cyl(pull,.35,.045,M.silver,[x,4.84,0]);end.rotation.z=Math.PI/2;
  }
  segment(pull,[.35,4.84,0],[.52,4.84,0],.085,M.silver);
  box(pull,.48,.46,.55,M.silver,[.76,4.84,0]);
  for(let i=0;i<6;i++){
    const angle=i*Math.PI/3;
    const jaw=box(a.chuck,.055,.19,.065,M.silver,[Math.sin(angle)*.145,-.045,Math.cos(angle)*.145]);
    jaw.rotation.y=angle;
  }
  const interfaceTarget=marker(g,[0,-.65,.35]),supportTarget=marker(g,[1.68,-1.65,.1]);
  return {outer,gas,pull,spindle,loadBearing,interfaceTarget,supportTarget,setHeat,
    sync(beat){
      gas.visible=beat.id==='10-melt-02'||beat.id==='11-seed-03'||beat.id.startsWith('15-magnetic');
      pull.visible=beat.id.startsWith('11-seed')||beat.id.startsWith('13-growth')||
        beat.id==='14-load-01'||beat.id==='15-magnetic-02';
      if(pull.visible){
        a.cable.updateMatrix();
        const tip=V(0,.5,0).applyMatrix4(a.cable.matrix);
        setSegment(continuation,tip.toArray(),[0,4.43,0]);
      }
    }};
}

function coreShots(rig,beat,a){
  const id=beat.id;
  if(id==='10-melt-01')return [
    shot('多晶硅装进','overview',[3.1,3.6,10],[0,-.5,0],11.7),
    shot('石墨支撑','section',[2,1.3,10],[0,-1.55,0],8.6),
    shot('热场','section',[-1.4,1.8,10],[-.2,-.85,0],10.6),
    shot('固体逐渐变成熔体','macro',[.4,6,10],[0,-.65,0],6.1),
  ];
  if(id==='10-melt-02')return [
    shot('气氛','overview',[2.1,2.5,10],[0,-.3,0],12),
    shot('热量分布','section',[-1.4,1.8,10],[-.2,-.85,0],10.6),
    shot('保持稳定','macro',[.2,6.5,10],[0,-.65,0],6.2),
    shot('不是温度越高越好','section',[1.3,2.2,10],[.45,-.6,0],8),
  ];
  if(id==='11-seed-01')return [
    shot('籽晶','section',[-1.5,1.8,10],[.3,1.3,0],8.2,a.seed),
    shot('方向已知','macro',[3,2,10],[1.6,1.3,0],3.9),
    shot('新来的硅原子','macro',[-1.3,1.2,10],[1.85,1.3,0],4.6),
  ];
  if(id==='11-seed-02')return [
    shot('接触熔硅','section',[1.5,2.1,10],[.2,.5,0],8.9),
    shot('向上提拉','section',[-1.5,1.8,10],[0,1.45,0],8.5,a.seed),
    shot('接触处凝固','macro',[1.6,3,10],[0,-.6,.12],3.4),
    shot('延续籽晶的取向','macro',[2.5,1.4,10],[1.6,1.3,0],3.7),
  ];
  if(id==='11-seed-03')return [
    shot('旋转','overview',[2,3.6,10],[0,.6,0],11.5),
    shot('传热','section',[-2,3.3,10],[-.3,-.8,.25],6.8),
    shot('物质输运','macro',[.4,6,10],[-.55,-.6,.4],4.5),
  ];
  return null;
}

function familyShots(beat){
  const s=shot;
  const shots={
    '05-furnace-01':[
      s('石英和碳质还原剂','overview',[3.5,3,10],[0,.1,0],11.5),
      s('电极送入能量','section',[-2,2.5,10],[0,.8,0],8),
      s('高温区域','macro',[1,4.7,10],[0,-.2,.15],5.9)],
    '05-furnace-02':[
      s('一氧化碳离开','overview',[-2,2.4,10],[0,.4,0],11.2),
      s('液态硅汇集炉底','section',[1,4,10],[0,-.6,0],6.1),
      s('出料口放出','macro',[-1,2,10],[1.76,-1.05,0],3.7)],
    '06-transform-01':[
      s('硅转化成','overview',[1.3,1.5,10],[0,.45,0],8.6),
      s('三氯氢硅','macro',[3,2,10],[1.15,.5,0],3.4)],
    '06-transform-02':[
      s('改变了化学形态','section',[.2,2.1,10],[0,.35,0],7.9),
      s('挥发性的差别','macro',[-.3,2,10],[0,-1.2,0],6.1)],
    '06-transform-03':[
      s('汽化','section',[-2,2.6,10],[-.7,-.2,0],6.8),
      s('冷凝','macro',[2,1,10],[.3,.4,0],3.3),
      s('不同的收集路径','section',[.2,3,10],[.45,-1.4,0],5.6)],
    '07-distill-01':[
      s('蒸气向上','overview',[2,2,10],[.1,-.1,0],10.8),
      s('液体向下','macro',[1,3,10],[-.4,0,.2],3.5),
      s('容易挥发','section',[-1,1.5,10],[-.4,1.1,.15],4.8)],
    '07-distill-02':[
      s('重复这样的交换','overview',[-1,2.8,10],[-.1,-.05,0],10),
      s('分别收集','section',[1.2,3.1,10],[-.3,-1.5,.1],7.2),
      s('多个分离步骤','macro',[-.7,1.2,10],[1.15,0,.2],4.1)],
    '07-distill-03':[
      s('杂质种类不同','macro',[.1,2,10],[-.65,0,.2],3.8),
      s('不是万能滤网','section',[-1.2,1.8,10],[-.65,-.4,.2],5.9),
      s('整套工艺配合','overview',[1.7,2.4,10],[0,-.3,0],10.2)],
    '08-siemens-01':[
      s('细长的硅芯','overview',[2,2.1,10],[0,-.3,0],9.7),
      s('通电加热','section',[-1.5,1.1,10],[0,-.65,0],6.3)],
    '08-siemens-02':[
      s('氯硅烷与氢气','overview',[-2,2.7,10],[-.1,-.1,0],9),
      s('硅沉积到硅芯表面','macro',[2,1.1,10],[-.55,-.15,.1],2.8),
      s('一层层长粗','section',[.1,1.4,10],[0,-.1,0],5.6)],
    '08-siemens-03':[
      s('重新沉积','section',[1.5,2,10],[0,-.1,0],6.2),
      s('气体循环','overview',[-.2,2,10],[0,.1,0],9.7),
      s('副产物处理','macro',[-1,1.5,10],[1.9,-.8,.2],3.8)],
    '09-feedstock-01':[
      s('取出硅棒','overview',[-1.5,2,10],[0,.1,0],8.4),
      s('破碎','section',[.5,3.4,10],[0,-.1,0],5.3),
      s('清理','macro',[1.1,4,10],[0,-.45,.1],4.7),
      s('洁净包装','section',[-2,3.4,10],[0,-.5,0],5.6),
      s('工具带来的污染','macro',[1.5,2,10],[1.55,1.32,.1],2.7),
      s('去掉','macro',[-1,2,10],[1.4,1.4,.1],2.35)],
    '09-feedstock-03':[
      s('先熔化','section',[-1,3,10],[-.45,-.1,0],7.2),
      s('重新生长单晶','macro',[2,2.2,10],[1,.8,0],3.5),
      s('不是','macro',[1,2,10],[0,-1.9,0],3.6)],
    '12-neck-01':[
      s('引入位错','section',[-1,1.8,10],[0,.2,0],5.8),
      s('线状缺陷','macro',[1.3,.7,10],[0,.75,.15],2.8),
      s('后续生长中延伸','section',[-.2,1.2,10],[0,-.1,0],5.8)],
    '12-neck-02':[
      s('拉出很细的颈部','section',[1,1.8,10],[0,-.05,0],5.7),
      s('表面更近','macro',[-.3,2,10],[0,.58,.16],2.6),
      s('位错在侧壁终止','macro',[.4,.5,10],[0,.58,.16],2.4)],
    '12-neck-03':[
      s('整根晶棒的品质','overview',[1.2,1.5,10],[.6,0,0],7.3),
      s('红线表示位错','macro',[-.5,1,10],[0,.65,.15],3.1),
      s('不是实际可见的裂缝','section',[2,2,10],[1.45,-.1,0],4.3)],
    '13-growth-01':[
      s('温度和拉速','overview',[1,2.6,10],[-.2,.2,0],11),
      s('直径逐渐增大','macro',[-1,2,10],[0,-.45,.12],3.6)],
    '13-growth-02':[
      s('目标直径','section',[1.2,2.3,10],[0,.2,0],7.3),
      s('晶棒向上','overview',[-1.4,2.2,10],[0,.8,0],10.4),
      s('固液界面','macro',[.3,3,10],[0,-.63,.1],3.3)],
    '13-growth-03':[
      s('金属般的光泽','macro',[3,2,10],[0,.25,0],4.1),
      s('慢慢长出来','section',[-1.6,2,10],[0,.8,0],8.4),
      s('热场和拉速','overview',[1,3,10],[-.15,.2,0],10.8)],
    '14-load-01':[
      s('晶棒越长越重','overview',[2,1.6,10],[0,1.15,0],10.6),
      s('承重设计','section',[-1.2,1.4,10],[0,2.7,0],6.2),
      s('辅助机构','macro',[1,2,10],[0,1.85,.1],7.8)],
    '14-load-02':[
      s('温差和旋转','section',[2,4,10],[0,-.8,0],7),
      s('流动','macro',[-.8,6,10],[0,-.6,.1],4.8),
      s('改变正在凝固的界面条件','macro',[.5,3.2,10],[0,-.65,.1],3.4)],
    '14-load-03':[
      s('界面条件不稳定','overview',[1,2,10],[0,0,0],7.5),
      s('均匀性','macro',[1,1.5,10],[-1,-.2,0],3.8),
      s('整根晶棒长得稳定','section',[-1,2,10],[1,0,0],5.4)],
    '15-magnetic-01':[
      s('能导电','section',[1,4,10],[0,-.65,0],6.5),
      s('磁场','overview',[.2,2.8,10],[0,-.5,0],13.6),
      s('抑制某些流动','macro',[.2,5,10],[0,-.58,.3],5.2)],
    '15-magnetic-02':[
      s('不是把硅吸起来','section',[-1.5,1.7,10],[0,2.2,0],8.1),
      s('流动与传热','overview',[1,3,10],[0,-.25,0],13.8),
      s('帮助控制','macro',[-.7,4.3,10],[0,-.63,.1],4.4)],
    '15-magnetic-03':[
      s('石英坩埚','section',[-1.2,3.7,10],[.2,-.95,0],6.9),
      s('引入氧','macro',[-2,4,10],[.7,-.8,.2],4.3),
      s('进入晶体','macro',[1,2.7,10],[0,-.12,.2],3.8),
      s('熔体流动','section',[.3,6,10],[0,-.62,0],6.1)],
    '16-control-01':[
      s('氧','section',[2,4,10],[0,0,0],7.7),
      s('热处理','macro',[2,3,10],[0,-.15,.1],4.5),
      s('吸杂','macro',[-1,2.4,10],[.15,-.18,.15],3.2),
      s('按用途控制','section',[1,4.6,10],[0,.1,0],7.3)],
    '16-control-02':[
      s('固体和液体','section',[1.2,2.3,10],[0,0,0],6.4),
      s('剩余熔体','macro',[-1,2.4,10],[0,-.6,.1],5.3)],
    '16-control-03':[
      s('沿晶棒长度','section',[-1,2,10],[-.55,0,0],5.7),
      s('沿半径','macro',[.3,8,10],[1.45,-.62,0],3.9),
      s('都需要控制','overview',[1,3,10],[.2,0,0],7.6)],
  };
  return shots[beat.id];
}

function localDetail(rig,beat){
  const id=beat.id;
  if(id.startsWith('12-neck')){
    const seed=rig.g.children.find(o=>o.isMesh&&o.position.y===1.6);
    const holder=group(seed);
    cyl(holder,.55,.12,M.dark,[0,.385,0]);
    for(const sign of [-1,1])box(holder,.08,.2,.4,M.silver,[sign*.49,.28,0]);
    const cut=context(rig.g);
    for(const sign of [-1,1])segment(cut,[sign*.62,1.78,-.4],[sign*.62,2.08,-.4],.035,M.dark);
    segment(cut,[-.62,2.08,-.4],[.62,2.08,-.4],.05,M.dark);
  }
  if(id==='09-feedstock-03'){
    const cup=openCup(rig.g,1.37,-1.51);
    cup.userData.contextOnly=true;
  }
}

export function detailGrowthRig(rig,beat){
  let a;
  rig.g.traverse(o=>{if(o.growthApparatus)a=o.growthApparatus;});
  if(a){
    const update=rig.update;
    rig.update=ctx=>{
      const state=update(ctx);a.detail.sync(beat);
      if(beat.id.startsWith('11-seed')){
        const latticeOnly=beat.id==='11-seed-01'?
          ctx.time>=ctx.window('方向已知').start:beat.id==='11-seed-02'?
            ctx.time>=ctx.window('延续籽晶的取向').start:false;
        a.g.visible=!latticeOnly;
      }
      return {...state,equipmentDetail:'manufacturing cutaway; not an engineering drawing'};
    };
    rig.storyShots=coreShots(rig,beat,a)||familyShots(beat);
  }else{
    rig.storyShots=familyShots(beat);
    localDetail(rig,beat);
  }
  if(!rig.storyShots||rig.storyShots.length<2)throw new Error(`Missing equipment shots: ${beat.id}`);
  for(const entry of rig.storyShots)
    if(!rig.semanticPlan.some(event=>event.phrase===entry.phrase))
      throw new Error(`Shot has no spoken action: ${beat.id}/${entry.phrase}`);
  rig.equipmentNotes={
    representation:'Selected manufacturing relationships in cutaway; not a construction drawing',
    scale:'Chamber, atomic and defect close-ups use separate explanatory scales',
    quantities:'No temperature, pressure, gas proportion, current or flow measurement is implied',
    detailRevision:1,
  };
  return rig;
}
