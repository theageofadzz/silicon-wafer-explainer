import {T,V,M,group,box,cyl,ball,ring,segment,dynamicLine,setSegment,tube,arrow,openCup,marker,rigResult,mix,buildDiamond} from './core.mjs';

export const growthKeys=['furnace','distill','siemens','melt','seed','neck','shoulder','growth','support','magnetic','oxygen','segregation'];
const E=(phrase,seconds,object,action,fact)=>({phrase,seconds,lead:0,object,action,fact});
const plans={
  '05-furnace-01':[
    E('石英和碳质还原剂',1.2,'石英与碳质炉料','两类炉料分别落入炉膛','炉料同时包含含硅原料与还原剂'),
    E('电极送入能量',.8,'电极与热区','电极端部变亮，热区展开','电炉提供反应所需能量'),
    E('高温区域',.9,'炉内反应区','炉料在热区中逐渐消耗','还原在高温反应区发生')],
  '05-furnace-02':[
    E('一氧化碳离开',1,'含氧气体','CO示意粒子沿上升路径离开炉膛','氧随气相产物离开'),
    E('液态硅汇集炉底',.9,'炉底硅液','液体集中到下部集液区','硅以液态汇集'),
    E('出料口放出',.55,'出料通道','开启出料流并增加接收容器中硅液','出料口通向接收容器')],
  '06-transform-01':[
    E('硅转化成',1.2,'固体硅与含氯产物','固体示意块减少，独立的氯硅烷分子出现','发生化学转化而非机械筛选'),
    E('三氯氢硅',.8,'三氯氢硅分子','突出硅、三个氯和一个氢的连接','三氯氢硅是氯硅烷的一例')],
  '06-transform-02':[
    E('改变了化学形态',1.0,'硅原料与氯硅烷','在两个不同组成的对象之间展开转化箭头','组成改变，不是单纯熔化'),
    E('挥发性的差别',.4,'两类组分','一类更多进入上部蒸气，另一类更多留在下部','组分进入汽相的倾向有差异')],
  '06-transform-03':[
    E('汽化',.7,'汽化容器','示意液滴变成向上的分散粒子','先进入汽相'),
    E('冷凝',.8,'冷凝通道','进入冷却通道的粒子汇成液滴','冷凝回到液相'),
    E('不同的收集路径',1.1,'两个收集容器','两种组分沿不同支路进入容器','分离后的组分分开收集')],
  '07-distill-01':[
    E('蒸气向上',.9,'塔内蒸气','汽相粒子依次经过塔板向上移动','蒸气上升'),
    E('液体向下',.9,'回流液体','液滴沿另一侧逐层向下移动','液体回流方向与汽相相反'),
    E('容易挥发',1.2,'较易挥发的组分','更多绿色组分进入上部汽相','汽液接触使组成改变')],
  '07-distill-02':[
    E('重复这样的交换',1.5,'三个接触级','三个接触级依次完成交换','多次交换产生逐级富集'),
    E('分别收集',.8,'两路输出','富集后的不同组分分别流入容器','分离后的物流分别处理'),
    E('多个分离步骤',1.0,'后续分离单元','第二处理单元出现并接续物流','实际净化包括多个步骤')],
  '07-distill-03':[
    E('杂质种类不同',1.1,'两类杂质','用两种不同位置的杂质突出不同分离路径','杂质不能当作同一种东西处理'),
    E('不是万能滤网',.8,'单独分离步骤','一个分离级后仍保留另一类杂质','单一步骤不能去掉所有污染'),
    E('整套工艺配合',1.0,'串联净化单元','后续单元接入，分别移除剩余组分','整套过程共同完成提纯')],
  '08-siemens-01':[
    E('细长的硅芯',.8,'细硅芯','突出尚未长粗的细硅芯','初始沉积基体是细硅芯'),
    E('通电加热',1,'电极和硅芯','电流路径接通，硅芯由冷色变成热色','通电先加热硅芯')],
  '08-siemens-02':[
    E('氯硅烷与氢气',.9,'两路反应气','两路不同形态的气体同时进入反应器','反应物进入沉积空间'),
    E('硅沉积到硅芯表面',1.4,'硅芯表面','示意硅原子到达表面并保留','硅在既有硅表面沉积'),
    E('一层层长粗',.4,'硅棒','保持长度而增加径向沉积层','棒体直径增加')],
  '08-siemens-03':[
    E('重新沉积',.9,'已长粗的硅棒','突出完成沉积的实体硅棒','气相原料重新成为固体硅'),
    E('气体循环',1.1,'回流管道','气体沿闭合回路回到入口','未直接成为产品的物流需要循环'),
    E('副产物处理',1,'副产物支路','独立支路将示意副产物送到处理容器','副产物另有处理路径')],
  '09-feedstock-01':[
    E('取出硅棒',.7,'多晶硅棒','将硅棒移出底座','产品从反应器取出'),
    E('破碎',.65,'硅棒与碎块','完整棒体变为彼此分离的碎块','后续装料使用破碎原料'),
    E('清理',.65,'碎块表面','去掉可见表面污染示意点','破碎后还需清理'),
    E('洁净包装',.8,'原料容器','清洁碎块进入容器并覆盖','包装防止再次污染'),
    E('工具带来的污染',.7,'工具接触点','单独放大工具接触留下的污染点','工具可能引入污染'),
    E('去掉',.3,'接触污染点','移除示意污染点','污染需去除而非带入下一步')],
  '09-feedstock-03':[
    E('先熔化',.9,'不同取向的晶粒','晶格连接消失，原子进入无序熔体','先打散固体原有排列'),
    E('重新生长单晶',1.1,'新的晶格','从同一籽晶方向逐层建立新晶格','单晶由熔体重新生长'),
    E('不是',.6,'原固体晶粒','固定其不同取向并突出两者分界','固体晶粒没有自行转正')],
  '10-melt-01':[
    E('多晶硅装进',1.2,'原料与石英坩埚','原料自上方落入石英坩埚','坩埚承装多晶硅'),
    E('石墨支撑',.7,'外侧石墨支撑','展开外部支撑剖面','石墨结构位于石英坩埚之外'),
    E('热场',.7,'加热结构','显示围绕坩埚的热区','热场围绕装料区布置'),
    E('固体逐渐变成熔体',.9,'固体硅与液面','固体块逐渐减少，连续液面形成','加热后发生固液转变')],
  '10-melt-02':[
    E('气氛',.8,'气体通道','入口与出口流线依次显现','生长空间需要控制气氛'),
    E('热量分布',1.0,'热区剖面','不同位置的热区分别显现','控制的不只是一个温度读数'),
    E('保持稳定',1.0,'热区与界面','原有不均匀色带趋于固定分布','目标是稳定条件'),
    E('不是温度越高越好',.7,'示意温度尺','过热一端出现叉号，目标区保持突出','稳定合适的热场比一味升温重要')],
  '11-seed-01':[
    E('籽晶',.8,'籽晶放大结构','突出已有的单晶小段','籽晶本身就是单晶'),
    E('方向已知',.8,'取向参照','固定方向参照轴出现','籽晶提供已知取向'),
    E('新来的硅原子',1.2,'新来的原子','新原子沿同一晶格方向连接','后续排列延续这一参照')],
  '11-seed-02':[
    E('接触熔硅',.7,'籽晶下端','籽晶下降至液面','接触先于提拉'),
    E('向上提拉',1.3,'提拉机构和新晶体','籽晶上移，凝固晶体下端保持接触液面','新晶体在固液界面形成'),
    E('接触处凝固',1.0,'固液界面','界面新生晶层由下方补入','新增材料不是从上方凭空出现'),
    E('延续籽晶的取向',.6,'晶格放大结构','新生晶格保持与籽晶相同的参照方向','取向连续')],
  '11-seed-03':[
    E('旋转',1.0,'晶体和坩埚','带参照刻线的两部分分别转动','晶体与坩埚可独立旋转'),
    E('传热',.8,'热量传递路径','热区之间的连接箭头展开','旋转配合传热'),
    E('物质输运',.9,'熔体示意粒子','粒子沿流动路径进入界面附近','流动输运材料，不是螺纹装配')],
  '12-neck-01':[
    E('引入位错',.8,'晶体内部线缺陷','红色位错线在局部晶格中出现','位错是晶格缺陷'),
    E('线状缺陷',.8,'位错线','突出一条连续红线而非开口裂纹','位错具有线状特征'),
    E('后续生长中延伸',.8,'新增晶段','晶体延长，位错线随新晶段延伸','不消除时缺陷可能延伸')],
  '12-neck-02':[
    E('拉出很细的颈部',1.2,'细颈','细颈在籽晶下逐渐拉长','首先形成细颈'),
    E('表面更近',.8,'细颈与侧壁','显示位错到较近侧壁的距离','细颈使侧表面更近'),
    E('位错在侧壁终止',1.15,'位错末端','位错线末端到达真实侧壁并停止','合适方向的位错可在侧壁终止')],
  '12-neck-03':[
    E('整根晶棒的品质',1.0,'细颈和完整晶棒','将细颈与后续无位错晶段的关系展开','细颈影响后续晶体品质'),
    E('红线表示位错',.9,'红色线标记','只点亮模型内部的线状示意','红线是解释标记'),
    E('不是实际可见的裂缝',.8,'连续实体外表面','突出未开裂的连续反光外表面','红线不等于实体裂缝')],
  '13-growth-01':[
    E('温度和拉速',1.0,'热场与提拉量','分别改变热区与提拉示意尺','生长条件通过温度和拉速调节'),
    E('直径逐渐增大',1.4,'肩部','下部直径逐渐扩大并展开横向标尺','放肩形成扩大的肩部')],
  '13-growth-02':[
    E('目标直径',.8,'晶棒横截面','固定直径参照线显现','等径段维持目标直径'),
    E('晶棒向上',1.2,'晶棒','晶棒向上延长，下端保持接触熔体','拉出晶棒而非悬空生长'),
    E('固液界面',1.0,'界面新层','在界面处逐次显示新晶层','材料在固液界面补入')],
  '13-growth-03':[
    E('金属般的光泽',1.0,'晶棒实体表面','改变反射观察方向，形状保持不变','真实硅表面呈金属般光泽'),
    E('慢慢长出来',1.1,'晶棒','增加等径段长度','晶棒由持续生长形成'),
    E('热场和拉速',1.4,'两个控制量','分别调整热区和提拉示意尺','生长需要持续调节')],
  '14-load-01':[
    E('晶棒越长越重',1.3,'晶棒与重力方向','长晶段增加并增强向下载荷箭头','长度增加带来承重问题'),
    E('承重设计',.8,'颈部支撑路径','突出向上的承载路径','载荷必须传到提拉机构'),
    E('辅助机构',.9,'辅助支撑','辅助支撑靠近肩部并分担载荷','辅助方案视工艺而定')],
  '14-load-02':[
    E('温差和旋转',1.1,'熔体','温差区和流动路径显现','温差与旋转引起流动'),
    E('流动',.8,'示意输运粒子','粒子沿熔体内路径移动','熔体并非静止'),
    E('改变正在凝固的界面条件',1.0,'凝固界面','界面热区随流动出现空间差异','流动影响正在凝固的区域')],
  '14-load-03':[
    E('界面条件不稳定',.9,'两根对比晶棒','对比晶棒之一的界面出现波动','界面条件可不稳定'),
    E('均匀性',1.0,'晶棒截面性质色带','不同位置的示意色带显示不均匀','不稳定条件可影响均匀性'),
    E('整根晶棒长得稳定',1.1,'稳定生长对照','突出另一根沿长度一致的示意色带','目标是整根稳定而非只变大')],
  '15-magnetic-01':[
    E('能导电',.7,'熔融硅','突出导电熔体区域','磁场作用涉及导电熔体'),
    E('磁场',.6,'磁场与熔体','磁极及场线出现','在熔体区域施加磁场'),
    E('抑制某些流动',.9,'熔体流动路径','原有较大流动幅度减小','磁场调节对流而非使硅悬浮')],
  '15-magnetic-02':[
    E('不是把硅吸起来',.8,'提拉机构','保持承重缆线并突出机械提拉方向','晶棒由机械机构提拉'),
    E('流动与传热',.9,'熔体与热区','显示磁场下受调节的流线和热区','磁场影响流动和传热'),
    E('帮助控制',1.2,'示意杂质','杂质沿熔体路径进入界面附近','流动影响杂质输运')],
  '15-magnetic-03':[
    E('石英坩埚',.9,'坩埚内壁','突出石英内壁及其中的氧示意点','氧的来源之一是石英坩埚'),
    E('引入氧',.9,'氧示意点','氧示意点从壁面进入熔体','坩埚可能向熔体引入氧'),
    E('进入晶体',1.0,'氧示意点与固体','一部分示意点经界面进入晶体','氧的输运与进入晶体有关'),
    E('熔体流动',.9,'熔体内输运路径','展开从壁面到界面的流动路径','流动影响分布')],
  '16-control-01':[
    E('氧',.7,'晶体内氧示意点','显示晶体内的氧示意点','氧含量需要按用途控制'),
    E('热处理',1.0,'晶体体内','氧示意点形成体内沉淀示意簇','热处理可利用氧的行为进行设计'),
    E('吸杂',1.0,'体内沉淀与金属杂质','杂质示意点向体内沉淀附近迁移','体内吸杂可用于杂质控制'),
    E('按用途控制',.3,'洁净表面与体内区域','分别突出表面与体内目标区域','用途决定控制要求')],
  '16-control-02':[
    E('固体和液体',1.2,'固相与液相','分开突出两个相及其不同示意浓度','两相中的元素浓度未必相同'),
    E('剩余熔体',1.5,'液相体积与掺杂点','生长使液相减少并改变剩余液相示意分布','剩余熔体状态随生长改变')],
  '16-control-03':[
    E('沿晶棒长度',1.1,'轴向采样点','沿轴线依次显示不同高度的采样点','轴向均匀性需要控制'),
    E('沿半径',.9,'径向采样点','在横截面上从中心到边缘展开采样','径向均匀性也需要控制'),
    E('都需要控制',.6,'两个方向的示意测量','同时保留两条独立检查路径','两个方向不能互相替代')],
};
function tag(o,text){o.userData.objectLabel=text;return o;}
function cross(g,xyz,scale=.18){
  const q=group(g);q.position.set(...xyz);
  segment(q,[-scale,-scale,0],[scale,scale,0],.018,M.amber);
  segment(q,[-scale,scale,0],[scale,-scale,0],.018,M.amber);return q;
}
function dots(parent,count,r=.045,material=M.green){
  return Array.from({length:count},(_,i)=>ball(parent,r,material,[Math.sin(i*2.4),0,Math.cos(i*2.4)]));
}
function chunks(parent,count,r=.15,material=M.silicon){
  return Array.from({length:count},(_,i)=>{
    const o=new T.Mesh(new T.IcosahedronGeometry(1,0),material);
    o.rotation.set(i*.37,i*.61,i*.24);o.scale.setScalar(r);parent.add(o);return o;
  });
}
function localLabels(ctx,entries){
  return entries.filter(entry=>entry.object.visible&&(!entry.phrase||ctx.time>=ctx.window(entry.phrase).start))
    .slice(-2).map(({phrase,...entry})=>entry);
}
function apparatus(parent,{radius=1.55}={}){
  const g=group(parent),cup=tag(openCup(g,radius,-1.15),'石英坩埚');
  const liquid=cyl(g,radius-.12,.055,M.hot,[0,-.76,0]);
  const graphite=group(g);
  for(const sign of [-1,1])box(graphite,.15,1.25,1.4,M.dark,[sign*(radius+.15),-1.26,0]);
  box(graphite,radius*2+.45,.18,1.4,M.dark,[0,-1.95,0]);
  const heat=group(g);
  for(const y of [-1.6,-1.25,-.9])ring(heat,radius+.4,M.hot,[0,y,0],.036);
  const neck=cyl(g,.09,.7,M.silicon,[0,1.4,0]);
  const seed=tag(cyl(g,.13,.4,M.silver,[0,1.95,0]),'籽晶');
  const chuck=cyl(g,.2,.25,M.dark,[0,2.28,0]);
  const cable=dynamicLine(g,M.silver,.02);
  const body=cyl(g,.64,1,M.silicon,[0,.12,0]);
  const shoulder=cyl(g,.64,.45,M.silicon,[0,.82,0],.09);
  const assembly=group(g);
  for(const o of [body,shoulder,neck,seed,chuck])assembly.attach(o);
  const setCrystal=(height=1.3,radius=.64,base=-.73)=>{
    body.visible=height>0;body.scale.set(radius/.64,Math.max(height,.001),radius/.64);
    body.position.set(0,base+height/2,0);
    shoulder.position.set(0,base+height+.225,0);shoulder.scale.set(radius/.64,1,radius/.64);
    neck.position.set(0,base+height+.8,0);seed.position.set(0,base+height+1.35,0);
    chuck.position.set(0,base+height+1.675,0);
    setSegment(cable,[0,base+height+1.8,0],[0,base+height+2.35,0]);
  };
  setCrystal();
  const anchor=marker(g,[.58,-.73,0]),bodyAnchor=marker(body,[.64,0,.05]);
  return {g,cup,liquid,graphite,heat,neck,seed,chuck,cable,body,shoulder,assembly,setCrystal,anchor,bodyAnchor};
}
function chlorosilane(parent,xyz=[0,0,0]){
  const g=group(parent);g.position.set(...xyz);
  const centre=ball(g,.18,M.atom);
  for(const [i,p]of [[.55,.5,.4],[-.55,.5,-.4],[.55,-.5,-.4],[-.55,-.5,.4]].entries()){
    ball(g,i===3?.1:.15,i===3?M.amber:M.green,p);segment(g,[0,0,0],p,.025,M.silver);
  }
  return {g,centre};
}
function separationSteps(parent,beat){
  const g=group(parent),second=beat.id.endsWith('02'),stages=[],product=[],impurities=[];
  for(let i=0;i<3;i++){
    const stage=group(g);stage.position.set(-.65,-1.35+i*1.25,0);
    box(stage,1.5,.95,.8,M.glass);
    box(stage,1.48,.035,.78,M.silver,[0,-.46,0]);
    stages.push(stage);
    product.push(dots(stage,8,.065,M.green));
    impurities.push(dots(stage,6,.07,M.amber));
    if(i<2)arrow(g,[-.65,-.78+i*1.25,.25],[-.65,-.2+i*1.25,.25],M.green,.018);
  }
  const clean=box(g,.85,.65,.8,M.glass,[1.2,-1.75,0]);
  const waste=box(g,.7,.65,.8,M.glass,[-1.95,-1.75,0]);
  const unit=group(g);unit.position.set(1.2,.05,0);
  box(unit,.8,1.5,.8,M.glass);
  const outlet=dots(g,8,.065,M.green),reject=dots(g,6,.07,M.amber),
    persistent=dots(g,5,.07,M.hot),lastReject=dots(g,5,.07,M.hot);
  return rigResult(g,ctx=>{
    const a=ctx.q(second?'重复这样的交换':'杂质种类不同'),
      b=ctx.q(second?'分别收集':'不是万能滤网'),
      c=ctx.q(second?'多个分离步骤':'整套工艺配合');
    stages.forEach((stage,j)=>{
      const progress=Math.min(1,Math.max(0,a*3-j));
      product[j].forEach((o,i)=>{
        o.visible=second?progress>0:j===1;
        o.position.set((i%4-1.5)*.26,-.12+Math.floor(i/4)*.27,.25);
      });
      impurities[j].forEach((o,i)=>{
        o.visible=second?progress>0&&i<6-j*2:j===1;
        o.position.set((i%3-1)*.35,mix(.1,.34,progress),.28);
        if(!second)o.position.x=mix((i%3-1)*.35,-1.3,b);
      });
      stage.visible=second||j===1;
    });
    persistent.forEach((o,i)=>{
      o.visible=!second&&a>0;
      o.position.set(mix(-.5,1.2,c)+Math.sin(i)*.2,mix(.2,-.7,c)+(i%2)*.15,.35);
    });
    outlet.forEach((o,i)=>{
      o.visible=second?b>0:c>0;
      const p=second?b:c;
      o.position.set(mix(-.65,1.2,p)+Math.sin(i)*.18,mix(second?1.2:.1,-1.65,p)+(i%3)*.12,.3);
    });
    reject.forEach((o,i)=>{
      o.visible=b>0;
      o.position.set(mix(-.65,-1.95,b)+Math.sin(i)*.13,mix(.1,-1.65,b)+(i%3)*.1,.3);
    });
    lastReject.forEach((o,i)=>{
      o.visible=!second&&c>0;
      o.position.set(mix(1.2,2.0,c),mix(-.5,-1.5,c)+(i%3)*.12,.3);
    });
    unit.visible=c>0;
    return {operation:second?'progressive-composition-enrichment':'two-impurities-different-removal-stages',
      repeatedContact:a,separateOutputs:b,secondaryTreatment:c,
      illustrativeComposition:true,noPurityMeasurement:true};
  },[stages[1],clean],{semanticPlan:plans[beat.id],
    view:{eye:[1.2,1.8,10],look:[0,-.1,0],span:7.1},
    semanticAnchors:ctx=>localLabels(ctx,second?[
      {text:'逐级富集示意',object:stages[2],offset:[110,-30],phrase:'重复这样的交换'},
      {text:'后续分离单元',object:unit,offset:[80,-70],phrase:'多个分离步骤'}]:[
      {text:'两类杂质示意',object:stages[1],offset:[-90,-80],phrase:'杂质种类不同'},
      {text:'另一类仍需处理',object:persistent[2],offset:[70,80],phrase:'不是万能滤网'}])});
}
function chemical(parent,beat){
  const id=beat.id,g=group(parent),labels=[];
  if(id==='07-distill-02'||id==='07-distill-03')return separationSteps(g,beat);
  let update,anchors,view={eye:[3,2.7,10],look:[0,0,0],span:7.2};
  if(id.startsWith('05-furnace')){
    openCup(g,1.5,-.85);
    const charge=chunks(g,24,.15,M.ceramic),carbon=chunks(g,12,.12,M.dark);
    const electrodes=[-.7,.7,0].map((x,i)=>cyl(g,.14,2.2,M.dark,[x,1.05,i===2?.75:-.3]));
    const tips=electrodes.map((o,i)=>ball(g,.2,M.hot,[o.position.x,-.05,o.position.z]));
    const liquid=cyl(g,1.35,.08,M.hot,[0,-.52,0]),gases=dots(g,10,.07,M.green);
    const stream=dynamicLine(g,M.hot,.06),receiver=cyl(g,.5,.12,M.hot,[1.95,-1.5,0]);
    tube(g,[[1.3,-.55,0],[1.95,-.6,0],[1.95,-.9,0]],.08,M.dark);
    const gasAnchor=marker(g,[.6,1.6,.3]);
    anchors=[id.endsWith('01')?electrodes[0]:gasAnchor,receiver];
    labels.push(...(id.endsWith('01')?[
      {text:'电极',object:electrodes[0],offset:[-90,-40],phrase:'电极送入能量'},
      {text:'高温反应区',object:liquid,offset:[90,40],phrase:'高温区域'}]:[
      {text:'CO 离开',object:gasAnchor,offset:[80,-40],phrase:'一氧化碳离开'},
      {text:'液态硅',object:receiver,offset:[-80,30],phrase:'液态硅汇集炉底'}]));
    update=ctx=>{
      const first=id.endsWith('01'),load=first?ctx.q('石英和碳质还原剂'):1,
        energy=first?ctx.q('电极送入能量'):1,consume=first?ctx.q('高温区域'):1;
      [...charge,...carbon].forEach((o,i)=>{
        const a=i*2.4,r=1.1*Math.sqrt((i+1)/36);
        o.position.set(Math.sin(a)*r,mix(2.1+(i%3)*.15,-.25,load),Math.cos(a)*r);
        o.scale.setScalar((i<24?.15:.12)*mix(1,.35,consume));
        o.visible=first;
      });
      tips.forEach(o=>o.visible=energy>0);
      liquid.scale.y=mix(.15,1,first?consume:ctx.q('液态硅汇集炉底'));
      const gas=first?0:ctx.q('一氧化碳离开'),pour=first?0:ctx.q('出料口放出');
      gases.forEach((o,i)=>{
        o.visible=gas>0;o.position.set(Math.sin(i)*.9,mix(-.2,2.0,gas)+(i%3)*.18,.35);
      });
      stream.visible=pour>0;setSegment(stream,[1.95,-.9,0],[1.95,mix(-.9,-1.42,pour),0]);
      receiver.scale.y=.05+.95*pour;
      return {operation:first?'charge-and-reduce':'gas-removal-and-tap',gasExit:gas,tap:pour,semanticDistinct:true};
    };
  }else if(id.startsWith('06-transform')){
    if(id.endsWith('01')||id.endsWith('02')){
      const chunk=new T.Mesh(new T.IcosahedronGeometry(.55,1),M.silicon);chunk.position.set(-1.2,.5,0);g.add(chunk);
      const molecule=chlorosilane(g,[1.15,.5,0]),conversion=arrow(g,[-.4,.5,0],[.45,.5,0]);
      const frameA=box(g,1.3,1.1,.7,M.glass,[-1.15,-1.3,0]),frameB=box(g,1.3,1.1,.7,M.glass,[1.15,-1.3,0]);
      const vapor=dots(g,10,.06,M.green),residue=dots(g,8,.065,M.amber);
      anchors=[chunk,molecule.centre];labels.push({text:'硅原料',object:chunk,offset:[0,-80]},
        {text:'氯硅烷',object:molecule.centre,offset:[0,-90],phrase:id.endsWith('01')?'硅转化成':'改变了化学形态'},
        ...(!id.endsWith('01')?[{text:'较易进入汽相',object:frameA,offset:[0,90],phrase:'挥发性的差别'}]:[]));
      update=ctx=>{
        const first=id.endsWith('01'),transform=ctx.q(first?'硅转化成':'改变了化学形态'),
          detail=ctx.q(first?'三氯氢硅':'挥发性的差别');
        chunk.scale.setScalar(mix(1,.55,transform));molecule.g.visible=transform>0;molecule.g.scale.setScalar(mix(.05,1,transform));
        conversion.visible=transform>0;
        frameA.visible=frameB.visible=!first;
        vapor.forEach((o,i)=>{o.visible=!first&&detail>0;o.position.set(-1.15+Math.sin(i)*.38,mix(-1.6,-.5,detail)+(i%3)*.12,.2);});
        residue.forEach((o,i)=>{o.visible=!first&&detail>0;o.position.set(1.15+Math.sin(i)*.4,mix(-1.5,-1.35,detail)+(i%3)*.1,.2);});
        return {operation:first?'chemical-conversion':'different-composition-and-volatility',chemicalNotMelting:true,
          illustrativeMolecule:'HSiCl3',vaporPreference:!first?detail:undefined};
      };
    }else{
      const pots=[-1.15,1.15].map(x=>box(g,.9,.85,.8,M.glass,[x,-1.1,0]));
      tube(g,[[-1.15,-.5,0],[-1.15,1,0],[.2,1,0],[.2,-.2,0],[1.15,-.5,0]],.045);
      const cold=ring(g,.35,M.silver,[.2,.45,0],.025);cold.rotation.z=Math.PI/2;
      const out=box(g,.8,.6,.7,M.glass,[-.2,-2.05,.2]);
      const vapor=dots(g,8,.055,M.green),condensate=dots(g,8,.06,M.green),split=dots(g,8,.06,M.amber);
      anchors=[pots[0],pots[1]];labels.push({text:'汽化',object:pots[0],offset:[-50,90],phrase:'汽化'},
        {text:'冷凝',object:cold,offset:[60,-70],phrase:'冷凝'},
        {text:'分开收集',object:out,offset:[50,80],phrase:'不同的收集路径'});
      update=ctx=>{
        const a=ctx.q('汽化'),b=ctx.q('冷凝'),c=ctx.q('不同的收集路径');
        vapor.forEach((o,i)=>{o.visible=a>0;o.position.set(-1.15,mix(-1.1,1,a)+(i%3)*.1,.2);});
        condensate.forEach((o,i)=>{o.visible=b>0;o.position.set(mix(.2,1.15,c),mix(.6,-1.05,b)+(i%3)*.1,.2);});
        split.forEach((o,i)=>{o.visible=c>0;o.position.set(mix(.2,-.2,c)+Math.sin(i)*.16,mix(-.2,-2,c),.2);});
        return {operation:'vaporize-condense-route',vaporize:a,condense:b,separateCollections:c};
      };
    }
  }else if(id.startsWith('07-distill')){
    const tower=group(g);tower.position.x=-.4;
    box(tower,1.1,4.2,.9,M.glass);
    const trays=Array.from({length:5},(_,i)=>box(tower,1.02,.04,.85,M.silver,[0,-1.6+i*.8,0]));
    const gas=dots(tower,12,.055,M.green),liquid=dots(tower,10,.06,M.silver),other=dots(tower,6,.065,M.amber);
    const unit=group(g);unit.position.set(1.55,0,0);
    box(unit,.7,2.5,.7,M.glass);const collector=box(g,.8,.6,.7,M.glass,[1.55,-1.9,0]);
    const out=dots(g,10,.06,M.green),waste=dots(g,6,.06,M.amber);
    anchors=[trays[2],collector];
    labels.push(...(id.endsWith('01')?[
      {text:'蒸气 ↑',object:gas[3],offset:[-100,-30],phrase:'蒸气向上'},
      {text:'回流液体 ↓',object:liquid[3],offset:[90,30],phrase:'液体向下'}]:[
      {text:'逐级富集',object:trays[3],offset:[-90,-20],phrase:id.endsWith('02')?'重复这样的交换':'杂质种类不同'},
      {text:'后续分离',object:unit,offset:[-20,-90],phrase:id.endsWith('02')?'多个分离步骤':'整套工艺配合'}]));
    update=ctx=>{
      const first=id.endsWith('01'),second=id.endsWith('02');
      const up=ctx.q(first?'蒸气向上':second?'重复这样的交换':'杂质种类不同');
      const down=ctx.q(first?'液体向下':second?'分别收集':'不是万能滤网');
      const final=ctx.q(first?'容易挥发':second?'多个分离步骤':'整套工艺配合');
      unit.visible=!first&&final>0;
      gas.forEach((o,i)=>{
        const stage=second?Math.min(1,Math.max(0,up*3-(i%3))):up;
        o.position.set(-.28+(i%3)*.16,mix(-1.75+(i%4)*.2,1.55+(i%3)*.15,stage),.35);
        o.scale.setScalar(.055*(1+final*.35));
      });
      liquid.forEach((o,i)=>o.position.set(.28,mix(1.6-(i%3)*.16,-1.6+(i%3)*.16,first?down:up),.35));
      other.forEach((o,i)=>{o.visible=!second;o.position.set(.1+Math.sin(i)*.2,mix(.9,-1.6,first?final:down),.36);});
      out.forEach((o,i)=>{o.visible=!first&&down>0;o.position.set(mix(.2,1.55,down)+Math.sin(i)*.15,mix(1.5,-1.75,down)+(i%3)*.1,.25);});
      waste.forEach((o,i)=>{o.visible=!first&&final>0;o.position.set(mix(.1,2.1,final),mix(-.3,-1.6,final)+(i%3)*.1,.3);});
      return {operation:first?'countercurrent-contact':second?'successive-enrichment':'staged-impurity-treatment',
        vaporUp:up,liquidDown:first?down:undefined,additionalUnit:unit.visible,schematic:true,noPurityMeasurement:true};
    };
  }else{
    const base=cyl(g,1.25,.16,M.dark,[0,-1.5,0]),rods=[],seedMaterial=M.silicon.clone();
    seedMaterial.emissive=new T.Color(0x000000);
    for(const x of [-.55,.55])rods.push(cyl(g,.08,2.6,seedMaterial,[x,-.1,0]));
    const bridge=cyl(g,.08,1.1,seedMaterial,[0,1.2,0]);bridge.rotation.z=Math.PI/2;
    const incoming=dots(g,12,.06,M.green),hydrogen=dots(g,8,.04,M.amber),returnGas=dots(g,8,.06,M.green);
    const inlet=tube(g,[[-1.7,-1.1,0],[-1.1,-1.1,0]],.05);
    const recycle=tube(g,[[1.1,1,0],[1.7,1,0],[1.7,1.8,0],[-1.7,1.8,0],[-1.7,-1.1,0],[-1.1,-1.1,0]],.04);
    const byproduct=box(g,.7,.6,.7,M.glass,[1.9,-1.6,0]);
    const bypoints=dots(g,6,.06,M.amber),rodAnchor=marker(rods[0],[.08,0,.05]);
    tag(rodAnchor,'硅芯');anchors=[rodAnchor,byproduct];
    labels.push(...(id.endsWith('01')?[
      {text:'硅芯',object:rodAnchor,offset:[-70,-60],phrase:'细长的硅芯'}]:id.endsWith('02')?[
      {text:'表面沉积',object:rodAnchor,offset:[-70,-60],phrase:'硅沉积到硅芯表面'}]:[
      {text:'气体回路',object:returnGas[3],offset:[0,-70],phrase:'气体循环'},
      {text:'副产物处理',object:byproduct,offset:[-20,90],phrase:'副产物处理'}]));
    if(id==='09-feedstock-01'){
      const pieces=chunks(g,12,.18,M.silicon),dirt=dots(g,6,.04,M.amber);
      const tray=box(g,2.0,.15,1.15,M.silver,[0,-.9,0]),cover=box(g,2.05,.08,1.2,M.glass,[0,.3,0]);
      const walls=group(g);
      for(const sign of [-1,1]){
        box(walls,.08,.6,1.15,M.glass,[sign*1.0,-.55,0]);
        box(walls,2.0,.6,.08,M.glass,[0,-.55,sign*.575]);
      }
      const inset=group(g);inset.position.set(1.25,1.25,0);
      const specimen=chunks(inset,1,.3,M.silicon)[0];
      const tool=box(inset,.15,.2,.8,M.dark,[.75,.15,0]),
        contamination=ball(inset,.09,M.amber,[.26,.15,.2]);
      anchors=[tray,tool];labels.length=0;labels.push({text:'破碎原料',object:tray,offset:[-60,100],phrase:'破碎'},
        {text:'接触污染示意',object:contamination,offset:[-70,-80],phrase:'工具带来的污染'});
      update=ctx=>{
        const extract=ctx.q('取出硅棒'),breakup=ctx.q('破碎'),clean=ctx.q('清理'),
          pack=ctx.q('洁净包装'),touch=ctx.q('工具带来的污染'),remove=ctx.q('去掉');
        inlet.visible=recycle.visible=false;
        rods.forEach((o,i)=>{o.visible=breakup<.9;o.position.set((i?1:-1)*.55,-.1+extract*.6,0);});
        bridge.visible=breakup<.9;bridge.position.y=1.2+extract*.6;base.visible=breakup<.9;
        pieces.forEach((o,i)=>{o.visible=breakup>0;o.position.set(Math.sin(i*2.4)*.7,mix(.6,-.65,breakup)+(i%3)*.13,Math.cos(i*2.4)*.35);o.scale.setScalar(.18*breakup);});
        dirt.forEach((o,i)=>{o.visible=clean<1&&breakup>0;o.position.set(Math.sin(i)*.6,-.4+clean*.4,.5);});
        tray.visible=breakup>0;walls.visible=pack>0;
        cover.visible=pack>0;cover.position.y=mix(.6,-.15,pack);
        inset.visible=touch>0;tool.position.x=mix(.75,.32,touch);
        specimen.rotation.set(.3,.4,.2);
        contamination.visible=touch>0&&remove<1;contamination.scale.setScalar(.09*(1-remove));
        [...incoming,...hydrogen,...returnGas,...bypoints].forEach(o=>o.visible=false);byproduct.visible=false;
        return {operation:'extract-break-clean-pack-contact-clean',broken:breakup,cleaned:clean,packed:pack,contactPollution:touch*(1-remove)};
      };
    }else update=ctx=>{
      const first=id.endsWith('01'),second=id.endsWith('02');
      const a=ctx.q(first?'细长的硅芯':second?'氯硅烷与氢气':'重新沉积'),
        b=ctx.q(first?'通电加热':second?'硅沉积到硅芯表面':'气体循环'),
        c=second?ctx.q('一层层长粗'):!first?ctx.q('副产物处理'):0;
      const radius=first?1:second?1+2.5*c:3.5;
      rods.forEach(o=>o.scale.set(radius,1,radius));bridge.scale.set(radius,1,radius);
      seedMaterial.emissive.setHex(first?0xde751e:0x000000);seedMaterial.emissiveIntensity=first?b*.8:0;
      incoming.forEach((o,i)=>{
        o.visible=second&&a>0;const angle=(i%6)*Math.PI/3,centre=i<6?-.55:.55;
        o.position.set(mix(-1.7,centre+Math.sin(angle)*.08*radius,b),-.7+(i%5)*.3,
          mix(.4,Math.cos(angle)*.08*radius,b));
        o.material=b===1?M.atom:M.green;
      });
      hydrogen.forEach((o,i)=>{o.visible=second&&a>0;o.position.set(mix(-1.9,1.65,b),.1+(i%4)*.25,.4);});
      returnGas.forEach((o,i)=>{
        const travel=Math.min(1,Math.max(0,b*1.8-i*.1));
        o.visible=!first&&!second&&b>i*.05;
        o.position.copy(recycle.geometry.parameters.path.getPointAt(travel));
      });
      byproduct.visible=!first&&!second;
      bypoints.forEach((o,i)=>{o.visible=!first&&!second&&c>0;o.position.set(1.9+Math.sin(i)*.16,mix(.8,-1.5,c)+(i%3)*.08,.3);});
      return {operation:first?'heat-seed-rods':second?'deposit-and-thicken':'recycle-and-byproduct',
        depositionRadiusFactor:radius,rodLengthConstant:true,gasRecycling:!first&&!second?b:0};
    };
  }
  return rigResult(g,update,anchors,{view,semanticPlan:plans[id],
    semanticAnchors:ctx=>localLabels(ctx,labels)});
}
function meltStage(parent,beat){
  const id=beat.id,a=apparatus(parent),g=a.g;
  a.assembly.visible=a.cable.visible=false;
  const charge=chunks(g,24,.15,M.silicon);
  const gas=Array.from({length:4},(_,i)=>{
    const x=i<2?-1.5+i*.25:1.25+(i-2)*.25;
    return arrow(g,[x,i<2?1.55:.85,.1],[x,i<2?.85:1.55,.1],M.green,.015);
  });
  const zones=Array.from({length:5},(_,i)=>ring(g,1.0+i*.14,M.hot,[0,-.68-i*.03,0],.026));
  const ruler=group(g);ruler.position.set(2.05,-.7,0);
  segment(ruler,[0,-1,0],[0,1.3,0],.018,M.silver);
  const needle=box(ruler,.3,.07,.08,M.green,[0,0,.06]),bad=cross(ruler,[0,1.15,.08]);
  const labels=id==='10-melt-01'?[
    {text:'石英坩埚',object:a.cup,offset:[-130,40],phrase:'多晶硅装进'},
    {text:'石墨支撑',object:a.graphite,offset:[140,60],phrase:'石墨支撑'},
    {text:'热场示意',object:a.heat,offset:[-140,-70],phrase:'热场'}]:[
    {text:'气氛',object:gas[1],offset:[70,-50],phrase:'气氛'},
    {text:'热区分布示意',object:zones[3],offset:[110,90],phrase:'热量分布'}];
  return rigResult(g,ctx=>{
    const first=id==='10-melt-01';
    const load=first?ctx.q('多晶硅装进'):1,support=first?ctx.q('石墨支撑'):1,
      heat=first?ctx.q('热场'):ctx.q('热量分布'),
      melting=first?ctx.q('固体逐渐变成熔体'):1;
    a.graphite.visible=support>0;a.heat.visible=first?heat>0:true;
    charge.forEach((o,i)=>{
      o.visible=first&&melting<1;const r=1.25*Math.sqrt((i+.5)/24),angle=i*2.4;
      o.position.set(Math.sin(angle)*r,mix(1.8+(i%3)*.2,-.52+(i%3)*.08,load),Math.cos(angle)*r);
      o.scale.setScalar(.15*(1-melting));
    });
    a.liquid.visible=melting>0;a.liquid.scale.setScalar(mix(.85,1,melting));
    const atmosphere=first?0:ctx.q('气氛'),stable=first?0:ctx.q('保持稳定'),
      limit=first?0:ctx.q('不是温度越高越好');
    gas.forEach((o,i)=>{o.visible=atmosphere>0;o.scale.y=.3+.7*atmosphere;o.position.y=atmosphere*.15;});
    zones.forEach((o,i)=>{
      o.visible=!first&&heat>0;o.scale.setScalar(mix(.83+(i%2)*.35,1,stable));
    });
    ruler.visible=!first;needle.position.y=mix(.3,0,stable);bad.visible=limit>0;
    return {operation:first?'load-support-heat-melt':'atmosphere-thermal-stability',
      chargeLoad:load,graphiteSupport:support,thermalField:heat,solidFraction:1-melting,
      atmosphereControl:atmosphere,thermalStability:stable,noExcessHeat:limit,schematicThermalField:true};
  },[a.cup,a.graphite],{semanticPlan:plans[id],view:{eye:[3.7,2.8,10],look:[0,-.1,0],span:7.8},
    semanticAnchors:ctx=>localLabels(ctx,labels)});
}
function remelt(parent,beat){
  const g=group(parent),left=buildDiamond(g,{cells:2,spacing:.7,atomRadius:.065}),
    right=buildDiamond(g,{cells:2,spacing:.7,atomRadius:.065}),free=dots(g,22,.06,M.atom);
  left.g.position.set(-1.1,.8,0);left.g.rotation.set(.4,.65,.15);right.g.position.set(1,.8,0);
  const melt=cyl(g,1.35,.09,M.hot,[0,-1.1,0]),divider=segment(g,[0,.05,0],[0,1.7,0],.012,M.dark);
  const reject=cross(g,[-1.1,-.05,.1]),path=arrow(g,[-.55,-.9,.25],[.65,-.9,.25],M.green,.02);
  const comparison=group(g);comparison.position.set(0,-1.9,0);
  for(const [i,x]of [-.4,.4].entries()){
    const crystal=buildDiamond(comparison,{cells:2,spacing:.55,atomRadius:.055});
    crystal.g.position.x=x;crystal.g.rotation.z=i?.35:-.3;
  }
  const wrong=cross(comparison,[0,0,.8],.45);
  return rigResult(g,ctx=>{
    const a=ctx.q('先熔化'),b=ctx.q('重新生长单晶'),c=ctx.q('不是');
    left.atoms.forEach(o=>o.scale.setScalar(.065*(1-a)));left.bonds.forEach(o=>o.o.visible=a<.5);
    free.forEach((o,i)=>{o.visible=a>0;o.position.set(Math.sin(i*2.4)*1.0,-.95+(i%3)*.12,Math.cos(i*2.4)*.6);});
    right.atoms.forEach((o,i)=>o.visible=b>i/right.atoms.length);
    right.bonds.forEach(({o,i,j})=>o.visible=right.atoms[i].visible&&right.atoms[j].visible);
    reject.visible=false;comparison.visible=c>0;wrong.visible=c>0;
    divider.visible=c>0;path.visible=a>0;melt.visible=a>0;
    return {operation:'destroy-old-order-regrow-new-order',melted:a,newCrystal:b,solidGrainsNeverRotate:true};
  },[melt,right.atoms[20]],{semanticPlan:plans[beat.id],view:{eye:[1,2.2,10],look:[0,0,0],span:6.8},
    semanticAnchors:ctx=>localLabels(ctx,[
      {text:'新晶格：取向示意',object:right.g,offset:[90,-80],phrase:'重新生长单晶'},
      {text:'固态晶粒不会自行转正',object:comparison,offset:[0,100],phrase:'不是'}])});
}
function seedStage(parent,beat){
  const id=beat.id,g=group(parent),a=apparatus(g),l=buildDiamond(g,{cells:2,spacing:.72,atomRadius:.07});
  l.g.position.set(1.6,1.3,0);l.g.scale.setScalar(.75);
  const axis=arrow(l.g,[0,-.8,0],[0,.85,0],M.amber,.018);
  const arrivals=dots(l.g,5,.07,M.green),tip=marker(a.g,[0,-.73,0]),heat=arrow(a.g,[-1.4,-1.1,.5],[-.35,-.8,.5],M.amber,.018);
  const flow=dots(a.g,8,.05,M.green),mark=segment(a.assembly,[.55,.1,0],[.55,.45,0],.025,M.green);
  const cupMark=group(a.g);
  for(let i=0;i<5;i++){
    const angle=i*.65;
    segment(cupMark,[Math.sin(angle)*1.25,-.68,Math.cos(angle)*1.25],
      [Math.sin(angle)*1.48,-.68,Math.cos(angle)*1.48],.035,i?M.silver:M.green);
  }
  const rotationArrow=arrow(a.g,[-.3,.45,.69],[.48,.45,.69],M.green,.025);
  const transportAnchor=marker(a.g,[-.9,-.57,.75]);
  return rigResult(g,ctx=>{
    const first=id.endsWith('01'),second=id.endsWith('02');
    a.heat.visible=false;a.graphite.visible=false;
    l.g.visible=first||second;axis.visible=first?ctx.q('方向已知')>0:second?ctx.q('延续籽晶的取向')>0:false;
    if(first){
      const highlight=ctx.q('籽晶'),join=ctx.q('新来的硅原子');
      a.setCrystal(0,.12,.1);a.body.visible=a.shoulder.visible=false;
      l.g.scale.setScalar(.6+highlight*.18);
      arrivals.forEach((o,i)=>{o.visible=join>0;o.position.copy(V(1.5,.9-i*.3,.4).lerp(V(...l.points[20+i]),join));});
      heat.visible=mark.visible=cupMark.visible=rotationArrow.visible=false;flow.forEach(o=>o.visible=false);
      return {operation:'known-seed-orientation',seedIsSingleCrystal:true,incomingAligned:join};
    }
    arrivals.forEach(o=>o.visible=false);
    if(second){
      const touch=ctx.q('接触熔硅'),pull=ctx.q('向上提拉'),solidify=ctx.q('接触处凝固');
      const base=mix(.9,-.73,touch),height=.1+pull*.95;
      a.setCrystal(height,.13,base);a.shoulder.visible=false;
      a.neck.position.y=base+height+.35;a.seed.position.y=base+height+.9;
      a.chuck.position.y=base+height+1.225;setSegment(a.cable,[0,base+height+1.35,0],[0,3.6,0]);
      l.atoms.forEach((o,i)=>o.visible=i<16||solidify>Math.floor(i/8)/8);
      l.bonds.forEach(({o,i,j})=>o.visible=l.atoms[i].visible&&l.atoms[j].visible);
      heat.visible=mark.visible=cupMark.visible=rotationArrow.visible=false;flow.forEach(o=>o.visible=false);
      return {operation:'contact-pull-interface-solidify',contact:touch,pull,interfaceGrowth:solidify,
        solidBottom:base,meltSurface:-.73,connectedToMelt:touch===1,seedOrientationContinuous:true};
    }
    const rotation=ctx.q('旋转'),thermal=ctx.q('传热'),transport=ctx.q('物质输运');
    a.setCrystal(1.2);a.assembly.rotation.y=rotation*Math.PI*.8;
    cupMark.rotation.y=-rotation*Math.PI*.6;rotationArrow.visible=rotation>0;
    mark.visible=cupMark.visible=rotation>0;
    heat.visible=thermal>0;heat.scale.setScalar(.1+.9*thermal);
    heat.position.z=.85;
    flow.forEach((o,i)=>{o.visible=transport>0;
      o.position.set(mix(-1.25+(i%3)*.16,-.55+(i%3)*.06,transport),
        -.62+(i%2)*.035,mix(.8,.5,transport));});
    return {operation:'rotation-heat-and-transport',rotation,thermal,transport,notScrewAssembly:true,
      connectedToMelt:true,solidBottom:-.73,meltSurface:-.73};
  },[tag(a.seed,'籽晶'),tip],{semanticPlan:plans[id],view:{eye:[2.5,2,10],look:[.3,.6,0],span:8.1},
    semanticAnchors:ctx=>localLabels(ctx,[
      {text:'籽晶',object:a.seed,offset:[-100,-60]},
      ...(id.endsWith('01')?[{text:'同一取向',object:axis,offset:[80,-60],phrase:'方向已知'}]:
        id.endsWith('02')?[{text:'固液界面',object:tip,offset:[100,60],phrase:'接触熔硅'}]:
          [{text:'输运路径示意',object:transportAnchor,offset:[-80,80],phrase:'物质输运'}]) ])});
}
function neckStage(parent,beat){
  const id=beat.id,g=group(parent),shell=M.silicon.clone();
  shell.transparent=true;shell.opacity=.24;shell.depthWrite=false;shell.side=T.DoubleSide;
  const red=new T.MeshBasicMaterial({color:0xe34842,toneMapped:false});
  const neck=cyl(g,.44,2.0,shell,[0,.1,0]),seed=cyl(g,.5,.65,M.silver,[0,1.6,0]);
  const rim=ring(g,.44,M.silver,[0,1.1,0],.014),bottom=ring(g,.44,M.silver,[0,-.9,0],.014);
  const melt=cyl(g,1.0,.07,M.hot,[0,-.94,0]);
  const lines=[dynamicLine(g,red,.026),dynamicLine(g,red,.026)],ends=dots(g,2,.05,red);
  const side=marker(g,[.44,.2,.1]),defect=marker(g,[.14,.6,.15]),smooth=ring(g,.445,M.silver,[0,.15,0],.013);
  const whole=group(g);whole.position.set(1.45,-.4,0);
  cyl(whole,.4,1.8,M.silicon,[0,-.3,0]);
  cyl(whole,.4,.4,M.silicon,[0,.8,0],.07);
  cyl(whole,.07,.65,M.silicon,[0,1.325,0]);
  const relation=arrow(g,[.55,.85,.2],[1.35,.93,.2],M.green,.018);
  return rigResult(g,ctx=>{
    const first=id.endsWith('01'),second=id.endsWith('02');
    const intro=ctx.q(first?'引入位错':second?'拉出很细的颈部':'整根晶棒的品质'),
      detail=ctx.q(first?'线状缺陷':second?'表面更近':'红线表示位错'),
      payoff=ctx.q(first?'后续生长中延伸':second?'位错在侧壁终止':'不是实际可见的裂缝');
    const height=first?2+payoff*.6:second?mix(1.4,2.8,intro):2.8,top=1.1,base=top-height;
    whole.visible=relation.visible=!first&&!second&&intro>0;
    whole.scale.setScalar(.2+.8*intro);
    neck.scale.y=height/2;neck.position.y=(top+base)/2;
    bottom.position.y=base;melt.position.y=base-.035;
    lines.forEach((line,i)=>{
      const sign=i?1:-1,start=[sign*.1,1.35,.15];
      const endpoint=second?[sign*mix(.15,.405,payoff),mix(.25,.42,payoff),.17]:
        [sign*.16,mix(.6,base+.15,first?payoff:0),.17];
      setSegment(line,start,endpoint);line.visible=first?intro>0:second?true:detail>0;
      ends[i].position.set(...endpoint);ends[i].visible=second&&payoff===1;
    });
    smooth.visible=second?detail>0:!first&&payoff>0;smooth.position.y=second?.42:-.25;
    side.position.set(.405,.42,.17);
    return {operation:first?'introduce-and-propagate-dislocation':second?'narrow-neck-terminate-at-wall':'mark-schematic-not-crack',
      dislocationColor:'#e34842',notVisibleCracks:true,localNeckEnlargement:true,
      neckHeight:height,dislocationIntroduced:intro,sidewallTerminationComplete:second&&payoff===1,
      solidBottom:base,meltSurface:base,connectedToMelt:true,geometryScaleIsSchematic:true};
  },[defect,side],{semanticPlan:plans[id],view:{eye:[.5,.8,10],look:[0,-.15,0],span:6.5},
    semanticAnchors:ctx=>localLabels(ctx,[
      {text:'位错线示意',object:defect,offset:[-115,-45],
        phrase:id.endsWith('01')?'引入位错':id.endsWith('02')?'拉出很细的颈部':'红线表示位错'},
      {text:id.endsWith('02')?'细颈侧壁':id.endsWith('03')?'后续完整晶棒':'连续实体表面',
        object:id.endsWith('03')?whole:side,offset:[110,80],
        phrase:id.endsWith('01')?'线状缺陷':id.endsWith('02')?'表面更近':'不是实际可见的裂缝'}])});
}
function growthStage(parent,beat){
  const id=beat.id,a=apparatus(parent),g=a.g;
  const thermal=ring(g,1.9,M.hot,[0,-1.15,0],.06);
  const gauge=group(g);gauge.position.set(-1.65,1.4,0);
  const measure=dynamicLine(gauge,M.green,.015),speed=arrow(gauge,[0,-.4,0],[0,.5,0],M.green,.02);
  const diameter=dynamicLine(g,M.green,.014),newLayer=cyl(g,.65,.045,M.green,[0,-.72,0]);
  const arms=[-1,1].map(sign=>box(g,.7,.12,.4,M.dark,[sign*1.8,1.3,0]));
  const supportFrame=group(g),uprights=[-1,1].map(()=>dynamicLine(supportFrame,M.dark,.055)),
    crossbar=dynamicLine(supportFrame,M.dark,.065);
  const weight=arrow(g,[1.05,.8,0],[1.05,-.4,0],M.amber,.025);
  const up=arrow(g,[-.8,1.15,0],[-.8,2.3,0],M.green,.025);
  const shoulderPositions=a.shoulder.geometry.attributes.position;
  const originalShoulder=shoulderPositions.array.slice();
  return rigResult(g,ctx=>{
    let height=1.4,radius=.64,p=0,controls=0,payoff=0;
    const shoulder=id==='13-growth-01',equal=id==='13-growth-02',real=id==='13-growth-03',support=id==='14-load-01';
    if(shoulder){controls=ctx.q('温度和拉速');p=ctx.q('直径逐渐增大');height=0;radius=mix(.09,.64,p);}
    if(equal){controls=ctx.q('目标直径');p=ctx.q('晶棒向上');payoff=ctx.q('固液界面');height=mix(.3,1.9,p);}
    if(real){const shine=ctx.q('金属般的光泽');p=ctx.q('慢慢长出来');controls=ctx.q('热场和拉速');
      a.assembly.rotation.y=shine*.5;height=mix(1.3,1.8,p);}
    if(support){p=ctx.q('晶棒越长越重');controls=ctx.q('承重设计');payoff=ctx.q('辅助机构');height=mix(1.1,2.1,p);}
    a.setCrystal(height,radius);
    if(shoulder){
      a.shoulder.scale.set(1,1,1);
      for(let i=0;i<shoulderPositions.count;i++){
        const t=(originalShoulder[i*3+1]+.225)/.45,oldRadius=mix(.64,.09,t),newRadius=mix(radius,.09,t);
        shoulderPositions.setX(i,originalShoulder[i*3]*newRadius/oldRadius);
        shoulderPositions.setZ(i,originalShoulder[i*3+2]*newRadius/oldRadius);
      }
      shoulderPositions.needsUpdate=true;a.shoulder.geometry.computeVertexNormals();
    }
    a.heat.visible=false;thermal.visible=shoulder||real;thermal.scale.setScalar(1+controls*.08);
    gauge.visible=shoulder||real;speed.scale.y=.4+.6*controls;setSegment(measure,[-.25,-.6,0],[mix(-.25,.25,controls),-.6,0]);
    setSegment(diameter,[-radius,-.65,.75],[mix(-radius,radius,shoulder?p:controls),-.65,.75]);
    diameter.visible=shoulder||equal;
    newLayer.visible=equal&&payoff>0;newLayer.scale.set(radius/.65,1,radius/.65);newLayer.position.y=-.70+.08*payoff;
    const contactY=-.73+height-.12,beamY=-.73+height+1.8;
    arms.forEach((o,i)=>{o.visible=support&&payoff>0;
      o.position.set((i?1:-1)*mix(1.8,radius+.35,payoff),contactY,0);});
    supportFrame.visible=support&&payoff>0;
    uprights.forEach((o,i)=>{
      const x=(i?1:-1)*(radius+.55);
      setSegment(o,[x,contactY,0],[x,beamY,0]);
    });
    setSegment(crossbar,[-radius-.55,beamY,0],[radius+.55,beamY,0]);
    weight.visible=support;weight.scale.y=.5+.5*p;up.visible=support&&controls>0;
    return {operation:shoulder?'shoulder-control-and-diameter':equal?'constant-diameter-interface-feed':real?'reflect-slow-grow-adjust':'weight-and-support',
      diameter:radius*2,solidHeight:height,controls,interfaceNewLayer:payoff,
      connectedToMelt:true,solidBottom:-.73,meltSurface:-.73,mechanicalSupportSchematic:support};
  },[tag(a.bodyAnchor,beat.visual==='shoulder'?'放肩':'等径生长'),a.anchor],
  {semanticPlan:plans[id],view:{eye:[3.7,2.6,10],look:[0,.6,0],span:8.7},
    semanticAnchors:ctx=>localLabels(ctx,id==='13-growth-03'?[
      {text:'热场 / 拉速',object:gauge,offset:[-80,-60],phrase:'热场和拉速'}]:[
      {text:id==='14-load-01'?'载荷示意':id==='13-growth-01'?'直径逐渐扩大':'固液界面',
        object:id==='14-load-01'?weight:id==='13-growth-01'?diameter:a.anchor,offset:[100,50],
        phrase:id==='14-load-01'?'晶棒越长越重':id==='13-growth-01'?'直径逐渐增大':'固液界面'}])});
}
function flowStage(parent,beat){
  const id=beat.id,a=apparatus(parent),g=a.g,magnets=group(g),paths=[],particles=dots(g,12,.05,M.green);
  for(const sign of [-1,1])box(magnets,.2,2.0,.9,M.dark,[sign*2.05,-.8,0]);
  for(let i=0;i<3;i++)arrow(magnets,[-1.9,-1.3+i*.5,.85],[1.9,-1.3+i*.5,.85],M.green,.011);
  for(let i=0;i<4;i++)paths.push(tube(g,[[Math.sin(i)*1.15,-.7,Math.cos(i)*.8],[Math.sin(i)*.5,-.55,Math.cos(i)*.6],[.3,-.72,.15]],.016,M.green));
  const hot=Array.from({length:3},(_,i)=>ring(g,.5+i*.22,M.hot,[0,-.67,0],.018));
  const traction=arrow(g,[0,2.4,.2],[0,3.2,.2],M.amber,.022);
  const oxygen=dots(g,10,.065,M.green),wall=marker(g,[1.4,-1.0,.2]);
  const dampingArrows=[-1,1].map(sign=>{
    const o=arrow(g,[-.38,0,0],[.38,.12,0],M.green,.03);
    o.position.set(sign*.85,-.61,.9);return o;
  });
  const cutaway=M.silicon.clone();cutaway.transparent=true;cutaway.opacity=.25;cutaway.depthWrite=false;
  return rigResult(g,ctx=>{
    const convection=id==='14-load-02',magnet=id==='15-magnetic-01',notLift=id==='15-magnetic-02',oxy=id==='15-magnetic-03';
    let first,second,third,fourth=0;
    if(convection){first=ctx.q('温差和旋转');second=ctx.q('流动');third=ctx.q('改变正在凝固的界面条件');}
    if(magnet){first=ctx.q('能导电');second=ctx.q('磁场');third=ctx.q('抑制某些流动');}
    if(notLift){first=ctx.q('不是把硅吸起来');second=ctx.q('流动与传热');third=ctx.q('帮助控制');}
    if(oxy){first=ctx.q('石英坩埚');second=ctx.q('引入氧');third=ctx.q('进入晶体');fourth=ctx.q('熔体流动');}
    a.setCrystal(1.4);a.heat.visible=false;a.graphite.visible=false;
    if(oxy){a.body.material=cutaway;a.shoulder.material=cutaway;}
    magnets.visible=(magnet||notLift)&&second>0;
    traction.visible=notLift&&first>0;
    const amplitude=magnet?mix(1,.25,third):notLift?.45:1;
    paths.forEach((o,i)=>{o.visible=magnet?false:convection?first>0:oxy?fourth>0:second>0;o.scale.x=amplitude;});
    dampingArrows.forEach(o=>{o.visible=magnet&&second>0;o.scale.y=amplitude;});
    particles.forEach((o,i)=>{
      o.visible=!oxy&&(convection?second:magnet?first:third)>0;
      const p=convection?second:magnet?first:third,angle=i*2.4+p*2;
      o.position.set(Math.sin(angle)*(magnet?1.05:.4+.65*amplitude),
        -.65+(i%3)*.015,Math.cos(angle)*.8);
    });
    hot.forEach((o,i)=>{o.visible=convection?first>0:notLift&&second>0;o.scale.x=convection?1+third*(i%2?.23:-.15):1;});
    oxygen.forEach((o,i)=>{
      o.visible=oxy&&first>0;const angle=i*2.4,r=mix(1.4,.5,second);
      o.position.set(Math.sin(angle)*r,mix(-1.0,-.56+third*(i%4)*.35,second),Math.cos(angle)*r);
      if(i<4&&third>0){
        o.position.x=mix(o.position.x,(i%2?1:-1)*.25,third);
        o.position.z=mix(o.position.z,.25,third);o.position.y=mix(-.65,-.3+i*.28,third);
      }
    });
    wall.visible=oxy;
    return {operation:convection?'thermal-convection-interface':magnet?'conducting-melt-magnetic-damping':notLift?'mechanical-pull-and-magnetic-transport':'wall-oxygen-interface-transport',
      magneticConvectionAmplitude:magnet?amplitude:undefined,mechanicalPull:notLift,
      oxygenSource:oxy?'quartz inner wall':undefined,oxygenTransfer:oxy?second:undefined,
      connectedToMelt:true,solidBottom:-.73,meltSurface:-.73,distributionSchematic:true,noConcentrationMeasurement:true};
  },[oxyTag(a.cup,beat),a.anchor],{semanticPlan:plans[id],view:{eye:[3.5,3.4,10],look:[0,.5,0],span:8.5},
    semanticAnchors:ctx=>localLabels(ctx,[
      {text:id==='15-magnetic-03'?'石英内壁':id==='15-magnetic-01'?'环流幅度示意':'熔体流动示意',
        object:id==='15-magnetic-03'?wall:id==='15-magnetic-01'?dampingArrows[0]:a.anchor,offset:[-120,80],
        phrase:id==='14-load-02'?'流动':id==='15-magnetic-01'?'抑制某些流动':id==='15-magnetic-02'?'流动与传热':'石英坩埚'},
      ...(id==='15-magnetic-02'?[{text:'机械提拉',object:traction,offset:[110,-50],phrase:'不是把硅吸起来'}]:[])])});
}
function oxyTag(cup,beat){return tag(cup,beat.id==='15-magnetic-03'?'氧可来自石英坩埚':'熔体区域');}
function comparison(parent,beat){
  const g=group(parent),rods=[-1,1].map(x=>cyl(g,.45,3.0,M.silicon,[x,0,0]));
  const bands=rods.map((o,j)=>Array.from({length:7},(_,i)=>ring(g,.46,j?M.green:i%2?M.amber:M.green,[o.position.x,-1.3+i*.42,0],.025)));
  const interfaceMark=ring(g,.5,M.amber,[-1,-1.55,0],.02);
  return rigResult(g,ctx=>{
    const a=ctx.q('界面条件不稳定'),b=ctx.q('均匀性'),c=ctx.q('整根晶棒长得稳定');
    interfaceMark.scale.set(1+a*.25,1,1-a*.15);
    bands.forEach((row,j)=>row.forEach((o,i)=>{o.visible=(j?c:b)>0;o.scale.setScalar(j?1:1+(i%2?.18:-.12)*b);}));
    rods[1].material=M.silicon;
    return {operation:'unstable-versus-stable-uniformity',geometryComparative:true,propertyBandsNotMeasurement:true,
      unstableInterface:a,nonuniformPropertyBands:b,uniformComparison:c};
  },[rods[0],rods[1]],{semanticPlan:plans[beat.id],view:{eye:[1.5,1.8,10],look:[0,0,0],span:6.7},
    semanticAnchors:ctx=>[
      ...(ctx.time>=ctx.window('均匀性').start?[{text:'性质不均匀示意',object:rods[0],offset:[-35,-100]}]:[]),
      ...(ctx.time>=ctx.window('整根晶棒长得稳定').start?[{text:'稳定目标示意',object:rods[1],offset:[35,100]}]:[])]});
}
function controlStage(parent,beat){
  const id=beat.id,g=group(parent),isOxygen=id==='16-control-01',isSeg=id==='16-control-02';
  if(isOxygen){
    const slab=box(g,3.4,.8,1.6,M.glass,[0,-.15,0]),surface=box(g,3.4,.045,1.6,M.silicon,[0,.27,0]),
      oxy=dots(g,12,.05,M.green),metals=dots(g,8,.06,M.amber),heat=ring(g,1.45,M.hot,[0,-.2,0],.03),
      cluster=marker(g,[.45,-.25,.2]);
    return rigResult(g,ctx=>{
      const a=ctx.q('氧'),b=ctx.q('热处理'),c=ctx.q('吸杂'),d=ctx.q('按用途控制');
      oxy.forEach((o,i)=>{
        const original=V(Math.sin(i*2.4)*1.4,-.25+(i%3)*.13,Math.cos(i*2.4)*.6),
          target=V(i%2?.55:-.55,-.25+(i%3)*.04,.15+(i%2)*.1);
        o.visible=a>0;o.position.copy(original.lerp(target,b));
      });
      metals.forEach((o,i)=>{o.visible=c>0;o.position.copy(V(Math.sin(i)*1.3,.0,Math.cos(i)*.6).lerp(V(i%2?.55:-.55,-.25,.18),c));});
      heat.visible=b>0&&c<1;surface.material=d>0?M.bright:M.silicon;
      return {operation:'oxygen-precipitation-bulk-gettering',oxygen:a,heatTreatment:b,getter:c,surfaceProtected:d,
        atomicAndSectionScaleSchematic:true,notOxygenAlwaysLowerIsBetter:true};
    },[surface,cluster],{semanticPlan:plans[id],view:{eye:[2,2,10],look:[0,0,0],span:6.7},
      semanticAnchors:ctx=>[
        {text:'表面区域',object:surface,offset:[0,-90]},
        ...(ctx.time>=ctx.window('吸杂').start?[{text:'体内吸杂示意',object:cluster,offset:[0,110]}]:[])]});
  }
  if(isSeg){
    const solid=box(g,2.4,1.2,1.3,M.glass,[0,.8,0]),liquid=box(g,2.4,1.4,1.3,M.liquid,[0,-.7,0]),
      front=box(g,2.45,.035,1.35,M.silver,[0,.1,0]),dopants=dots(g,14,.075,M.amber);
    return rigResult(g,ctx=>{
      const a=ctx.q('固体和液体'),b=ctx.q('剩余熔体'),interfaceY=mix(.1,-.4,b);
      solid.scale.y=(1.4-interfaceY)/1.2;solid.position.y=(1.4+interfaceY)/2;
      liquid.scale.y=(interfaceY+1.4)/1.4;liquid.position.y=(interfaceY-1.4)/2;front.position.y=interfaceY;
      dopants.forEach((o,i)=>{
        o.visible=a>0;const inSolid=i<4+(b>.8?2:0),j=i%7;
        o.position.set((j%3-1)*.58,inSolid?interfaceY+.25+(j%3)*.28:
          interfaceY-.18-(j%3)*Math.max(.14,(interfaceY+1.4)/4),(i%2?1:-1)*.3);
      });
      return {operation:'phase-partition-and-changing-residual-melt',phaseComparison:a,remainingMeltChange:b,
        conservedIllustrativeDopantCount:14,concentrationNotToScale:true,noConcentrationMeasurement:true};
    },[solid,liquid],{semanticPlan:plans[id],view:{eye:[2.5,1.6,10],look:[0,0,0],span:6.8},
      semanticAnchors:[{text:'固体',object:solid,offset:[100,-50]},{text:'剩余熔体',object:liquid,offset:[100,70]}]});
  }
  const rod=cyl(g,.7,3.2,M.silicon,[-.55,0,0]),section=cyl(g,.8,.09,M.silicon,[1.15,-.7,0]),
    axis=Array.from({length:6},(_,i)=>ball(g,.06,M.green,[-.55,-1.3+i*.52,.72])),
    radial=Array.from({length:5},(_,i)=>ball(g,.06,M.amber,[1.15+i*.18,-.62,0])),
    line=dynamicLine(g,M.green,.015),radius=dynamicLine(g,M.amber,.015);
  return rigResult(g,ctx=>{
    const a=ctx.q('沿晶棒长度'),b=ctx.q('沿半径'),c=ctx.q('都需要控制');
    axis.forEach((o,i)=>o.visible=a>i/axis.length);radial.forEach((o,i)=>o.visible=b>i/radial.length);
    line.visible=a>0;setSegment(line,[-.55,-1.3,.73],[-.55,mix(-1.3,1.3,a),.73]);
    radius.visible=b>0;setSegment(radius,[1.15,-.61,0],[1.15+.72*b,-.61,0]);
    return {operation:'axial-and-radial-sampling',axial:a,radial:b,bothChecked:c,measurementsSchematic:true};
  },[rod,section],{semanticPlan:plans[id],view:{eye:[2.2,2.2,10],look:[.25,0,0],span:6.8},
    semanticAnchors:ctx=>[
      ...(ctx.time>=ctx.window('沿晶棒长度').start?[{text:'轴向',object:axis[2],offset:[-100,0]}]:[]),
      ...(ctx.time>=ctx.window('沿半径').start?[{text:'径向',object:radial[2],offset:[60,70]}]:[])]});
}
export function growthRig(key,parent,beat){
  if(!plans[beat.id])throw new Error(`No growth storyboard for ${beat.id}`);
  if(['furnace','distill','siemens'].includes(key))return chemical(parent,beat);
  if(beat.id==='09-feedstock-03')return remelt(parent,beat);
  if(beat.id.startsWith('10-melt'))return meltStage(parent,beat);
  if(beat.id.startsWith('11-seed'))return seedStage(parent,beat);
  if(key==='neck')return neckStage(parent,beat);
  if(beat.id.startsWith('13-growth')||beat.id==='14-load-01')return growthStage(parent,beat);
  if(beat.id==='14-load-03')return comparison(parent,beat);
  if(beat.id.startsWith('16-control'))return controlStage(parent,beat);
  return flowStage(parent,beat);
}
