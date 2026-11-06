import * as T from '../assets/vendor/three.module.min.js';
const timeline=await(await fetch('../timeline.json')).json();
const settings=new URLSearchParams(location.search);
const W=Number(settings.get('w')??576),H=Number(settings.get('h')??1024);
const renderer=new T.WebGLRenderer({canvas:document.getElementById('world'),antialias:true,preserveDrawingBuffer:true});
renderer.setSize(W,H,false);renderer.setPixelRatio(1);
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.12;renderer.localClippingEnabled=true;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(35,W/H,.03,180);
scene.background=new T.Color(0x171b1e);
scene.add(new T.HemisphereLight(0xe6edf1,0x202326,2.2));
for(const[colour,power,position]of [[0xf4f7f8,4.1,[-6,10,9]],[0xaec8d1,2.1,[7,3,-4]],[0xe2e6e5,1.1,[-4,-2,4]]]){
 const light=new T.DirectionalLight(colour,power);light.position.set(...position);scene.add(light);
}
const envCanvas=document.createElement('canvas');envCanvas.width=2048;envCanvas.height=1024;
const ec=envCanvas.getContext('2d');ec.fillStyle='#262b30';ec.fillRect(0,0,2048,1024);
for(const[x,y,w,h]of [[0,130,2048,90],[0,360,2048,22],[0,670,2048,120],[330,0,95,1024],[1500,0,40,1024]]){
 ec.fillStyle='#f4f7f7';ec.fillRect(x,y,w,h);
}
const texture=new T.CanvasTexture(envCanvas);texture.mapping=T.EquirectangularReflectionMapping;
const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromEquirectangular(texture).texture;
pmrem.dispose();texture.dispose();
const material=(colour,metalness=.7,roughness=.24,extra={})=>new T.MeshPhysicalMaterial({color:colour,metalness,roughness,...extra});
const M={
 steel:material(0xaebbc2,.9,.23),bright:material(0xdde5e9,.98,.16),
 dark:material(0x24282b,.6,.38),black:material(0x101316,.3,.48),
 ceramic:material(0xd8dcda,.08,.53),silicon:material(0x939fa5,1,.12),
 green:material(0x399a74,.18,.53),amber:material(0xeab65a,.4,.32),
 oxygen:material(0xc86457,.05,.46),white:material(0x819098,.04,.72,{envMapIntensity:.28,specularIntensity:.25}),
 hot:material(0xf2b35d,.45,.27,{emissive:0xd45a1f,emissiveIntensity:.55}),
 glass:material(0xc9dfdc,0,.18,{transparent:true,opacity:.28,side:T.DoubleSide,depthWrite:false}),
 liquid:material(0x8aaca9,.25,.13,{transparent:true,opacity:.48,side:T.DoubleSide,depthWrite:false})
};
const V=(...v)=>new T.Vector3(...v),clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);},lerp=(a,b,u)=>a+(b-a)*u;
const smooth=(t,a,b)=>ease((t-a)/Math.max(.01,b-a));
const group=parent=>{const g=new T.Group();parent?.add(g);return g;};
function mesh(parent,geo,mat,pos=[0,0,0]){const o=new T.Mesh(geo,mat);o.position.set(...pos);parent.add(o);return o;}
function box(parent,w,h,d,mat,pos=[0,0,0],bevel=.025){
 const shape=new T.Shape(),x=-w/2,y=-h/2;
 shape.moveTo(x+bevel,y);shape.lineTo(x+w-bevel,y);shape.quadraticCurveTo(x+w,y,x+w,y+bevel);
 shape.lineTo(x+w,y+h-bevel);shape.quadraticCurveTo(x+w,y+h,x+w-bevel,y+h);
 shape.lineTo(x+bevel,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-bevel);
 shape.lineTo(x,y+bevel);shape.quadraticCurveTo(x,y,x+bevel,y);
 const geometry=new T.ExtrudeGeometry(shape,{depth:Math.max(.001,d-2*bevel),bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:3,steps:1});
 geometry.translate(0,0,-d/2+bevel);return mesh(parent,geometry,mat,pos);
}
function cyl(parent,r,h,mat,pos=[0,0,0],rt=r){
 return mesh(parent,new T.CylinderGeometry(rt,r,h,96),mat,pos);
}
function sphere(parent,r,mat,pos=[0,0,0]){return mesh(parent,new T.SphereGeometry(r,24,16),mat,pos);}
function ring(parent,r,t,mat,pos=[0,0,0],axis='y'){
 const o=mesh(parent,new T.TorusGeometry(r,t,8,128),mat,pos);if(axis==='y')o.rotation.x=Math.PI/2;return o;
}
function line(parent,a,b,r,mat){
 const d=V(...b).sub(V(...a)),o=cyl(parent,r,d.length(),mat);
 o.position.copy(V(...a).add(V(...b)).multiplyScalar(.5));
 o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return o;
}
function pipe(parent,points,r=.06,mat=M.steel){
 const curve=new T.CatmullRomCurve3(points.map(p=>V(...p)),false,'centripetal');
 return mesh(parent,new T.TubeGeometry(curve,80,r,10,false),mat);
}
function bolts(parent,r,y,n=16,size=.035){
 for(let i=0;i<n;i++){const a=i/n*Math.PI*2;cyl(parent,size,.065,M.bright,[Math.cos(a)*r,y,Math.sin(a)*r]);}
}
function flange(parent,r,y){
 cyl(parent,r,.1,M.steel,[0,y,0]);ring(parent,r*.92,.018,M.bright,[0,y+.055,0]);bolts(parent,r*.79,y+.085,16);
}
function platform(parent,w=4,d=3,y=-2.5){
 box(parent,w,.16,d,M.dark,[0,y,0],.04);
 for(const x of [-w/2+.24,w/2-.24])for(const z of [-d/2+.24,d/2-.24]){
  cyl(parent,.12,.32,M.steel,[x,y-.22,z]);cyl(parent,.2,.08,M.black,[x,y-.4,z]);
 }
}
function shell(parent,r,h,y,mat=M.dark,start=.32*Math.PI,length=1.38*Math.PI){
 return mesh(parent,new T.CylinderGeometry(r,r,h,128,1,true,start,length),mat,[0,y,0]);
}
function wafer(parent,r=2,y=0,mat=M.silicon){
 const g=group(parent),thickness=r*2*.775/300;
 cyl(g,r,thickness,mat,[0,0,0]);ring(g,r-.004,.004,M.bright,[0,thickness/2,0]);
 g.position.y=y;g.userData={diameterMm:300,thicknessMm:.775};return g;
}
function lattice(parent,n=3,scale=.5,colour=M.white){
 const g=group(parent),p=[],map=new Map();
 const basis=[[0,0,0],[0,2,2],[2,0,2],[2,2,0],[1,1,1],[1,3,3],[3,1,3],[3,3,1]];
 for(let x=0;x<n;x++)for(let y=0;y<n;y++)for(let z=0;z<n;z++)for(const b of basis){
  const q=[4*x+b[0],4*y+b[1],4*z+b[2]];map.set(q.join(','),p.length);p.push(q);
 }
 const positions=p.map(q=>q.map(a=>(a-(n*4-1)/2)*scale/4)),atoms=[];
 for(const point of positions)atoms.push(sphere(g,scale*.115,colour,point));
 let bonds=0;const linkRefs=[];
 p.forEach((q,i)=>{for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){
  const j=map.get([q[0]+x,q[1]+y,q[2]+z].join(','));
  if(j>i){linkRefs.push({a:i,b:j,o:line(g,positions[i],positions[j],scale*.02,M.green)});bonds++;}
 }});
 return {g,atoms,positions,bonds,linkRefs};
}
const models={};
function model(name,build){const g=group(scene);g.visible=false;models[name]={g,...build(g)};}
model('silica',g=>{
 const central=sphere(g,.34,M.silicon),oxygen=[],outer=[];
 for(const q of [[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]]){
  const o=q.map(a=>a*.72),s=q.map(a=>a*1.44);
  oxygen.push(sphere(g,.25,M.oxygen,o));outer.push(sphere(g,.34,M.silicon,s));
  line(g,[0,0,0],o,.055,M.steel);line(g,o,s,.055,M.steel);
 }
 return {update(t,s){g.rotation.set(.1,lerp(-.25,.2,ease((t-s.start)/(s.end-s.start))),0);return{};},
  objectCount:g.children.length,truth:'Local Si-O tetrahedral coordination; outer network continues beyond view'};
});
model('furnace',g=>{
 platform(g,5.2,4,-2.8);flange(g,2.15,-2.45);
 shell(g,2.12,3.7,-.5);shell(g,1.93,3.55,-.48,M.ceramic);
 cyl(g,1.9,.08,M.hot,[0,-1.7,0]);ring(g,2.15,.11,M.steel,[0,1.35,0]);
 const electrodes=[],chargeMaterial=material(0x929891,.05,.88);
 for(const[x,z]of [[-.9,-.35],[.9,-.35],[0,.7]]){
  const e=cyl(g,.23,4.5,M.dark,[x,1.45,z]);electrodes.push(e);
  for(const y of [2.6,2.85,3.2])cyl(g,.34,.1,M.ceramic,[x,y,z]);
  box(g,.62,.18,.6,M.steel,[x,3.6,z]);
  for(const dx of [-.22,.22])cyl(g,.035,.2,M.bright,[x+dx,3.65,z]);
 }
 box(g,3.2,.18,.45,M.bright,[0,3.6,-.35]);
 const charge=group(g);
 for(let i=0;i<140;i++){
  const a=i*2.399963,r=1.78*Math.sqrt((i+.5)/140);
  const rock=mesh(charge,new T.IcosahedronGeometry(.13+(i%5)*.025,2),i%4?chargeMaterial:M.black,
   [Math.cos(a)*r,-1.18+(i%7)*.065,Math.sin(a)*r]);rock.rotation.set(i*.7,i*.4,i*.6);
 }
 const spout=pipe(g,[[1.75,-1.64,.1],[2.17,-1.7,.1],[2.55,-1.9,.1]],.12,M.dark);
 const stream=pipe(g,[[2.5,-1.88,.1],[2.85,-2.2,.15],[2.9,-2.65,.2]],.055,M.hot);
 const ladle=cyl(g,.65,.1,M.hot,[2.9,-2.75,.2]);ring(g,.69,.06,M.dark,[2.9,-2.7,.2]);
 const glow=new T.PointLight(0xffa552,16,5);glow.position.set(0,-.9,1);g.add(glow);
 return {update(t,s){
  const heat=smooth(t,anchor(s,'高温'),anchor(s,'高温')+.8);
  glow.intensity=4+heat*14;charge.position.y=-heat*.16;
  stream.visible=t>=anchor(s,'得到');ladle.visible=stream.visible;
  return{reactionVisible:heat>.5,chargeDoesNotBecomeElectronicGrade:true};
 },objectCount:g.children.length};
});
model('distill',g=>{
 platform(g,4.4,3,-3.1);const beads=[];
 for(let j=0;j<2;j++){
  const tower=group(g);tower.position.x=(j-.5)*2.25;
  cyl(tower,.63,.18,M.steel,[0,-2.85,0]);shell(tower,.54,5.4,-.05,M.steel,.32*Math.PI,1.25*Math.PI);
  cyl(tower,.54,.35,M.steel,[0,2.78,0],.1);cyl(tower,.1,.18,M.bright,[0,3.045,0]);
  for(let k=0;k<13;k++){
   const y=-2.65+k*.42;cyl(tower,.51,.045,M.steel,[0,y,0]);
   for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++)cyl(tower,.035,.065,M.bright,[x*.21,y+.045,z*.21]);
  }
  for(let k=0;k<22;k++)line(tower,[-.66,-2.7+k*.25,.38],[-.41,-2.7+k*.25,.38],.016,M.steel);
  line(tower,[-.67,-2.8,.38],[-.67,2.8,.38],.021,M.steel);line(tower,[-.4,-2.8,.38],[-.4,2.8,.38],.021,M.steel);
  for(const y of [-2.7,-1.4,0,1.4,2.6])ring(tower,.55,.025,M.bright,[0,y,0]);
  for(let i=0;i<18;i++)beads.push({o:sphere(tower,.045,i%6?M.green:M.amber),i,j});
 }
 pipe(g,[[-1.125,3.1,0],[-1.125,3.45,0],[.65,3.45,0],[1.125,3.1,0]],.055);
 pipe(g,[[1.125,-2.7,0],[1.8,-2.7,0],[1.9,-2.7,.8],[1.9,-2.2,.8]],.06);
 const receiver=cyl(g,.28,.8,M.glass,[1.9,-1.8,.8]);flange(g,.2,-3.0);
 return {update(t,s){
  beads.forEach(({o,i,j})=>{const u=((t-s.start)*.23+i/18)%1;o.position.set(Math.sin(i*2.4)*.32,-2.55+u*5.0,.18+Math.cos(i*2.4)*.16);});
  return{separation:'illustrative boiling-point fractions',receiver:receiver.id};
 },objectCount:g.children.length};
});
model('siemens',g=>{
 platform(g,4.8,4,-2.35);flange(g,2,-2.05);
 const rods=[],bridges=[];
 for(let j=0;j<3;j++){
  const z=-.7+j*.7;
  for(const x of [-.65,.65]){
   cyl(g,.2,.28,M.ceramic,[x,-1.83,z]);
   const rod=cyl(g,.09,3.3,M.hot,[x,-.05,z]);rods.push(rod);
   ring(g,.2,.025,M.steel,[x,-1.69,z]);
  }
  const bridge=pipe(g,[[-.65,1.6,z],[-.65,1.85,z],[0,1.95,z],[.65,1.85,z],[.65,1.6,z]],.09,M.hot);
  bridge.userData.bridge=true;
  bridges.push(bridge);
 }
 shell(g,1.95,4,.05,M.glass,.25*Math.PI,1.45*Math.PI);
 const dome=mesh(g,new T.SphereGeometry(1.95,96,32,0,Math.PI*2,0,Math.PI/2),M.glass,[0,2.05,0]);dome.scale.y=.32;
 for(let i=0;i<12;i++){
  const a=i/12*Math.PI*2;line(g,[Math.cos(a)*1.8,-1.9,Math.sin(a)*1.8],[Math.cos(a)*1.8,-1.1,Math.sin(a)*1.8],.035,M.steel);
 }
 pipe(g,[[-2.6,-2.15,0],[-2.6,-1.55,0],[-1.1,-1.55,0]],.075);
 pipe(g,[[1.1,-1.55,0],[2.6,-1.55,0],[2.6,-2.15,0]],.075);
 const glow=new T.PointLight(0xffae52,8,6);glow.position.set(0,.4,0);g.add(glow);
 return {update(t,s){
  const u=smooth(t,anchor(s,'沉积'),s.end-1.1);
  rods.forEach(o=>o.scale.set(1+u*1.9,1,1+u*1.9));
  for(const bridge of bridges){
   const curve=bridge.geometry.parameters.path;bridge.geometry.dispose();
   bridge.geometry=new T.TubeGeometry(curve,80,.09*(1+u*1.9),10,false);
  }
  return{radiusFactor:1+u*1.9,rodLengthUnchanged:true,timeCompressed:true};
 },objectCount:g.children.length};
});
model('grains',g=>{
 const grains=[];
 for(let i=0;i<3;i++){const l=lattice(g,2,.8);l.g.position.set((i-1)*1.8,0,0);l.g.rotation.set(i*.24,i*.39,i*.18);grains.push(l);}
 const mono=lattice(g,4,.72);mono.g.rotation.set(.13,.27,.05);
 return {update(t,s){const single=t>=s.captions[2].start;
  grains.forEach(l=>l.g.visible=!single);mono.g.visible=single;return{single,crystalGrainsDoNotRotateIntoAlignment:true};
 },objectCount:g.children.length,atoms:grains.reduce((n,l)=>n+l.atoms.length,0)+mono.atoms.length};
});
model('pull',g=>{
 platform(g,5.2,4.2,-2.8);flange(g,2.35,-2.5);
 shell(g,2.3,5.0,.1,M.steel,.3*Math.PI,1.45*Math.PI);
 shell(g,2.08,2.0,-1.1,M.black,.25*Math.PI,1.5*Math.PI);
 const outer=mesh(g,new T.LatheGeometry([[0,-2.1],[1.5,-2.1],[1.8,-1.9],[1.95,-1.55],[2.02,-.95],[2.04,-.42],[1.94,-.42],[1.92,-.95],[1.85,-1.5],[1.68,-1.8],[1.45,-1.99],[0,-1.99]].map(p=>new T.Vector2(...p)),128,Math.PI*.3,Math.PI*1.45),M.glass);
 cyl(g,1.9,.07,M.hot,[0,-.45,0]);
 ring(g,1.96,.05,M.ceramic,[0,-.4,0]);
 for(let i=0;i<9;i++)ring(g,2.13,.038,M.dark,[0,-2.2+i*.23,0]);
 for(const x of [-2.45,2.45]){
  line(g,[x,-2.4,-.7],[x,4.6,-.7],.085,M.steel);
  box(g,.34,.5,.4,M.dark,[x,3.7,-.7]);
  pipe(g,[[x,-1.8,-.7],[x*1.17,-1.8,-.7],[x*1.17,-2.7,-.7]],.055);
 }
 box(g,5.05,.22,.65,M.dark,[0,4.5,-.7]);box(g,.65,.6,.65,M.dark,[0,4.5,-.05]);
 for(let i=0;i<7;i++){box(g,.65,.035,.035,M.steel,[-2.45,3.45+i*.065,-.47]);}
 const charge=group(g);
 for(let i=0;i<60;i++){const a=i*2.4,r=1.65*Math.sqrt(i/60);const q=mesh(charge,new T.IcosahedronGeometry(.16+(i%3)*.04,1),M.silicon,[Math.cos(a)*r,-.2+(i%4)*.1,Math.sin(a)*r]);q.rotation.set(i,i*.3,i*.6);}
 const solid=group(g),body=cyl(solid,.65,2.2,M.silicon,[0,0,0]),shoulder=cyl(solid,.65,.5,M.silicon,[0,0,0],.055);
 const neck=cyl(solid,.055,.8,M.silicon),chuck=cyl(solid,.15,.28,M.dark),cable=cyl(g,.022,3,M.steel);
 for(let j=0;j<22;j++)ring(solid,.653,.003,M.bright,[0,-1+j*.095,0]);
 const hot=new T.PointLight(0xffad50,10,6);hot.position.set(0,-.25,1.1);g.add(hot);
 return {update(t,s){
  const u=clamp((t-s.start)/(s.end-s.start)),id=s.id,up=id==='seed'?anchor(s,'向上'):s.start;
  charge.visible=id==='melt';
  charge.scale.setScalar(id==='melt'?1-.9*smooth(t,anchor(s,'熔化')-.7,s.end-.6):1);
  solid.visible=id!=='melt';
  let height=.3,radius=.055,seedY=.7;
  if(id==='seed'){
   const contact=smooth(t,s.captions[0].start,s.captions[0].end-.15);
   const pull=smooth(t,up,s.end-.6);height=.08+pull*.72;radius=.055+pull*.16;seedY=.7*(1-contact);
  }else if(id==='growth'){
   const neckEnd=s.captions[1].start+.55,shoulderStart=anchor(s,'放肩');
   const widen=smooth(t,shoulderStart,shoulderStart+1.0),grow=smooth(t,s.captions[2].start,s.end-.6);
   height=.6+grow*2.1;radius=.055+widen*.595;seedY=0;
  }
  body.scale.set(radius/.65,height/2.2,radius/.65);body.position.y=-.45+height/2+seedY;
  shoulder.scale.set(radius/.65,1,radius/.65);shoulder.position.y=-.45+height+.25+seedY;
  neck.position.y=-.45+height+.9+seedY;chuck.position.y=neck.position.y+.54;
  for(const child of solid.children)if(child.geometry?.type==='TorusGeometry')child.visible=false;
  const bottom=chuck.position.y+.14,top=4.18;cable.scale.y=Math.max(.01,(top-bottom)/3);cable.position.y=(top+bottom)/2;
  solid.rotation.y=(t-s.start)*.65;hot.intensity=id==='melt'?12:8;
  return{solidHeight:height,solidRadius:radius,solidBottom:-.45+seedY,meltSurface:-.45,timeCompressed:true};
 },objectCount:g.children.length,crucibleThicknessIllustrative:true};
});
model('doping',g=>{
 const l=lattice(g,4,.75);
 let centre=0;l.positions.forEach((p,i)=>{if(V(...p).length()<V(...l.positions[centre]).length())centre=i;});
 const site=l.atoms[centre],normal=V(3,2,6).normalize(),origin=V(...l.positions[centre]);
 const firstShell=new Set([centre,...l.linkRefs.filter(e=>e.a===centre||e.b===centre).map(e=>e.a===centre?e.b:e.a)]);
 l.positions.forEach((p,i)=>{const relative=V(...p).sub(origin);l.atoms[i].visible=firstShell.has(i)||(relative.length()<1.35&&relative.dot(normal)<.16);});
 l.linkRefs.forEach(e=>e.o.visible=l.atoms[e.a].visible&&l.atoms[e.b].visible);
 const tor=ring(g,.16,.012,M.amber,site.position.toArray(),'z');tor.material=tor.material.clone();tor.material.depthTest=false;
 return{update(t,s){
  g.rotation.set(.05,.1+(t-s.start)*.012,0);
  const active=t>=anchor(s,'加入');site.material=active?M.amber:M.white;tor.visible=active;tor.quaternion.copy(camera.quaternion);
  return{highlightedSubstitutionalSite:centre,retainedNearestNeighbours:firstShell.size-1,concentrationNotToScale:true};
 },
 objectCount:l.atoms.length+l.bonds};
});
model('trim',g=>{
 platform(g,5.6,3.4,-2.0);
 const rod=cyl(g,.9,4.2,M.silicon,[0,0,0]);rod.rotation.z=Math.PI/2;
 const ends=[];
 for(const sign of [-1,1]){
  const e=cyl(g,.9,.7,M.silicon,[sign*2.45,0,0],.1);e.rotation.z=sign*Math.PI/2;ends.push(e);
  ring(g,.91,.012,M.amber,[sign*2.1,0,0],'z').rotation.y=Math.PI/2;
  box(g,.6,.45,1.5,M.dark,[sign*1.4,-1.2,0]);
  for(const z of [-.65,.65])cyl(g,.045,.2,M.bright,[sign*1.4,-.95,z]);
 }
 const wheel=cyl(g,.6,.2,M.dark,[0,1.4,0]);wheel.rotation.z=Math.PI/2;
 cyl(g,.18,.27,M.steel,[0,1.4,0]).rotation.z=Math.PI/2;
 const notch=box(g,.12,.09,.3,M.black,[1.8,-.05,.89]);
 return{update(t,s){
  const split=smooth(t,anchor(s,'切去'),s.captions[0].end-.25);
  ends.forEach((e,i)=>e.position.x=(i?1:-1)*(2.45+split*.65));
  wheel.position.set(lerp(-1.6,1.6,smooth(t,s.captions[0].start+1,s.captions[0].end)),1.45,0);wheel.rotation.y=t*5;
  notch.visible=t>=s.captions[1].start;return{endSeparation:split,notchIllustrative:true};
 },objectCount:g.children.length};
});
model('wire',g=>{
 platform(g,5.8,4,-2.65);const web=group(g),wires=[];
 for(const y of [-1.6,1.6])for(const z of [-1.2,1.2]){
  const roller=cyl(g,.3,5.1,M.dark,[0,y,z]);roller.rotation.z=Math.PI/2;
  for(let i=0;i<28;i++){const rim=ring(g,.303,.007,M.bright,[-2.2+i*.16,y,z],'z');rim.rotation.y=Math.PI/2;}
  for(const x of [-2.65,2.65])box(g,.4,.7,.7,M.steel,[x,y,z]);
 }
 for(let i=0;i<28;i++){
  const x=-2.16+i*.16;wires.push(line(web,[x,1.6,-1.2],[x,-1.6,1.2],.004,M.bright));
 }
 const residual=cyl(g,.9,4.5,M.silicon,[0,-.6,0]);residual.rotation.z=Math.PI/2;
 const slices=[];
 for(let i=0;i<28;i++){const d=cyl(g,.9,.118,M.steel,[-2.16+i*.16,-.6,0]);d.rotation.z=Math.PI/2;slices.push(d);}
 return{update(t,s){
  const cut=smooth(t,s.captions[0].start,s.captions[1].end),release=smooth(t,s.captions[1].end,s.captions[2].start+.6);
  residual.position.y=-1.1+cut*.7;residual.visible=release<.03;
  slices.forEach((d,i)=>{d.visible=!residual.visible;d.position.set((i-13.5)*(.16+release*.035),-.4,0);});
  return{parallelWires:28,release,spacingAndThicknessExaggerated:true};
 },objectCount:g.children.length+28};
});
function polishRig(parent,isLap){
 const g=group(parent);
 platform(g,4.9,4,-2.5);cyl(g,2.2,.45,M.dark,[0,-1.8,0]);
 const pad=cyl(g,2.1,.12,isLap?M.steel:M.ceramic,[0,-1.51,0]);
 for(let i=1;i<8;i++)ring(g,i*.25,.007,M.dark,[0,-1.44,0]);
 const rotor=group(g),carriers=[];
 for(let j=0;j<3;j++){
  const a=j/3*Math.PI*2,c=group(rotor);c.position.set(Math.cos(a)*1.02,-1.35,Math.sin(a)*1.02);
  cyl(c,.67,.1,M.dark);wafer(c,.5,.065);
  for(let i=0;i<16;i++){const b=i/16*Math.PI*2;box(c,.07,.065,.075,M.steel,[Math.cos(b)*.68,.02,Math.sin(b)*.68],.006);}
  carriers.push(c);
 }
 box(g,.42,3.2,.45,M.dark,[-2.2,-.5,-.7]);box(g,3.0,.3,.45,M.steel,[-.7,1.1,-.7]);
 const head=cyl(g,1.85,.18,M.dark,[0,.7,0]);cyl(g,.2,.9,M.bright,[0,1.22,0]);
 pipe(g,[[2.3,.7,-.5],[2.0,.7,-.5],[1.7,.3,-.3],[1.6,-1.25,-.2]],.035,M.steel);
 const micro=group(parent);micro.position.set(0,.1,0);
 box(micro,4.6,.28,2.1,M.steel,[0,-.17,0],.015);
 const geometry=new T.PlaneGeometry(4.6,2.1,100,40);geometry.rotateX(-Math.PI/2);
 const surface=mesh(micro,geometry,M.silicon),p=geometry.attributes.position,original=p.array.slice();
 const abrasive=[];
 for(let i=0;i<12;i++)abrasive.push(sphere(micro,.055,M.amber,[-2+i*.35,.38,.1]));
 const grinding=cyl(micro,.42,1.25,M.ceramic,[0,.62,0]);grinding.rotation.z=Math.PI/2;
 const microPad=box(micro,4.9,.18,2.2,M.ceramic,[0,.28,0],.035);
 const damage=group(micro);
 for(let i=0;i<35;i++){
  const x=-2.15+i*.127,z=(i%5-2)*.34;
  line(damage,[x,-.025,z],[x+.09,-.14,z+.05],.008,M.oxygen);
 }
 const roundedEdge=group(parent);
 const edgeGeometry=new T.LatheGeometry([[1.5,-.12],[1.95,-.12],[2.0,-.1],[2.03,-.05],[2.04,0],[2.03,.05],[2.0,.1],[1.95,.12],[1.5,.12]].map(p=>new T.Vector2(...p)),192,.1,1.4);
 mesh(roundedEdge,edgeGeometry,M.silicon);
 const edgeWheel=cyl(roundedEdge,.4,.3,M.ceramic,[2.44,0,0]);edgeWheel.rotation.x=Math.PI/2;
 const upperPlate=cyl(g,1.85,.18,M.steel,[0,-1.12,0]);
 return{update(t,s){
  const edge=isLap&&t<s.captions[1].start;
  const close=isLap?t>=s.captions[2].start:t>=s.captions[1].start;
  g.visible=!edge&&!close;roundedEdge.visible=edge;micro.visible=close;
  pad.visible=true;rotor.visible=true;head.visible=!isLap;upperPlate.visible=isLap;
  rotor.rotation.y=(t-s.start)*.45;carriers.forEach(c=>c.rotation.y=-(t-s.start)*.9);
  edgeWheel.position.set(2.37,.01,lerp(-.8,.9,smooth(t,s.start,s.captions[0].end)));edgeWheel.rotation.z=t*3;
  const flat=smooth(t,isLap?s.captions[2].start:s.captions[1].start,s.captions[2].end-.25);
  const toolX=lerp(-2.8,2.8,flat);
  for(let i=0;i<p.count;i++){
   const x=original[i*3],z=original[i*3+2],finished=smooth(toolX,x-.25,x+.25);
   p.setY(i,(Math.sin(x*17+z*3)*.025+Math.cos(x*31)*.015)*(1-finished));
  }
  p.needsUpdate=true;geometry.computeVertexNormals();
  grinding.position.x=toolX;grinding.rotation.y=t*2.8;grinding.visible=false;
  microPad.visible=!isLap;microPad.position.x=toolX-2.4;
  damage.visible=isLap;damage.children.forEach((part,i)=>{part.scale.setScalar(1-.97*flat);part.position.y=flat*.12;});
  abrasive.forEach((a,i)=>{a.visible=!isLap;a.position.x=((i*.37+(t-s.start)*.5)%4.6)-2.3;a.position.y=.12+(1-flat)*.06;});
  return{microSurfaceAmplitude:.04*(1-flat),microScaleIsIllustrative:true,edge,etching:isLap&&close,damageLayerRemoval:flat};
 },objectCount:g.children.length+carriers.length*20+abrasive.length};
}
model('lap',g=>polishRig(g,true));
model('polish',g=>polishRig(g,false));
model('wash',g=>{
 platform(g,4.8,3,-2.3);
 for(const x of [-1.35,1.35]){
  box(g,2.35,.14,2.5,M.steel,[x,-1.9,0]);
  for(const z of [-1.2,1.2])box(g,2.35,1.8,.06,M.glass,[x,-1,z]);
  for(const dx of [-1.15,1.15])box(g,.06,1.8,2.45,M.glass,[x+dx,-1,0]);
  box(g,2.25,.02,2.35,M.liquid,[x,-.35,0],.005);
 }
 const holder=group(g),disk=wafer(holder,1.45,0);disk.rotation.x=Math.PI/2;
 const arms=[];
 for(const x of [-1.38,1.38])arms.push(box(holder,.09,2.2,.16,M.ceramic,[x,.8,0]));
 line(holder,[-1.4,1.88,0],[1.4,1.88,0],.06,M.steel);
 box(g,5.7,.25,.45,M.steel,[0,3.1,-.4]);const lift=box(holder,.22,1.2,.28,M.dark,[0,2.45,0]);
 const particles=[];for(let i=0;i<16;i++)particles.push(sphere(g,.027,M.amber,[(i%4-1.5)*.45,(Math.floor(i/4)-1.5)*.45,.027]));
 return{update(t,s){
  const u=smooth(t,s.captions[0].start,s.captions[0].end);
  holder.position.set(-1.35,-u*.35,0);
  particles.forEach((p,i)=>{p.position.set(-1.35+(i%4-1.5)*.45+u*(i%2?.8:-.8),-.35+(Math.floor(i/4)-1.5)*.45-u*.9,.03+u*.35);p.scale.setScalar(1-.85*u);p.visible=u<.98;});
  return{removedIllustrativeParticles:u,edgeHandling:true};
 },objectCount:g.children.length+particles.length};
});
model('scan',g=>{
 platform(g,4.6,4,-2.6);cyl(g,1.0,.45,M.dark,[0,-1.9,0]);
 const stage=cyl(g,1.8,.16,M.dark,[0,-1.58,0]),disk=wafer(g,1.8,-1.48);
 box(g,.45,4.1,.55,M.steel,[-2,-.5,-.8]);box(g,3.6,.3,.5,M.steel,[-.4,1.7,-.8]);
 const probe=group(g);box(probe,.55,.65,.55,M.dark,[0,.9,0]);cyl(probe,.16,.28,M.bright,[0,.45,0]);ring(probe,.17,.025,M.steel,[0,.3,0]);
 const beam=line(g,[0,.3,0],[0,-1.46,0],.009,M.green),spot=sphere(g,.035,M.green);
 const upper=group(g),lower=group(g);
 box(upper,.4,.45,.45,M.dark,[0,-.6,0]);box(lower,.4,.45,.45,M.dark,[0,-2.18,0]);
 for(let i=0;i<4;i++)box(g,.35,.08,.6,M.steel,[-2,1.0-i*.4,-.8]);
 return{update(t,s){
  const scan=t<s.captions[1].start,u=clamp((t-s.captions[0].start)/(s.captions[0].end-s.captions[0].start));
  const a=u*14,r=u*1.45,x=Math.cos(a)*r,z=Math.sin(a)*r;
  probe.visible=scan;beam.visible=scan;spot.visible=scan;upper.visible=!scan;lower.visible=!scan;
  probe.position.set(x,0,z);beam.position.set(x,-.58,z);spot.position.set(x,-1.46,z);
  upper.position.x=lower.position.x=lerp(-1.1,1.1,smooth(t,s.captions[1].start,s.captions[1].end));
  disk.rotation.y=(t-s.start)*.35;
  return{opticalScan:scan,measurementIsIllustrative:true,probeAndSpot:[x,z]};
 },objectCount:g.children.length};
});
model('cassette',g=>{
 platform(g,4.2,3.5,-2.5);
 box(g,3.5,.2,2.7,M.dark,[0,-2.1,0]);box(g,3.5,.2,2.7,M.dark,[0,2.1,0]);
 for(const x of [-1.68,1.68]){
  box(g,.16,4.2,2.6,M.ceramic,[x,0,0]);
  for(let i=0;i<25;i++)box(g,.18,.04,2.3,M.dark,[x,-1.75+i*.145,0],.008);
 }
 box(g,3.3,4.1,.15,M.dark,[0,0,-1.22]);
 const disks=[];for(let i=0;i<25;i++)disks.push(wafer(g,1.5,-1.75+i*.145));
 box(g,.8,.16,.3,M.steel,[0,2.28,0]);
 return{update(t,s){disks.forEach((d,i)=>{d.position.z=.35*(1-smooth(t,s.start,s.start+2.0))*(i===15?1:0);});g.rotation.y=-.18+(t-s.start)*.015;return{waferCount:25};},objectCount:g.children.length};
});
function anchor(s,text){
 const norm=x=>x.replace(/[^\u3400-\u9fffA-Za-z0-9]/g,'');
 const full=s.words.map(w=>norm(w.text)).join(''),query=norm(text),pos=full.indexOf(query);
 if(pos<0)throw new Error(`Missing actual word anchor ${s.id}: ${text}`);
 let offset=0;
 for(const word of s.words){const len=norm(word.text).length;if(offset+len>pos)return word.start;offset+=len;}
 throw new Error('Uncalibrated anchor');
}
function pose(eye,look,fov=35){camera.position.set(...eye);camera.lookAt(...look);camera.fov=fov;camera.updateProjectionMatrix();camera.updateMatrixWorld();}
const label=document.getElementById('label');
window.renderScene=(id,time,labels=false)=>{
 const s=timeline.scenes.find(s=>s.id===id);if(!s)throw new Error(id);
 Object.values(models).forEach(m=>{m.g.visible=false;});
 const m=models[s.model],t=Math.max(s.start,Math.min(time,s.end-1e-5));
 m.g.visible=true;m.g.position.set(0,0,0);m.g.rotation.set(0,0,0);
 const u=(t-s.start)/(s.end-s.start),second=t>=s.captions[1].start,third=t>=s.captions.at(-1).start;
 const data=m.update(t,s);
 let eye=[6,4.4,12],look=[0,0,0],fov=35;
 if(s.model==='silica'){eye=second?[3.8,2.2,8.1]:[5.4,3.4,10.4];look=[0,0,0];fov=36;}
 if(s.model==='furnace'){eye=second?[4.8,3.9,10.0]:[6,4.7,15];look=second?[.4,-.7,0]:[0,.3,0];fov=39;}
 if(s.model==='distill'){eye=second?[4.4,1.4,10.0]:[5.3,3.7,16.6];look=[0,second?.3:.1,0];fov=38;}
 if(s.model==='siemens'){eye=second?[3.8,1.3,9.7]:[5.7,3.4,13.8];look=[0,.25,0];}
 if(s.model==='grains'){eye=third?[3.2,2.3,6.0]:[5,3,11.5];fov=41;look=[0,0,0];}
 if(s.model==='pull'){
  eye=second?[4.4,2.4,11.5]:[6.0,4.7,16.2];look=[0,.4,0];fov=39;
  if(s.id==='seed'&&third){eye=[2.7,1.25,7.2];look=[0,.15,0];fov=35;}
  if(s.id==='growth'&&third){eye=[3.9,1.8,11.3];look=[0,.75,0];}
 }
 if(s.model==='doping'){eye=second?[2.2,1.4,4.3]:[3.2,2.2,6.0];look=[0,0,0];fov=40;}
 if(s.model==='trim'){eye=second?[5.4,2.7,8.5]:[7,4.5,13.2];fov=42;}
 if(s.model==='wire'){eye=second?[5.8,2.8,9.4]:[7.6,4.5,14.4];look=[0,-.2,0];fov=44;}
 if(s.model==='lap'||s.model==='polish'){
  const micro=s.model==='lap'?third:second;
  eye=micro?[3.2,2.6,7.7]:[6.1,5,13.0];look=micro?[0,0,0]:[0,-.7,0];fov=40;
  if(s.model==='lap'&&!second){eye=[3.2,1.6,4.6];look=[1.7,0,.8];fov=38;}
 }
 if(s.model==='wash'){eye=second?[4,2.4,10.2]:[6,4.2,15.2];look=[0,-.15,0];fov=41;}
 if(s.model==='scan'){eye=second?[4.2,2.4,9.7]:[5.8,4.5,13.7];look=[0,-.6,0];}
 if(s.model==='cassette'){eye=second?[4.1,1.7,10.6]:[5.8,3.1,13.2];look=[0,.1,0];}
 eye[0]+=.12*Math.sin(u*1.7);eye[2]-=.12*u;pose(eye,look,fov);
 label.textContent=labels?(s.id==='doping'?'掺杂位点 · 比例示意':s.id==='melt'&&second?'1400 多摄氏度':s.id==='silica'?'Si—O 局部结构示意':''):'';
 renderer.render(scene,camera);
 const gl=renderer.getContext(),pixels=new Uint8Array(W*H*4);gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
 let bright=0,min=255,max=0;
 for(let i=0;i<pixels.length;i+=256){const v=Math.max(...pixels.slice(i,i+3));min=Math.min(min,v);max=Math.max(max,v);if(v>100)bright++;}
 const state={id,time:t,stage:third?3:second?2:1,data,camera:eye,look,fov,bright,min,max,parts:m.objectCount,labels:label.textContent};
 window.__state=state;return state;
};
window.__inventory=Object.fromEntries(Object.entries(models).map(([id,m])=>[id,{parts:m.objectCount,atoms:m.atoms,truth:m.truth}]));
window.__ready=true;
window.renderScene(timeline.scenes[0].id,timeline.scenes[0].start);
