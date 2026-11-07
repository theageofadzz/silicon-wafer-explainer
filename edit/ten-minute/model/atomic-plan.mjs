const action=(phrase,seconds,object,change,fact)=>({phrase,seconds,lead:0,object,action:change,fact});

// Each entry is a spoken fact, a named scene object, and its own word-timed action.
export const atomicPlans={
  '02-purity-01':{visual:'purity',actions:[
    action('百分之九十九',.65,'hundred-unit-grid','显出99个硅示意单位和1个异类单位','99%用100份中的99份表达，球数不是原子实测。'),
    action('一百份',.7,'count-bracket','按十行展开计数框','分母是100份，不能把一个球解释为真实杂质浓度。'),
    action('一份别的东西',.65,'impurity-unit','把唯一异类单位移出原平面并连回原位','仍有一份非硅成分。'),
  ]},
  '02-purity-02':{visual:'purity',actions:[
    action('十个',.5,'purity-notation','显出十个纯度位示意格','纯度位表示法与杂质相对量比较分开。'),
    action('十一个九',.5,'purity-extra-place','在第二行显出第十一个示意格','再增加一个九对应更小的残余份额。'),
    action('每多一个九',.65,'tenfold-benchmark','固定十格基准并建立上下比较关系','比较的基准不能和残余条一起缩小。'),
    action('剩余杂质',.95,'tenfold-remainder','下排从十格收缩至一格，保留空格导轨','每增加一个九，残余杂质相对量降至十分之一。'),
  ]},
  '02-purity-03':{visual:'doping',actions:[
    action('高纯原料',.6,'feedstock-lattice','显出未掺杂的硅晶格','原料纯度不是后续产品全部成分的同义词。'),
    action('有意加入',1.05,'controlled-dopant','异类原子进入指定替位位置，原硅原子移出','替位掺杂为原子尺度示意，不是污染。'),
    action('失控的污染',.65,'surface-contaminants','另一表面接收随机分布的外来颗粒','表面污染和受控晶格掺杂属于不同对象。'),
    action('分开理解',.55,'composition-comparison','把替位晶格和受污染表面分成两条明确支路','两个概念不能共用同一粒杂质的动画。'),
  ]},
  '03-order-01':{visual:'grains',actions:[
    action('全是硅',.6,'polycrystal','显出同色硅原子的多个区域','元素相同不能保证晶体取向相同。'),
    action('各排各的',.8,'grain-networks','分别接通已有不同取向的晶格键','晶粒取向保持不同，不在固态自行转正。'),
    action('交界处',.65,'grain-boundaries','沿相邻晶粒之间建立可见边界','晶界来自取向不同区域的交界。'),
  ]},
  '03-order-02':{visual:'lattice',actions:[
    action('同一套晶格取向',1.15,'continuous-lattice','沿同一金刚石晶格继续出现新位点','连续单晶始终使用同一取向。'),
    action('连续的网',.8,'cross-region-bonds','接通跨越概念分区的真实近邻键','分区是观察方法，晶格本身连续。'),
    action('而不是',.7,'misoriented-comparison','显出另一组互不相容的独立小晶粒','比较对象不是主晶格的一部分。'),
    action('不同方向',.55,'unmatched-edges','将比较晶粒靠近但保留不匹配的边缘','拼在一起不会自动成为单晶。'),
  ]},
  '04-quartz-01':{visual:'silica',actions:[
    action('透明',.65,'clear-quartz','透明石英标本从石英轮廓中显出透光内部','外观不是纯度或晶体成分测量。'),
    action('乳白',.65,'milky-quartz','显出乳白外观的第二块石英标本','不同外观仍可具有相同主要化学组成。'),
    action('主要成分',.8,'silica-network','在标本下方展开局部Si-O四面体网络','这是延续的二氧化硅网络，不是孤立三原子分子。'),
  ]},
  '04-quartz-02':{visual:'silica',actions:[
    action('硅与氧结合在一起',.95,'silicon-oxygen-bonds','逐条接通局部四配位Si-O键','氧是化学结合的组成部分。'),
    action('单质硅',.75,'silicon-product','建立独立的单质硅产物位置','单质硅和二氧化硅是不同物质。'),
    action('化学反应',1.1,'reductant-carbon','引入碳，断开受反应影响的Si-O键并转移氧','示意总还原过程，不宣称展示真实基元反应路径。'),
    action('把它们分开',.65,'carbon-monoxide-products','含氧CO产物离开，硅保留于产物区','不是洗水或无能量的自行解离。'),
  ]},
  '04-quartz-03':{visual:'silica',actions:[
    action('洗得再干净',.85,'wash-water','水流经过沙粒表面','清洗针对外来的表面污染。'),
    action('不能直接做芯片',.65,'retained-silica-network','展开沙粒内部仍存在的Si-O网络','去污后的沙粒仍是二氧化硅。'),
    action('洗掉泥土',.75,'external-dirt','只把外部泥土带到排水方向','水流不带走网络中化学结合的氧。'),
    action('并没有改变物质',.75,'unchanged-si-o-bonds','沿未断开的Si-O键显示完整的连接关系','清洗没有完成化学还原。'),
  ]},
  '05-furnace-03':{visual:'purity',actions:[
    action('工业硅',.75,'metallurgical-silicon','从炉后产物位置显出银色不规则硅块','还原得到硅，不等于完成电子级提纯。'),
    action('百分之九十八',.7,'ninety-eight-case','展开98份与2份异类的固定比较案例','98%是口播范围的一端，格数为比例示意。'),
    action('九十九',.6,'ninety-nine-case','另展99份与1份异类的独立案例','不是把98%案例动画成一次已知提纯测量。'),
    action('不够纯',.6,'remaining-impurities','把两个案例仍保留的异类单位同时指出','即使99%也未达到电子级原料要求。'),
  ]},
  '09-feedstock-02':{visual:'grains',actions:[
    action('很纯',.65,'pure-feedstock-grains','让同材质的多块硅料显出内部硅原子','化学纯度提高不消除多晶结构。'),
    action('取向不同的晶粒',.9,'different-orientations','逐块显出方向不同且不旋转的晶格键','现有晶粒的取向保持不同。'),
    action('打散原来的排列',1.0,'disordered-melt-atoms','先断开固体晶格键，再让原子进入无序熔体位置','重新建立取向必须先破坏旧固体排列。'),
    action('再重新建立',.65,'new-crystal-nucleus','在独立位置出现有序新晶核和少量凝固位点','不把原固体晶粒直接旋转对齐；后续直拉段解释取向来源。'),
  ]},
  '10-melt-03':{visual:'doping',actions:[
    action('加入极少量',1.0,'dopant-feed','少量示意掺杂原子从计量口进入熔体','以硼或磷为例，不把可见球数当配方。'),
    action('调节电阻率',.85,'carrier-transport','在独立固态示意区增加载流子输运路径','电学性质为定性示意，没有测量值或通用浓度曲线。'),
    action('加入多少',.65,'dose-control','计量口闭合，保留明确的少量加入边界','加入总量需要受控。'),
    action('分布怎样',.85,'melt-distribution','掺杂示意粒子在熔体中输运至多个位置','分布也要受控，不宣称已经完美均匀。'),
  ]},
  '17-defects-01':{visual:'defects',actions:[
    action('少一个原子',.8,'vacancy-site','一个实际硅原子离开常规晶格位点','初始晶格完整，之后才产生空位。'),
    action('形成空位',.55,'vacancy-halo','标出已经失去原子的空位','空位不是另一个特殊颜色的原子。'),
    action('多一个原子',.65,'incoming-interstitial','另一个原子从晶格外进入局部','额外原子与原正常位点原子区分。'),
    action('挤进正常位置之间',.65,'interstitial-site','额外原子进入经核对未占用的间隙位置','间隙原子不占据普通替位位点。'),
  ]},
  '17-defects-02':{visual:'defects',actions:[
    action('冷却',.55,'thermal-state','降低原子热位移幅度并改变热区指示','这里只示意冷却，不模拟真实扩散速率。'),
    action('可能聚集',1.1,'defect-cluster','通过邻位原子交换使空位靠近，另让间隙原子靠近','展示一种可能的聚集，不把点缺陷画成位错线。'),
    action('生长速度',.65,'growth-rate-control','改变独立生长界面示意的推进距离','速度是需配合控制的工艺量。'),
    action('温度梯度',.65,'temperature-gradient','在固定高度的热区标尺上改变空间梯度','温度梯度和生长速度不是同一动作。'),
    action('后续热过程',.7,'thermal-treatment','热处理范围包围缺陷区域但不抹除已有缺陷','后续热过程参与控制，不保证缺陷自动消失。'),
  ]},
  '17-defects-03':{visual:'lattice',actions:[
    action('取向',.65,'common-orientation','同时显出两块晶格平行的取向参照','单晶描述连续取向。'),
    action('低缺陷',.75,'quality-comparison','展开取向相同、示意缺陷数不同的独立样本','缺陷指标与取向指标分别比较。'),
    action('不能把单晶',.8,'single-crystal-defects','指出单晶样本中的空位和额外间隙原子','同一取向可以与点缺陷同时存在。'),
    action('绝对完美',.5,'residual-vacancy','在较低缺陷样本中仍保留并指出一个空位','低缺陷也不等于绝对无缺陷；数量是示意。'),
  ]},
  '24-epitaxy-01':{visual:'epitaxy',actions:[
    action('受控条件',.75,'epitaxy-environment','显出简化供气口与受控加热区','不是给所有硅片粘贴一张膜。'),
    action('气相原料',.95,'gas-feed-atoms','气相原料中的硅示意原子抵达衬底表面','原料到表面后才形成固体位点。'),
    action('硅片表面',.6,'surface-incorporation','第一组原子进入与衬底相容的位置并形成界面键','新层和衬底保持连接。'),
    action('形成新的单晶层',.6,'epitaxial-growth','从界面逐级生成相干原子层','同一金刚石网络连续生长，没有悬空膜片。'),
  ]},
  '24-epitaxy-02':{visual:'epitaxy',actions:[
    action('延续下面的晶格取向',1.0,'coherent-interface','沿跨界面近邻键逐条连接上下晶格','新层与白色衬底使用同一取向。'),
    action('厚度',.7,'layer-thickness','增加完整外延原子层并同步延长厚度括号','原子图层厚是放大示意。'),
    action('电阻率',.7,'epilayer-electrical-control','仅在新层显出受控替位位点与输运示意','不修改衬底、不展示虚构测量值。'),
  ]},
  '24-epitaxy-03':{visual:'epitaxy',actions:[
    action('不是贴一层膜',.75,'bonded-interface','强调已有新层与衬底之间的真实相干键','外延图解中不存在脱离衬底的整片膜。'),
    action('抛光片',.6,'polished-product','显出无新增外延层的抛光片及其原子局部','抛光片本身就是一种产品路线。'),
    action('外延片',.6,'epitaxial-product','另显出带相干新层的外延片及原子局部','这是另一种按需求加工的产品。'),
    action('不同的使用要求',.75,'product-routes','两个产品分别接入独立的输出路径','用途不同，不能把两者排列成强制先后步骤。'),
    action('并非必经步骤',.65,'direct-polished-route','接通抛光片的直接输出路径，保留外延支路','外延是可选工序。'),
  ]},
};

export function atomicWindow(beat,phrase){
  const words=beat.words||[],text=words.map(w=>w.text).join('');
  const start=text.indexOf(phrase);
  if(start<0)throw new Error(`Missing word-timed phrase "${phrase}" in ${beat.id}`);
  let cursor=0,first,last;
  for(const word of words){
    const next=cursor+word.text.length;
    if(cursor<start+phrase.length&&next>start){first??=word;last=word;}
    cursor=next;
  }
  if(!first||!last||!Number.isFinite(first.start)||!Number.isFinite(last.end))
    throw new Error(`Invalid word timing for "${phrase}" in ${beat.id}`);
  return {start:first.start,end:last.end};
}

export function atomicPlanFor(beat){
  const definition=atomicPlans[beat?.id];
  if(!definition)throw new Error(`No atomic semantic plan for ${beat?.id}`);
  if(definition.visual!==beat.visual)throw new Error(`Atomic visual mismatch for ${beat.id}`);
  return definition.actions.map(entry=>{atomicWindow(beat,entry.phrase);return {...entry};});
}
