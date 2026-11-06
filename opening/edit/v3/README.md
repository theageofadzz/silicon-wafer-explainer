# 硅片科普竖屏样片：第三版

范围仍为约30秒开场，1080×1920、24fps。完整影片等待样片确认。本版继续以用户提供的 B 站 BV1i3x16XEB3 为视觉参考：银黑实物、受控反射、景别变化、从表面进入内部结构。没有复制原片画面、音轨、字幕或水印。

## 制作分工

- **ComfyUI 原生图生视频**：`WV3Photo → LTXVPreprocess → LTXVImgToVideo → SamplerCustom → VAEDecodeTiled → WV3SaveShot`。加工晶圆、晶棒和石英以真实照片决定外观，视频扩散模型生成镜头运动。
- **空白硅片的引导生成**：`WV3Guide → LTXVPreprocess → LTXVImgToVideo → SamplerCustom → VAEDecodeTiled → WV3SaveShot`。原照片的复杂倒影曾被误生成为凸起，已退回。最终改用81帧精确三维运动参考，0.9强度逐帧约束平面、轮廓和摄影运动。这个输入是三维渲染，不能称为真实照片。引导素材及生成脚本为 `model/wafer-guide.mp4` 与 `model/wafer-guide.mjs`。
- **准确三维**：只负责直径与厚度、晶棒切片的实体关系、硅原子的金刚石立方结构。包含全貌、薄边、局部、端面和晶格内的多个机位。模型源码在 `model/`。
- **合成与字幕**：`WV3Assemble` 按原始配音词时间轴切镜头，合并连续音频，最后烧录字幕。FFmpeg 只做编解码、合成和字幕，不承担图生视频。

原生生成分辨率及步数见 `shots.json`；成片经过放大，不能称为原生1080p拍摄。真实照片生成的动态镜头属于解释性重建，不是工厂实录。石英全貌与微距取自同一块标本；这块天然标本不能被描述为已达工业高纯等级。

## 文件入口

- `../../sample-9x16-v3.mp4`：30.375秒样片。
- `../../watch-v3.html`：本地播放器，署名在播放器下方。
- `workflows/all.json`：完整 ComfyUI 可视化工作流，46节点。
- `workflows/all-api.json`：同一流程的 API 格式。
- `workflows/assemble-cached.json`：复用已生成镜头，修改合成或字幕时使用。
- `shots.json`：每个镜头的真实输入、长提示词、种子、帧数、采样器与sigma。
- `BEATS.md`：第三版台词锚点、画面动作、解释事实及观察停留。替代旧版文字计划中的画面描述。
- `review/assembly.json`：最终剪点、台词锚点、真实生成时长及输出哈希。
- `QA.md`：2026-11-06 的技术检查结果、字幕 OCR 限制、播放检查和未宣称事项。
- `workflows/*-history.json`：实际 ComfyUI 执行记录。
- `../../assets/v3-real/sources.json`：照片作者、原始链接、许可及原图哈希。
- `../../assets/v3-real/input-crops.json`：照片裁切、抠图、背景处理及输入哈希。

## 安装

需要已有 ComfyUI、Python、Node.js、FFmpeg 和 Chrome。Python需 Pillow、NumPy、PyTorch；浏览器渲染需 Playwright。项目根目录运行 `npm install`，使用已有 Chrome，避免另行下载浏览器。

模型体积较大，不打包进工程压缩包。下载位置、大小、SHA-256 和许可见 `workflows/models.json`。把 LTX checkpoint 放入 ComfyUI 的 `models/checkpoints/`，T5 编码器放入 `models/text_encoders/`。也可以使用项目启动器指定已有模型库。

在项目根目录运行：

```sh
python3 launch_comfy.py --v3 --comfy-root /absolute/path/to/ComfyUI --model-root /absolute/path/to/models --port 8195
```

`--model-root` 目录下使用 `video/` 存放 LTX checkpoint，使用 `text_encoders/` 存放 T5。自定义节点由启动器自动映射，无需复制到系统安装目录。其他 ComfyUI 服务不受影响。

本机使用 Apple M4、16GB共享内存，扩散与BF16 VAE走MPS，T5走CPU。其他平台可按其显存调整设备和缓存。完整流程保留固定模型版本；换模型后需要重新检查形状与时间轴。

## 使用

导入 `workflows/all.json`，确认照片和引导视频路径存在后排队。每个镜头保存为 `generated/<shot>.mp4`，随后渲染准确三维并合成成片。采样种子固定；不同硬件仍可能产生像素差异。引导视频已包含在工程包；修改硅片三维后，先运行 `node edit/v3/model/wafer-guide.mjs` 更新它，再生成空白硅片镜头。

保留现有成片素材时，导入 `workflows/assemble-cached.json`。改变 `../../text-plan.json` 的字幕文字或停留即可重合成；新增、删改台词时必须重新校准真实录音词时间戳，并更新镜头计划，不能平均分配图片时长。

命令行入口同样通过 ComfyUI 排队：

```sh
node edit/v3/comfy.mjs all
node edit/v3/comfy.mjs assemble-cached
```

在项目根目录运行 `npm run preview` 打开本地播放器；默认端口3429，可通过 `WAFER_PORT` 改变。播放器默认展示第三版，照片署名位于视频下方，不叠进画面。

## 检查与限制

`verify.py` 对编码后的成片做全帧解码、15条字幕OCR、尺寸/帧数检查，以及剪点附近的连续取帧。`browser-check.mjs` 检查工作流导入和正常速度播放、桌面与手机播放器。三维层另外检查四配位、四面体键角、近邻键长及切片来源。

FFmpeg具备libass时直接烧录ASS；没有libass时，以Pillow/FreeType栅格化同一词时间轴，编码透明字幕条并在画面合成后叠加。`captions.ass` 始终保留用于编辑。OCR漏字时必须查看编码后的实际画面，使用 `--visually-reviewed-caption <cue-id>` 记录明确的人工视觉检查；报告保留OCR原始结果和帧哈希，不把视觉复核改写为OCR通过。

这些检查不能代替用户对讲解效果的判断。自动播放不代表完成了人耳听审；照片来源许可保留在外部记录与播放器下方，不在画面内叠加署名水印。改编照片及其生成镜头按来源要求署名和共享许可，详见素材清单。
