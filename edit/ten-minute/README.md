# 一块石头，怎样成为芯片的起点

9 分 58 秒的中文竖屏科普工程。28 个小节、84 个语义节拍，1080×1920、
24fps。完整旁白见 [NARRATION.md](NARRATION.md)，词时间轴见
[timeline.json](timeline.json)，台词与动作对应见 [BEATS.md](BEATS.md)。

这一版重新组织和撰写台词，补充缩颈、磁控、氧、分凝、点缺陷、加工损耗、
平整度与光刻、外延以及量产能力。参考片只用于研究，不包含其帧、配音和字幕。
科学事实及图解边界见 [FACTS.md](FACTS.md)。

## 分工

| 工作 | 执行方式 |
|---|---|
| 石英、晶棒、镜面硅片的实物质感 | 有来源记录的照片，经 ComfyUI 原生 LTX 图生视频 |
| 晶格、设备剖面、生长、加工和测量动作 | Three.js 确定性场景，以词锚点控制 |
| 配音 | 独立中文合成语音，缓存 MP3 与真实 WordBoundary 事件 |
| 标注与字幕 | 字体检查后，由代码在 AI 画面之后合成；字幕最后叠加 |
| 全片调度 | ComfyUI 准备节点 → 摄影生成或缓存 → 合成节点 |

实物 AI 镜头只在合适的信息点短暂切入，不循环、不强拉时长。
关键结构由确定性模型解释，避免生成模型改变晶格、位错、切缝和设备接触关系。
新扩散摄影原生 576×1024、24fps；代码画面的实际分辨率与采样帧率记录在
`model/renders/*.json`，不把交付分辨率冒充全部素材的原生分辨率。

## 运行

先按仓库根 README 安装 Python、Node、Chrome、FFmpeg 与模型依赖。
以下命令均从仓库根目录运行。

```sh
# 缓存 MP3 和词事件随仓库提供；文本与音色未变时，离线重建 WAV 和时间轴。
.venv/bin/python3 edit/ten-minute/production/narrate.py --fit
.venv/bin/python3 edit/ten-minute/production/content_check.py

# 检查模型、词锚点、投影与关键连续帧。
node edit/ten-minute/production/render.mjs --review

# 缺少的确定性镜头可以由工作流准备节点自动生成，也可独立运行。
node edit/ten-minute/production/render.mjs --render

# 独立服务，不修改其他项目的 ComfyUI 配置。
.venv/bin/python3 edit/ten-minute/production/launch_comfy.py \
  --comfy-root /absolute/path/to/ComfyUI \
  --model-root /absolute/path/to/models --port 8197

# 导出图，并校验本机节点定义。
SILICON_COMFY_URL=http://127.0.0.1:8197 \
  node edit/ten-minute/production/comfy.mjs all --validate-only

# 使用已生成的摄影素材，执行完整合成。
SILICON_COMFY_URL=http://127.0.0.1:8197 \
  node edit/ten-minute/production/comfy.mjs cached --run

# 重新生成三段摄影，再合成全片。
SILICON_COMFY_URL=http://127.0.0.1:8197 \
  node edit/ten-minute/production/comfy.mjs full --run

# 只重新生成三段摄影，便于分开控制资源。
SILICON_COMFY_URL=http://127.0.0.1:8197 \
  node edit/ten-minute/production/comfy.mjs photos --run

# 校验最终编码，提取字幕帧与动作连续帧。
.venv/bin/python3 edit/ten-minute/production/verify.py --captions all --continuity all
.venv/bin/python3 edit/ten-minute/production/ocr.py --labels
node edit/ten-minute/production/playback.mjs
.venv/bin/python3 edit/ten-minute/production/audit.py
```

ComfyUI 前端可直接导入 `workflows/full.json` 或 `workflows/cached.json`。
`*-api.json` 是相应的 API 图。三个摄影分支使用标准 LTX 节点，并连接最终合成。
自定义节点源码位于 `comfyui/custom_nodes/wafer_tenminute/`，准备与合成代码均可读。
服务端环境变量 `SILICON_TENMIN_ROOT` 指向本目录，`SILICON_COMFY_URL` 指向服务地址。
模型路径、Python、Chrome 和端口都可以显式指定。准备节点默认渲染
1080×1920、原生 24fps；物体标注按每个输出帧的实际投影更新。

修改脚本后必须重新生成真实配音和时间轴，再重建动作素材；不能沿用旧时间。
现有录音未变时不重复请求语音服务。缓存校验会拒绝台词、时间轴或字体不一致的输入。

## 观看和检查

```sh
node production/server.mjs --background
```

播放器：`http://127.0.0.1:60090/edit/ten-minute/watch.html`。
输出：`output/silicon-wafer-10min-9x16.mp4`。
`--pilot` 会选择不足 60 秒的完整小节，输出 `output/pilot.mp4`。
最终字幕、合成清单和检查证据都在 `output/`。

不要将“字体包含这些字”和“字幕 OCR 已通过”混为一谈。自动技术测量、观察到的
连续帧、正常速度播放记录与尚未进行的人耳听审，分别写入验收记录。

## 许可

代码沿用仓库 MIT。原创影片贡献沿用 CC BY-SA 4.0；照片、字体、模型和语音服务
仍按各自条件使用。作者署名、原图许可和 AI 修改说明见根目录
[THIRD_PARTY.md](../../THIRD_PARTY.md)。发布时一并保留这些记录。
模型权重、ComfyUI 运行时和参考片均不打入工程包。
