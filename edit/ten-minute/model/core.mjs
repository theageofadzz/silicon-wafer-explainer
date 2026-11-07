import * as T from '../../../assets/vendor/three.module.min.js';
export {T};
export const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
export const clamp=x=>Math.max(0,Math.min(1,x));
export const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
export const mix=(a,b,u)=>a+(b-a)*u;
export const phase=(p,a=0,b=1)=>ease((p-a)/(b-a));
export const C={background:0x191b1c,silver:0xbcc3c7,graphite:0x35393b,green:0x58bd8a,amber:0xf2b55b};
const physical=(color,metalness=.65,roughness=.3,extra={})=>new T.MeshStandardMaterial({color,metalness,roughness,...extra});
export const M={
  silver:physical(C.silver,.82,.27),bright:physical(0xe0e4e5,.78,.21),
  atom:physical(0xd3d9db,.12,.44),
  silicon:new T.MeshPhysicalMaterial({color:0x9ca9b3,metalness:.96,roughness:.075,clearcoat:1,clearcoatRoughness:.035,envMapIntensity:1.35}),
  dark:physical(C.graphite,.55,.42),
  black:physical(0x202324,.25,.5),ceramic:physical(0xb8bcba,.05,.65),
  green:physical(C.green,.15,.42,{emissive:0x183d28,emissiveIntensity:.25}),
  amber:physical(C.amber,.25,.38),
  hot:physical(0xa65f21,.15,.4,{emissive:0xe28b2f,emissiveIntensity:.55}),
  liquid:physical(0xb1cec4,.05,.25,{transparent:true,opacity:.42,depthWrite:false,side:T.DoubleSide}),
  glass:physical(0xdce5e2,.05,.3,{transparent:true,opacity:.16,depthWrite:false,side:T.DoubleSide}),
};
const ballGeometry=new T.SphereGeometry(1,16,12);
export function group(parent){const o=new T.Group();parent?.add(o);return o;}
export function mesh(parent,geometry,material=M.silver,xyz=[0,0,0]){
  const o=new T.Mesh(geometry,material);o.position.set(...xyz);parent.add(o);return o;
}
export function box(parent,w,h,d,mat=M.silver,xyz){return mesh(parent,new T.BoxGeometry(w,h,d),mat,xyz);}
export function cyl(parent,r,h,mat=M.silver,xyz,top=r){
  return mesh(parent,new T.CylinderGeometry(top,r,h,64),mat,xyz);
}
export function ball(parent,r,mat=M.silver,xyz){
  const o=mesh(parent,ballGeometry,mat,xyz);o.scale.setScalar(r);return o;
}
export function ring(parent,r,mat=M.silver,xyz,t=.018){
  const o=mesh(parent,new T.TorusGeometry(r,t,8,80),mat,xyz);o.rotation.x=Math.PI/2;return o;
}
export function segment(parent,a,b,r=.018,mat=M.silver){
  const d=V(...b).sub(V(...a)),o=cyl(parent,r,Math.max(.00001,d.length()),mat);
  o.position.copy(V(...a).add(V(...b)).multiplyScalar(.5));
  o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return o;
}
export function setSegment(o,a,b,r=1){
  const d=V(...b).sub(V(...a)),length=d.length();o.position.copy(V(...a).add(V(...b)).multiplyScalar(.5));
  o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());o.scale.set(r,Math.max(.00001,length),r);
}
export function dynamicLine(parent,mat=M.green,r=.018){
  return cyl(parent,r,1,mat);
}
export function tube(parent,points,r=.025,mat=M.silver){
  return mesh(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>V(...p))),48,r,8,false),mat);
}
export function arrow(parent,a,b,mat=M.green,r=.025){
  const g=group(parent),d=V(...b).sub(V(...a)),length=d.length(),head=Math.min(.19,length*.3);
  cyl(g,r,Math.max(.01,length-head),mat,[0,(length-head)/2,0]);
  cyl(g,r*3.3,head,mat,[0,length-head/2,0],0);
  g.position.set(...a);g.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return g;
}
export function wafer(parent,r=1.65,xyz=[0,0,0],material=M.silicon){
  const g=group(parent),h=2*r*.775/300;
  const disk=cyl(g,r,h,material);
  g.position.set(...xyz);g.userData={diameterMm:300,thicknessMm:.775,thicknessRatio:.775/300};
  return {g,disk,r,h};
}
export function lathe(parent,profile,mat=M.silicon){
  return mesh(parent,new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),80),mat);
}
export function openCup(parent,r=1.7,y=-1.15){
  const cup=lathe(parent,[[0,-.72],[r-.3,-.72],[r,-.45],[r+.04,.42],[r-.05,.42],[r-.09,-.37],[r-.32,-.62],[0,-.62]],M.ceramic);
  cup.position.y=y;return cup;
}
export function marker(parent,xyz){const o=new T.Object3D();o.position.set(...xyz);parent.add(o);return o;}
export function rigResult(g,update,anchors,extra={}){
  return {g,update,anchors,view:{eye:[5,3.6,10],look:[0,0,0],span:6.2},...extra};
}
export function buildDiamond(parent,{cells=2,spacing=.95,atomRadius=.09}={}){
  const g=group(parent),basis=[[0,0,0],[0,2,2],[2,0,2],[2,2,0],[1,1,1],[1,3,3],[3,1,3],[3,3,1]];
  const ticks=[],points=[],map=new Map(),atoms=[],bonds=[],degree=[];
  for(let x=0;x<cells;x++)for(let y=0;y<cells;y++)for(let z=0;z<cells;z++)for(const b of basis){
    const q=[x*4+b[0],y*4+b[1],z*4+b[2]],i=ticks.length;
    ticks.push(q);map.set(q.join(','),i);degree.push(0);
    const p=q.map(v=>(v-(cells*4-1)/2)*spacing/4);
    points.push(p);atoms.push(ball(g,atomRadius,M.atom,p));
  }
  for(let i=0;i<ticks.length;i++)for(const dx of [-1,1])for(const dy of [-1,1])for(const dz of [-1,1]){
    const q=ticks[i],j=map.get([q[0]+dx,q[1]+dy,q[2]+dz].join(','));
    if(j>i){
      const o=segment(g,points[i],points[j],.018,M.green);
      bonds.push({i,j,o});degree[i]++;degree[j]++;
    }
  }
  return {g,atoms,bonds,points,degree,basis:'diamond cubic FCC + (1/4,1/4,1/4)',nearestDistance:spacing*Math.sqrt(3)/4};
}
