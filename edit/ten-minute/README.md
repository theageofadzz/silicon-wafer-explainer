# 一块石头，怎样成为芯片的起点

9 分 58 秒的中文竖屏科普工程。28 个小节、84 个语义节拍，1080×1920、
24fps。完整旁白见 [NARRATION.md](NARRATION.md)，词时间轴见
[timeline.json](timeline.json)，台词与动作对应见 [BEATS.md](BEATS.md)。

这一版重新组织和撰写台词，补充缩颈、磁控、氧、分凝、点缺陷、加工损耗、
平整度与光刻、外延以及量产能力。参考片只用于研究，不包含其帧、配音和字幕。
科学事实及图解边界见 [FACTS.md](FACTS.md)。

## v2.1 状态

v2.1.0 是逐词组动作修订的工程版本；模型协议为 `semanticVersion: 3`，
修正版文件为 `output/silicon-wafer-10min-9x16-v3.mp4`。原版 v2 的
`output/silicon-wafer-10min-9x16.mp4` 保留作基线，不覆盖。
本版为已完成本轮验证的逐句画面修正版，冻结成片 SHA-256：
`487673030d60029b17023333bab1e1cabfe53fa98820e29c5a023288f0c4e0cf`。
时间轴 SHA-256：
`508552f1cb812834cc75300d13c30ed0f11405381c7cf1a7d0459c38df111cdf`。
全量编码验证、两类 OCR、598秒整片和41.667秒样段的1x浏览器播放、
audit 与 content_check 均已完成。执行记录见
[comfy-execution.json](review/comfy-execution.json)，技术汇总见
[verification-summary.json](review/verification-summary.json)，具体修改与独立图像复核入口见
[语义纠正报告](review/semantic-correction-v3.md)。

字幕 OCR 为331/335直接匹配，解释文字按节拍为72/84直接匹配；其余差异的图像复看
见 [visual-review.md](review/visual-review.md)，保留原始差异，不记为 OCR 全通过。
7个节拍最后阅读停留不足1秒，最短0.543秒，见
[content-check.json](review/content-check.json)。程序正常播放不等于人耳全片听审，
本轮未进行人耳听审，也未由自动检查授予全部科学含义或同步性的验收。

## 分工

| 工作 | 执行方式 |
|---|---|
| 石英、晶棒、镜面硅片的实物质感 | 有来源记录的照片，经 ComfyUI 原生 LTX 图生视频 |
| 晶格、设备剖面、生长、加工和测量动作 | Three.js 确定性场景，以词锚点控制 |
| 配音 | 独立中文合成语音，缓存 MP3 与真实 WordBoundary 事件 |
| 标注与字幕 | 字体检查后，由代码在 AI 画面之后合成；字幕最后叠加 |
| 全片调度 | ComfyUI 准备节点 → 摄影生成或缓存 → 合成节点 |

实物 AI 镜头只在合适的信息点短暂切入，不循环、不强拉时长。
一般引入镜头在机制动作开始前结束；外观描述可以在实际录音的对应词组处由实物镜头表达。
开场 `01-start-01` 的空白硅片镜头移至“表面亮得像镜子”词组，只插入一次，
替代原先的开场插入，最长2.5秒，不重复、不变速，也不改变台词时长。
`26-shipping-03` 禁用 chip 摄影覆盖，让“光刻、刻蚀、沉积、互连”分别按
实际配音词组展示对应代码动作；最终编码连续帧已确认该摄影遮盖问题关闭。
关键结构由确定性模型解释，避免生成模型改变晶格、位错、切缝和设备接触关系。
v2.1 复用已生成且哈希匹配的 ComfyUI 实物镜头，原生576×1024、24fps；
本轮已重作全部84段语义模型片段，并全部原生重渲染为1080×1920、24fps，
共306个独立词组动作，没有再次运行照片扩散生成。代码画面的实际分辨率与采样帧率记录在
`model/renders/*.json`，不把交付分辨率冒充全部素材的原生分辨率。

## 运行

先按仓库根 README 安装 Python、Node、Chrome、FFmpeg 与模型依赖。
以下命令均从仓库根目录运行。

```sh
# 缓存 MP3 和词事件随仓库提供；文本与音色未变时，离线重建 WAV 和时间轴。
.venv/bin/python3 edit/ten-minute/production/narrate.py --fit

# 校准具体词组动作后，再检查模型、投影与关键连续帧。
node edit/ten-minute/production/render.mjs --calibrate
.venv/bin/python3 edit/ten-minute/production/content_check.py
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

## 语义动作与缓存

每个 beat ID 有自己的 rig 和动作计划；`visual` 仅作机制族路由，不能借同一
通用片段替代多句不同含义的讲解。原子、热场和加工可以共用几何工具，但对象、
实际变化、关系和结论必须在各自 beat 中实现，字幕变化或换角度不算新的讲解动作。
`SEMANTIC-STORYBOARD.md` 记录每个动作的 `phrase / object / action / fact`。

`model/semantic.mjs` 从实际录音的 `words` 寻找每个词组，分别计算
`wordStart / wordEnd`，再依 `lead / seconds` 建立动作窗。找不到词组或动作
超出 beat 就报错；不回退到平均时长。修改词组、时长或 rig 后，先校准，再审图：

```sh
node edit/ten-minute/production/render.mjs --calibrate
.venv/bin/python3 edit/ten-minute/production/content_check.py
node edit/ten-minute/production/render.mjs --review
node edit/ten-minute/production/render.mjs --render --capture-fps=24
```

可用 `--only=<beatId>` 缩小校准、审图或渲染范围。校准会更新统一时间轴和执行表；
校准本身不证明科学含义、构图或语音同步通过。按每个词组动作检查前、中、后帧，
并检查最终状态的阅读停留，再对新编码做逐句审片。

每段渲染 sidecar 保存 `semanticVersion`、完整 `semanticPlan` 和
`modelSources`（所有模型 `.mjs` 的 SHA-256）。合成入口拒绝旧通用片段、
变化后的计划、模型源哈希、视觉类型或动作时间；发生变化就重新校准并重渲染
受影响素材。当前哈希门禁覆盖所有模型源码，任一文件变化都会令旧 sidecar 失效，
不能靠改名、复用旧 MP4 或只更新时间轴绕过。

修改脚本后必须重新生成真实配音和时间轴，再重建动作素材；不能沿用旧时间。
现有录音未变时不重复请求语音服务。缓存校验会拒绝台词、时间轴或字体不一致的输入。

## 观看和检查

```sh
node production/server.mjs --background
```

播放器：`http://127.0.0.1:60090/edit/ten-minute/watch.html`。
播放器默认使用当前修正版合成记录中的 `file`；没有修正版记录时指向
`output/silicon-wafer-10min-9x16-v3.mp4`，未生成会明确不可用，不自动播放旧版冒充。
原版 v2 有独立选择项；样段与选定片段选择项保留。
`--pilot` 会选择不足 60 秒的完整小节，输出 `output/pilot.mp4`。
最终字幕、合成清单和检查证据都在 `output/`。

不要将“字体包含这些字”和“字幕 OCR 已通过”混为一谈。自动技术测量、观察到的
连续帧、正常速度播放记录与尚未进行的人耳听审，分别写入验收记录。
`playback.mjs` 从 `full-assembly.json` 读取文件与时长，核对浏览器的 `currentSrc`
及该 URL 实际返回内容的 SHA，并拒绝播放期间文件或合成记录变化。
`audit.py` 要求编码验证、字幕 OCR、解释标签 OCR、完整播放都绑定同一成片 SHA，
从实际结果计算差异数并记录语义版本／动作数；它不授予语义或人耳验收通过。
摄影条目使用 `comfyPhotography` 和 `cachedFromPriorRender: true`，不把缓存复用
记作本轮重新生成。

## 工程包

打包入口如下；本轮文档收尾未运行打包：

```sh
.venv/bin/python3 edit/ten-minute/production/package.py
```

输出 `release/silicon-wafer-explainer-v2.1.0-project.zip` 和
`release/SHA256SUMS-v2.1.0.txt`。打包使用 `full-verification.json` 中的精确
`file` 与 SHA，核对合成记录、时间轴、模型源与计划，包含全部84段模型 MP4及
sidecar。源码清单来自 Git 索引，包含已跟踪路径和明确 `git add` 的新增路径，
打包其当前工作区内容；未暂存的新源码会阻止打包，不递归收集任意未跟踪文件。
新增计划源码及执行表应先明确暂存，运行环境、权重和参考片不打包。
若存在 `output/semantic-encoded.json`，打包其原始字节及清单中
`contactSheets[].file`、`continuous.contactSheets[].file` 指定的两类总览图
（本版为21张节拍图和19张连续图）；
核对其成片、合成记录和时间轴哈希，不收集1858张独立采样帧。
若存在41.667秒修正样段 `output/only.mp4`，一并收录它及现有的
`only-assembly.json`、`only-verification.json`、`only-captions.srt`。
样段合成与验证记录的文件、SHA及 `timelineSha256` 必须对应当前样段与时间轴，
否则拒绝收录，不能带入旧样段记录。
所有收录文件保留原始内容并写入包内 SHA 清单；证据中的独立帧路径仍保留作追溯，
不表示那些图片也已打包。
包能生成不等于逐句含义通过，也不能把旧版验收当作新版发布证据。

## 许可

代码沿用仓库 MIT。原创影片贡献沿用 CC BY-SA 4.0；照片、字体、模型和语音服务
仍按各自条件使用。作者署名、原图许可和 AI 修改说明见根目录
[THIRD_PARTY.md](../../THIRD_PARTY.md)。发布时一并保留这些记录。
模型权重、ComfyUI 运行时和参考片均不打入工程包。
