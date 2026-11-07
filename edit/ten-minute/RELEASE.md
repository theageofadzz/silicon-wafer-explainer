# 一块石头，怎样成为芯片的起点

## v2.1.0 逐句画面修正版

这是已完成本轮验证的生产支持与语义动作修订说明。
开场镜面词组调整及 `26-shipping-03` 摄影覆盖纠正均已进入冻结成片。
修正版为 `output/silicon-wafer-10min-9x16-v3.mp4`；
原版 v2 的 `output/silicon-wafer-10min-9x16.mp4` 保留为对照。
工程版本 v2.1.0、素材名 v3 和 `semanticVersion: 3` 分别指包版本、输出命名和动作协议。

9 分 58 秒中文科普，1080×1920、24fps、9:16。

冻结成片 SHA-256：
`487673030d60029b17023333bab1e1cabfe53fa98820e29c5a023288f0c4e0cf`。
时间轴 SHA-256：
`508552f1cb812834cc75300d13c30ed0f11405381c7cf1a7d0459c38df111cdf`。
具体纠正、样段身份与复核入口见 [语义纠正报告](review/semantic-correction-v3.md)。

本十分钟版以 28 个问题串起硅片制造的 8 个章节；本轮保留完整旁白，重作84个语义节拍、
306个独立词组动作，使用实际录音的词时间戳同步模型、局部标注和335条字幕。
保留实物与图解配合，简化设备外壳，让晶格、生长、切割、抛光和检测的变化更清楚。

- 每个 beat ID 使用具体机制 rig；每个讲解动作绑定实际录音词组，不以通用片段反复
  换标题代替解释。必须先校准动作计划，再审图、渲染和验收新编码。
- 合成拒绝不匹配的 `semanticPlan`、模型源 SHA、动作时间和旧通用素材。
- 播放器默认修正版，另列原版基线，并保留样段与选定片段。
- MP4、`full-captions.srt`、合成和验收记录须来自同一轮修正版输出。
- 打包脚本配置为收录源码、ComfyUI 工作流、口播缓存、词事件、必要照片、
  已生成实物片段和全部确定性模型片段。
- Git 仓库也能重建模型并运行缓存合成。完整入口见 `edit/ten-minute/README.md`。
- 工程包名为 `silicon-wafer-explainer-v2.1.0-project.zip`；源码仅来自 Git 已跟踪或
  明确暂存的路径，新增源码需先暂存。全部模型片段及 sidecar 显式收录。
- 存在时收录 `output/semantic-encoded.json` 及其节拍／连续帧总览图（本版21张和19张），以及
  41.667秒修正样段 `only.mp4` 和样段合成、验证、字幕记录；保留原始字节与哈希，
  不收录1858张独立采样帧。样段合成与验证记录的文件、SHA及 `timelineSha256`
  必须匹配当前样段与时间轴；打包成功本身不构成全片语义审查通过。
- 原生代码画面为1080×1920、24fps；本轮已重作并原生重渲染全部84段语义模型片段。
  ComfyUI LTX 实物镜头复用此前已生成且匹配的缓存，为576×1024、24fps，
  短暂切入并在合成时放大；audit 以 `comfyPhotography` 和
  `cachedFromPriorRender: true` 如实记录，本轮没有再次运行照片扩散生成。
- 一般引入镜头在机制动作前结束；外观说明允许使用对应实际词组处的实物镜头。
  开场空白硅片移至“表面亮得像镜子”词组，替代原先插入，只出现一次、最长2.5秒，
  不重复、不变速、不调整台词时长；机制解释仍由代码画面承担。
- `26-shipping-03` 禁用 chip 摄影覆盖，使“光刻、刻蚀、沉积、互连”按实际配音
  词组展示对应代码动作；最终编码连续帧已确认该P1关闭，干燥阶段漂洗标注的P2
  也已关闭。晚段36节拍复核在其观察范围内未发现新增实质P1/P2。
- 模型权重与 ComfyUI 运行时需独立安装；参考片的画面、音轨、字幕不在工程内。

代码 MIT；原创影片贡献 CC BY-SA 4.0。照片、字体、模型和语音服务各自保留条件，
照片作者包括 Jan Helebrant、Enrique Jiménez、Thingreenline4546、
Warut Roonguthai、Mojmir Churavy；空白片原图由 Hebbe 以公有领域发布。
裁切、背景处理及 AI 动态重建均为修改。保留仓库 `THIRD_PARTY.md` 的来源和许可链接。

冻结成片的全量解码、14352帧连续覆盖、两类 OCR、598秒整片1x浏览器播放、
audit 与 content_check 均已完成；41.666667秒样段也已完成1x播放，实测墙钟42.04秒。
记录见 [verification-summary.json](review/verification-summary.json)、
[playback.json](review/playback.json) 和 [playback-sample.json](review/playback-sample.json)。
ComfyUI full/sample prompt 的成功状态和输出身份见
[comfy-execution.json](review/comfy-execution.json)。

字幕 OCR 为331/335直接匹配，解释文字按节拍为72/84直接匹配。4条字幕和12段解释文字
差异已作图像复看，观察范围与原尺寸补查见 [visual-review.md](review/visual-review.md)；
原始 OCR 差异保留，不改记全数通过。7个节拍最后阅读停留不足1秒，最短0.543秒，
见 [content-check.json](review/content-check.json)。
独立复核结论只适用于报告列出的编码帧和时序；动作数量、自动检查、程序正常播放
均不等于人耳全片听审。本轮未进行人耳听审，不授予发音或朗读风格的人工批准。

`verification.file` 及其 SHA 决定打包的具体成片；打包时仍需核对同版证据，
不能沿用旧版验收。发布文件包括完整成片、重点样段、工程包、字幕和 SHA-256 清单。
