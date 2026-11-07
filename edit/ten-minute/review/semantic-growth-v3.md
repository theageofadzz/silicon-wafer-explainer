# Growth v3 独立语义审查

2026-11-07 最终编码复核：已实际查看指定最终编码的全部 33 个 growth beat、102 个语义事件的 204 个关键词/动作结束面板，并对四处修正查看原生单帧。原列四项问题在最终编码中均已修正；本轮未发现新的实质对象、动作或连接关系错误。结论限定为下列编码图像的语义复核，不是全片正常速度带声验收。本次仅更新本报告，未修改制作源或启动渲染。

## 最终编码绑定

- 实际编码：[silicon-wafer-10min-9x16-v3.mp4](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/silicon-wafer-10min-9x16-v3.mp4)，1080×1920、24fps、14352 帧、598s。
- 实测视频 SHA256：`487673030d60029b17023333bab1e1cabfe53fa98820e29c5a023288f0c4e0cf`。
- 实测 timeline SHA256：`508552f1cb812834cc75300d13c30ed0f11405381c7cf1a7d0459c38df111cdf`。
- [semantic-encoded.json](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-encoded.json) 记录的两个指纹与上述实测值一致；assembly SHA256 为 `8c224db6aa70bb70e2d1a211725b1d9ae707369c78cb66654a38a67f767d2152`。
- 本轮实际查看的图片全部来自 `output/review-full/semantic-encoded-487673030d60029b/`。下述时间为完整影片时间，帧号从 0 开始。旧 `review-only/0f097...` 样片及模型图不作为本轮修正通过的证据。

## 四处修正的编码复核

### 08-siemens-03：回流返回入口，已关闭

台词：“气体循环和副产物处理，也是生产体系的重要部分。”

[F3918 / 163.250s](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/frames/frame-003918.jpg) 的绿色粒子分布在回流管顶部及左侧下行段；[F3932 / 163.833s](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/frames/frame-003932.jpg) 已到左下入口管的内侧终点，局部“气体回路”引线随粒子移至入口。图 06 随后的副产物面板显示黄色粒子进入独立容器。旧版停在左上弯管而未返回的问题不再出现。本结论针对工艺示意的返回关系，不宣称图中完整呈现了反应器外壳和全部工业管线。

### 11-seed-01：错误取向 summary 消失，已关闭

台词：“它已经是单晶，方向已知，给新来的硅原子一个排列参照。”

[F5146 / 214.417s](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/frames/frame-005146.jpg) 中，左侧“籽晶”引线落在籽晶上，右侧晶格及取向轴旁保留“同一取向”局部标注；白色坩埚正面已没有旧版“已知晶格取向”summary。图 08 的后续新原子事件中也没有恢复这条错误标注。此项已由实际编码确认，不再仅依据 `assemble.py` 推断。

### 14-load-01：支撑接触并连接横梁，已关闭

台词：“晶棒越长越重，承重设计不能忽略。颈部结构或辅助机构，要配合安全生长。”

[F6661 / 277.542s](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/frames/frame-006661.jpg) 可见辅助机构向晶棒靠近；[F6672 / 278.000s](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/frames/frame-006672.jpg) 两侧支撑内端已与肩部下方的上部晶棒侧面接触，竖杆连续连到横梁，横梁跨接提拉机构。原先支撑悬空、没有承载连接的关系缺陷不再出现。图中也明确注明设备方案因工艺而异；本项是机械示意的关系确认，不是实际设备承载能力认证。

### 15-magnetic-01：箭头原位缩短且粒子不收拢，已关闭

台词：“熔融硅能导电，磁场可以抑制某些流动，调节对流。”

对照 [F7136 / 297.333s](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/frames/frame-007136.jpg)、[F7147 / 297.792s](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/frames/frame-007147.jpg)、[F7159 / 298.292s](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/frames/frame-007159.jpg)：两支较粗环流箭头固定起点、尖端逐步退回，最终明显变短；绿色示踪粒子在三帧中的位置和分布保持不变，外加磁场长箭头也保持不变。局部“环流幅度示意”引线落在环流箭头上且不遮住主要变化。旧版粒子向晶棒聚拢及上一轮只缩细箭身的问题都已消除。箭头长度仅表示流动幅度示意，不是实测抑制率。

关键编码证据帧 SHA256：

```text
frame-003932.jpg d81435062af5ee04a4bb7a325d65737c697ac107bbb582c15648e2394605568d
frame-005146.jpg 0db3162c0685c0cc850d8cdc84c663f95526c4562863bcb734d6340431545cfd
frame-006672.jpg c33385762551222842b50ac7ab8aa69e80bcfb165332b99a490d3703cd5ca383
frame-007136.jpg e0dc36b56dd67a7e4203236b2b8f3248434555a8cabb82fd5d044a843092e5f6
frame-007159.jpg e4e59ddfd44dafdc61cced776d926c379abd139351996548be11b6b8d0c34f8f
```

## 全部 33 个 Growth Beat 的编码图像覆盖

已实际逐张查看图 04–12，逐行对照完整台词及各关键词面板；这些图使用 `phrase` 和 `end` 两种面板角色，不应称作逐帧完整观看。目标 33 beat 共 102 个事件、204 个面板均在这些图中；同图中的 atomic 行不计入这 33 个 growth beat。

| 图 | 实际查看的最终编码关键词图 |
| --- | --- |
| 04 | [beats-04.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/beats-04.jpg) |
| 05 | [beats-05.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/beats-05.jpg) |
| 06 | [beats-06.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/beats-06.jpg) |
| 07 | [beats-07.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/beats-07.jpg) |
| 08 | [beats-08.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/beats-08.jpg) |
| 09 | [beats-09.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/beats-09.jpg) |
| 10 | [beats-10.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/beats-10.jpg) |
| 11 | [beats-11.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/beats-11.jpg) |
| 12 | [beats-12.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/beats-12.jpg) |

| Beat | 图 | 编码图中实际看到的讲解关系 |
| --- | --- | --- |
| 05-furnace-01 | 04 | 两类炉料进入炉区，电极端部发热，热区炉料减少。 |
| 05-furnace-02 | 04 | CO 示意点向上离开，下方硅液汇集，出料流进入接收区域。 |
| 06-transform-01 | 04 | 左侧原料缩减，右侧出现中心硅与三个氯、一个氢连接的分子。 |
| 06-transform-02 | 05 | 化学转化前后对象不同；挥发性比较中一类点进入上方、另一类留在下方。 |
| 06-transform-03 | 05 | 左侧汽化、管道冷凝位置分开，两类组分分别进入收集位置。 |
| 07-distill-01 | 05 | 蒸气向上、回流液体向下，较易挥发组分在上部富集。 |
| 07-distill-02 | 05 | 多个接触级依次显示组分交换，之后分路收集并接入后续单元。 |
| 07-distill-03 | 06 | 第一分离步骤后仍保留另一类组分，后续单元接续处理。 |
| 08-siemens-01 | 06 | 细硅芯保持细长，通电加热事件后由冷色转为热色。 |
| 08-siemens-02 | 06 | 两类气体进入，表面沉积点到达硅芯，后续沉积层使棒径增大。 |
| 08-siemens-03 | 06 | 成品粗棒保留，绿色粒子沿管返回入口，副产物另入容器；见原生帧复核。 |
| 09-feedstock-01 | 07 | 取棒、破碎、去表面污染、加盖包装分步发生；工具接触污染由独立放大对象说明。 |
| 09-feedstock-03 | 07 | 原有不同取向结构消解进入熔体，新晶格从同一方向建立；旧晶粒对照未自行转正。 |
| 10-melt-01 | 07 | 装料、外部石墨支撑、热场和熔化分别改变对象；另看连续帧。 |
| 10-melt-02 | 08 | 气体通道、热区色带及目标温度尺分步变化，过热端出现叉号。 |
| 11-seed-01 | 08 | 籽晶与晶格取向参照分别标注，新原子延续参照；坩埚错误 summary 消失。 |
| 11-seed-02 | 08 | 籽晶先接触液面，提拉时新固体下端仍连液面，晶格放大区继续建立同向连接。 |
| 11-seed-03 | 09 | 晶体/坩埚有旋转参照，之后出现输运路径和熔体示意粒子。 |
| 12-neck-01 | 09 | 红色位错线先出现，随后随新增晶段延伸；外表面仍连续。 |
| 12-neck-02 | 09 | 细颈拉长，侧壁距离被突出，红线末端弯向并止于侧壁。 |
| 12-neck-03 | 09 | 细颈与后续晶棒并列建立关系，红线解释与连续实体表面分别突出。 |
| 13-growth-01 | 10 | 热场/提拉参照变化后肩部逐渐加宽，下端与熔体连接。 |
| 13-growth-02 | 10 | 目标直径保持，等径段向上增长，固液界面新层另行出现。 |
| 13-growth-03 | 10 | 表面反光变化、晶棒延长及热场/提拉调整为不同事件。 |
| 14-load-01 | 10 | 长度增加与向下载荷先出现，辅助支撑随后靠近并接触、连接横梁。 |
| 14-load-02 | 11 | 温差区域和流动路径出现，粒子随后进入输运示意，界面热区分布改变。 |
| 14-load-03 | 11 | 不稳定界面与不均匀性质色带出现在一侧，另一侧展示沿长度一致的目标色带。 |
| 15-magnetic-01 | 11 | 磁极/场线出现后，环流箭头原位缩短而粒子不收拢；见原生帧复核。 |
| 15-magnetic-02 | 11 | 先突出机械提拉，再显示磁场下的流动/热区和界面附近示意输运。 |
| 15-magnetic-03 | 12 | 石英内壁、壁面氧进入熔体、部分进入透明晶体及流动路径依次显示。 |
| 16-control-01 | 12 | 体内氧点形成沉淀示意簇，杂质点移向体内区域，表面与体内目标分开突出。 |
| 16-control-02 | 12 | 固相/液相及两相示意点分布分开，剩余液相随生长减少。 |
| 16-control-03 | 12 | 轴向采样先展开，径向采样随后展开，两条检查方向最后同时保留。 |

## 连续帧与验收限制

- 对 03:10 附近的先后关系追加查看 [continuous-003.jpg：190.000–190.958s，每帧](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/continuous-003.jpg)，可见原料从上方逐步下降进入坩埚；[continuous-008.jpg：195.000–195.958s，每帧](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/semantic-encoded-487673030d60029b/continuous-008.jpg) 可见固体逐步缩减、液面保留。不是仅换字幕或镜头。
- 四处修正除关键词图外，另实际查看上述 8 张原生编码单帧。磁控使用动作前、中、后对照；回流与支撑使用动作中、完成后的关系对照。
- 本轮未进行正常速度带声完整观看；未逐帧覆盖全部 598s，也没有重新验收 atomic、finishing 全部模块。关键词帧足以关闭这里列出的四个具体关系缺陷，但不能由此宣称整片音画、字幕、全部时序均已验收。
- 没有把 SHA 匹配、提取覆盖率、`nonblank`、像素差异或语义计划执行成功当作语义通过依据。上述结论来自实际查看的最终编码画面，指纹只用于绑定版本。
