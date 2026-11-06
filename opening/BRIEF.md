---
workflow: general-video
flow: automation
storyboard: no
aspect: 9:16
language: zh-CN
length: approximately 30 seconds
---

# 硅片制造：竖屏开场样片

用户于 2026-11-05 授权制作约 30 秒完整样片，包含原创旁白、音效、字幕、三维解释和真实元素。先交付样片，等待用户确认后才扩展至三分钟内全片。现阶段不制作后续全片，不上传 GitHub。

参考 `../../../references/silicon-wafer-BV1i3x16XEB3/source.mp4` 的开场：加工后的晶圆、空白硅片、尺寸与厚度、单晶内部、纯／完整／平。重排为竖屏叙事，不使用原片音轨、水印和烧录字幕。

第三版制作路线按用户于 2026-11-05 的最新要求更新：真实照片输入 ComfyUI 原生 LTX 图生视频，负责加工晶圆、晶棒与石英的动态镜头。空白硅片照片的复杂倒影出现生成错误，退回后改以81帧精确三维运动参考约束ComfyUI；不将其称为实拍。三维代码负责准确尺寸、切片关系、晶格与必要多机位解释。专业文字在合成末端加入，不让 AI 生成文字或改写晶格拓扑。

1080 x 1920，24 fps。图生视频的原生尺寸及放大限制见 `edit/v3/shots.json`。旁白实际词边界作为统一时间轴。最终交付包括 MP4、可编辑工程、ComfyUI UI/API 工作流、自定义节点、真实照片来源与处理记录、提示词/种子/执行历史及检查报告。

当前 HyperFrames usage 返回 unknown/no_subscription_login，不推断剩余额度。使用现有本地 ComfyUI 模型与本地渲染。
