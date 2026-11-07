"""Summarize measured delivery evidence without granting human listening approval."""
import json
import subprocess
from datetime import date
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
    file = Path(verification["file"])
    file = (file if file.is_absolute() else ROOT / file).resolve()
    assembled_file = Path(assembly["file"])
    assembled_file = (assembled_file if assembled_file.is_absolute() else ROOT / assembled_file).resolve()
    film_sha = sha(file)
    if assembled_file != file or assembly.get("sha256") != film_sha:
        raise ValueError("Assembly and verification must describe the same encoded file")
    if verification.get("fullDecode") != "passed" or verification.get("sha256") != film_sha:
        raise ValueError("Full encoded verification must pass for the current film")
    for name, record in [("Caption OCR", ocr), ("Explanatory-label OCR", label_ocr)]:
        if record.get("encodedSha256") != film_sha:
            raise ValueError(f"{name} must describe the current encoded film")
        if record.get("status") not in {"passed", "mismatches-need-visual-review"}:
            raise ValueError(f"{name} has not completed")
    if (playback.get("encodedSha256") != film_sha
            or playback.get("status") != "normal-speed-browser-playback-completed"):
        raise ValueError("Complete normal-speed playback must describe the current encoded film")
    if any(record.get("timelineSha256") != sha(ROOT / "timeline.json")
           for record in (assembly, verification)):
        raise ValueError("Timeline changed since assembly or verification")
    beats = [beat for scene in timeline["scenes"] for beat in scene["beats"]]
    if ocr["count"] != len(assembly["captions"]) or label_ocr["beatCount"] != len(beats):
        raise ValueError("OCR must cover all current captions and explanatory beats")
    process = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", str(file), "-vn",
         "-af", "loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json", "-f", "null", "-"],
        capture_output=True, text=True, check=True)
    loudness, _ = json.JSONDecoder().raw_decode("{" + process.stderr.rsplit("\n{", 1)[1])
    code = []
    for beat in beats:
        record = read(ROOT / "model/renders" / (beat["id"] + ".json"))
        code.append({"beat": beat["id"], "width": record["width"], "height": record["height"],
                     "captureFps": record["captureFps"], "frames": record["frameCount"],
                     "duplicatedFrames": record["duplicatedFrames"],
                     "semanticVersion": record.get("semanticVersion"),
                     "semanticActionCount": len(record.get("semanticPlan", []))})
    caption_mismatches = ocr["count"] - ocr["matched"]
    label_mismatches = label_ocr["beatCount"] - label_ocr["exactlyMatchedBeats"]
    report = {
        "date": date.today().isoformat(),
        "status": "automated-evidence-recorded",
        "film": str(file.relative_to(ROOT)),
        "sha256": film_sha,
        "timelineSha256": sha(ROOT / "timeline.json"),
        "semanticVersion": timeline.get("semanticVersion"),
        "semanticActionCount": sum(len(beat.get("semanticPlan", [])) for beat in beats),
        "duration": verification["duration"],
        "width": verification["width"], "height": verification["height"],
        "fps": verification["fps"], "frames": verification["frames"],
        "fullDecode": verification["fullDecode"],
        "pictureCoverage": verification["pictureCoverage"],
        "captionCount": len(assembly["captions"]),
        "captionOCR": {"status": ocr["status"], "count": ocr["count"], "matched": ocr["matched"],
                       "encodedSha256": ocr["encodedSha256"]},
        "explanatoryOCR": {"status": label_ocr["status"], "beatCount": label_ocr["beatCount"],
                           "exactlyMatchedBeats": label_ocr["exactlyMatchedBeats"],
                           "encodedSha256": label_ocr["encodedSha256"]},
        "ocrMismatchImageReview": {
            "captionMismatchCount": caption_mismatches, "explanatoryMismatchBeatCount": label_mismatches,
            "status": "requires-visual-review" if caption_mismatches or label_mismatches else "no-ocr-mismatches",
            "humanReviewApprovedByAudit": False},
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
        "comfyPhotography": [],
        "humanAudioReview": "not performed by this automated system",
        "normalSpeedPlayback": {"status": playback["status"], "duration": playback["duration"],
                                "wallSeconds": playback["wallSeconds"], "pageErrors": playback["pageErrors"]},
        "semanticMeaningApprovedByAudit": False,
        "semanticReview": "not granted; phrase plans and action counts do not establish scientific meaning or synchrony",
    }
    for key in ["quartz", "boule", "blank"]:
        metadata = read(ROOT / "generated" / (key + ".json"))
        report["comfyPhotography"].append(
            {name: metadata[name] for name in ["frames", "fps", "width", "height", "sha256",
                                              "sourcePhotoSha256", "method"]}
            | {"key": key, "cachedFromPriorRender": True})
    target = ROOT / "review/verification-summary.json"
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps({key: value for key, value in report.items()
                      if key not in {"modelClips", "comfyPhotography"}}, ensure_ascii=False, indent=2))
    print(target)


if __name__ == "__main__":
    main()
