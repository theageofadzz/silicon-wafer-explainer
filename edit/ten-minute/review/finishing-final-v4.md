# Finishing 最终 v4 身份更新复核

2026-11-08。**从新冻结 MP4 重新提取并实际查看指定的 6 帧，四项旧 P1 在此次有限样本中依旧关闭；未发现要求重新打开这四项的问题。** 本报告是独立图像语义复核，不是全片或音频验收。

## 最终身份

- 影片：[silicon-wafer-10min-9x16-v4.mp4](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/silicon-wafer-10min-9x16-v4.mp4)
- 实际计算的影片 SHA-256：`a1630f9b4ec35eee9de9be4a486af72df45d0ceb11f38433e1c7f4706b941425`
- 实际计算的 `timeline.json` SHA-256：`279b3b7212988cf43878353a5015af95007c85c5d5198adf3204c5b574d2c6d8`
- 视频流：1080×1920、24 fps、598 秒、14352 帧。
- 本次使用 ffmpeg 从上述新 MP4 按原始视频帧号 `n` 选择 8981、8994、9797、10209、10389、10436，仅输出 6 张原尺寸 JPG，并逐张打开查看；没有复用旧 JPG 代替新片抽样。

## 六帧证据

帧号从 0 开始，编码时间为帧号除以 24。

| Beat | 输出帧 | 编码秒数 | 核对对象 | 新片提取图 |
| --- | ---: | ---: | --- | --- |
| 18-trim-03 | 8981 | 374.208333 | 线网与棒体接触、切缝前沿 | [01.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-finishing-final-v4-a1630f9b4ec35eee/01.jpg) |
| 18-trim-03 | 8994 | 374.750000 | 平行切面终态与线网位置 | [02.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-finishing-final-v4-a1630f9b4ec35eee/02.jpg) |
| 20-edge-02 | 9797 | 408.208333 | 上下研磨盘、驱动连接与工作板 | [03.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-finishing-final-v4-a1630f9b4ec35eee/03.jpg) |
| 21-polish-01 | 10209 | 425.375000 | 移动终态的喷嘴、液流及外露接触入口 | [04.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-finishing-final-v4-a1630f9b4ec35eee/04.jpg) |
| 21-polish-02 | 10389 | 432.875000 | “供液”终态的供液主体 | [05.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-finishing-final-v4-a1630f9b4ec35eee/05.jpg) |
| 21-polish-02 | 10436 | 434.833333 | 供液完成后的 hold | [06.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-finishing-final-v4-a1630f9b4ec35eee/06.jpg) |

## 四项结论

| 旧问题 | 本次新片实际观察 | 有限样本结论 |
| --- | --- | --- |
| 18-trim-03 切缝超前线网接触 | 两帧中切缝与线网接触位置相符，后帧平行切面随线网通过而贯通，未见切缝先跑到未接触区。 | 依旧关闭。 |
| 20-edge-02 上盘与工作板承力断开 | 上主轴接完整上盘，上下连接件接至相应工作板及盘体，旧的悬空承力段未再出现。 | 依旧关闭。 |
| 21-polish-01 供液路径被垫体截断 | 喷嘴出口的液流经过剖开垫前方，通向外露接触入口；未再呈现液流消失于实体垫上表面的旧形态。“化学作用区”标注靠近落点，本帧仍可辨认供液路径。 | 依旧关闭。 |
| 21-polish-02 供液主体不可见 | “供液”终态和 hold 均可见喷嘴、液流及工作垫前缘入口，供液主体没有消失。 | 依旧关闭。 |

上述判断来自新编码图像中的对象关系，不以像素变化、动作量或执行状态替代语义判断。

## JPG 身份与边界

按本报告 01–06 顺序记录新提取 JPG 的 SHA-256：

```text
01.jpg 129bb3ca007a81dda5d2f891420f50b229886cb422eb8ace39d68c443e1381bb
02.jpg baa693ed01013e1bb7d86ca654e2c4f5bf6b84f0b43f124ce027fa17cfd6e6c3
03.jpg 1c1d228c5c17c6ff0faa8d04b8d65ebcdea65ae07b2c8b7c2583719b0d15837c
04.jpg 2a66a149f98e4073f63ff0a801f24f6d583e7a7382c996730401282e1881d359
05.jpg e46b31e4a11dc64792a589eb61fb32e15a9a5d6c71826a6247ed1041322a633a
06.jpg f7329e717519e77d0b0ebc2de2fb86d4fefc17f9b31e49a45af95882cce20243
```

本次只看这 6 帧，没有追加邻帧、检查完整动作区间、精馏或包装改动及其他片段；未听音，未做正常速度音画审听。未修改源码、未渲染、未运行全片 verifier。

旧 [finishing-encoded-v4.md](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/review/finishing-encoded-v4.md) 保持原样，仍仅绑定 `889f5bb2…ff9820` 历史编码；新片的上述有限样本结论由本报告单独承载。
