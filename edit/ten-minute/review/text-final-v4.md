# v4 冻结成片文字差异复核

日期：2026-11-08。

成片：`/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/silicon-wafer-10min-9x16-v4.mp4`

成片 SHA256：`a1630f9b4ec35eee9de9be4a486af72df45d0ceb11f38433e1c7f4706b941425`

时间轴 SHA256：`279b3b7212988cf43878353a5015af95007c85c5d5198adf3204c5b574d2c6d8`

新 `review/ocr-full.json`、`review/ocr-labels-full.json` 及 `output/full-verification.json` 的成片 SHA 均与上述一致，verifier 的时间轴 SHA 也一致。本轮重新打开新 verifier 提取的 4 张字幕 crop 和 15 张标签 image，逐张复核实际像素；未用旧报告代替新证据。旧 `text-review-v4.md` 保留为 `889f…` 历史记录。

## 结论与原始计数

限定的 19 张图均已查看，未发现实际错字、缺字、裁切或文字被遮挡的阻断项。以下结论只适用于这些采样时刻。

- 字幕 OCR 原始匹配数仍为 **331/335**，4 项不匹配。
- 标签 OCR 原始完全匹配 beat 数仍为 **69/84**，15 个 beat 不匹配，共涉及 16 个被报缺失字符串。
- 图像复核不改写 OCR 原始结果，不表述为“OCR 全通过”。
- `抛/拋` 保持为字形识别差异的中性记录，编码字形完整可读；不从 OCR 输出推断实际打印繁体。

## 4 张字幕 crop

时间单位为秒；帧号从 0 起，24 fps，精确采样时刻为帧号除以 24。表中小数四舍五入至毫秒。

| 证据 | 时间 / 帧号 | OCR 差异 | 新图观察 |
|---|---:|---|---|
| [09-feedstock-01 / caption-0098](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/caption-0098-crop.png) | 170.875 / 4101 | `清理并洁净包装` → `清理井洁净包装` | 实帧可读为“清理并洁净包装”，“并”的上部笔画完整；未缺字、裁切或遮挡。 |
| [21-polish-01 / caption-0234](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/caption-0234-crop.png) | 421.250 / 10110 | `抛光垫和抛光液共同作用` → 首字识别为 `拋` | 全句完整可读。`抛/拋` 为字形识别差异，不推断打印繁体；未裁切或遮挡。 |
| [24-epitaxy-03 / caption-0278](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/caption-0278-crop.png) | 502.167 / 12052 | `抛光片和外延片` → 首字识别为 `拋` | 全句完整可读。`抛/拋` 为字形识别差异，不推断打印繁体；未裁切或遮挡。 |
| [28-recap-02 / caption-0328](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/caption-0328-crop.png) | 586.375 / 14073 | `再切磨抛` → 末字识别为 `拋` | 四字完整可读。`抛/拋` 为字形识别差异，不推断打印繁体；未裁切或遮挡。 |

## 15 张标签 image

以下均为新抽取的 `action-<beat>-7.jpg`。时间与帧号取新 `full-verification.json` 对应动作条带的 `times[7]`。

| 证据 | 时间 / 帧号 | 被 OCR 报缺失的文字 | 新图观察 |
|---|---:|---|---|
| [03-order-03](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/action-03-order-03-7.jpg) | 62.417 / 1498 | `加工 → 检测`；`还原 → 提纯 → 生长` | 两条均完整；箭头有可辨箭头尖，未变成实际打印的“一”。文字无裁切、遮挡。 |
| [04-quartz-01](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/action-04-quartz-01-7.jpg) | 68.667 / 1648 | `石英：SiO₂` | 标签完整，下标 ₂ 可辨，未打印成 OCR 返回的 z；无裁切、遮挡。 |
| [04-quartz-02](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/action-04-quartz-02-7.jpg) | 75.125 / 1803 | `硅—氧网络` | 文字及中间连接号完整，未被原子球或引线盖住。 |
| [05-furnace-02](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/action-05-furnace-02-7.jpg) | 97.125 / 2331 | `总体反应：SiO₂ + 2C → Si + 2CO` | 完整可读；O、下标 ₂、加号及箭头均在，未见字母被裁切或遮挡。 |
| [06-transform-01](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/action-06-transform-01-7.jpg) | 111.333 / 2672 | `工业硅 → 氯硅烷` | 上部流程文字及箭头完整；无裁切、遮挡。 |
| [11-seed-02](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/action-11-seed-02-7.jpg) | 223.875 / 5373 | `接触 → 凝固 → 提拉` | 三个词及两枚箭头完整；未被晶格模型覆盖。 |
| [12-neck-02](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/action-12-neck-02-7.jpg) | 244.833 / 5876 | `位错在侧面终止` | 底部黑底说明完整可读，与上方位错线、侧壁标签分开；实际未隐藏、裁切或遮挡。 |
| [16-control-01](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/action-16-control-01-7.jpg) | 320.000 / 7680 | `具体要求取决于用途` | 底部说明完整；OCR 的“决/決”差异不构成实际缺字，无裁切、遮挡。 |
| [21-polish-01](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/action-21-polish-01-7.jpg) | 427.833 / 10268 | `抛光垫` | 局部标签完整可读；`抛/拋` 为识别差异，不推断打印繁体。无裁切、遮挡。 |
| [21-polish-03](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/action-21-polish-03-7.jpg) | 442.625 / 10623 | `双面加工 / 精抛` | 上部说明完整，斜杠清楚；`抛/拋` 为识别差异，不推断打印繁体。无裁切、遮挡。 |
| [23-clean-02](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/action-23-clean-02-7.jpg) | 478.500 / 11484 | `分步清洗 → 漂洗 → 干燥` | 流程文字及箭头完整；未被供气管或清洗盘覆盖。 |
| [25-inspect-01](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/action-25-inspect-01-7.jpg) | 515.083 / 12362 | `多项指标分别检测` | 底部黑底说明完整可读，与上方检测设备分开；实际未隐藏、裁切或遮挡。 |
| [27-industry-03](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/action-27-industry-03-7.jpg) | 576.833 / 13844 | `共同决定量产能力` | 底部说明完整；OCR 的“决/決”差异不构成实际缺字，无裁切、遮挡。 |
| [28-recap-01](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/action-28-recap-01-7.jpg) | 582.667 / 13984 | `还原 → 提纯` | 上部流程标签完整，箭头可辨；无裁切、遮挡。 |
| [28-recap-02](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/review-full/action-28-recap-02-7.jpg) | 589.708 / 14153 | `单晶生长 → 表面加工` | 中上部流程文字及箭头完整；无裁切、遮挡。 |

## 验收边界

指定 19 张新证据图范围内没有未查看项；文字差异复核未见阻断。未检查其余字幕样本、标签匹配 beat 或其他时刻，不据此声称整片文字全时段无误、标签语义通过或人耳听审通过。未修改生产源码，未重跑 verifier、OCR 或生成任务；本轮仅新增本报告。
