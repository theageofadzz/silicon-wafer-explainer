"""Summarize measured delivery evidence without granting human listening approval."""
import json
import subprocess
from datetime import date
from pathlib import Path

from assemble import ROOT, sha


def read(file):
    return json.loads(file.read_text())


def composition_execution(workflow, tag, timeline_sha):
    history_file = ROOT / "workflows" / (workflow + "-history.json")
    history, job = read(history_file), read(ROOT / "workflows" / (workflow + "-job.json"))
    assembly = read(ROOT / "output" / (tag + "-assembly.json"))
    verification = read(ROOT / "output" / (tag + "-verification.json"))
    film = Path(assembly["file"])
    film = (film if film.is_absolute() else ROOT / film).resolve()
    prompt_id = job["prompt_id"]
    if (not history["status"].get("completed") or history["status"]["status_str"] != "success"
            or history["prompt"][1] != prompt_id):
        raise ValueError(f"Completed Comfy composition evidence is missing: {workflow}")
    outputs = history["outputs"]["500"]["text"]
    if str(film) not in outputs:
        raise ValueError(f"Comfy output does not name the assembled film: {workflow}")
    film_sha = sha(film)
    if any(record.get("sha256") != film_sha or record.get("timelineSha256") != timeline_sha
           for record in (assembly, verification)):
        raise ValueError(f"Composition evidence changed: {workflow}")
    if verification.get("fullDecode") != "passed":
        raise ValueError(f"Encoded composition has not passed decode: {workflow}")
    return {"promptId": prompt_id, "completed": True, "status": "success",
            "history": str(history_file.relative_to(ROOT)), "historySha256": sha(history_file),
            "workflow": "workflows/" + workflow + "-api.json",
            "output": str(film.relative_to(ROOT)), "sha256": film_sha,
            "assemblySha256": sha(ROOT / "output" / (tag + "-assembly.json")),
            "duration": assembly["duration"], "beatCount": len(assembly["selection"]),
            "nodeClasses": sorted({node["class_type"] for node in history["prompt"][2].values()}),
            "photographsUsed": [shot["media"] for shot in assembly["shots"]
                                if shot["kind"] == "photographic-i2v"]}


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
        if (record.get("visualRevision") != 4
                or record.get("cameraPlan") != beat.get("cameraPlan")
                or len(record.get("cameraPlan", [])) < 2):
            raise ValueError(f"Current detailed camera plan is missing: {beat['id']}")
        code.append({"beat": beat["id"], "width": record["width"], "height": record["height"],
                     "captureFps": record["captureFps"], "frames": record["frameCount"],
                     "duplicatedFrames": record["duplicatedFrames"],
                     "semanticVersion": record.get("semanticVersion"),
                     "visualRevision": record["visualRevision"],
                     "cameraShotCount": len(record["cameraPlan"]),
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
        "visualRevision": timeline.get("visualRevision"),
        "cameraShotCount": sum(len(beat["cameraPlan"]) for beat in beats),
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
                                "wallSeconds": playback["wallSeconds"], "muted": playback.get("muted", False),
                                "observedSeconds": playback.get("observedSeconds"),
                                "environmentGaps": playback.get("environmentGaps", []),
                                "pageErrors": playback["pageErrors"]},
        "semanticMeaningApprovedByAudit": False,
        "semanticReview": "not granted; phrase plans and action counts do not establish scientific meaning or synchrony",
    }
    photo_history_file = ROOT / "workflows/photos-history.json"
    photo_history = read(photo_history_file)
    photo_job = read(ROOT / "workflows/photos-job.json")
    graph = photo_history["prompt"][2]
    if (not photo_history["status"].get("completed")
            or photo_history["status"]["status_str"] != "success"
            or photo_history["prompt"][1] != photo_job["prompt_id"]):
        raise ValueError("New Comfy photography run has not completed")
    cached_nodes = {str(node) for kind, detail in photo_history["status"]["messages"]
                    if kind == "execution_cached" for node in detail["nodes"]}
    for key in ["quartz", "boule", "blank"]:
        metadata = read(ROOT / "generated" / (key + ".json"))
        saves = [node_id for node_id, node in graph.items()
                 if node["class_type"] == "WTSave" and node["inputs"]["photo"] == key]
        if len(saves) != 1 or saves[0] in cached_nodes or metadata["prompt"] != graph:
            raise ValueError(f"New uncached photography evidence is missing: {key}")
        if metadata["sha256"] != sha(ROOT / "generated" / (key + ".mp4")):
            raise ValueError(f"Photographic bytes changed: {key}")
        report["comfyPhotography"].append(
            {name: metadata[name] for name in ["frames", "fps", "width", "height", "sha256",
                                              "sourcePhotoSha256", "method"]}
            | {"key": key, "cachedFromPriorRender": False,
               "promptId": photo_job["prompt_id"], "saveNode": saves[0],
               "historySha256": sha(photo_history_file)})
    target = ROOT / "review/verification-summary.json"
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2))
    execution = {
        "date": report["date"], "version": "2.2.0", "visualRevision": 4,
        "timelineSha256": report["timelineSha256"],
        "status": "generation-composition-and-encoded-evidence-recorded",
        "photographyGeneration": {
            "promptId": photo_job["prompt_id"], "completed": True,
            "history": "workflows/photos-history.json", "historySha256": sha(photo_history_file),
            "cachedFromPriorRender": False, "diffusionExecutedThisRun": True,
            "photographs": report["comfyPhotography"]},
        "finalAssembly": composition_execution("cached", "full", report["timelineSha256"]),
        "sampleAssembly": composition_execution("cached-only", "only", report["timelineSha256"]),
        "divisionOfWork": {
            "ComfyUI": "A separate native LTX run generated three new photographic clips. "
                       "The cached full/sample graphs read those files and dispatch final composition.",
            "code": "Independent Three.js beat scenes, actual word timing, camera cuts, "
                    "projection labels, subtitles, audio mix and FFmpeg encoding."},
        "verificationSummary": "review/verification-summary.json",
        "acceptanceLimits": {"semanticAcceptanceGranted": False, "humanAudioReviewGranted": False,
                             "note": "Generation, decode and browser completion establish execution; "
                                     "bounded image critiques remain separate."},
        "weightsIncluded": False, "referenceMediaIncluded": False,
    }
    (ROOT / "review/comfy-execution.json").write_text(
        json.dumps(execution, ensure_ascii=False, indent=2))
    print(json.dumps({key: value for key, value in report.items()
                      if key not in {"modelClips", "comfyPhotography"}}, ensure_ascii=False, indent=2))
    print(target)


if __name__ == "__main__":
    main()
