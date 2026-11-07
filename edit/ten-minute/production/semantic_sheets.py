"""Arrange real reviewed frames at the end of each spoken semantic action."""
import json
import hashlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FONT = ROOT.parents[1] / "assets/fonts/NotoSansSC-Regular.otf"
face = ImageFont.truetype(str(FONT), 19)
small = ImageFont.truetype(str(FONT), 16)
timeline = json.loads((ROOT / "timeline.json").read_text())
model_sources = {f"model/{file.name}": hashlib.sha256(file.read_bytes()).hexdigest()
                 for file in (ROOT / "model").glob("*.mjs") if not file.name.startswith(".")}
rows = []
for scene in timeline["scenes"]:
    for beat in scene["beats"]:
        file = ROOT / "model/review" / f"{beat['id']}.json"
        if not file.is_file() or not beat.get("semanticPlan"):
            raise ValueError(f"Missing semantic review for {beat['id']}; run render.mjs --review")
        record = json.loads(file.read_text())
        if record.get("semanticVersion") != 3:
            raise ValueError(f"Legacy semantic review for {beat['id']}; run render.mjs --review")
        if record.get("modelSources") != model_sources or record.get("semanticPlan") != beat["semanticPlan"]:
            raise ValueError(f"Stale model review for {beat['id']}; run render.mjs --review before making sheets")
        if (record.get("visual") != beat["visual"]
                or any(abs(record.get(key, -1) - beat[key]) > 1e-6 for key in ("start", "end"))):
            raise ValueError(f"Review timing or visual changed: {beat['id']}; run render.mjs --review")
        samples = [(beat["start"], "动作开始前")]
        samples += [(event["end"], event["phrase"]) for event in beat["semanticPlan"]]
        panels = []
        for time, phrase in samples:
            state = min(record["states"], key=lambda s: abs(s["time"] - time))
            if abs(state["time"] - time) > 1e-6:
                raise ValueError(f"Missing exact action-end review frame: {beat['id']}/{phrase}")
            image = Image.open(ROOT / "model/review" / state["file"]).convert("RGB")
            panels.append((image, state["time"], phrase))
        rows.append((beat, panels))
out = ROOT / "output/semantic-sheets"
out.mkdir(parents=True, exist_ok=True)
for page in range(0, len(rows), 4):
    canvas = Image.new("RGB", (1440, 2240), "#f0f1ef")
    draw = ImageDraw.Draw(canvas)
    for row, (beat, panels) in enumerate(rows[page:page + 4]):
        y = row * 560
        draw.text((10, y + 5), f"{beat['id']}   {beat['start']:.2f}-{beat['end']:.2f}s", fill="black", font=face)
        count = max(4, len(panels))
        cell = 1440 // count
        for col, (image, time, phrase) in enumerate(panels):
            image.thumbnail((cell - 8, 476))
            canvas.paste(image, (col * cell + (cell - image.width) // 2, y + 40))
            draw.text((col * cell + 5, y + 518), f"{time:.3f}  {phrase[:17]}", fill="black", font=small)
    target = out / f"model-{page // 4 + 1:02}.jpg"
    canvas.save(target, quality=91)
    print(target)
