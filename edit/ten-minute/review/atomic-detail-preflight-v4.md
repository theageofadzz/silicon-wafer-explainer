# Atomic Detail V4 模型预检

结论：本次指定范围内未发现明确阻断项（0 项），无需据此阻止进入后续合成审图。**这是未合成模型预检，不是最终验收。**

2026-11-07，由非 atomic 作者进行独立图像语义复核。实际查看下列 5 个 beat 的 95 张既有 JPG，并对照其 JSON 中逐词 q、相机和对象状态；重点放大检查透明石英、缺陷迁移中间帧及外延界面。只判断明确误导、遮挡和主体不可见，不列美术偏好或推测性问题。

## 逐 Beat 结论

时间为模型统一时间轴的秒数，区间为现有 semanticPlan 动作窗口；不是本次重新测得的音频词时间。

| Beat / 图数 | 核对的 q 词窗口 | 图像复核依据 | 阻断项 |
| --- | --- | --- | --- |
| 04-quartz-01 / 16 | 透明 63.895–64.545；乳白 64.979–65.629；主要成分 66.255–67.055 | [透明标本终态](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/04-quartz-01-04.jpg)有可辨内部及叠合晶面；[乳白标本](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/04-quartz-01-09.jpg)与其外观可区分。[成分局部](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/04-quartz-01-14.jpg)与宏观标本分开展示，有延续的 Si–O 连接，未画成纯硅块或孤立三原子分子。 | 无 |
| 04-quartz-03 / 19 | 洗得再干净 76.474–77.324；不能直接做芯片 77.697–78.347；洗掉泥土 79.254–80.004；并没有改变物质 80.396–81.146 | [内部网络](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/04-quartz-03-09.jpg)、[泥土离开](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/04-quartz-03-14.jpg)及[最终保留网络](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/04-quartz-03-17.jpg)可区分外来污物与化学结合结构。未见水洗移走网络中的氧或把石英直接变成制芯硅的展示。 | 无 |
| 03-order-02 / 19 | 同一套晶格取向 48.701–49.851；连续的网 50.788–51.588；而不是 51.815–52.515；不同方向 53.061–53.611 | [主晶格](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/03-order-02-04.jpg)取向一致；[连续连接局部](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/03-order-02-09.jpg)能读出跨区近邻键。[错向比较终态](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/03-order-02-17.jpg)仍是取向不同的独立晶粒，靠近后未自动对齐或融合。局部镜头裁去晶格边缘未导致作用点消失。 | 无 |
| 17-defects-02 / 22 | 冷却 342.803–343.353；可能聚集 343.369–344.469；生长速度 344.660–345.310；温度梯度 345.802–346.452；后续热过程 346.725–347.425 | 空位以缺失位点及环形提示表达，绿色额外原子与之可区分。[聚集中间帧](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/17-defects-02-08.jpg)能辨邻位原子交换与引导线，未把点缺陷替换为位错线。[生长控制](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/17-defects-02-14.jpg)、[梯度控制](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/17-defects-02-17.jpg)和[热过程终态](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/17-defects-02-20.jpg)各有对应对象，缺陷未被热区直接抹除。 | 无 |
| 24-epitaxy-01 / 19 | 受控条件 488.266–489.016；气相原料 489.661–490.611；硅片表面 490.676–491.276；形成新的单晶层 491.541–492.141 | [腔体及受支承硅片](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/24-epitaxy-01-04.jpg)、[供气阶段](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/24-epitaxy-01-09.jpg)可见；490.635 s [切镜前](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/24-epitaxy-01-10.jpg)到 490.676 s [表面局部](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/24-epitaxy-01-11.jpg)明确改变观察尺度，腔壁未挡住局部。白色衬底与薄荷绿新原子在[界面阶段](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/24-epitaxy-01-14.jpg)及[生长终态](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/24-epitaxy-01-17.jpg)保持取向及连接；绿色矩形是轮廓引导，未显示成悬浮实体膜片。 | 无 |

## 状态交叉核对

JSON 只用于确认采样时点、对象身份和状态，不替代看图，也不以像素变化、动作计数或 `nonblank` 判定语义通过。

- 石英：局部 Si 配位为 4，氧桥接两个 Si；清洗期间记录的原网络坐标不变、Si–O 断键为 0。图像中的外来泥土与保留网络相符。
- 晶格：主晶格跨区连接增加，比较晶粒保持不同取向。图像中连续主网与独立错向比较能分辨。
- 缺陷：空位及间隙原子各 2 个，迁移为示意、非弛豫原子模拟；热过程结束后仍保留缺陷。中间图未显示缺陷类型被替换。
- 外延：宏观设备与原子局部采用分离尺度；局部界面先出现新位点及连接，后续完成层数由 0 增至 3。`layerCount: 0` 的表面阶段不等于无新位点，实际图像中已有部分新原子。未将供气标记当作分子式或真实反应机理验收。

## 快照绑定

只采用下列 JSON 的 `states[].file` 所列 JPG，未将目录中残留的旧编号图混入本次 95 张。五份状态均为 `visualRevision: 4`、`synthetic: false`，JPG 为 576×1024，`textBurnedIn: false`。写报告前复核，atomic 两个源码哈希与这些快照的 `modelSources` 一致。

| 状态文件 | SHA-256 |
| --- | --- |
| [04-quartz-01.json](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/04-quartz-01.json) | `d9e9578ba62990b0e073f6dd85dfb8eee759ae5b2493c3f1edf593eda42d8829` |
| [04-quartz-03.json](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/04-quartz-03.json) | `92d1863b52bb4384dce1f4efb0e5a0590e2006163d6e5f0cfc597ef274a98dc1` |
| [03-order-02.json](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/03-order-02.json) | `45f603ca7198deff35df0c702886546ef52873eae3e62e5685fa5e611468859a` |
| [17-defects-02.json](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/17-defects-02.json) | `5ad25d599954e8d77a37c907c678c4c9ccc0871f7cc3d3a767ec279078f32773` |
| [24-epitaxy-01.json](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/24-epitaxy-01.json) | `9258f52db077d96fbd273102ee63818fedb58bfc9c07ad819794c7662b233f03` |

```text
atomic.mjs          b88e28ef8033630c4d7233de1eafc45c507546fc88b6d539a61c2f8ac909baeb
atomic-detail.mjs   136476b707c1897d9f6a7239590f7a333e8f6bbbbf5a410585a00508d3f57267
finishing.mjs       40f134996ea5330792f3d945ebea3d7ffb28ef0f01b8d6453faf66af6ff602e8
finishing-detail.mjs 0eeec19644c536d4172438ba1dd42e4e8bf03cd5717a63ac6a4e02aa0079b089
```

finishing 两个文件保持原冻结哈希。本次仅新增本报告，未改源码，未渲染，未播放音频。

## 预检边界

本报告记录未合成模型 JPG 的独立图像语义复核，不代表最终编码、整段正常速度播放、音画对齐或全片验收。字幕、最终文字标注、摄影插入和合成遮盖不在这些未烧字模型图的检验范围；JSON 中部分标注的隐藏/出框提示也不能据此宣称最终文字已通过。当前“0 项阻断”仅对应上述五个 beat、95 张实际图像及其绑定状态。
