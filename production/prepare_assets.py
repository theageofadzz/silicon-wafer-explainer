"""Prepare credited photographic I2V inputs without synthesizing source pixels."""
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/sources.json"


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


records = json.loads(SOURCE.read_text())["records"]
used = []
for name in ["silicon-seed", "silicon-shoulder"]:
    file = ROOT / f"assets/photos/{name}.jpg"
    image = ImageOps.exif_transpose(Image.open(file)).convert("RGB")
    fitted = Image.new("RGB", (576, 1024), (24, 25, 27))
    picture = ImageOps.contain(image, (576, 880))
    fitted.paste(picture, ((576 - picture.width) // 2, (1024 - picture.height) // 2))
    target = ROOT / f"assets/inputs/{name}.png"
    fitted.save(target)
    record = next(r.copy() for r in records if r["file"] == f"assets/photos/{name}.jpg")
    record["file"] = f"assets/photos/{name}.jpg"
    record["input"] = str(target.relative_to(ROOT))
    record["inputSHA256"] = digest(target)
    record["modifications"] = "EXIF orientation; proportional contain on charcoal background, or central portrait crop. ComfyUI invents camera motion, not an actual recording."
    record["used"] = True
    used.append(record)
used.extend(record for record in records if not record.get("used", True))
(ROOT / "assets/sources.json").write_text(json.dumps({
    "date": "2026-11-06", "records": used,
    "openingSources": "opening/assets/v3-real/sources.json",
    "limits": "The Avogadro photo documents a silicon crystal experiment, not a generic industrial production line. Natural quartz is not evidence of industrial purity."
}, ensure_ascii=False, indent=2))
print("Prepared", len(used), "credited inputs")
