# 从石英到硅片 v1.0.0

2 分 54 秒的 9:16 中文科普视频，1080 x 1920、24 fps，包含配音与中文字幕。

从石英、工业硅和高纯多晶硅，讲到直拉单晶、切片、研磨、抛光、清洗与检测。
影片保留已确认的开场，用真实照片动态重建与精确三维引导生成交替讲解。
原生扩散为 576 x 1024，新增动作段经运动补偿插值后放大交付。

- `silicon-wafer-explainer-9x16.mp4`：完整视频。
- `silicon-wafer-explainer-v1.0.0-project.zip`：含成片、原始录音与词事件、
  生成镜头、准确动作参考、完整及缓存 ComfyUI 工作流、脚本、素材与许可。
- `captions.srt`：完整字幕。
- `SHA256SUMS.txt`：完整视频、工程包和字幕的校验值。

工程包不含模型权重和 ComfyUI 运行时。运行方法见根目录 README。
同种子在不同硬件或不同 ComfyUI 版本上不保证逐像素一致。

代码 MIT；影片及原创视觉贡献 CC BY-SA 4.0，第三方照片与字体保留原许可。
照片作者：Jan Helebrant、Enrique Jiménez、Thingreenline4546、Warut Roonguthai、
Mojmir Churavy。照片经过裁切、背景处理和 AI 动态重建，不能称为实拍视频。
完整来源、许可链接及修改记录见 [THIRD_PARTY.md](https://github.com/theageofadzz/silicon-wafer-explainer/blob/main/THIRD_PARTY.md)。

没有重新分发 B 站参考片的画面、声音、字幕或水印。
验证范围及仍需人耳复核的事项见工程中的 `review/verification.json`。
