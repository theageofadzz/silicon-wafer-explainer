# 一块石头，怎样成为芯片的起点

## v2.2.0 场景深化版

9分58秒中文竖屏科普，1080×1920、24fps、9:16。
成片为 `output/silicon-wafer-10min-9x16-v4.mp4`，重点样段为 `output/only.mp4`。
旧v3与v2另存作对照。包版本2.2.0、场景修订 `visualRevision: 4`、
词组动作协议 `semanticVersion: 3` 分别记录。
精确成片身份、时间轴SHA及实际检查结果以
[verification-summary.json](review/verification-summary.json)为准；
不能沿用v2.1的验证记录。

本版保留原有598秒原创旁白，以实际WordBoundary词时间驱动84个独立节拍、
306个语义动作、288个机位及335条字幕。台词重新组织，不包含参考片的画面、
配音或字幕。每个节拍的对象、变化、事实和镜头目的分别见
[SEMANTIC-STORYBOARD.md](SEMANTIC-STORYBOARD.md)、
[CINEMATOGRAPHY.md](CINEMATOGRAPHY.md)与
[DETAIL-PLAN-v4.md](DETAIL-PLAN-v4.md)。

### 本轮变化

- 增加与讲解相关的设备结构：承载、驱动、进出料、气路、热场、供液和检测光路。
  剖面、全景、局部与微观视角由配音词组切换，最后动作完成后冻结镜头供阅读。
- 装料终态落在坩埚内部；杯壁、石墨支撑和加热器的引线指向可见表面；
  固液界面标签在实际接触完成后出现。
- 切割线跟随切入前沿；双面研磨上下盘有实际连接；抛光液从出口连续流向接触区。
- 精馏特写以数量守恒的两类粒子演示液相至汽相的迁移与组成偏向，比例为定性示意；
  洁净包装完成时盖板贴合盒壁。最终编码的有限复核见
  [final-repair-v4.md](review/final-repair-v4.md)。
- 三段实物摄影在独立ComfyUI LTX运行中重新扩散生成，原生576×1024、24fps。
  石英、晶棒与空白硅片分别最多使用2秒、1秒、1.25秒；不循环、不强拉时长。
  其余摄影缓存各用一次，机制动作由代码动画解释。
- `26-shipping-03`的光刻、刻蚀、沉积与互连保留各自独立动作。
  结尾使用独立场景，不回放开场片段。
- 84段代码动画原生1080×1920、24fps。合成拒绝相同代码片段或摄影片段跨节拍复用，
  并核对每段动作、镜头计划及全部模型源码SHA；任一源变化都使旧sidecar失效。

### 工作流与复现

ComfyUI摄影生成及全片、样段合成是实际执行的不同图；
其prompt、history和输出SHA记录在
[comfy-execution.json](review/comfy-execution.json)。
`workflows/full.json`可导入ComfyUI，`cached.json`使用摄影缓存合成；
`*-api.json`提供相同API图。准备与合成自定义节点源码包含在仓库内。
运行命令及依赖见[README.md](README.md)。

工程包为 `release/silicon-wafer-explainer-v2.2.0-project.zip`，
包含Git索引中的源码、工作流、配音缓存、实际词事件、必要照片、
生成摄影、全部84段模型MP4与sidecar、精确字幕、样段和验证证据。
文件保留原始字节并有SHA清单。权重、运行环境和研究用参考片不在包内。
打包成功本身不授予科学含义或听感验收。

### 验证边界

本轮图像观察和历史问题的修复复核见
[scene-detail-v4.md](review/scene-detail-v4.md)。
线切割、研磨连接及抛光供液在新冻结编码中的复核见
[finishing-final-v4.md](review/finishing-final-v4.md)；旧编码报告保留为历史。
完整解码、分辨率、帧数、连续覆盖、字幕及解释文字OCR、
静音1x浏览器播放、ComfyUI执行及图像复核分别留证。
原始OCR差异保留，不改写为全数识别成功。
7个节拍最后阅读停留不足1秒，最短0.543秒，
详见[content-check.json](review/content-check.json)。

自动检查、像素变化与浏览器播放完成不等于逐句科学含义验收。
本系统未进行人耳全片听审，不授予发音、朗读风格或听觉同步的人工批准。
报告仅适用于其明确绑定的编码SHA、帧和观察范围。

### 许可

代码MIT；原创影片贡献CC BY-SA 4.0。照片、字体、模型和语音服务各保留条件。
照片作者包括Jan Helebrant、Enrique Jiménez、Thingreenline4546、
Warut Roonguthai、Mojmir Churavy；空白片原图由Hebbe以公有领域发布。
裁切、背景处理及AI动态重建均为修改。
完整来源与许可见仓库根目录 `THIRD_PARTY.md`。
