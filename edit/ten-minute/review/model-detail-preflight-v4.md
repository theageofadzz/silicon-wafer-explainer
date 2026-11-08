# v4 后处理模型细节预检

结论：发现 3 项 P1 阻断，建议修正后再冻结对应片段。这里只检查指定五段的词组状态与实际 JPG，不是最终成片验收。

范围：`18-trim-03 / 20-edge-02 / 21-polish-01 / 23-clean-02 / 25-inspect-02`，`visualRevision=4`、`semanticVersion=3`。任务开始时为 576×1024 预览；复核期间部分文件被正式渲染覆写，下列引用的 18/20/21 JPG 在读取时已为 1080×1920。全部仍是直接模型画面，未合成字幕、标注或摄影。时间取对应 review JSON 的全片绝对秒数，未进行音频听审。只读核对源码，没有修改模型或启动生成。

## 1. P1：多线切割的切缝跑在线网前面

- 词组：“同时加工许多平行切面”，06:13.666–06:14.716。
- 实帧：[中点 06:14.191](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/18-trim-03-13.jpg)、[结束 06:14.716](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/18-trim-03-14.jpg)。中点已经出现一排向上发展的切缝，而实际线网仍在棒体下方；结束帧切缝贯穿到顶部，线网却只升到棒体中部附近。
- 只读结构核对：[multiwire](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/finishing.mjs:275)。进给完成后棒心为 y=0、半径 0.76；切缝前沿为 `-0.76+1.52u`，实际线高却为 `-1.8+1.72u`。中点前沿已到 y=0，线高仍为 -0.94，低于棒底 -0.76；结束时线高仅 -0.08，前沿已到棒顶 0.76。这些是模型坐标，不是制造尺寸。
- 最小修正：由同一个实际接触高度驱动线网相对进给与材料去除前沿，保证任何新切缝都由经过该位置的线产生；保持上方安装条承托。当前画面会把多线切割解释成工具尚未到达、材料先自行分片。

## 2. P1：双面研磨上驱动盘与工作板之间断开

- 词组：“两面更平行”及“厚度接近目标”，06:46.009–06:48.197。
- 实帧：[06:46.459](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/20-edge-02-03.jpg)、[06:47.772](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/20-edge-02-08.jpg)。横梁主轴连接着上方黑色半圆盘，但该盘与夹住硅截面的白色上工作板之间始终有明显空气间隔；白板自行调平、靠近，主轴和黑盘没有随动承力连接。
- 只读结构核对：[doubleLapping](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/finishing.mjs:468)。黑盘中心固定在 y=1.03，白板中心按 `h+0.1` 改变，两者没有连接机构。这不是透视遮挡造成的假缝。
- 最小修正：补上随动压头或连接件，让上驱动盘与实际工作板组成可辨认的承力链；若保留截面放大示意，应明确分开机器总览与放大截面，避免当前同一装置里悬空工作板执行加工的关系。

## 3. P1：抛光液没有从喷嘴接续到接触区

- 词组：“抛光液”，07:00.984–07:01.634。
- 实帧：[中点 07:01.309](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/21-polish-01-08.jpg)、[结束 07:01.634](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/review/21-polish-01-09.jpg)。中点喷嘴口与垫边的孤立液滴群之间留有明显空段；结束时液滴进入垫下不可见，而喷嘴仍悬在右上方，没有可辨认的输液路径。
- 只读结构核对：[cmpContact](/Volumes/联想硬盘/视频/videos/silicon-wafer-explainer/edit/ten-minute/model/finishing.mjs:537)。喷嘴端点固定为 `(0.9,0.65,0)`；所有液滴随词组进度成团移向 `(0.3,0.15,z)`，没有从喷嘴持续补入的轨迹。实际缺失的是“喷嘴供液进入接触区”的连接，不是储液罐细节。
- 最小修正：将液流或有间隔的液滴轨迹起点固定在喷嘴口，终点落到可见的垫边/工件接触入口；后续垫运动时保留供液关系。

其余两段抽查未形成新的具体阻断：`23-clean-02` 的中心承托存在，漂洗流能落到片面，污染物位于下方收集区；`25-inspect-02` 抽查的扫描、散射、关联运动及覆盖状态中，光源与光点、异常点与侧收集头的对应关系可辨。此说明不等于这两段或全 84 段通过最终验收；上述三项修复后仍需在最终编码中复核接触关系、词组落点和标注遮挡。
