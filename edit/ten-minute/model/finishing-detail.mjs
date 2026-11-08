import {T,M,group,box,cyl,ring,segment,tube,wafer} from './core.mjs';

const at=(parent,xyz)=>{const g=group(parent);g.position.set(...xyz);return g;};
export function named(object,name){object.name=name;return object;}
export function context(parent,name){
  const g=group(parent);g.name=name;g.userData.contextOnly=true;return g;
}
export function axisCylinder(parent,r,length,xyz,axis='x',material=M.dark){
  const o=cyl(parent,r,length,material,xyz);
  if(axis==='x')o.rotation.z=Math.PI/2;
  if(axis==='z')o.rotation.x=Math.PI/2;
  return o;
}
export function machineBed(parent,{length=4.8,y=-1.65,depth=2.1}={}){
  const g=group(parent);
  for(const z of [-depth/2+.14,depth/2-.14]){
    box(g,length,.22,.28,M.dark,[0,y,z]);
    box(g,length-.24,.08,.11,M.bright,[0,y+.15,z]);
  }
  for(const x of [-length/2+.35,length/2-.35]){
    box(g,.38,.7,depth,M.dark,[x,y-.42,0]);
    for(const z of [-depth/2+.2,depth/2-.2])cyl(g,.13,.12,M.black,[x,y-.83,z]);
  }
  return g;
}
export function saddle(parent,x,r=.72,y=0){
  const g=at(parent,[x,y,0]);
  box(g,.34,.32,2,M.dark,[0,-r-.38,0]);
  box(g,.34,.17,2,M.dark,[0,-r-.625,0]);
  for(const sign of [-1,1]){
    segment(g,[0,-r-.23,sign*.62],[0,-r*.70,sign*r*.70],.085,M.ceramic);
    axisCylinder(g,.12,.32,[0,-r*.70,sign*r*.70],'x',M.bright);
  }
  return g;
}
export function chuckX(parent,x,{r=.72,face=1,y=0}={}){
  const g=at(parent,[x,y,0]);
  axisCylinder(g,r*.72,.22,[0,0,0],'x',M.dark);
  axisCylinder(g,.22,.36,[-face*.29,0,0],'x',M.bright);
  box(g,.42,1.16,1.18,M.dark,[-face*.62,-.32,0]);
  box(g,.65,.56,2,M.dark,[-face*.62,-1.18,0]);
  for(let i=0;i<3;i++){
    const a=i*2*Math.PI/3;
    const jaw=box(g,.22,.18,.31,M.ceramic,[face*.15,Math.cos(a)*r*.47,Math.sin(a)*r*.47]);
    jaw.rotation.x=a;
  }
  return g;
}
export function toolSpindle(parent,{axis='x',side=-1,r=.19,length=.65}={}){
  const g=group(parent),coordinate=axis==='x'?0:axis==='y'?1:2;
  const a=[0,0,0];a[coordinate]=side*(length/2+.05);
  axisCylinder(g,r*.55,length,a,axis,M.bright);
  const b=[...a];b[coordinate]=side*(length+.25);
  axisCylinder(g,r,.4,b,axis,M.dark);
  return g;
}
export function guideBearing(parent,x,y,z){
  const g=at(parent,[x,y,z]);
  box(g,.26,.54,.5,M.ceramic,[0,-.09,0]);
  axisCylinder(g,.19,.3,[0,0,0],'x',M.dark);
  axisCylinder(g,.09,.4,[0,0,0],'x',M.bright);
  return g;
}
export function sectionSeat(parent,{y=-.6,width=3,depth=1.2}={}){
  const g=group(parent);
  for(const x of [-width*.38,width*.38]){
    box(g,.2,.13,depth*.88,M.ceramic,[x,y,0]);
    box(g,.28,.25,depth*.95,M.dark,[x,y-.19,0]);
  }
  return g;
}
export function vacuumStage(parent,{r=1.2,y=-.1}={}){
  const g=at(parent,[0,y,0]);
  cyl(g,r,.11,M.dark);
  for(const radius of [r*.42,r*.78])ring(g,radius,M.bright,[0,.06,0],.009);
  cyl(g,.24,.32,M.bright,[0,-.215,0]);
  box(g,r*1.75,.2,r*1.65,M.dark,[0,-.48,0]);
  return g;
}
export function openTank(parent,{width=3.8,depth=2,height=1.25,y=-.5}={}){
  const g=at(parent,[0,y,0]);
  box(g,width,.12,depth,M.ceramic,[0,-height/2,0]);
  for(const x of [-width/2,width/2])box(g,.09,height,depth,M.ceramic,[x,0,0]);
  box(g,width,height,.09,M.ceramic,[0,0,-depth/2]);
  // The front wall is sectioned low so both faces and the liquid remain visible.
  box(g,width,height*.23,.09,M.ceramic,[0,-height*.385,depth/2]);
  for(const x of [-width/2,width/2])box(g,.14,.08,depth+.12,M.bright,[x,height/2,0]);
  tube(g,[[width/2,-height*.3,0],[width/2+.22,-height*.3,0],
    [width/2+.22,-height*.65,0]],.05,M.dark);
  return g;
}
export function filterHousing(parent,xyz,width=2.8){
  const g=at(parent,xyz);box(g,width,.23,1.5,M.ceramic);
  for(let i=0;i<9;i++)box(g,width-.18,.018,.045,M.dark,[0,-.126,(i-4)*.14]);
  box(g,.85,.17,.8,M.dark,[0,.2,0]);return g;
}
export function opticalHead(parent,xyz,{r=.18,axis='y'}={}){
  const g=at(parent,xyz);
  axisCylinder(g,r,.3,[0,0,0],axis,M.dark);
  const end=axis==='y'?[0,-.19,0]:axis==='z'?[0,0,.19]:[.19,0,0];
  axisCylinder(g,r*.77,.08,end,axis,M.bright);
  axisCylinder(g,r*.61,.015,end.map(n=>n*1.23),axis,M.glass);
  return g;
}
export function recordPlate(parent,xyz,{w=.55,h=.32,face='front'}={}){
  const g=at(parent,xyz);box(g,w,h,.025,M.ceramic);
  for(let i=0;i<11;i++){
    const width=i%3===0?.026:.012;
    box(g,width,h*.56,.008,M.dark,[-w*.38+i*w*.075,0,.018]);
  }
  box(g,w*.72,.025,.008,M.dark,[0,-h*.37,.018]);
  if(face==='up')g.rotation.x=-Math.PI/2;
  g.userData.identifierSchematic=true;
  return g;
}
export function terminal(parent,xyz,{scale=1}={}){
  const g=at(parent,xyz);
  box(g,.8,.54,.12,M.dark,[0,.45,0]);
  box(g,.68,.42,.015,M.black,[0,.45,.068]);
  for(let i=0;i<4;i++){
    box(g,.14,.025,.01,M.green,[-.2,.57-i*.08,.08]);
    box(g,.26,.018,.01,M.ceramic,[.08,.57-i*.08,.08]);
  }
  box(g,.12,.23,.16,M.bright,[0,.08,0]);
  box(g,.65,.05,.4,M.dark,[0,-.06,.12]);
  g.scale.setScalar(scale);return g;
}
export function fabBuilding(parent,xyz,{variant=0,scale=1}={}){
  const g=at(parent,xyz);
  box(g,1.2,.7,.9,M.ceramic,[0,.05,0]);
  box(g,1.36,.06,1.02,M.bright,[0,.43,0]);
  for(let i=0;i<3;i++){
    box(g,.25,.15,.21,M.dark,[(i-1)*.34,.53,-.17]);
    box(g,.24,.17,.025,M.glass,[(i-1)*.34,.14,.466]);
  }
  box(g,.26,.35,.02,M.dark,[.36,-.12,.47]);
  box(g,.6,.12,.44,M.dark,[-.24,-.24,.66]);
  for(const x of [-.46,-.16])box(g,.07,.13,.09,M.ceramic,[x,-.24,.85]);
  const utilities=at(g,[variant%2?-.77:.77,0,-.1]);
  box(utilities,.28,.5,.65,M.dark,[0,-.05,0]);
  for(const z of [-.23,.23])cyl(utilities,.07,.14,M.bright,[0,.27,z]);
  g.scale.setScalar(scale);return g;
}
export function cassetteDock(parent,xyz,{scale=1}={}){
  const g=at(parent,xyz);box(g,2.9,.2,2.35,M.ceramic);
  for(const [x,z] of [[-.95,-.7],[.95,-.7],[0,.7]])cyl(g,.08,.13,M.bright,[x,.16,z]);
  for(const x of [-1.12,1.12])box(g,.15,.7,2.1,M.dark,[x,-.44,0]);
  box(g,2.8,.12,2.1,M.dark,[0,-.85,0]);
  g.scale.setScalar(scale);return g;
}
export function edgeNest(parent,r=1.3,y=0){
  const g=at(parent,[0,y,0]);
  for(let i=0;i<3;i++){
    const a=i*2*Math.PI/3+.45,x=Math.cos(a)*r,z=Math.sin(a)*r;
    box(g,.16,.16,.16,M.ceramic,[x,-.05,z]);
    segment(g,[x,-.14,z],[x,-.44,z],.055,M.dark);
    segment(g,[x,-.44,z],[0,-.44,0],.045,M.dark);
  }
  cyl(g,.16,.26,M.bright,[0,-.6,0]);return g;
}
export function planetaryPlate(parent,{r=1.65,y=0}={}){
  const g=at(parent,[0,y,0]);
  cyl(g,r,.16,M.dark);
  ring(g,r*.96,M.bright,[0,.09,0],.018);
  const orbit=group(g),carriers=[];
  for(let i=0;i<3;i++){
    const a=i*2*Math.PI/3,p=at(orbit,[Math.cos(a)*r*.49,.105,Math.sin(a)*r*.49]);
    const shape=new T.Shape(),radius=r*.43;
    shape.absarc(0,0,radius,0,Math.PI*2,false);
    for(let j=0;j<3;j++){
      const b=j*2*Math.PI/3,x=Math.cos(b)*radius*.5,z=Math.sin(b)*radius*.5,hole=new T.Path();
      hole.absarc(x,z,radius*.26,0,Math.PI*2,true);shape.holes.push(hole);
      wafer(p,radius*.255,[x,.055,-z]);
    }
    const mesh=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:false}),M.ceramic);
    mesh.rotation.x=-Math.PI/2;p.add(mesh);
    for(let j=0;j<24;j++){
      const b=j*2*Math.PI/24;
      const tooth=box(p,.065,.045,.05,M.ceramic,[Math.cos(b)*(radius+.02),.018,Math.sin(b)*(radius+.02)]);
      tooth.rotation.y=-b;
    }
    carriers.push(p);
  }
  cyl(g,.15,.12,M.bright,[0,.14,0]);return {g,orbit,carriers};
}

// Shot positions describe each existing semantic specimen, rather than a common set.
const shot=(phrase,look,span,kind='section',eye=[2.5,3.1,10],projection='orthographic',object)=>({
  phrase,eye,look,span,kind,projection,fit:false,...(object?{object}:{}),
});
export function finishingShots(beat,g){
  const object=name=>g.getObjectByName(name);
  const overview=(phrase,look,span,eye=[3.8,3.5,10])=>shot(phrase,look,span,'overview',eye,'perspective');
  const macro=(phrase,look,span,eye,track)=>shot(phrase,look,span,'macro',eye||[1.5,2.8,10],'perspective',track);
  const shots={
    '01-start-01':()=>[overview('一片薄薄的硅',[0,-.1,0],7.4,[3,4,10]),
      macro('表面亮得像镜子',[0,0,0],6.4,[3.3,4.5,10])],
    '01-start-02':()=>[overview('三百毫米',[0,.35,0],7.8,[1,6,10]),
      shot('餐盘',[0,.5,0],7.2,'section',[0,7,10]),macro('厚度',[.45,-1.6,0],6.8,[.5,1.7,10])],
    '01-start-03':()=>[overview('杂质',[0,.1,0],9),macro('原子的排列',[0,0,0],4.6),
      macro('表面的高低',[0,-1.95,0],6.4),shot('控制',[0,.1,0],9.4)],
    '03-order-03':()=>[overview('从石头中取出硅',[0,0,0],10),
      macro('提纯',[0,.7,0],5.3),macro('长成单晶',[0,-.7,0],6),
      macro('加工表面',[0,-1.9,0],5.5),macro('石英开始',[0,2.1,0],4.8)],
    '18-trim-01':()=>[overview('切去',[0,-.15,0],11.6,[4,3.1,10]),
      macro('外圆加工',[0,.4,0],6.5,[2,3,10],object('trimContact')),
      shot('材料也在这里损耗',[0,-.7,0],9.4,'section',[2,4,10])],
    '18-trim-02':()=>[overview('确定晶向',[0,0,0],10.4,[5,3,8]),
      macro('制作定位缺口',[0,.4,.4],5.8,[4,3.4,9],object('notchContact')),
      shot('晶格方向',[.4,.25,.3],6.4,'section',[6,2,8]),
      macro('识别参照',[.8,.4,.4],4.8,[5,3,8])],
    '18-trim-03':()=>[overview('送向',[0,0,-.2],11,[4,3,10]),
      macro('运动的线网',[0,-.9,0],7.7,[4,5,9],object('wireWeb')),
      shot('同时加工许多平行切面',[0,.1,0],6.8,'section',[3.8,3,10])],
    '19-slice-01':()=>[overview('金刚线',[0,-.25,0],8),
      macro('逐步去除硅',[0,0,.55],3.5,[1.8,2,10],object('grainContact')),
      macro('线径',[0,-.4,.4],3.8),shot('片间距',[0,-.6,0],7.5)],
    '19-slice-02':()=>[overview('切口',[0,-.1,0],8.8),
      shot('消耗材料',[0,-.5,.2],8.1),shot('切缝损耗',[0,.35,0],7.2),
      overview('原料用量',[0,-.2,0],9)],
    '19-slice-03':()=>[overview('不够平',[0,-.1,0],8.2),
      macro('锯痕',[.3,.1,.1],4.3,[1,5,10]),macro('受损层',[.2,-.12,.6],4.3,[1,1.5,10]),
      shot('继续加工',[0,-.35,0],8.3)],
    '20-edge-01':()=>[overview('崩缺',[0,.1,0],8.7),
      macro('颗粒',[.9,1.15,.3],3.2),macro('加工成圆滑轮廓',[.7,-1.1,.1],5,[3,2.5,10])],
    '20-edge-02':()=>[overview('两面更平行',[0,.15,-.3],10.2,[4,4,10]),
      macro('厚度接近目标',[.5,0,.5],6.6,[1,1,10]),
      shot('整片几何',[0,0,-.3],8.4,'section',[1,6,10])],
    '20-edge-03':()=>[overview('留下损伤',[0,-.25,0],9.7,[3,4,10]),
      shot('化学蚀刻',[0,-.2,0],8.6,'section',[3,5,10]),
      macro('移除一定材料',[.4,0,.6],5.6,[1,1.8,10]),
      macro('去掉受损层',[0,-.2,.4],5.8)],
    '21-polish-01':()=>[overview('抛光垫',[0,.45,0],9.2,[4,3,10]),
      shot('抛光液',[.5,.55,0],7.3),macro('化学作用',[.3,.12,.55],3.9,[1,1.2,10]),
      macro('移走材料',[.6,.2,.5],5.4)],
    '21-polish-02':()=>[overview('突起逐渐被削低',[0,.5,0],8.7),
      shot('压力',[0,.75,0],7),macro('运动',[0,.15,.5],5.2,[1,1.5,10]),
      shot('供液',[.35,.65,0],7.6)],
    '21-polish-03':()=>[overview('双面抛光',[0,.2,0],10),
      macro('精抛',[0,.95,0],6.2),shot('镜面反光',[0,-1.1,0],6.5,'section',[2,7,10]),
      macro('实际测量',[0,-.8,0],6.6,[3,4,10])],
    '22-flatness-01':()=>[overview('整片翘曲',[0,.1,0],9.2),
      macro('局部平坦度',[0,0,0],5.3,[1,2,10]),
      macro('微观粗糙度',[0,-1.6,0],5.9,[.5,1.5,10])],
    '22-flatness-02':()=>[overview('光刻需要清楚成像',[0,.75,0],9.8,[3.3,3,10]),
      macro('有些地方高',[0,.6,0],5.8,[1,2,10]),
      macro('有些地方低',[1.1,.6,0],5.8,[1,2,10]),
      shot('同时处在合适的焦点',[.3,.1,.4],7.7,'section',[.5,1,10])],
    '22-flatness-03':()=>[overview('容许多少起伏',[0,0,0],9),
      shot('器件和产品规格',[0,.1,.2],8.1,'section',[1,1.5,10]),
      macro('下一阶段的加工',[0,-1.95,0],5.7,[2,4,10])],
    '23-clean-01':()=>[overview('磨粒',[0,.05,0],10.3),
      macro('有机残留',[0,0,.2],5.5),macro('金属污染',[0,-1.8,.2],5.5),
      overview('清洗',[0,0,0],10.3,[4,4,10]),shot('分别解决',[.3,0,.2],9.7)],
    '23-clean-02':()=>[overview('高纯水漂洗',[0,.2,0],9.8,[3,5,10]),
      shot('干燥',[0,.4,0],7.6,'section',[2,5,10]),
      macro('去掉旧污染',[0,-.5,.5],7.1,[2,3.8,10]),
      shot('避免新的残留',[0,.1,0],7.6,'section',[2,5.2,10])],
    '23-clean-03':()=>[overview('夹具',[0,.5,0],9.4),
      shot('空气',[0,1,0],8.7,'section',[3,3,10]),
      shot('包装',[0,.4,0],8.6),macro('每一次接触',[0,0,.1],6.7,[2,4.8,10]),
      shot('清洁表面能否保住',[0,.15,0],7.9,'section',[2,5,10])],
    '25-inspect-01':()=>[overview('颗粒',[0,.1,0],9.5),
      macro('缺陷',[.9,1.8,.2],3.9),macro('厚度',[-.9,.1,.2],3.9),
      macro('平整度',[.9,.1,.2],3.9),macro('电学性质',[-.9,-1.45,0],4.4,[2,3.5,10])],
    '25-inspect-02':()=>[overview('扫描表面',[.2,-.15,0],10.2,[4,4,10]),
      macro('异常散射',[.8,-.05,.25],6.6,[1.2,3.4,10]),
      shot('关联运动',[0,-.1,0],8.8,'section',[3,5,10]),
      shot('覆盖检查区域',[0,-.4,0],7.2,'section',[1,8,10])],
    '25-inspect-03':()=>[overview('厚不厚',[0,-.5,0],10.4),
      macro('平不平',[0,.1,.2],5.6),macro('有没有翘曲',[0,-1.55,0],6,[1,1.5,10]),
      macro('颗粒检查',[0,-2.9,0],4.3,[2,4,10])],
    '26-shipping-01':()=>[overview('身份记录',[0,.55,0],11),
      shot('追溯到晶棒',[0,.3,0],9.6),macro('批次',[0,.55,.2],6.5,[2,4,10]),
      macro('回查原料',[-1,2.6,0],5.8),macro('加工环节',[1,2.7,0],5.7)],
    '26-shipping-02':()=>[overview('专用运输盒',[0,-.6,0],11.6),
      macro('保护硅片',[0,0,.5],8.2,[2,2,10]),
      macro('减少颗粒和接触污染',[1,0,.55],5.4,[3,2.8,10]),
      overview('送往后续工厂',[0,-1.3,0],11.6,[4,4,10])],
    '26-shipping-03':()=>[overview('材料起点',[0,1.65,0],6.5,[3,5,10]),
      shot('光刻',[0,-.1,0],8,'section',[2,3,10]),
      macro('刻蚀',[.15,-.65,.4],5.7,[1,2.5,10]),
      macro('沉积',[.15,-.65,.4],5.7,[1,2.5,10]),
      macro('互连',[0,-.45,.3],6.2,[2,5,10])],
    '27-industry-01':()=>[overview('样品',[0,1.8,0],6.5,[3,5,10]),
      shot('持续量产',[0,-.05,0],8.8),macro('每批都稳定',[0,0,0],7.5,[2,5,10]),
      macro('适配自己的工艺',[0,-1.6,0],6.7,[3,5,10])],
    '27-industry-02':()=>[overview('信越',[-.5,.95,0],7.1,[2,5,10]),
      macro('胜高',[.9,1.9,0],4.5),macro('环球晶圆',[-.9,.1,0],4.5),
      macro('世创',[.9,.1,0],4.5),macro('爱思开矽特隆',[-.9,-1.7,0],4.5),
      macro('国内也在发展',[.9,-1.7,0],4.5)],
    '27-industry-03':()=>[overview('厂房和规划产能',[0,.6,0],10.6),
      macro('量产质量',[-.95,.35,0],4.7),macro('客户验证',[.95,.35,0],4.7),
      shot('稳定交付',[0,-1.6,0],6.7),overview('共同决定生产能力',[0,.1,0],10.6)],
    '28-recap-01':()=>[overview('还原',[0,-.2,0],10.4),
      macro('转化',[0,.35,0],4.9),shot('分离',[0,-.5,0],6.4),
      macro('沉积',[0,-2.15,0],5.4),shot('降低不需要的杂质',[0,-.75,0],6.8)],
    '28-recap-02':()=>[overview('籽晶建立取向',[0,1.4,0],6.2),
      macro('生长与缺陷',[0,1.2,0],4.9),shot('切磨抛',[0,-.3,0],6.9),
      macro('清洗',[-.3,-.15,0],5.9),macro('检测',[0,.05,0],5.8),
      shot('得到合格硅片',[0,-1.9,0],6.6,'section',[2,5,10])],
    '28-recap-03':()=>[overview('一整条精密制造链',[0,.7,0],10.6,[4,4,10]),
      shot('计算世界',[0,2.7,0],8.4,'section',[3,4,10]),
      overview('材料上开始搭建',[0,.8,0],11.4,[3,4.5,10])],
  };
  const make=shots[beat.id];
  if(!make)throw new Error(`Missing finishing story shots: ${beat.id}`);
  return make();
}
