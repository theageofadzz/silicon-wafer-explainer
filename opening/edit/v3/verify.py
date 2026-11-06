"""Verify the encoded sample, captions and shot boundaries; export review evidence."""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

EDIT = Path(__file__).resolve().parent
ROOT = EDIT.parents[1]
REVIEW = EDIT / "review"
VIDEO = ROOT / "sample-9x16-v3.mp4"
parser = argparse.ArgumentParser()
parser.add_argument("--visually-reviewed-caption", action="append", default=[],
                    help="Cue ID whose exported encoded frame was explicitly inspected.")
args = parser.parse_args()


def run(args):
    return subprocess.run([str(arg) for arg in args], cwd=ROOT, check=True,
                          text=True, capture_output=True).stdout


def frame(time, output, crop=None):
    args = ["ffmpeg", "-y", "-v", "error", "-ss", f"{time:.6f}", "-i", VIDEO,
            "-frames:v", "1"]
    if crop:
        args += ["-vf", crop]
    run(args + [output])


def normalize(text):
    return re.sub(r"[\s，。！？、,.!?：:；;]+", "", text)


def picture_pixels(file, index):
    filters = ("scale=1080:1920:flags=lanczos:in_range=auto:out_range=tv:out_color_matrix=bt709,"
               "crop=1080:1450:0:0,scale=108:145")
    raw = subprocess.check_output(
        ["ffmpeg", "-v", "error", "-ss", f"{index / 24:.9f}", "-i", str(file),
         "-vf", filters, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"])
    return np.frombuffer(raw, dtype=np.uint8).astype(np.float32)


REVIEW.mkdir(exist_ok=True)
assembly = json.loads((REVIEW / "assembly.json").read_text())
video_sha256 = hashlib.sha256(VIDEO.read_bytes()).hexdigest()
assert video_sha256 == assembly["sha256"], "The encoded video changed after its assembly report."
data = json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format",
                       "-of", "json", VIDEO]))
video = next(s for s in data["streams"] if s["codec_type"] == "video")
audio = next(s for s in data["streams"] if s["codec_type"] == "audio")
assert (video["width"], video["height"], int(video["nb_frames"])) == (1080, 1920, 729)
assert video["r_frame_rate"] == "24/1"
assert abs(float(data["format"]["duration"]) - 30.375) < .05
assert int(audio["sample_rate"]) == 48000
run(["ffmpeg", "-v", "error", "-i", VIDEO, "-f", "null", "-"])
alignment = []
anchor_frames = {round(time * 24) for time in
                 [5.75, 7.75, 9.5, 12, 17, 17.75, 21.75, 23, 24.5]}
anchor_frames.update((shot["startFrame"] + shot["endFrame"]) // 2
                     for shot in assembly["shots"])
for index in sorted(anchor_frames):
    shot = next(shot for shot in assembly["shots"]
                if shot["startFrame"] <= index < shot["endFrame"])
    source_index = shot["sourceStartFrame"] + index - shot["startFrame"]
    actual = picture_pixels(VIDEO, index)
    expected = picture_pixels(ROOT / shot["file"], source_index)
    mae = float(np.abs(actual - expected).mean())
    correlation = float(np.corrcoef(actual, expected)[0, 1])
    alignment.append({"frame": index, "time": index / 24, "source": shot["source"],
                      "sourceFrame": source_index, "meanAbsoluteError255": mae,
                      "correlation": correlation, "pass": mae < 10 and correlation > .96})
(REVIEW / "picture-alignment.json").write_text(json.dumps(alignment, indent=2))
assert all(item["pass"] for item in alignment), alignment

ocr_files = []
for cue in assembly["captions"]:
    output = REVIEW / f"caption-{cue['id']}.png"
    frame((cue["start"] + cue["end"]) / 2, output, "crop=1080:240:0:1470")
    ocr_files.append(output)
ocr = json.loads(run(["swift", ROOT / "ocr.swift", *ocr_files]))
results = []
for cue, actual in zip(assembly["captions"], ocr):
    recognized = normalize("".join(actual["text"]))
    expected = normalize(cue["text"])
    ocr_pass = expected in recognized
    visual_reviewed = cue["id"] in args.visually_reviewed_caption
    image = REVIEW / f"caption-{cue['id']}.png"
    results.append({"id": cue["id"], "expected": expected, "recognized": recognized,
                    "ocrPass": ocr_pass, "visualReviewed": visual_reviewed,
                    "encodedFrameSHA256": hashlib.sha256(image.read_bytes()).hexdigest(),
                    "pass": ocr_pass or visual_reviewed})
(REVIEW / "caption-ocr.json").write_text(json.dumps(results, indent=2, ensure_ascii=False))
assert all(r["pass"] for r in results), results

times = sorted(set([.25, 1, 2.7, 5.8, 7.9, 10.4, 12.2, 13.5, 14.9,
                    16.3, 17.4, 19.5, 21.95, 23.1, 24.5, 26.7, 28.3, 29.7] +
                   [max(0, s["start"] + d) for s in assembly["shots"][1:]
                    for d in [-2 / 24, -1 / 24, 0, 1 / 24, 2 / 24]]))
frames = []
for time in times:
    output = REVIEW / f"encoded-{round(time * 24):04}.jpg"
    frame(time, output)
    image = Image.open(output)
    pixels = np.asarray(image)
    assert pixels.std() > 5, f"Blank picture near {time}"
    frames.append({"time": time, "file": output.name})

selected = [(.7, "晶圆"), (2.7, "空白硅片"), (5.8, "直径"), (7.9, "薄边"),
            (10.4, "真实晶棒"), (13.5, "切片"), (14.9, "镜面"), (17.4, "晶格"),
            (21.95, "纯度"), (24.5, "平整"), (26.7, "石英"), (29.7, "断口微距")]
sheet = Image.new("RGB", (4 * 270, 3 * 508), (12, 15, 18))
font = ImageFont.truetype(str(ROOT / "assets/fonts/NotoSansSC-Regular.otf"), 18)
draw = ImageDraw.Draw(sheet)
for i, (time, label) in enumerate(selected):
    image_file = REVIEW / f"contact-{i}.jpg"
    frame(time, image_file)
    image = Image.open(image_file).resize((270, 480), Image.Resampling.LANCZOS)
    x, y = (i % 4) * 270, (i // 4) * 508
    sheet.paste(image, (x, y))
    draw.text((x + 8, y + 482), f"{time:.2f}s · {label}", font=font, fill=(226, 234, 236))
sheet.save(REVIEW / "sequence-overview.jpg", quality=94)
with (REVIEW / "audio-levels.txt").open("w") as log:
    subprocess.run(["ffmpeg", "-hide_banner", "-i", str(VIDEO), "-af", "ebur128=peak=true",
                    "-f", "null", "-"], stdout=subprocess.DEVNULL, stderr=log, check=True)
report = {"format": data, "videoSHA256": video_sha256, "fullDecode": True, "captionCues": len(results),
          "captionOCRPassed": sum(r["ocrPass"] for r in results),
          "captionVisualReview": [r["id"] for r in results if r["visualReviewed"]],
          "captionChecksPassed": all(r["pass"] for r in results),
          "encodedPictureMatchesEDL": True, "pictureAlignmentFrames": len(alignment),
          "boundaryAndSemanticFrames": frames,
          "nativeI2VSecondsInFinal": assembly["nativeI2VSecondsInFinal"],
          "limits": "OCR and frame export verify technical delivery only. Continuous visual review and human listening remain distinct."}
(REVIEW / "verification.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))
print(f"Decoded 729 frames; OCR passed {report['captionOCRPassed']}/{len(results)} captions; "
      f"visually reviewed {report['captionVisualReview']}; exported {len(frames)} review frames.")
