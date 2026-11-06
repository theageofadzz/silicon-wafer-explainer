"""Check encoded deliverables, real word timing, and readable caption frames."""
import argparse
import difflib
import hashlib
import json
import math
import shutil
import subprocess
import sys
from fractions import Fraction
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / "review"
FPS = 24


def run(args):
    result = subprocess.run([str(x) for x in args], cwd=ROOT, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr[-6000:])
    return result.stdout


def sha(file):
    value = hashlib.sha256()
    with file.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def probe(file):
    return json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", file]))


def norm(text):
    return "".join(c for c in text if c.isalnum())


def frame(file, at, out):
    run(["ffmpeg", "-y", "-v", "error", "-ss", max(0, at), "-i", file,
         "-frames:v", "1", "-update", "1", out])
    if not out.is_file():
        raise RuntimeError(f"Failed to extract {at}: {file}")
    return Image.open(out).convert("RGB")


def sheet(images, out, columns=4, thumb=(216, 384)):
    rows = math.ceil(len(images) / columns)
    image = Image.new("RGB", (columns * thumb[0], rows * (thumb[1] + 24)), "#171b1c")
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype(str(ROOT / "assets/fonts/NotoSansSC-Regular.otf"), 13)
    for index, (label, source) in enumerate(images):
        x, y = index % columns * thumb[0], index // columns * (thumb[1] + 24)
        image.paste(source.resize(thumb, Image.Resampling.LANCZOS), (x, y))
        draw.text((x + 5, y + thumb[1] + 3), label, font=font, fill="white")
    image.save(out, quality=91)


def timing_checks(timeline):
    previous = timeline["openingDuration"]
    reports = []
    for scene in timeline["scenes"]:
        assert abs(scene["start"] - previous) < 1e-6, f"Scene gap: {scene['id']}"
        previous = scene["end"]
        assert scene["end"] > scene["start"]
        assert norm("".join(scene["clauses"])) == norm("".join(w["text"] for w in scene["words"]))
        last_word_end = scene["start"]
        for word in scene["words"]:
            assert scene["start"] <= word["start"] < word["end"] <= scene["end"]
            assert word["start"] >= last_word_end - .03, f"Overlapping words: {scene['id']}"
            last_word_end = word["end"]
        raw = json.loads((ROOT / f"assets/voice/{scene['id']}.json").read_text())
        events = raw if isinstance(raw, list) else raw["events"]
        events = [event for event in events if event.get("type") == "WordBoundary"]
        assert len(events) == len(scene["words"]), f"Missing provider events: {scene['id']}"
        errors = []
        for event, word in zip(events, scene["words"]):
            error = abs(event["offset"] / 1e7 + scene["audioStart"] - word["start"])
            assert error < 1e-6, f"Wrong timestamp unit or segment offset: {scene['id']}"
            assert norm(event["text"]) == norm(word["text"])
            errors.append(error)
        reports.append({"scene": scene["id"], "words": len(events),
                        "maximumStartError": max(errors), "readingHold": scene["end"] - last_word_end})
    assert abs(previous - timeline["duration"]) < 1e-6
    return reports


def clip_checks():
    plan = json.loads((ROOT / "shots.json").read_text())
    results = []
    for shot in plan["shots"]:
        file = ROOT / f"generated/{shot['id']}.mp4"
        if not file.is_file():
            results.append({"scene": shot["id"], "status": "not-generated"})
            continue
        data = probe(file)
        video = next(s for s in data["streams"] if s["codec_type"] == "video")
        assert [video["width"], video["height"]] == [576, 1024]
        assert int(video["nb_frames"]) == shot["frames"]
        assert abs(float(Fraction(video["avg_frame_rate"])) - shot["fps"]) < .001
        metadata = json.loads(file.with_suffix(".json").read_text())
        assert sha(file) == metadata["sha256"]
        run(["ffmpeg", "-v", "error", "-xerror", "-i", file, "-f", "null", "-"])
        images = []
        for index, fraction in enumerate([.04, .18, .34, .49, .65, .81, .95]):
            at = float(video["duration"]) * fraction
            out = REVIEW / f"encoded-{shot['id']}-{index}.jpg"
            image = frame(file, at, out)
            array = np.asarray(image)
            assert array.max() - array.min() > 70, f"Flat/blank clip: {shot['id']}"
            images.append((f"{shot['id']} {at:.2f}s", image))
        sheet(images, REVIEW / f"{shot['id']}-contact.jpg")
        results.append({"scene": shot["id"], "status": "decoded", "sha256": metadata["sha256"],
                        "frames": int(video["nb_frames"]), "fps": float(Fraction(video["avg_frame_rate"]))})
    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--clips", action="store_true")
    parser.add_argument("--pilot", action="store_true")
    args = parser.parse_args()
    REVIEW.mkdir(exist_ok=True)
    timeline = json.loads((ROOT / "timeline.json").read_text())
    timing = timing_checks(timeline)
    if args.clips:
        report = {"timing": timing, "clips": clip_checks(),
                  "limits": "Decoded clips and timestamp checks do not establish scientific or audiovisual acceptance."}
        (REVIEW / "clips.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
        print(json.dumps([{"scene": x["scene"], "status": x["status"]} for x in report["clips"]]))
        return
    file = ROOT / "output" / ("pilot.mp4" if args.pilot else "silicon-wafer-explainer-9x16.mp4")
    assembly = json.loads((REVIEW / ("pilot-assembly.json" if args.pilot else "assembly.json")).read_text())
    data = probe(file)
    video = next(s for s in data["streams"] if s["codec_type"] == "video")
    audio = next(s for s in data["streams"] if s["codec_type"] == "audio")
    assert [video["width"], video["height"]] == [1080, 1920]
    assert Fraction(video["avg_frame_rate"]) == FPS
    assert int(video["nb_frames"]) == round(assembly["duration"] * FPS)
    assert abs(float(video["duration"]) - assembly["duration"]) < 1 / FPS
    assert abs(float(audio["duration"]) - assembly["duration"]) < .05
    assert int(audio["sample_rate"]) == 48000
    if not args.pilot:
        assert int(video["nb_frames"]) == round(timeline["duration"] * FPS)
        assert timeline["duration"] < 180
    run(["ffmpeg", "-v", "error", "-xerror", "-i", file, "-f", "null", "-"])
    previous = 0
    for shot in assembly["shots"]:
        assert shot["startFrame"] == previous
        previous = shot["endFrame"]
        assert (ROOT / shot["source"]).is_file()
    assert previous == int(video["nb_frames"])
    cmap = TTFont(str(ROOT / "assets/fonts/NotoSansSC-Bold.otf")).getBestCmap()
    from assemble import caption_lines
    font = ImageFont.truetype(str(ROOT / "assets/fonts/NotoSansSC-Bold.otf"), 55)
    opening_cues = json.loads((ROOT / "opening/edit/v3/review/assembly.json").read_text())["captions"]
    all_cues = opening_cues + assembly["captions"]
    previous = 0
    cue_images, crops, text_checks = [], [], []
    for index, cue in enumerate(all_cues):
        assert previous <= cue["start"] < cue["end"] <= assembly["duration"]
        previous = cue["end"]
        assert all(ord(c) in cmap for c in cue["text"] if not c.isspace())
        assert all(font.getlength(line) <= 930 for line in caption_lines(cue["text"], font))
        at = (cue["start"] + cue["end"]) / 2
        out = REVIEW / f"caption-{index:02}.png"
        image = frame(file, at, out)
        crop = REVIEW / f"caption-crop-{index:02}.png"
        image.crop((0, 1490, 1080, 1770)).save(crop)
        crops.append(crop)
        cue_images.append((f"{at:.2f}s", image))
        text_checks.append({"cue": index, "expected": cue["text"], "time": at, "frame": out.name})
    sheet(cue_images, REVIEW / ("pilot-captions.jpg" if args.pilot else "captions-overview.jpg"), columns=8, thumb=(135, 240))
    ocr = {"status": "unavailable", "reason": "macOS Vision / Swift required", "manualReviewRequired": True}
    if sys.platform == "darwin" and shutil.which("swift"):
        recognized = json.loads(run(["swift", ROOT / "opening/ocr.swift", *crops]))
        for item, result in zip(text_checks, recognized):
            text = "".join(result["text"])
            item["recognized"] = text
            item["similarity"] = difflib.SequenceMatcher(None, norm(item["expected"]), norm(text)).ratio()
        exact = sum(norm(x["expected"]) == norm(x["recognized"]) for x in text_checks)
        ocr = {"status": "ran", "exact": exact, "count": len(text_checks),
               "manualReviewRequired": exact != len(text_checks), "checks": text_checks}
    sequences, overview = [], []
    for scene in timeline["scenes"]:
        if scene["start"] >= assembly["duration"]:
            continue
        joined = "".join(norm(w["text"]) for w in scene["words"])
        position = joined.find(norm(scene["anchor"]))
        assert position >= 0, f"Uncalibrated action anchor: {scene['id']}"
        cursor, at = 0, None
        for word in scene["words"]:
            cursor += len(norm(word["text"]))
            if cursor > position:
                at = word["start"]
                break
        images = []
        for index, offset in enumerate([-.20, -.08, 0, .08, .20, .40, .65, 1.0]):
            point = max(scene["start"], min(scene["end"] - 1 / FPS, at + offset))
            out = REVIEW / f"encoded-{scene['id']}-anchor-{index}.jpg"
            image = frame(file, point, out)
            images.append((f"{point:.3f}s", image))
        contact = REVIEW / f"action-{scene['id']}.jpg"
        sheet(images, contact)
        overview.append((scene["id"], images[5][1]))
        sequences.append({"scene": scene["id"], "word": scene["anchor"], "at": at, "contact": contact.name})
    sheet(overview, REVIEW / ("pilot-overview.jpg" if args.pilot else "overview.jpg"), columns=4)
    frame(file, 1.2, REVIEW / "poster.jpg")
    report = {"file": str(file.relative_to(ROOT)), "sha256": sha(file), "fullDecode": "passed",
              "width": video["width"], "height": video["height"], "frames": int(video["nb_frames"]),
              "fps": FPS, "duration": float(video["duration"]), "sampleRate": int(audio["sample_rate"]),
              "pictureCoverage": "contiguous", "fontGlyphs": "passed", "captionLayout": "passed",
              "speechTiming": timing, "ocr": ocr, "actionSequences": sequences,
              "normalSpeedPlayback": "Run production/playback.mjs; not established by frame extraction.",
              "humanAudioReview": "not performed; automated decoding and playback do not constitute listening approval."}
    name = "pilot-verification.json" if args.pilot else "verification.json"
    (REVIEW / name).write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps({"file": str(file), "frames": report["frames"], "duration": report["duration"],
                      "ocr": {k: v for k, v in ocr.items() if k != "checks"}}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
