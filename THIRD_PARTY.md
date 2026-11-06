# 第三方素材与许可

代码和原创制作文档采用根目录 MIT License。影片及原创视觉贡献以
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 发布，照片原件保留各自许可。
素材、配音、模型权重不因放在本仓库而变成 MIT 软件。

## 已使用的照片

| 文件与作者 | 许可 | 在影片中的使用 |
| --- | --- | --- |
| [Milky quartz, Příbram](https://commons.wikimedia.org/wiki/File:Milky_quartz_SiO2_locality_-_P%C5%99%C3%ADbram,_Czech_Republic_(50585167016).jpg), Jan Helebrant | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) | 石英全貌和断口微距；裁切后由AI生成小幅镜头运动 |
| [Silicon Wafer 20190210](https://commons.wikimedia.org/wiki/File:Silicon_Wafer_20190210.jpg), Enrique Jiménez | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) | 加工晶圆及结尾；裁切和AI动态重建 |
| [Single Crystal Silicon Boule](https://commons.wikimedia.org/wiki/File:Single_Crystal_Silicon_Boule.jpeg), Thingreenline4546 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | 开场晶棒；比例缩放、背景处理和AI动态重建 |
| [Silicon seed crystal puller rod](https://commons.wikimedia.org/wiki/File:Silicon_seed_crystal_puller_rod.jpg), Warut Roonguthai | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)，在该照片多重许可中选用 | 先展示籽晶实物，然后切到接触熔体的解释动作；比例缩放及AI动态重建 |
| [FZU AV CR Silicon Single Crystal A](https://commons.wikimedia.org/wiki/File:FZU_AV_CR_Silicon_Single_Crystal_A.jpg), Mojmir Churavy | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | 单晶样品外观；比例缩放及AI动态重建 |

逐文件来源、原图哈希、尺寸与修改记录：

- `opening/assets/v3-real/sources.json`
- `opening/assets/v3-real/input-crops.json`
- `assets/sources.json`

署名保存在本页、素材记录、播放器外侧及Release说明中，不在影片内叠加水印。
共享改编照片和生成片段时，请同时保留作者、来源、许可链接以及修改说明。

历史空白硅片照片 [Siliziumwafer](https://commons.wikimedia.org/wiki/File:Siliziumwafer.JPG)
由 Hebbe 发布为公有领域，但因倒影造成错误生成而没有进入最终空白片镜头。
该镜头使用原创精确三维运动参考。历史公有领域晶棒照片由 Sebastian Wallroth 拍摄，
不作为当前 `input-boule.png` 的输入。

实验炉照片 [Avogadro Crystal (in the furnace)](https://commons.wikimedia.org/wiki/File:Avogadro_Crystal_(in_the_furnace)_-_SFU_PAMR.jpg)，
Simon Fraser University Public Affairs and Media Relations，
[CC BY 2.0](https://creativecommons.org/licenses/by/2.0/)，保留为来源研究与已生成的候选镜头。
其画面无法证明坩埚装料过程，因此没有纳入本片该段落。

## 软件、字体与模型

- Three.js：2010–2026 Three.js Authors，MIT，完整文本见 `licenses/THREE.txt`。
- Noto Sans CJK SC Regular/Bold 2.004：2014–2021 Adobe，SIL Open Font License 1.1，
  完整文本见 `licenses/OFL.txt`。文件名为 `NotoSansSC-*.otf`，内部族名是 Noto Sans CJK SC。
- Playwright：Apache-2.0，由 npm 安装；其完整许可位于安装包内。
- ComfyUI：独立安装，遵守其上游许可；本仓库没有重新发布其源码和运行时。
- FFmpeg：独立安装，本机使用的编解码功能和构建许可由安装版本决定。
- LTX-Video 0.9.8 distilled：模型权重不包含在仓库和工程包中，
  使用 Lightricks 的独立权重许可，见 `licenses/LTX-Video-Open-Weights-License-0.X.txt`。
- T5 XXL 编码器：独立下载，见 `workflows/models.json` 的来源和校验值。
- 旁白：台词为原创；使用 `zh-CN-YunxiNeural` 合成并保存实际词事件。
  复现语音需要可用的语音服务，使用者应遵守服务条款。本仓库不提供该声音的模型权重。

GSAP 依赖已从开源版三维渲染入口中移除；历史压缩包中的未使用副本未纳入Git跟踪。
原B站参考片的画面、音轨、字幕与水印均不包含在开源仓库或Release工程包中。
