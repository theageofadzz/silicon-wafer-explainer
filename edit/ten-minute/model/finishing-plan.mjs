const step=(phrase,seconds,object,action,fact)=>({phrase,seconds,lead:0,object,action,fact});
export const finishingPlans={
  '01-start-01':[
    step('一片薄薄的硅',.65,'blank wafer','tilt to expose its thin edge','The starting substrate has no device pattern.'),
    step('表面亮得像镜子',.5,'polished face','change the reflection angle','Mirror reflection describes the surface, not completed circuitry.'),
  ],
  '01-start-02':[
    step('三百毫米',.8,'diameter dimension','extend across the wafer','The illustrated wafer diameter is 300 mm.'),
    step('餐盘',.55,'plate outline','show a separate approximate size reference','The comparison concerns diameter, not wafer thickness.'),
    step('厚度',.75,'magnified edge section','reveal a separate thickness dimension','The 0.775 mm section is magnified, not drawn at physical aspect ratio.'),
  ],
  '01-start-03':[
    step('杂质',.55,'impurity atom','isolate the colored inclusion','Impurity content is one independent material control.'),
    step('原子的排列',.75,'diamond lattice','reveal coherent nearest-neighbour bonds','Crystal arrangement is distinct from purity.'),
    step('表面的高低',.65,'fixed surface profile','move a height probe','Surface geometry is a third independent control.'),
    step('控制',.6,'three measuring references','reveal limits around the three objects','Control does not imply a perfectly flat or absolutely pure material.'),
  ],
  '03-order-03':[
    step('从石头中取出硅',.85,'quartz and silicon','connect the mineral to the silicon output','Silicon must first be chemically extracted.'),
    step('提纯',.6,'feedstock with foreign particles','route foreign particles to a separate collector','Purification changes composition.'),
    step('长成单晶',.7,'coherent crystal rod','extend one crystal orientation','Crystal growth establishes order.'),
    step('加工表面',.6,'wafer and finishing pad','move the pad over a separate wafer','Surface processing follows bulk material production.'),
    step('石英开始',.55,'quartz specimen','bring attention back to the mineral','The next explanation starts with quartz.'),
  ],
  '18-trim-01':[
    step('切去',1.2,'seed and tail offcuts','cut and separate both ends','Nonconforming ends are discarded.'),
    step('外圆加工',1.1,'retained cylinder and grinding wheel','reduce the outer radius under tool contact','The retained rod is ground to its target diameter.'),
    step('材料也在这里损耗',.65,'offcuts and grinding debris','collect removed material below the rod','Trimming and cylindrical grinding consume feedstock.'),
  ],
  '18-trim-02':[
    step('确定晶向',.75,'end-face direction arrow','reveal a geometric orientation reference','A known crystal direction precedes the locating feature.'),
    step('制作定位缺口',1.1,'axial V groove','advance a grinding wheel along the rod','The recess is a real removed-volume feature.'),
    step('晶格方向',.7,'direction arrow and groove floor','connect the reference to the groove','The groove represents a prescribed orientation relationship, not an invented Miller index.'),
    step('识别参照',.4,'locating probe','approach the existing groove without cutting','Equipment can use the feature as an orientation reference.'),
  ],
  '18-trim-03':[
    step('送向',.9,'intact rod','feed toward the stationary wire web','Feed motion brings the rod into the cutting web.'),
    step('运动的线网',.85,'parallel wires','translate wire contact indicators together','Many parallel wires run at once.'),
    step('同时加工许多平行切面',1.05,'parallel cut fronts','advance all cut fronts together','Multiwire slicing produces parallel sections simultaneously.'),
  ],
  '19-slice-01':[
    step('金刚线',.75,'magnified abrasive wire','move visible abrasive grains along the wire','Cutting is abrasive material removal.'),
    step('逐步去除硅',1.1,'contact groove','deepen a local cut and release chips','Silicon is removed along the wire path.'),
    step('线径',.55,'wire diameter bracket','reveal its enlarged dimension','The wire is exaggerated for readability.'),
    step('片间距',.55,'adjacent slices and gap bracket','reveal the enlarged pitch','Section spacing is schematic, not a manufacturing scale measurement.'),
  ],
  '19-slice-02':[
    step('切口',.65,'alternating solid and kerf strips','identify the kerf volumes','Each cut occupies material that cannot become a wafer.'),
    step('消耗材料',.85,'kerf strips','carry removed material into a loss tray','Kerf is consumed silicon.'),
    step('切缝损耗',.65,'surviving sections','separate the remaining slices','Product volume excludes the removed gaps.'),
    step('原料用量',.7,'original-volume bracket','span both product and collected loss','Feedstock accounting includes product and loss.'),
  ],
  '19-slice-03':[
    step('不够平',.65,'as-sawn profile and straight reference','reveal the mismatch without changing the surface','The slice is not sufficiently flat.'),
    step('锯痕',.6,'fixed saw grooves','highlight existing grooves','Saw marks remain after slicing.'),
    step('受损层',.6,'subsurface damage layer','expose a magnified cutaway','Mechanical damage lies below the visible face.'),
    step('继续加工',.6,'outgoing process arrow','indicate a later operation','Diagnosis does not itself remove damage or flatten the wafer.'),
  ],
  '20-edge-01':[
    step('崩缺',.65,'sharp-edge comparison specimen','detach a small shard','A brittle sharp edge is vulnerable to chipping.'),
    step('颗粒',.5,'detached fragments','separate visible particles','Edge damage can release contamination.'),
    step('加工成圆滑轮廓',1.0,'independent production edge and wheel','remove sharp corners under wheel contact','Rounding reduces edge risk; a broken edge is not magically repaired.'),
  ],
  '20-edge-02':[
    step('两面更平行',.9,'top and bottom surfaces with opposed plates','remove a wedge error from both faces','Lapping controls parallelism.'),
    step('厚度接近目标',.85,'thickness dimension','move both faces toward the target separation','Thickness is a geometric quantity.'),
    step('整片几何',.75,'whole-wafer outline','show the full section inside geometric references','The objective is not merely a shiny front face.'),
  ],
  '20-edge-03':[
    step('留下损伤',.65,'subsurface cracks','highlight the pre-existing damaged layer','Mechanical processing can leave subsurface damage.'),
    step('化学蚀刻',.75,'etch bath','bring reagent to both faces','Etching is a chemical removal operation.'),
    step('移除一定材料',1.05,'damaged surface shells','remove both shells uniformly','Etching removes material rather than pressing the sample flat.'),
    step('去掉受损层',.65,'remaining crystalline substrate','show the removed layer in the bath','The removed depth includes the damaged region.'),
  ],
  '21-polish-01':[
    step('抛光垫',.55,'polishing pad','bring the pad into contact','The pad provides mechanical contact.'),
    step('抛光液',.65,'liquid feed','supply liquid to the contact','Slurry participates in polishing.'),
    step('化学作用',.75,'thin surface reaction zone','change the surface reaction layer','Chemical action modifies the contact surface.'),
    step('移走材料',.85,'reaction-zone fragments','transport material away with pad motion','CMP combines reaction and mechanical removal.'),
  ],
  '21-polish-02':[
    step('突起逐渐被削低',1.2,'magnified asperities','remove peaks under a moving pad','High spots are reduced during polishing.'),
    step('压力',.55,'normal-force arrow','bring the load arrow onto the pad','Pressure is a process variable.'),
    step('运动',.65,'pad','translate the pad across the section','Relative motion contributes to removal.'),
    step('供液',.7,'slurry nozzle','feed liquid into the contact','Supply conditions affect the result.'),
  ],
  '21-polish-03':[
    step('双面抛光',.8,'two polishing pads','show treatment on both faces','Both sides may be polished.'),
    step('精抛',.7,'fine polishing tool','make a separate final pass','Fine polishing is a further product-dependent step.'),
    step('镜面反光',.65,'separate polished wafer','change the reflection angle','Appearance alone is insufficient evidence of flatness.'),
    step('实际测量',.65,'noncontact gauge','move the gauge over the unchanged polished surface','Flatness must be measured.'),
  ],
  '22-flatness-01':[
    step('整片翘曲',.7,'fixed bowed wafer','show a whole-wafer reference','Global shape is a large-scale geometric property.'),
    step('局部平坦度',.65,'fixed local patch','frame a smaller inspection area','Local flatness uses a different spatial scale.'),
    step('微观粗糙度',.65,'fixed roughness section','reveal the magnified small-scale profile','Roughness is not interchangeable with bow or local flatness.'),
  ],
  '22-flatness-02':[
    step('光刻需要清楚成像',.75,'lens and fixed focal plane','reveal the optical reference','The optical system has a reference focal plane.'),
    step('有些地方高',.6,'high point on the fixed surface','move the optical probe to a high point','Height changes defocus at fixed optical settings.'),
    step('有些地方低',.6,'low point on the same surface','move the probe to a low point','The surface is not flattened by measurement.'),
    step('同时处在合适的焦点',.6,'two local focus-error segments','compare both heights against one plane','Different heights cannot all coincide with the same plane.'),
  ],
  '22-flatness-03':[
    step('容许多少起伏',.7,'unchanged surface profile','show a qualitative tolerance envelope','Allowable variation is a specification.'),
    step('器件和产品规格',.9,'two independent specification windows','show different envelopes around identical profiles','Different requirements can set different tolerances.'),
    step('下一阶段的加工',.8,'downstream optical fixture','connect the specification to a later process','Flatness serves downstream processing.'),
  ],
  '23-clean-01':[
    step('磨粒',.5,'abrasive grains','identify loose solid particles','Particles are one contamination category.'),
    step('有机残留',.6,'surface film','identify a different film-like residue','Organic residue differs from abrasive grains.'),
    step('金属污染',.6,'metal contaminant sites','identify isolated contaminant sites','Metal contamination is a distinct category.'),
    step('清洗',.8,'three treatment paths','route particles, film and ions differently','Cleaning requires differentiated treatment.'),
    step('分别解决',.5,'three output collectors','keep the removal routes separate','One generic spray does not explain all contaminants.'),
  ],
  '23-clean-02':[
    step('高纯水漂洗',.9,'wafer and rinse stream','wash remaining soluble residue into a drain','Rinsing follows treatment.'),
    step('干燥',.8,'surface liquid film','spin and remove the liquid film','Drying removes water after rinsing.'),
    step('去掉旧污染',.65,'drain collector','retain the removed residue outside the wafer','Old contamination leaves with the rinse.'),
    step('避免新的残留',.5,'clean surface and drain boundary','separate clean output from used rinse','New residue must be avoided.'),
  ],
  '23-clean-03':[
    step('夹具',.65,'edge grippers','close onto wafer edge only','Fixtures should preserve the clean face.'),
    step('空气',.6,'filtered airflow paths','show downward clean-air flow','The environment affects cleanliness.'),
    step('包装',.6,'protective enclosure','bring an enclosure around the handling path','Packaging contributes to protection.'),
    step('每一次接触',.9,'gripped wafer','transfer on edge supports without touching its face','Handling differs from washing.'),
    step('清洁表面能否保住',.65,'protected wafer face','retain the uncontaminated surface','Cleanliness must survive every subsequent contact.'),
  ],
  '25-inspect-01':[
    step('颗粒',.55,'particle inspection specimen','reveal the particle detector','Particles require a corresponding inspection method.'),
    step('缺陷',.55,'defect cutaway','reveal a distinct defect target','Defects are not merely brightness.'),
    step('厚度',.55,'opposed gauge heads','bracket the section thickness','Thickness is measured geometrically.'),
    step('平整度',.55,'fixed surface and height reference','reveal a reference-plane comparison','Flatness is a separate measurement.'),
    step('电学性质',.65,'four-contact electrical probe','lower contacts onto an independent specimen','Electrical properties use a different instrument.'),
  ],
  '25-inspect-02':[
    step('扫描表面',1.15,'light spot and detector','sweep together toward an existing particle','The probe follows the illuminated position.'),
    step('异常散射',.7,'particle and off-axis detector','show light scattered away from specular reflection','Abnormal scattering may indicate a surface anomaly.'),
    step('关联运动',.75,'probe and illuminated spot','move both along the same path','Their positions remain physically linked.'),
    step('覆盖检查区域',.5,'scan trajectory','finish the coverage path','Coverage is a scan operation, not proof of every quality metric.'),
  ],
  '25-inspect-03':[
    step('厚不厚',.55,'opposed thickness probes','bracket the fixed section','Thickness measurement does not alter thickness.'),
    step('平不平',.6,'local fixed profile and reference','sample local heights','Flatness measurement does not flatten the surface.'),
    step('有没有翘曲',.65,'bowed wafer and global reference','compare the global shape','Bow is a whole-wafer quantity.'),
    step('颗粒检查',.6,'separate optical particle specimen','show a separate measurement path','Geometry and particles are different tasks.'),
  ],
  '26-shipping-01':[
    step('身份记录',.6,'wafer identity token','associate a geometric token with the wafer','An identity record belongs to the material.'),
    step('追溯到晶棒',.75,'wafer-to-rod connector','connect the wafer to its source rod','Traceability is not another machining operation.'),
    step('批次',.65,'batch records','connect the source rod to its batch','Identity includes lot context.'),
    step('回查原料',.7,'feedstock record','trace a reverse path to incoming material','Records support investigation.'),
    step('加工环节',.5,'processing record','highlight the linked process station','Process history can also be checked.'),
  ],
  '26-shipping-02':[
    step('专用运输盒',.8,'slotted clean transport enclosure','show wafers already supported in separate slots','A transport box protects material during delivery.'),
    step('保护硅片',.85,'front cover','close around supported wafers','The enclosure limits exposure.'),
    step('减少颗粒和接触污染',.8,'outside particles and edge supports','block particles outside the closed box','Protection concerns both environment and contact.'),
    step('送往后续工厂',.45,'sealed box and cart','move the closed container toward the receiving station','Transport preserves a qualified input.'),
  ],
  '26-shipping-03':[
    step('材料起点',.65,'blank wafer','present the unpatterned input','Wafer preparation finishes before device patterning starts.'),
    step('光刻',.65,'separate magnified device section and mask','expose a patterned resist mask','Device processing begins only at this spoken word.'),
    step('刻蚀',.6,'exposed section channels','remove selected material below openings','Etching transfers a pattern.'),
    step('沉积',.55,'conformal layer','add a distinct new layer','Deposition adds material.'),
    step('互连',.65,'metal tracks','bridge the processed structures','Interconnect belongs to later device fabrication.'),
  ],
  '27-industry-01':[
    step('样品',.65,'single sample wafer','present one sample','One successful specimen is not continuous production.'),
    step('持续量产',1.0,'three repeated wafer batches','reveal multiple batches over the output path','Production requires repeated output.'),
    step('每批都稳定',.8,'batch comparison gauges','align equal measurement references','Batch consistency is required.'),
    step('适配自己的工艺',.6,'customer receiving fixture','bring the specified fixture to an unchanged wafer','Process compatibility is a separate requirement.'),
  ],
  '27-industry-02':[
    step('信越',.5,'equal-area supplier station 1','reveal its wafer output','Supplier examples are not a market-share chart.'),
    step('胜高',.5,'equal-area supplier station 2','reveal its wafer output','All supplier symbols use equal scale.'),
    step('环球晶圆',.6,'equal-area supplier station 3','reveal its wafer output','The station identifies a supplier example.'),
    step('世创',.5,'equal-area supplier station 4','reveal its wafer output','The station identifies a supplier example.'),
    step('爱思开矽特隆',.65,'equal-area supplier station 5','reveal its wafer output','The station identifies a supplier example.'),
    step('国内也在发展',.55,'equal-area domestic-development station','reveal a separate development example','No visual area encodes capacity or share.'),
  ],
  '27-industry-03':[
    step('厂房和规划产能',.8,'unfilled factory outline','show planned capacity without completed output','Buildings and plans alone do not prove production ability.'),
    step('量产质量',.75,'quality gauge and material','show a measured output','Quality is one production condition.'),
    step('客户验证',.7,'customer validation fixture','check a distinct receiving interface','Customer qualification is another condition.'),
    step('稳定交付',.8,'repeated sealed deliveries','place consistent shipments on the delivery path','Delivery must be repeatable.'),
    step('共同决定生产能力',.7,'three converging paths','connect all three completed conditions','The conditions work together.'),
  ],
  '28-recap-01':[
    step('还原',.7,'silicon-oxygen and carbon schematic','carry oxygen away with carbon','Reduction produces elemental silicon.'),
    step('转化',.6,'chlorosilane schematic','form a different chemical carrier','Chemical conversion enables a separation route.'),
    step('分离',.5,'separate collectors','route unlike components apart','Separation lowers unwanted components.'),
    step('沉积',.65,'silicon deposition core','add silicon onto the core','Deposition returns purified silicon to solid feedstock.'),
    step('降低不需要的杂质',.65,'foreign-particle collector','retain foreign particles away from feedstock','Purification concerns unwanted species.'),
  ],
  '28-recap-02':[
    step('籽晶建立取向',.75,'seed and growing coherent lattice','extend the same orientation from the seed','A seed supplies crystal orientation.'),
    step('生长与缺陷',.65,'growth interface and defect indicator','show controlled growth beside an explicit defect target','Orientation and defect control are different requirements.'),
    step('切磨抛',.7,'rod, cut slices and finishing contact','show the sequential material forms','Mechanical and surface processing produce wafers.'),
    step('清洗',.55,'separate rinse path','remove surface residue','Cleaning follows processing.'),
    step('检测',.5,'measurement instrument','check the cleaned output','Inspection is a distinct operation.'),
    step('得到合格硅片',.4,'finished wafer','move the qualified material to the output','The output follows the preceding process steps.'),
  ],
  '28-recap-03':[
    step('一整条精密制造链',1.05,'material-processing chain','reveal connected upstream material stations','The mirror face is the output of a manufacturing chain.'),
    step('计算世界',.9,'separate computing devices','reveal a downstream computing-system schematic','Computing is a subsequent use of the material.'),
    step('材料上开始搭建',.75,'device-system connection','connect material output to downstream devices','Material preparation is the foundation, not finished circuitry.'),
  ],
};

export function phraseWindow(beat,phrase){
  const normalize=text=>text.replace(/[\s、，。！？；：,.!?;:“”「」]/gu,'');
  const wanted=normalize(phrase),words=beat.words;
  const joined=words.map(w=>normalize(w.text)).join(''),index=joined.indexOf(wanted);
  if(index<0)throw new Error(`Missing real word phrase ${beat.id}: ${phrase}`);
  let cursor=0;
  const selected=words.filter(w=>{
    const start=cursor;cursor+=normalize(w.text).length;
    return cursor>index&&start<index+wanted.length;
  });
  return {start:selected[0].start,end:selected.at(-1).end};
}

export function finishingPlan(beat){
  const plan=finishingPlans[beat.id];
  if(!plan)throw new Error(`No independent finishing semantic plan: ${beat.id}`);
  return plan.map(entry=>({...entry}));
}
