"""Create a phrase-aligned overview from the exact final encode without changing it."""
import argparse
import hashlib
import io
import json
import math
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SELECTION = [
    ("01-start-01", "表面亮得像镜子", "镜面外观"),
    ("02-purity-02", "剩余杂质", "纯度与剩余杂质"),
    ("03-order-02", "连续的网", "单晶的连续取向"),
    ("07-distill-02", "分别收集", "精馏与分别收集"),
    ("10-melt-01", "多晶硅装进", "装料：多晶硅进入坩埚"),
    ("10-melt-01", "石墨支撑", "支撑：石墨支撑坩埚"),
    ("10-melt-01", "热场", "热场：外围加热结构"),
    ("10-melt-01", "固体逐渐变成熔体", "熔化：固体变为熔体"),
    ("12-neck-02", "位错在侧壁终止", "缩颈与位错终止"),
    ("17-defects-01", "挤进正常位置之间", "空位与间隙原子"),
    ("19-slice-01", "逐步去除硅", "金刚线切片"),
    ("21-polish-02", "突起逐渐被削低", "抛光削低突起"),
    ("22-flatness-02", "同时处在合适的焦点", "表面高低与光刻焦点"),
    ("24-epitaxy-02", "电阻率", "外延层与衬底"),
    ("25-inspect-02", "关联运动", "表面扫描与检测"),
    ("26-shipping-03", "互连", "后续器件制造与互连"),
]


def sha(file):
    digest = hashlib.sha256()
    with file.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def extract_frame(file, frame, fps, size):
    seek = max(0, frame / fps - 1e-6)
    result = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostdin", "-v", "info", "-copyts",
         "-ss", f"{seek:.9f}", "-i", str(file), "-map", "0:v:0",
         "-vf", f"showinfo,scale={size[0]}:{size[1]}:flags=lanczos",
         "-frames:v", "1", "-fps_mode", "passthrough", "-an",
         "-threads", "1", "-c:v", "png", "-f", "image2pipe", "pipe:1"],
        capture_output=True, check=True)
    log = result.stderr.decode(errors="replace")
    match = re.search(r"\bn:\s*0\s+pts:\s*-?\d+\s+pts_time:\s*(\S+)", log)
    if not match or round(float(match[1]) * fps) != frame:
        raise ValueError(f"Decoded frame differs from requested frame {frame}: {log}")
    image = Image.open(io.BytesIO(result.stdout)).convert("RGB")
    if image.size != size:
        raise ValueError(f"Unexpected extracted size: {image.size}")
    return image


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sha256", required=True, help="Expected frozen film SHA-256")
    parser.add_argument("--timeline-sha256", required=True, help="Expected frozen timeline SHA-256")
    args = parser.parse_args()

    assembly_file = ROOT / "output/full-assembly.json"
    timeline_file = ROOT / "timeline.json"
    assembly_bytes = assembly_file.read_bytes()
    assembly = json.loads(assembly_bytes)
    timeline_bytes = timeline_file.read_bytes()
    timeline = json.loads(timeline_bytes)
    film = Path(assembly["file"])
    film = (film if film.is_absolute() else ROOT / film).resolve()
    film.relative_to((ROOT / "output").resolve())
    film_sha = sha(film)
    timeline_sha = hashlib.sha256(timeline_bytes).hexdigest()
    if film_sha != args.sha256 or film_sha != assembly.get("sha256"):
        raise ValueError("Film does not match the frozen SHA and assembly")
    if timeline_sha != args.timeline_sha256 or timeline_sha != assembly.get("timelineSha256"):
        raise ValueError("Timeline does not match the frozen SHA and assembly")
    fps = assembly["fps"]
    if fps != 24 or timeline["fps"] != fps:
        raise ValueError("Overview requires the native 24fps assembly")

    font_file = ROOT.parents[1] / "assets/fonts/NotoSansSC-Regular.otf"
    face = ImageFont.truetype(str(font_file), 20)
    small = ImageFont.truetype(str(font_file), 16)
    heading = ImageFont.truetype(str(font_file), 26)
    width, height, caption, gutter, header = 360, 640, 54, 12, 76
    canvas = Image.new("RGB", (width * 4 + gutter * 5,
                              (height + caption) * 4 + gutter * 5 + header), "#eef1ef")
    draw = ImageDraw.Draw(canvas)
    draw.text((gutter, 10), "硅片制造：最终编码画面总览", font=heading, fill="#17211f")
    draw.text((gutter, 46), f"16 frames | 1080x1920 / 24fps | SHA-256 {film_sha[:20]}",
              font=small, fill="#46534e")
    beats = {beat["id"]: beat for scene in timeline["scenes"] for beat in scene["beats"]}
    items = {item["beat"]: item for item in assembly["selection"]}
    panels = []
    for index, (bid, phrase, title) in enumerate(SELECTION):
        beat, item = beats[bid], items[bid]
        event = next(event for event in beat["semanticPlan"] if event["phrase"] == phrase)
        timeline_frame = math.ceil(event["end"] * fps - 1e-7) + 1
        output_frame = item["startFrame"] + timeline_frame - item["sourceStartFrame"]
        if not item["startFrame"] <= output_frame < item["endFrame"]:
            raise ValueError(f"Selected phrase frame is outside {bid}")
        shot = next(shot for shot in assembly["shots"]
                    if shot["startFrame"] <= output_frame < shot["endFrame"])
        if shot["beat"] != bid:
            raise ValueError(f"Shot and phrase disagree: {bid}")
        image = extract_frame(film, output_frame, fps, (width, height))
        x = gutter + index % 4 * (width + gutter)
        y = header + gutter + index // 4 * (height + caption + gutter)
        canvas.paste(image, (x, y))
        if draw.textlength(title, font=face) > width - 8:
            raise ValueError(f"Overview title is too wide: {title}")
        seconds = output_frame // fps
        stamp = f"{seconds // 60:02}:{seconds % 60:02}:{output_frame % fps:02}"
        draw.text((x + 4, y + height + 3), title, font=face, fill="#17211f")
        draw.text((x + 4, y + height + 30), f"{stamp}  {bid}", font=small, fill="#46534e")
        panels.append({
            "beat": bid, "phrase": phrase, "title": title,
            "phraseWordStart": event["wordStart"], "phraseWordEnd": event["wordEnd"],
            "actionStart": event["start"], "actionEnd": event["end"],
            "outputFrame": output_frame, "outputSeconds": output_frame / fps,
            "timecode": stamp, "shotKind": shot["kind"],
            "imageRegion": [x, y, width, height],
        })
        print(f"{index + 1:02}/16 {stamp} {bid} {phrase}", flush=True)

    if (sha(film) != film_sha or assembly_file.read_bytes() != assembly_bytes
            or timeline_file.read_bytes() != timeline_bytes):
        raise ValueError("Frozen inputs changed while extracting overview")
    output = ROOT / "review/overview.jpg"
    canvas.save(output, quality=93, subsampling=0)
    report = {
        "status": "overview-extracted-final-validation-pending-parent-confirmation",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "file": str(output), "sha256": sha(output), "size": list(canvas.size),
        "encodedFile": str(film), "encodedSha256": film_sha,
        "timelineSha256": timeline_sha,
        "assemblySha256": hashlib.sha256(assembly_bytes).hexdigest(),
        "sourceHashesMeasured": True, "panelCount": len(panels), "panels": panels,
        "humanListeningPerformed": False, "semanticAcceptanceGranted": False,
        "limits": "Sixteen selected encoded frames only. Full verification, OCR and 1x playback "
                  "are handled separately; this overview grants no final-film or human-audio approval.",
    }
    report_file = ROOT / "review/overview.json"
    report_file.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(output)
    print(report_file)


if __name__ == "__main__":
    main()
