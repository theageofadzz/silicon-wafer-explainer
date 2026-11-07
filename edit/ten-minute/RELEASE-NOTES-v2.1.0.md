# 从石英到硅片：逐句画面修正版

9 分 58 秒，1080×1920、24fps、9:16。针对台词与画面错配问题，
重作全部84段模型镜头，306个独立动作分别绑定实际录音词组。
03:10附近依次展示装料、石墨支撑、热场与熔化；后续修正气体回流、
辅助承重、磁控示意、干燥标注，以及照片遮盖器件制造步骤的问题。
保留完整旁白，已有 ComfyUI 实物镜头作为对应外观的短暂引入；
本轮未重新运行照片扩散生成。

下载附件：

- `silicon-wafer-10min-9x16-v3.mp4`：完整修正版。
- `only.mp4`：约42秒重点样段，对应原片03:09.667–03:51.333。
- `silicon-wafer-explainer-v2.1.0-project.zip`：源码、ComfyUI工作流、
  口播与词事件、照片素材、84段模型渲染、成片和检查记录。
- `full-captions.srt`：完整字幕。
- `SHA256SUMS-v2.1.0.txt`：附件校验值。

[制作说明](https://github.com/theageofadzz/silicon-wafer-explainer/blob/v2.1.0/edit/ten-minute/README.md) ·
[逐句执行表](https://github.com/theageofadzz/silicon-wafer-explainer/blob/v2.1.0/edit/ten-minute/SEMANTIC-STORYBOARD.md) ·
[ComfyUI工作流](https://github.com/theageofadzz/silicon-wafer-explainer/tree/v2.1.0/edit/ten-minute/workflows) ·
[修正与复核记录](https://github.com/theageofadzz/silicon-wafer-explainer/blob/v2.1.0/edit/ten-minute/review/semantic-correction-v3.md)

完整编码解码、598秒整片及样段1x浏览器播放已完成。字幕OCR直接匹配331/335，
解释文字匹配72/84节拍；差异已作图像复看，原始差异保留。
7个节拍的最终阅读停留不足1秒，最短0.543秒。独立复核范围见各报告，
程序播放和图像复核不代表人耳全片听审，本轮未进行人耳听审。

成片SHA-256：
`487673030d60029b17023333bab1e1cabfe53fa98820e29c5a023288f0c4e0cf`

代码MIT，原创影片贡献CC BY-SA 4.0；第三方照片、字体及模型条件见仓库
`THIRD_PARTY.md`。工程包不包含模型权重、运行环境或B站参考片。
