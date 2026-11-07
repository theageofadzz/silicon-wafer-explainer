# Late36 最终编码语义复核

2026-11-07。**最终冻结编码复核完成：36/36 个 beat、149 个 semanticPlan 事件；旧P1摄影遮盖和旧P2漂洗标注均已在最终连续编码帧中确认关闭。未发现新增实质P1/P2问题，没有要求修改晚段模型的阻断项。** 本结论绑定下列最终MP4与时间轴，已重新查看全部晚段关键词图，并非仅替换报告中的SHA。

本审片者检查的是335.875–598.000s的编码画面与既有实际词事件对应。未自行进行正常速度带声完整观看；父任务告知的598秒1x播放、样段播放及full verify/OCR完成情况，属于父任务验收记录，不冒充本审片者的听看经历。

## 两项旧发现的关闭依据

### 已关闭｜26-shipping-03：摄影遮住工艺步骤的P1

台词：“光刻、刻蚀、沉积和互连，属于接下来的器件制造。”

此前编码 `fbe845ac…` 和 `d5028326…` 在546.625–548.666667s用同一次图案片照片盖住前三阶段。最终编码 `48767303…` 的整段543.583–552.708s已呈现代码画面：上方保留空白片作为材料起点，下方展开后续器件制造；没有图案片摄影截断工序。

|词事件|实际词时间（s）|最终编码中的可见变化与证据|
|---|---:|---|
|光刻|546.595750–547.172449|透镜/光束及表面条带在词附近出现，形成独立曝光示意。F13125 / 546.875s、F13134 / 547.250s可见；不再是成品图案片照片。|
|刻蚀|547.426191–548.060564|条带之间的硅材料被逐步移除，形成沟槽；与上一阶段保持同一截面。F13146 / 547.750s、F13153 / 548.041667s可见。|
|沉积|548.279717–548.741068|沟槽表面出现并扩展白色覆盖层；层的增加可在连续帧中辨认。F13164 / 548.500s、F13172 / 548.833333s可见。|
|互连|548.867918–549.363856|新的横向连接跨过已加工结构。对照F13172的覆层与F13189 / 549.541667s的横连，能读出独立的连接阶段；随后保持供“接下来的器件制造”读取。|

实际查看了546.500–550.500s的**96张连续编码帧**，分4张一秒拼图，每张24帧；没有用assembly声明代替观看。assembly将本beat记录为F13046–F13265（右端不含）的一段 `exact-code`，与实际编码相符。该旧P1关闭。

最终证据：[第一秒](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-late-final-487673030d60029b/shipping-546500-01.jpg)、[第二秒](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-late-final-487673030d60029b/shipping-546500-02.jpg)、[第三秒](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-late-final-487673030d60029b/shipping-546500-03.jpg)、[第四秒](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-late-final-487673030d60029b/shipping-546500-04.jpg)；原尺寸对照：[覆层F13172](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/frames/frame-013172.jpg)、[横连F13189](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/frames/frame-013189.jpg)。

### 已关闭｜23-clean-02：干燥阶段漂洗标注未退场的P2

台词：“用高纯水漂洗并干燥。去掉旧污染，也要避免新的残留。”

最终编码在473.258661–474.296711s的“高纯水漂洗”附近保留喷嘴、液流、片面液膜及漂洗标注。474.458191–474.815736s的“干燥”附近，喷嘴/液流和漂洗标注退出，气流箭头及“干燥”引线出现；引线终点明确落在中央气流箭头上。随后液膜消失形成干片，片外残留收集区与保护边界依次出现。477.500s原缺陷帧位仅有干燥标注，不再有两种工序标注指向同一片面。

实际查看了473.250–478.250s的**120张连续编码帧**，包含漂洗、切换、干燥完成和后续读取；还对照最终词中/结束帧与原尺寸图。漂洗标签没有在后续停留中回现。该旧P2关闭，原基线“无干燥动作”的P1也未复发。

最终证据：[漂洗](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-late-final-487673030d60029b/drying-473250-01.jpg)、[切换至干燥](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-late-final-487673030d60029b/drying-473250-02.jpg)、[干燥完成](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-late-final-487673030d60029b/drying-473250-03.jpg)、[旧污染与保护边界](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-late-final-487673030d60029b/drying-473250-04.jpg)、[末段保持](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-late-final-487673030d60029b/drying-473250-05.jpg)；原尺寸：[干燥词中F11391 / 474.625s](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/frames/frame-011391.jpg)、[原缺陷帧位F11460 / 477.500s](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/frames/frame-011460.jpg)。

## 缺陷控制标签专项

`17-defects-02` 的“生长速度”344.660385–345.456195s、“温度梯度”345.802240–346.609594s、“后续热过程”346.724942–347.843712s已在最终关键词图与342.750–348.750s的**144张连续编码帧**中重核。

“生长速度示意”对应下方生长指示对象，“温度梯度示意”指向独立的空间色带，“热过程示意”与包围晶格的作用区域关联；三项在各自词附近建立，之后共同保留供“配合控制”读取。没有把三个控制量都标在同一个缺陷原子上，也没有用标签覆盖字幕来代替对象变化。它们是定性示意，不是具体工艺设定值。未发现须追加修正的实质问题。

最终证据：[冷却](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-late-final-487673030d60029b/controls-342750-01.jpg)、[聚集与引入速度项](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-late-final-487673030d60029b/controls-342750-02.jpg)、[速度项](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-late-final-487673030d60029b/controls-342750-03.jpg)、[梯度项](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-late-final-487673030d60029b/controls-342750-04.jpg)、[热过程项](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-late-final-487673030d60029b/controls-342750-05.jpg)、[协同读取](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-late-final-487673030d60029b/controls-342750-06.jpg)；[原尺寸F8339 / 347.458333s](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/frames/frame-008339.jpg)。

## 最终证据身份与方法

- 成片：[silicon-wafer-10min-9x16-v3.mp4](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/silicon-wafer-10min-9x16-v3.mp4)。SHA-256 **`487673030d60029b17023333bab1e1cabfe53fa98820e29c5a023288f0c4e0cf`**；33681599 bytes；1080×1920、24fps、14352帧、598.000s。已实际计算哈希并读取编码参数。
- 时间轴SHA-256：**`508552f1cb812834cc75300d13c30ed0f11405381c7cf1a7d0459c38df111cdf`**。`full-assembly.json`、`semantic-encoded.json`均绑定上述成片和时间轴；晚段36个beat的assembly输出偏移均为0。词时间据新版清单核对，未套用平均时长。
- 主证据目录：`output/review-full/semantic-encoded-487673030d60029b/`。父清单全片1858张抽帧、21张beat拼图，状态为 `encoded-evidence-ready-human-review-pending`；本审查不以此机器状态当作语义合格。
- 已重新查看最终S13–S21全部9张拼图，覆盖晚段149个事件的词中与动作完成两种位置；共298个格位，部分帧重用。没有声称本审片者看过全片1858张图。两项旧发现和控制标签另查上述15张24fps拼图，共360张连续编码帧，并放大查看关键原尺寸帧。
- 追加连续图均由最终MP4直接ffmpeg解码，6列×4行、逐行阅读。组内第j张（从1起）第k格（从0起）的时间为 `组起点 + (j-1) + k/24` 秒；shipping组起点546.500、drying组473.250、controls组342.750。各组无填充格。
- 对照 `NARRATION.md`、`BEATS.md`、时间轴实际WordBoundary词事件及[旧基线报告](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/review/semantic-baseline-late.md)。没有重新转写，没有用动作量、像素差异、计划执行成功或已通过数字替代语义判断。
- 本轮仅更新本报告及允许的编码抽帧，没有修改源码、模型或时间轴，没有启动模型渲染，没有向其他worker发送消息。后续若成片或时间轴再次变化，本结论不自动移交新SHA。

## 最终36个beat的逐项结论

下表全部36行均根据实际重新查看的 **`48767303…` 最终编码**填写，S13–S21指向下方同SHA的最终拼图，F编号为最终成片绝对帧号。“关闭”指旧基线所述的具体错配在最终编码中不再成立，不等于证明工艺图具备全部科学细节。“未新增实质问题”允许清楚、忠于台词的示意简化。

|Beat / 绝对时间（s）|实际画面与逐句核对|旧问题处置 / 证据|
|---|---|---|
|17-defects-01 / 335.875–341.917|“少一个原子”时有原子离开位点；随后空位圈标出缺失处。“多一个原子”先出现额外原子，再在“挤进正常位置之间”进入间隙，没有把空位画成另一种原子。|原先时机不足已改善；未新增实质问题。S13；F8088、8117、8155、8180。|
|17-defects-02 / 341.917–349.417|冷却指示后点缺陷聚集；生长速度指示、温度梯度色带、后续热过程区域分别在对应词附近出现。最终版三条“示意”标签各自关联对象，并共同保留供协同控制读取。|旧P1关闭；最终标签专项及144张连续帧已复核，无新增实质问题。S13；F8241、8268、8288、8315、8339。|
|17-defects-03 / 349.417–356.750|取向箭头和同向晶格先建立方向；另一组同向晶格呈现不同缺陷状态。“不能把单晶理解成绝对完美”保留同向但含缺陷的反例。|原先两个维度未区分的问题改善。S13；F8420、8440、8484、8522。|
|18-trim-01 / 356.750–363.583|“切去”有两端分离；“外圆加工”有外圆工具及加工轮廓；“材料损耗”有被保留中段与独立碎屑/损耗区。|旧P1关闭，不再只切头尾。S13；F8617、8658、8701。|
|18-trim-02 / 363.583–370.125|晶向参照先建立，缺口加工随后发生；“晶格方向”与缺口对应，“识别参照”出现对准/读取关系。|旧P2改善；不据示意缺口形状外推行业尺寸标准。S14；F8747、8780、8822、8862。|
|18-trim-03 / 370.125–376.750|晶棒向密排细线进给；线网运动与进给有各自变化；多个平行切面一起形成。|原先只有组件整体位移的不足改善。S14；F8919、8965、8994。|
|19-slice-01 / 376.750–383.542|金刚线对象在词附近被强调；硅在线接触处逐步移除，线径与片间距分别有放大示意/标注。|原先宽景切割重播不足改善；不将示意尺度当真实比例。S14；F9077、9111、9162、9176。|
|19-slice-02 / 383.542–390.875|各切口对应被移走的条带；切缝材料进入损耗区，与保留薄片分开。“原料用量”处有原始范围和保留/损耗的关系。|旧P1关闭。S14；F9232、9257、9288、9327。|
|19-slice-03 / 390.875–398.375|先暴露不平表面；锯痕与下面的受损层分别显出；到“继续加工”才建立下一步方向。没有在“受损层都在”时用夹板将它抹掉。|旧P1关闭。S15；F9430、9475、9490、9525。|
|20-edge-01 / 398.375–405.333|尖边崩缺、颗粒产生先出现，随后轮具把边缘变为圆滑轮廓；风险来源和处理结果能区分。|旧P2改善。S15；F9619、9641、9688。|
|20-edge-02 / 405.333–412.167|上下表面趋于平行；厚度括号/目标关系出现；“整片几何”保留两面及间距，没有只用高光表示平整。|旧P2改善。S15；F9766、9797、9848。|
|20-edge-03 / 412.167–420.167|损伤层先可辨；化学蚀刻阶段有液体作用对象，外层材料被移除，之后保留未损伤主体。|层去除原先已部分成立，本版继续成立且阶段更清楚。S15；F9939、9981、10010、10041。|
|21-polish-01 / 420.167–427.875|抛光垫和抛光液依次建立；“化学作用”有表层变化；“移走材料”有碎屑从作用面离开。|旧P1关闭，不再用一次提前结束的整平包办后续台词。S16；F10100、10120、10176、10209。|
|21-polish-02 / 427.875–434.875|突起先降低；“压力”有作用箭头，“运动”有垫相对移动，“供液”有独立液体路径。三个条件落在各自词附近。|旧P1关闭；图示没有给真实去除率，不凭示意要求虚构数值。S16；F10323、10346、10370、10389。|
|21-polish-03 / 434.875–442.667|双面关系、精抛阶段、镜面高光依次呈现；“实际测量”时出现独立测量探头与参考关系。|旧P1关闭；核心“测量时再次抛光”错配已消失。S16；F10458、10504、10526、10586。|
|22-flatness-01 / 442.667–449.833|整片弯曲、局部区域轮廓、微观起伏依次有不同对象/尺度和参考关系，没有三个词共用同一个扫描结束态。|旧P1关闭。S16；F10691、10718、10748。|
|22-flatness-02 / 449.833–456.833|有透镜/光束及焦平面；高、低部位分别建立高度关系；“同时处在合适焦点”时，两个高度差标记与同一焦面并存。|旧P2的核心比较已有几何支持。没有清晰/模糊图像对照是表达简化，本次不列必须改模型的问题。S17；F10817、10864、10891、10933。|
|22-flatness-03 / 456.833–464.625|容许范围先出现；产品规格处有对应的范围/规格比较；随后连接下一工序对象。|旧P1关闭，不再重播上一段扫焦。S17；F10983、11035、11112。|
|23-clean-01 / 464.625–471.625|磨粒是离散颗粒，有机残留是表面膜，金属污染为另一类位点；清洗时各自有移除/输送路径。|旧P1关闭，三类污染不再是同一组绿点换字幕。S17；F11193、11213、11243、11278、11294。|
|23-clean-02 / 471.625–478.542|漂洗有液流和残留离开；干燥起始喷嘴、液流和漂洗标签退场，“干燥”引线锚定中央气流，之后液膜消失形成干片；旧污染在片外收集，清洁输出另有边界。|旧P1及本轮旧P2均已关闭；最终120张连续帧和原尺寸图确认无旧标签回现。S17；F11380、11391、11407、11424、11460。|
|23-clean-03 / 478.542–486.333|夹具在边缘接触，空气有独立控制对象，包装/保护区随后出现；“每次接触”有洁净转运动作，保住的是片面而非再洗旧污。|旧P1关闭。S18；F11503、11521、11534、11583、11617。|
|24-epitaxy-01 / 486.333–493.250|受控条件先建立；气相原料到达表面；随后在衬底上长出连贯的新晶格层。|旧P2的原料路径缺失改善。S18；F11737、11775、11791、11812。|
|24-epitaxy-02 / 493.250–499.792|跨界面晶格取向连续；“厚度”处增加新层并延长括号；“电阻率”附近出现受控着色格点及独立输运示意。|旧P1关闭；原尺寸图确认着色点处于界面附近的首层新层位点，不能因前后投影重叠断言在修改衬底。电性图为定性示意，未编造测量值。S18；F11875、11935、11948。|
|24-epitaxy-03 / 499.792–507.750|连续晶格支持“不是贴膜”；抛光片和外延片分别出现并连接不同要求；“并非必经”有绕过外延的产品路径。|旧P1关闭。S18；F12019、12052、12070、12102、12144。|
|25-inspect-01 / 507.750–515.125|颗粒和缺陷分别有光学对象；厚度有两面间距，平整度有参考关系，电学性质有接触探头。多种测量不再被一次光扫代替。|旧P1关闭。S19；F12240、12257、12276、12295、12319。|
|25-inspect-02 / 515.125–522.000|光扫描后有异常散射路径和接收对象；到“关联运动”探头与光点继续同步位移；最后累积已扫区域点迹。|旧P1关闭；描述“关联运动”时不再早已停住。S19；F12404、12430、12489、12504。|
|25-inspect-03 / 522.000–530.000|厚度测上下表面间距；局部平整有独立轮廓与基准；翘曲有整片形状参考；颗粒检查为另一个光学对象。|旧P1关闭，不再把上表面高度直接当厚度。S19；F12571、12593、12615、12651。|
|26-shipping-01 / 530.000–537.125|片身份关联到晶棒，再到批次；问题回查原料和加工记录，连接逐项建立。|旧P1关闭；本次没有切头尾动作替代追溯。S19；F12737、12771、12796、12854、12873。|
|26-shipping-02 / 537.125–543.583|运输盒装片后有保护/封闭关系，颗粒和非必要接触被隔开，随后出现向后续工厂交付的方向。|旧P2改善。S20；F12912、12936、12958、13021。|
|26-shipping-03 / 543.583–552.708|上方空白片保留材料起点；下方同一截面按词展开光刻曝光、刻蚀沟槽、沉积覆层、横向互连，随后保持后续器件制造结果。整段没有摄影替换。|本轮旧P1已关闭；最终96张连续帧及覆层/横连原尺寸对照确认四阶段实际可见。S20；F13125、13146、13164、13172、13189。|
|27-industry-01 / 552.708–559.917|单片样品与连续多个批次分别出现；批次指标有稳定比较；客户工艺有独立匹配对象。|旧P1关闭，不再使用晶棒→圆片→方块泛化路径。S20；F13290、13319、13391、13419。|
|27-industry-02 / 559.917–568.125|五家供应商名称随各词保留在主画面，形成并列主体；国内发展有新增主体。|旧P1关闭。没有要求无据增加份额、排名或商标。S20；F13452、13470、13491、13516、13535、13615。|
|27-industry-03 / 568.125–576.875|厂房/计划产能与量产质量、客户验证、稳定交付分开呈现，后面三项通过连接汇合到生产能力。|旧P1关闭。S21；F13673、13721、13747、13774、13795。|
|28-recap-01 / 576.875–582.708|还原、转化、组分分离、沉积各有相应对象变化；杂质沿支路离开而所需硅被保留。|旧P1关闭；不再把晶棒→圆片→方块叫作还原提纯。S21；F13878、13902、13917、13934、13960。|
|28-recap-02 / 582.708–589.750|籽晶与取向先建立，随后有生长/缺陷指示；切磨抛、清洗、检测各有不同对象，末端是合格圆片。|旧P1关闭。总结段对缺陷控制为压缩示意，不能据单个着色点认定重新详细解释了空位/位错；本段未承诺逐类重讲。S21；F14014、14049、14085、14102、14116、14129。|
|28-recap-03 / 589.750–598.000|镜面片后有连贯制造链；计算世界出现独立终端对象；材料到器件/计算的连接逐步建立。|旧P2改善，结尾不再只有转片高光。S21；F14221、14276、14309。|

旧基线23个P1 beat的原始错误映射在最终编码中均已纠正；本轮发现的 `23-clean-02` 标注P2和 `26-shipping-03` 摄影遮盖P1也已依据最终连续帧关闭。**晚段最终编码审查完成，无遗留实质P1/P2及模型修改阻断项。** 关闭依据是可见语义关系，动作计划、源端修复和抽帧完成本身不构成语义验收。

## 已查看的最终拼图索引

以下9张均已在本轮实际重新查看，来自最终 `487673030d60029b…` 成片。每个事件的两格分别为词中与动作完成；精确帧号和照片/代码来源显示在格下。拼图页脚“待独立语义审阅”是机器生成时的固定提示，本报告记录其后的独立图像语义复核。

|索引|覆盖的4个beat|证据|
|---|---|---|
|S13|17-defects-01/02/03，18-trim-01|[beats-13.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/beats-13.jpg)|
|S14|18-trim-02/03，19-slice-01/02|[beats-14.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/beats-14.jpg)|
|S15|19-slice-03，20-edge-01/02/03|[beats-15.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/beats-15.jpg)|
|S16|21-polish-01/02/03，22-flatness-01|[beats-16.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/beats-16.jpg)|
|S17|22-flatness-02/03，23-clean-01/02|[beats-17.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/beats-17.jpg)|
|S18|23-clean-03，24-epitaxy-01/02/03|[beats-18.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/beats-18.jpg)|
|S19|25-inspect-01/02/03，26-shipping-01|[beats-19.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/beats-19.jpg)|
|S20|26-shipping-02/03，27-industry-01/02|[beats-20.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/beats-20.jpg)|
|S21|27-industry-03，28-recap-01/02/03|[beats-21.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/beats-21.jpg)|

## 历史附录

本节只保留初轮发现及旧证据，不代表最终文件仍有这些问题，也不承担最终36个beat的证据索引。

- 原基线 `d6762872…` 的36个beat审计和23个P1 beat详见[semantic-baseline-late.md](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/review/semantic-baseline-late.md)。
- 初轮 `fbe845ac…` 的S20及后续 `d5028326…` 编码显示摄影遮盖；旧版直接证据为[546.500s起连续72帧](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-late-v3/shipping-546500-72frames.jpg)。该发现已由最终报告前文的96张连续编码帧确认关闭。
- `d5028326…` 编码仍有漂洗标签跨入干燥阶段；旧版证据为[474.125s起连续48帧](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-late-v3/drying-474125-48frames.jpg)及[旧F11460](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-late-v3/drying-F11460.jpg)。该发现已由最终120张连续帧及同帧位原尺寸图确认关闭。
- 初轮另查过[旧外延连续图](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-late-v3/epitaxy-496500-48frames.jpg)和[旧焦面连续图](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-late-v3/focus-454750-48frames.jpg)，未列模型阻断问题。最终两段均已重新查看本报告S17/S18的全部对应关键词格；旧图不混入最终证据。

抽帧数量、像素差异、计划执行成功与动作量均不作为语义合格依据；本报告的判断依据是具体台词时刻可见的对象、变化、关系与后续可读状态。
