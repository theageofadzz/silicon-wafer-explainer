# Finishing 修复模型预检

2026-11-07，有界、只读的独立图像语义复核。**这是未合成模型预检，不是最终编码或音频验收。**

最新结论：**可以冻结本次修复范围。** 19:34 更新的三段模型图已完成下述 5 帧复核，研磨承力连接、CMP 移动后的供液入口及第二段抛光供液不可见问题均在本轮模型抽查中关闭；切缝前沿沿用上一轮关闭结论。本次指定范围未发现仍需阻止源码冻结的明确问题。仅为模型预检，不代表最终合成或音频通过。

## 最新补核：19:34 快照

只查看以下 5 张 1080×1920 原生图，并对照其 JSON。三份 JSON 于 2026-11-07 19:34:52–54 CST 更新，均绑定当前 `finishing.mjs` SHA-256 `ebd71e1c356242eb8910895f05542cd071a028702485f4e986afed47fdd7299e`。

| 范围 | 实际查看的新图 | 关闭依据 |
| --- | --- | --- |
| 20-edge-02 上下工作板连接 | [406.459 秒，平行度 q=.5](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/20-edge-02-03.jpg)、[408.197 秒，厚度 q=1](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/20-edge-02-09.jpg) | 完整上盘与主轴相接，两侧连接件到达白色上工作板；厚度终态中下侧连接件也可辨认地接到下工作板及下盘。旧图中杆上端悬空的空段不再出现。模型范围关闭。 |
| 21-polish-01 移动后的液流落点 | [425.352 秒，移走材料 q=1](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/21-polish-01-19.jpg)、[427.833 秒，末态停留](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/21-polish-01-20.jpg) | 前部剖开后，液流从喷嘴连续经过切面前方，抵达白色垫下缘与外露接触区。末态仍可见完整路径，没有消失在上方实体垫内。模型范围关闭。 |
| 21-polish-02 供液可见性 | [434.833 秒，供液完成后的末态](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/21-polish-02-20.jpg) | 喷嘴及液流位于工作垫前方，液流下端到达白色工作垫下缘的外露入口；不再只有喷嘴而看不到供液主体。模型范围关闭。 |

最新证据 SHA-256：

```text
20-edge-02.json 4075925a9d89e8ce62c3c7ee25e317bf887e91b17f4a919a386d04eb9747d4cf
21-polish-01.json 11539a2f547cfc9d9729b91908a2d920a4d521416406758a6ec23fc6938df4e7
21-polish-02.json f8240d6be3865acb06ef767ddc0975a64ac3016012f01f56b9e149151c9602be
20-edge-02-03.jpg 7e8ba369609524a4e0e3529a86937702d859cef497fe91d0c172ca11dec78f28
20-edge-02-09.jpg 21f8d8abffcea1dc881559e65071388ffea4a8cdba9649a41b26a2d3cb687349
21-polish-01-19.jpg 13e327e5ddee9c66474b3bd3b22843f7adeb913b3c3e7cb5e35f122fa20313df
21-polish-01-20.jpg 13e327e5ddee9c66474b3bd3b22843f7adeb913b3c3e7cb5e35f122fa20313df
21-polish-02-20.jpg c66e234235c0e05ea49c2a79670ffe7b6e20abd5d4f57649c1b78eb0c0483747
```

本轮只补写报告，未修改源码、相机或标签，未启动渲染，未播放音频。以下保留上一轮发现及哈希作为历史；原 JPG 路径已被新版图覆写，以下未关闭语句不代表当前状态，以本节及其哈希为准。

## 历史：上一轮未关闭项

### P1：21-polish-01 移动后液流进入垫体，上下接触入口没有被解释

- 词组：“移走材料”，424.502–425.352 秒。
- [425.352 秒，移走材料 q=1](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/21-polish-01-19.jpg)：液流与喷嘴口已接续，但垫移动后，可见液流落在白色垫的上表面并被垫体截断；未见其抵达垫下方与硅表面的接触入口。
- [421.309 秒，抛光液 q=.5](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/21-polish-01-08.jpg)及[421.634 秒，q=1](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/21-polish-01-09.jpg)证明原来的喷嘴到孤立液滴群的空气间隔已经修正；这只关闭了供液路径的起点断开，未关闭后续落点问题。
- 只读源码交叉核对：最终垫心 x=.5，垫高范围约 y=.12–.34；设定落点 `(1.25,.145,.28)` 在垫的水平圆形投影内，且高度处于垫体内部。该位置不是硅表面上的外露供液入口，和图中“液流消失于垫上面”的现象一致。`slurryFromOutletToContact:true` 不作为关闭依据。

### P1：21-polish-02 “供液”结束时供液路径不可见

- 词组：“供液”，432.156–432.856 秒。
- [432.856 秒，供液 q=1](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/21-polish-02-19.jpg)：右侧喷嘴可见，但没有可辨认的液流或液滴接续到白色工作垫与硅表面的入口。供液这一解释主体未在该终态呈现。
- 同帧 JSON 的 `slurrySupply=1`、`jointConditions=true` 只说明状态已执行，不能替代图像里的供液动作。此项来自本次用户指定的第二个抛光 beat 抽查，不是对其他段落扩大审查。

## 历史：上一轮关闭与证据边界

| 旧 P1 | 实际图像证据 | 模型预检结论 |
| --- | --- | --- |
| 18-trim-03 切缝跑在线网前面 | [374.191 秒，切割 q=.5](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/18-trim-03-13.jpg)中线网已进入棒体中部，切缝位于已通过区域；[374.716 秒，q=1](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/18-trim-03-14.jpg)中线网到达上沿，平行切面随之贯通。对应 JSON 的前沿和线高分别同为约 0、.76，与图像相符。 | 在该修复后快照的两张关键图中关闭。不是全片或最终编码结论。 |
| 20-edge-02 上驱动盘与工作板承力断开 | [406.459 秒](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/20-edge-02-03.jpg)、[407.772 秒](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/20-edge-02-08.jpg)已出现连接杆，但杆上端与可见上盘之间仍有空段。该组图及 JSON 为 19:21 的 `f627180e…` 快照，早于当前源码；当前源码可读到完整圆柱上盘和连接件，不能把旧图空段直接判给当前完整上盘修复，也不能据源码宣称图像已通过。 | 暂不判关闭。需要父任务刷新该段对应关键图；本次未另行启动渲染。 |

## 历史：上一轮抽查范围与绑定

实际打开 **8 张 1080×1920 原生 JPG**：18-trim-03 的 13/14；20-edge-02 的 03/08；21-polish-01 的 08/09/19；21-polish-02 的 19。另只对其中两张已有 JPG 做局部放大，未增加模型采样。逐一对照各自 JSON 的绝对时间及 q，不以动作量、像素变化、布尔标志或文件更新时间代替看图。

21-polish-01/02 的 JPG、JSON 已于 **2026-11-07 19:27:36–37 CST** 更新，二者绑定的 `finishing.mjs` SHA-256 与本次读取的当前文件相同：

```text
4be82778c6f33c337e45433c5a7e443d8eb5a08e9b6842fc2bf0b85e3e4ca02d
```

其他两组按其实际快照单独记录，没有冒称全部绑定当前源码：

| Beat | JSON 修改时间（CST） | JSON 记录的 finishing.mjs SHA-256 |
| --- | --- | --- |
| 18-trim-03 | 19:16:58 | `4755faf46a4c7a29a44226f4c5e203890488bd692efa8e587d9664ad8b5667f6` |
| 20-edge-02 | 19:21:20 | `f627180e6111eb2ced5267aa9096b8104b8499d98ce177bcfa437ad0aac30e0e` |

以下保留本次实际关键图的 SHA-256，防止原路径后续覆写造成证据混用：

```text
18-trim-03-13.jpg 90c7fc12502c8f2971d41f6190fa88e80586dc9f101d7dc4f32a37dbd95935e4
18-trim-03-14.jpg 433e08b5e3abe8b741d8c2f9bf431c711c3cfbf818c4b96c1a24d358f5595347
20-edge-02-03.jpg 89191d50ef43361fa1bab7eb2dd0736d2255ef15027b859980f96c53ddffe2eb
20-edge-02-08.jpg 97fbdbf204845636a146e8f000ce4300652f6fa811fd7af5359c8eecc10037d8
21-polish-01-08.jpg 2d27a89013bcd0e93048223413c3dd8c84384b9db704084edb45780521a0d281
21-polish-01-09.jpg a04c3865afb85b2103c18427c4ed12ca26ce57bfc1a52576bc3ded60c0da0b07
21-polish-01-19.jpg 64ebdc15b1d344645cf159d748fb39e5c549563d9b19144bf6277f6afc67bca1
21-polish-02-19.jpg 1dd266f59a192b0f4dcf3b8c3c2e1116025d8de8886d0b675fc944c20a34b029
```

本次仅新增本报告；没有修改源码、相机或标签，没有运行模型渲染，也没有播放音频。上述结论不覆盖最终合成的字幕、标注、摄影覆盖及编码结果。
