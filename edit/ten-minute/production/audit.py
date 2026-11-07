"""Summarize measured delivery evidence without granting human listening approval."""
import json
import subprocess
from pathlib import Path

from assemble import ROOT, sha


def read(file):
    return json.loads(file.read_text())


def main():
    verification = read(ROOT / "output/full-verification.json")
    assembly = read(ROOT / "output/full-assembly.json")
    timeline = read(ROOT / "timeline.json")
    ocr = read(ROOT / "review/ocr-full.json")
    label_ocr = read(ROOT / "review/ocr-labels-full.json")
    playback = read(ROOT / "review/playback.json")
    file = Path(assembly["file"])
    if verification.get("sha256") != sha(file) or ocr.get("encodedSha256") != sha(file):
        raise ValueError("Verification and OCR must describe the current encoded film")
    if playback.get("encodedSha256") != sha(file):
        raise ValueError("Complete normal-speed playback must describe the current encoded film")
    process = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", str(file), "-vn",
         "-af", "loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json", "-f", "null", "-"],
        capture_output=True, text=True, check=True)
    loudness, _ = json.JSONDecoder().raw_decode("{" + process.stderr.rsplit("\n{", 1)[1])
    beats = [beat for scene in timeline["scenes"] for beat in scene["beats"]]
    code = []
    for beat in beats:
        record = read(ROOT / "model/renders" / (beat["id"] + ".json"))
        code.append({"beat": beat["id"], "width": record["width"], "height": record["height"],
                     "captureFps": record["captureFps"], "frames": record["frameCount"],
                     "duplicatedFrames": record["duplicatedFrames"]})
    report = {
        "date": "2026-11-07",
        "status": "automated-evidence-recorded",
        "film": "output/" + file.name,
        "sha256": sha(file),
        "duration": verification["duration"],
        "width": verification["width"], "height": verification["height"],
        "fps": verification["fps"], "frames": verification["frames"],
        "fullDecode": verification["fullDecode"],
        "pictureCoverage": verification["pictureCoverage"],
        "captionCount": len(assembly["captions"]),
        "captionOCR": {"status": ocr["status"], "count": ocr["count"], "matched": ocr["matched"]},
        "explanatoryOCR": {"status": label_ocr["status"], "beatCount": label_ocr["beatCount"],
                           "exactlyMatchedBeats": label_ocr["exactlyMatchedBeats"]},
        "ocrMismatchImageReview": "review/visual-review.md; all 5 caption and 13 explanatory mismatches inspected",
        "fontMissingGlyphs": {weight: data["missing"] for weight, data in verification["fontGlyphs"].items()},
        "allWordAnchorsCalibrated": not timeline["uncalibratedAnchors"],
        "minimumActionReadingHold": min(beat["end"]-beat["actionEnd"] for beat in beats),
        "projectionUpdateFPS": assembly["projectionTracking"]["updateFPS"],
        "audio": {"integratedLUFS": float(loudness["input_i"]),
                  "truePeakDBTP": float(loudness["input_tp"]),
                  "loudnessRangeLU": float(loudness["input_lra"]),
                  "masterFilter": assembly["audioMaster"]["filter"]},
        "allCodeNative1080x1920And24fps": all(
            [item["width"], item["height"], item["captureFps"], item["duplicatedFrames"]]
            == [1080, 1920, 24, False] for item in code),
        "modelClips": code,
        "newComfyPhotography": [],
        "humanAudioReview": "not performed by this automated system",
        "normalSpeedPlayback": {"status": playback["status"], "duration": playback["duration"],
                                "wallSeconds": playback["wallSeconds"], "pageErrors": playback["pageErrors"]},
        "semanticReview": "see critic and visual review records; technical checks alone do not approve meaning",
    }
    for key in ["quartz", "boule", "blank"]:
        metadata = read(ROOT / "generated" / (key + ".json"))
        report["newComfyPhotography"].append(
            {name: metadata[name] for name in ["frames", "fps", "width", "height", "sha256",
                                              "sourcePhotoSha256", "method"]} | {"key": key})
    target = ROOT / "review/verification-summary.json"
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps({key: value for key, value in report.items()
                      if key not in {"modelClips", "newComfyPhotography"}}, ensure_ascii=False, indent=2))
    print(target)


if __name__ == "__main__":
    main()
