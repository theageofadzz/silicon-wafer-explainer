# Finishing v4 最终编码有界复核

**结论：本次指定的四项旧 P1，均在最终编码的有界图像复核中关闭；抽查范围内未发现新的实质阻断项。** 这是对四项修复的独立图像语义复核，不是全片验收或音频验收。

## 编码与证据绑定

- 最终影片：[silicon-wafer-10min-9x16-v4.mp4](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/silicon-wafer-10min-9x16-v4.mp4)
- 影片 SHA-256：`889f5bb2d859f131fe9b216d6a106971fadc16aad4da22330d7ecf3d33ff9820`
- Timeline SHA-256：`2949372566f0cd466a3ae5e9af1dcef87389673d40aa6cad33f896075f41b75e`
- 视频：1080×1920、24 fps、598 秒、14352 帧。帧号从 0 开始。
- `output/full-assembly.json`、`output/semantic-encoded.json` 均绑定上述最终影片 SHA。四个受检 beat 均为 `exact-code`，装配偏移为 0 帧，没有摄影插入覆盖；本表编码时间与 timeline 时间相同。
- 本次实际提取并查看 **10 张关键编码帧，另补 2 张相邻编码帧**。结束采样取事件动作结束时刻或之后的第一帧，不能把舍入后的编码时间当成原词事件结束时间。
- 完整证据索引及各 JPG SHA-256：[frames.json](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-finishing-v4-889f5bb2d859f131/frames.json)。

## 四项关闭结论

| Beat / 旧问题 | 最终编码中实际可见的修复 | 本次结论 |
| --- | --- | --- |
| 18-trim-03：切缝前沿超前线网接触 | “同时加工许多平行切面”的中点与结束帧中，线网进入棒体，切缝位于已经接触、通过的区域；结束帧中平行切面随线网推进贯通，未再出现切缝先跑到未接触区。 | 在所查中点与终态关闭。 |
| 20-edge-02：上盘与工作板承力连接断开 | “两面更平行”“厚度接近目标”终态中，完整上盘与主轴相接，上下连接件接到工作板及对应盘体；旧图中的悬空承力段未再出现。 | 在所查两处终态关闭。 |
| 21-polish-01：喷嘴到实际接触区的供液路径断开 / 被垫体截断 | “抛光液”和“移走材料”终态中，液流从喷嘴连续经过剖开垫前方，到达外露接触入口；材料移除终态及其前后各一帧仍能辨认该路径。接触区附近的“化学作用区”标注没有遮断供液主体。 | 在所查终态及相邻帧关闭。 |
| 21-polish-02：“供液”主体不可见 | “供液”终态和结束后的停留帧中，喷嘴、液流、白色工作垫前缘的外露接触入口连续可辨，未再只有喷嘴而缺少通向接触入口的供液主体。 | 在所查终态与停留帧关闭。 |

关闭依据是最终编码图像中的接触、承力及供液关系；不以像素变化、动作数量或 JSON 布尔状态单独证明语义成立。

## 实际编码帧索引

时间单位均为秒；括号内为便于定位的分秒时间。邻帧与停留帧仍列出其对应的原事件结束时间。

| Beat | 台词事件 / 采样位置 | Timeline 事件结束 | 输出帧 | 编码时间 | 实际查看的 JPG |
| --- | --- | ---: | ---: | --- | --- |
| 18-trim-03 | 同时加工许多平行切面 / 中点 | 374.715793 | 8981 | 374.208333（06:14.208） | [01.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-finishing-v4-889f5bb2d859f131/01.jpg) |
| 18-trim-03 | 同时加工许多平行切面 / 结束 | 374.715793 | 8994 | 374.750000（06:14.750） | [02.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-finishing-v4-889f5bb2d859f131/02.jpg) |
| 20-edge-02 | 两面更平行 / 结束 | 406.909156 | 9766 | 406.916667（06:46.917） | [03.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-finishing-v4-889f5bb2d859f131/03.jpg) |
| 20-edge-02 | 厚度接近目标 / 结束 | 408.197078 | 9797 | 408.208333（06:48.208） | [04.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-finishing-v4-889f5bb2d859f131/04.jpg) |
| 21-polish-01 | 抛光垫 / 结束 | 420.807184 | 10100 | 420.833333（07:00.833） | [05.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-finishing-v4-889f5bb2d859f131/05.jpg) |
| 21-polish-01 | 抛光液 / 结束 | 421.633820 | 10120 | 421.666667（07:01.667） | [06.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-finishing-v4-889f5bb2d859f131/06.jpg) |
| 21-polish-01 | 移走材料 / 前一帧 | 425.351647 | 10208 | 425.333333（07:05.333） | [neighbor-1.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-finishing-v4-889f5bb2d859f131/neighbor-1.jpg) |
| 21-polish-01 | 移走材料 / 结束 | 425.351647 | 10209 | 425.375000（07:05.375） | [07.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-finishing-v4-889f5bb2d859f131/07.jpg) |
| 21-polish-01 | 移走材料 / 后一帧 | 425.351647 | 10210 | 425.416667（07:05.417） | [neighbor-2.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-finishing-v4-889f5bb2d859f131/neighbor-2.jpg) |
| 21-polish-02 | 突起逐渐被削低 / 结束 | 430.092393 | 10323 | 430.125000（07:10.125） | [08.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-finishing-v4-889f5bb2d859f131/08.jpg) |
| 21-polish-02 | 供液 / 结束 | 432.856479 | 10389 | 432.875000（07:12.875） | [09.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-finishing-v4-889f5bb2d859f131/09.jpg) |
| 21-polish-02 | 供液 / 结束后停留 | 432.856479 | 10436 | 434.833333（07:14.833） | [10.jpg](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/output/semantic-baseline/critic-finishing-v4-889f5bb2d859f131/10.jpg) |

切割事件的实际区间为 373.665793–374.715793 秒；中点请求为 374.190793 秒，编码帧向后取至 374.208333 秒。所有其他原始事件起止、采样请求及输出映射均保存在上述 `frames.json`。

## 范围限制与历史

本轮只完成上述四项旧问题的最终编码图像关闭复核，未扩大至其他 beat 或整片；未听音，也未做正常速度音画审听。稀疏关键帧和三帧邻域不代表整个动作区间已逐帧检查。

未修改源码、模型、相机或标签，未启动渲染，未另跑 full verify；父任务完整验证的完成情况不作为本报告图像判断的替代证据。

模型预检与初轮发现保留在 [finishing-repair-preflight-v4.md](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/review/finishing-repair-preflight-v4.md)，本轮未覆盖该历史报告。本报告提供独立的最终编码证据及其有限范围内的关闭结论。
