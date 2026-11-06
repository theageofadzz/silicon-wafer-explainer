"""Export semantic scene actions and fixed native diffusion settings."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
timeline = json.loads((ROOT / "timeline.json").read_text())
actions = {
    "silica": ("石英断口切到硅氧结构；强调连接在硅上的氧", "二氧化硅是化合物，必须经过化学还原"),
    "reduction": ("炉体剖面切到电极下方的反应区域，再看熔融产物出料", "碳质还原剂在电炉中还原石英，产物还需提纯"),
    "distill": ("总览精馏塔，再切内部塔盘及不同组分的分流", "改变化学形态后，可借沸点差异进行分离"),
    "deposition": ("加热硅芯上径向沉积，保持硅芯长度和端部支座不变", "沉积增加棒体半径，产物为多晶硅"),
    "polycrystal": ("分别观察三个晶粒的取向，再切到独立的有序单晶结构", "纯度和结晶取向是不同要求；不演示晶粒自行转正"),
    "melt": ("石英坩埚剖面显示装料，颗粒体积逐渐减小，留下熔体", "高纯硅在坩埚中熔化，示意温度为1400多摄氏度"),
    "doping": ("晶格剖面中一个已有位点在“加入”时变色，保留四个近邻", "受控掺杂用于调节电阻率；标记比例不代表实际浓度"),
    "seed": ("籽晶接触液面，旋转提拉，凝固界面保持与液面相接", "籽晶确定新生晶体的取向"),
    "growth": ("细颈、放肩与等径段依次出现，镜头转向凝固界面", "温度和提拉速度共同控制形状，时间明显压缩"),
    "trim": ("端部沿切口分离，外圆磨削，再切定位缺口的近景", "修整形状与晶向定位是切片前的不同动作"),
    "slice": ("从多线锯滚轮总览切到线网与晶棒接触，再看分离薄片", "并行切割获得薄片，表面仍有损伤"),
    "lapping": ("边缘局部倒圆，双面研磨旋转，然后在剖面去掉损伤层", "研磨改善几何精度，蚀刻去除加工损伤"),
    "polish": ("抛光头接触旋转抛光垫，微距表面凸起减小，再看镜面", "化学机械作用共同整平表面"),
    "clean": ("夹具保持边缘接触，晶圆浸入清洗槽，示意颗粒随液流离开", "清洗去除污染；液体及颗粒尺寸均为示意"),
    "inspect": ("扫描光点与探头关联运动，再切双面测量和入盒", "光学检查与几何测量分别完成，不伪造检测实测数据"),
    "ending": ("洁净载具中的硅片逐层可见，再以空白片匹配加工晶圆", "硅片制备完成后才进入器件加工"),
}
shots = []
for index, scene in enumerate(timeline["scenes"]):
    action, fact = actions[scene["id"]]
    duration = scene["end"] - scene["start"]
    shots.append({
        "id": scene["id"], "input": f"model/guides/{scene['id']}.mp4",
        "kind": "precise-3d-motion-guide", "frames": 65, "fps": 65 / duration,
        "guideStrength": .93, "seed": 20261106000 + index,
        "prompt": (
            "A premium scientific technical film of the semiconductor manufacturing mechanism "
            "in the supplied precise motion guide. Preserve every mechanical part, material boundary, "
            "object silhouette, cutaway, atom position and physical action in the guide. "
            "Follow its exact camera angles, cuts and timing. Brushed silver steel, dark graphite, "
            "credible quartz glass, controlled soft studio strip reflections, crisp machining details "
            "and restrained realistic material response. Gray silicon atoms with green bonds remain "
            "rigid and connected exactly as shown. Hot silicon is softly amber. "
            "The mechanism moves only as in the guide. No extra structures, no morphing, no writing or graphics."
        ),
        "start": scene["start"], "end": scene["end"],
        "action": action, "fact": fact,
        "wordAnchors": [{"text": cue["text"], "start": cue["start"], "end": cue["end"]}
                        for cue in scene["captions"]],
        "readingHold": scene["end"] - scene["words"][-1]["end"]
    })
photos = [
    {"id": "hot-crystal", "input": "assets/inputs/hot-crystal.png",
     "prompt": "A scientific macro camera moves slightly upward across this actual photographed silicon crystal and its furnace environment. Preserve the photograph's actual rigid crystal, stationary furnace structure, glowing red hot zone and dark metal. Small parallax and changing highlights only. Real experiment photography. No growth transformation, no extra parts, no text, no watermark."},
    {"id": "silicon-seed", "input": "assets/inputs/silicon-seed.png",
     "prompt": "A premium scientific macro photograph of this real silicon seed crystal rod, kept exactly rigid with its true narrow shape and shiny tip. A very small sideways camera move reveals the real tip and notch with changing reflections. Preserve every edge and background. No bending, no growing, no added objects, no lettering."},
    {"id": "silicon-shoulder", "input": "assets/inputs/silicon-shoulder.png",
     "prompt": "A documentary macro shot of the actual single crystal silicon sample in this photograph. A small controlled lateral camera movement reveals the real metallic crystal surface, shoulder and subtle machining detail. Preserve its silhouette, true surface features and photographed surroundings. No morphing, no melting, no extra parts, no text."}
]
photos = [shot for shot in photos if shot["id"] != "hot-crystal"]
for i, shot in enumerate(photos):
    shot.update({"kind": "real-photograph", "frames": 65, "fps": 24,
                 "guideStrength": 1, "seed": {"silicon-seed": 20261106101, "silicon-shoulder": 20261106102}[shot["id"]]})
plan = {
    "nativeWidth": 576, "nativeHeight": 1024, "sampler": "euler_ancestral", "cfg": 1,
    "sigmaSchedule": "1.0000, 0.9937, 0.9875, 0.9812, 0.9750, 0.9094, 0.7250, 0.4219, 0.0",
    "decodeTileSize": 256, "decodeTemporalSize": 32, "decodeTemporalOverlap": 8,
    "negative": "Text, lettering, subtitles, logo, watermark, cartoon, plastic, low polygon, extra geometry, melting solid metal, changing parts, flicker, distorted atoms, disconnected bonds.",
    "shots": shots + photos
}
(ROOT / "shots.json").write_text(json.dumps(plan, ensure_ascii=False, indent=2))
rows = [
    "# 讲解动作与实际录音锚点",
    "",
    "秒为成片绝对时间。新增动作由实际词事件驱动；65帧引导视频对连续时间进行采样，并不平均分配图片。最终字幕保留完整词事件时间。摄影镜头不能代替尺寸与结构证据。",
    "",
    "| 时间 | 语句锚点 | 变化 | 解释事实 | 句尾观察停留 |",
    "| --- | --- | --- | --- | --- |"
]
for shot in shots:
    anchors = "；".join(f"{c['start']:.3f} {c['text']}" for c in shot["wordAnchors"])
    rows.append(f"| {shot['start']:.3f}–{shot['end']:.3f} | {anchors} | {shot['action']} | {shot['fact']} | {shot['readingHold']:.3f}s |")
(ROOT / "BEATS.md").write_text("\n".join(rows) + "\n")
print(f"Exported {len(shots)} guided scenes and {len(photos)} photographic shots")
