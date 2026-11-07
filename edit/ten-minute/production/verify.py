"""Verify timing, explicit fonts, bounds, encoded frames and review evidence.

--preflight is read-only. Encoded verification writes evidence under output/review-*.
Glyph coverage and planned bounds do not imply OCR, semantic or listening approval.
"""
import argparse
import json
import math
import sys
from fractions import Fraction
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from assemble import (CAPTION_HEIGHT, CAPTION_Y, FONTS, FPS, HEIGHT, LIMITS, OUT, ROOT, WIDTH,
                      audio_ranges, inside, label_kind, label_track, load_timeline, mapped_captions, media_info,
                      picture_plan, preflight, probe, resolve_inputs, run, select_beats, sha)


def extract(file, at, target):
    run(["ffmpeg", "-y", "-v", "error", "-ss", f"{max(0, at):.9f}", "-i", file,
         "-map", "0:v:0", "-frames:v", "1", "-update", "1", target])
    if not target.is_file():
        raise RuntimeError(f"Frame extraction failed: {at}s")
    with Image.open(target) as source:
        return source.convert("RGB")


def strip(images, target, columns=8, thumb=(180, 320)):
    canvas = Image.new("RGB", (columns * thumb[0], math.ceil(len(images) / columns) * (thumb[1] + 30)), "#14191b")
    draw = ImageDraw.Draw(canvas)
    face = ImageFont.truetype(str(FONTS / "NotoSansSC-Regular.otf"), 14)
    for i, (label, image) in enumerate(images):
        x, y = (i % columns) * thumb[0], (i // columns) * (thumb[1] + 30)
        canvas.paste(image.resize(thumb, Image.Resampling.LANCZOS), (x, y))
        draw.text((x + 4, y + thumb[1] + 5), label, font=face, fill="white")
    canvas.save(target, quality=91)


def verify(args):
    timeline = load_timeline()
    items = select_beats(timeline, args.only, args.pilot)
    # Check every expected string and every layout, even for a short pilot delivery.
    all_items = select_beats(timeline)
    all_validation = preflight(timeline, all_items)
    selected = preflight(timeline, items)
    report = {"status": "preflight", "timelineSha256": sha(ROOT / "timeline.json"),
              "timelineDuration": timeline["duration"], "selectionDuration": selected["duration"],
              "fontGlyphs": all_validation["glyphs"], "allExpectedTextBounds": all_validation["layout"],
              "allExpectedCaptionBounds": all_validation["captionLayout"],
              "captionTiming": "validated absolute seconds, no overlaps, frame-quantized without collisions",
              "narration": selected["audio"], "uncalibratedAnchors": timeline["uncalibratedAnchors"],
              "ocr": {"status": "not-run", "reason": "Font coverage and bounding boxes do not inspect encoded letters"},
              "humanAudioReview": "not performed; requires normal-speed listening",
              "semanticActionReview": "not performed; inspect continuity strips and listen at normal speed",
              "normalSpeedPlayback": "not performed",
              "limitations": LIMITS}
    if args.preflight:
        missing = [item["beat"]["id"] for item in items
                   if not (ROOT / "model/renders" / f"{item['beat']['id']}.mp4").is_file()]
        report["missingExactCodeRenders"] = missing
        if not missing:
            code, photos = resolve_inputs(items)
            report["picturePlan"] = picture_plan(items, code, photos)
        report["status"] = "input-preflight-only" if not missing else "blocked-missing-code-renders"
        return report, not missing

    tag = "pilot" if args.pilot else "only" if args.only else "full"
    record_file = inside(f"output/{tag}-assembly.json")
    assembly = json.loads(record_file.read_text())
    file = inside(args.file or assembly["file"])
    review = OUT / f"review-{tag}"
    review.mkdir(parents=True, exist_ok=True)
    if assembly["timelineSha256"] != report["timelineSha256"]:
        raise ValueError("Assembly uses an older timeline")
    if assembly["narrationSha256"] != sha(ROOT / "assets/narration.wav"):
        raise ValueError("Assembly uses different narration")
    if "sha256" in assembly and assembly["sha256"] != sha(file):
        raise ValueError("Encoded file differs from assembly hash")
    if assembly["frames"] != selected["frames"]:
        raise ValueError("Assembly selection/duration differs; use the original --only/--pilot arguments")
    if assembly["captions"] != mapped_captions(items) or assembly["audioRanges"] != audio_ranges(items):
        raise ValueError("Assembly caption/audio mapping differs from the current timeline selection")
    if assembly["validation"]["glyphs"] != all_validation["glyphs"]:
        raise ValueError("Font files or expected strings changed after assembly")
    data = probe(file)
    video = next(s for s in data["streams"] if s["codec_type"] == "video")
    audio = next((s for s in data["streams"] if s["codec_type"] == "audio"), None)
    duration, frames = selected["duration"], selected["frames"]
    if [video["width"], video["height"]] != [WIDTH, HEIGHT]:
        raise ValueError("Deliverable must be 1080x1920")
    if Fraction(video["avg_frame_rate"]) != FPS or int(video["nb_frames"]) != frames:
        raise ValueError("Deliverable FPS/frame count mismatch")
    if abs(float(video["duration"]) - duration) > 1 / FPS:
        raise ValueError("Encoded duration differs from actual selected narration")
    if not assembly.get("pictureOnly"):
        if audio is None or int(audio["sample_rate"]) != 48000:
            raise ValueError("Missing 48kHz narration")
        if abs(float(audio["duration"]) - duration) > .065:
            raise ValueError("Narration/video duration mismatch (no padding is permitted)")
        if not assembly.get("textAppliedAfterAI") or not assembly.get("subtitleAppliedLast"):
            raise ValueError("Text compositing order is not recorded")
    elif audio is not None:
        raise ValueError("Picture-only file unexpectedly contains sound")
    previous = 0
    for shot in assembly["shots"]:
        if shot["startFrame"] != previous or shot["endFrame"] <= previous:
            raise ValueError("Picture gap/overlap")
        if sha(inside(shot["source"], ROOT.parents[1])) != shot["sourceSha256"]:
            raise ValueError(f"Source changed after assembly: {shot['source']}")
        if shot["kind"] == "photographic-i2v" and shot["endFrame"] - shot["startFrame"] > 60:
            raise ValueError("Photographic insert exceeds 2.5 seconds")
        previous = shot["endFrame"]
    if previous != frames:
        raise ValueError("Picture does not cover selected duration")
    _, expected_tracking = label_track(items, assembly["shots"])
    if not assembly.get("pictureOnly"):
        if assembly.get("projectionTracking") != expected_tracking:
            raise ValueError("Projection metadata differs from the assembled label track")
        for event in assembly["projectionTracking"]["events"]:
            item = next(i for i in items if i["beat"]["id"] == event["beat"])
            if event["text"] != item["beat"]["labels"][0]:
                raise ValueError("Mechanism qualifier used as an object label")
            if event["leader"] and (event["photographic"] or label_kind(item["beat"]) != "object-noun"):
                raise ValueError("Leader attached to photography or a non-object explanation")
            if event["outputStartFrame"] != item["startFrame"] + event["sourceFrame"]:
                raise ValueError("Projection source frame was not mapped to the final timeline")
        report["projectionTracking"] = expected_tracking
        report["projectionReview"] = "frame mapping and noun policy checked; visual target correctness requires review"
    run(["ffmpeg", "-v", "error", "-xerror", "-err_detect", "explode", "-i", file,
         "-map", "0:v:0", "-map", "0:a?", "-f", "null", "-"])
    first = extract(file, min(.5, (frames - 1) / FPS), review / "first-frame.png")
    report.update({"file": str(file), "sha256": sha(file), "fullDecode": "passed",
                   "width": WIDTH, "height": HEIGHT, "fps": FPS, "frames": frames,
                   "duration": float(video["duration"]), "pictureCoverage": "contiguous",
                   "firstFrame": str(review / "first-frame.png"),
                   "pictureOnly": assembly.get("pictureOnly", False)})
    evidence, contact = [], []
    cues = assembly["captions"] if not assembly.get("pictureOnly") else []
    if args.captions == "first":
        cues = cues[:1]
    elif args.captions == "pilot":
        cues = [c for c in cues if c["start"] < 60]
    for index, cue in enumerate(cues):
        # Pick a frame that is actually inside the visible, frame-quantized interval.
        at = (cue["startFrame"] + max(0, (cue["endFrame"] - cue["startFrame"] - 1) // 2)) / FPS
        target = review / f"caption-{index:04}.png"
        image = extract(file, at, target)
        crop = review / f"caption-{index:04}-crop.png"
        image.crop((0, CAPTION_Y, WIDTH, CAPTION_Y + CAPTION_HEIGHT)).save(crop)
        contact.append((f"{index:03}  {at:.2f}s", image))
        evidence.append({"expected": cue["text"], "time": at, "frame": str(target), "crop": str(crop),
                         "start": cue["start"], "end": cue["end"], "beat": cue["beat"]})
        if len(contact) == 32:
            strip(contact, review / f"captions-page-{index // 32:03}.jpg")
            contact = []
    if contact:
        strip(contact, review / f"captions-page-{len(evidence) // 32:03}.jpg")
    report["captionFrames"] = {"selection": args.captions, "count": len(evidence), "checks": evidence,
                              "readabilityApproval": "pending human/OCR review"}
    sequences = []
    if args.continuity != "none":
        chosen = items[:1] if args.continuity == "first" else items
        for item in chosen:
            beat = item["beat"]
            shift = (item["startFrame"] - item["sourceStartFrame"]) / FPS
            at = beat["actionStart"] + shift
            points = [at - .20, at - 1/FPS, at, at + 1/FPS, at + .20, at + .40,
                      beat["actionEnd"] + shift, item["endFrame"]/FPS - 1/FPS]
            images, times = [], []
            for i, point in enumerate(points):
                point = min((item["endFrame"] - 1) / FPS, max(item["startFrame"] / FPS, point))
                target = review / f"action-{beat['id']}-{i}.jpg"
                image = extract(file, point, target)
                images.append((f"{point:.3f}s", image))
                times.append(point)
            target = review / f"action-{beat['id']}.jpg"
            strip(images, target)
            sequences.append({"beat": beat["id"], "anchor": beat["actionAnchor"],
                              "sourceActionStart": beat["actionStart"], "outputActionStart": at,
                              "times": times, "strip": str(target),
                              "readingHold": beat["end"] - beat["actionEnd"]})
        boundaries = assembly["shots"][1:]
        if args.continuity == "first":
            boundaries = boundaries[:1]
        for index, shot in enumerate(boundaries):
            at = shot["startFrame"] / FPS
            images = []
            for i, offset in enumerate([-2/FPS, -1/FPS, 0, 1/FPS]):
                point = max(0, min((frames - 1) / FPS, at + offset))
                target = review / f"cut-{index:03}-{i}.jpg"
                images.append((f"{point:.3f}s", extract(file, point, target)))
            target = review / f"cut-{index:03}.jpg"
            strip(images, target, columns=4, thumb=(216, 384))
            sequences.append({"kind": "picture-boundary", "time": at, "strip": str(target)})
    report["continuityStrips"] = sequences
    report["status"] = "technical-checks-passed-human-review-pending"
    return report, True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pilot", action="store_true")
    parser.add_argument("--only", default="", help="Same selection as the assembler")
    parser.add_argument("--file", help="Encoded file; default is taken from its assembly record")
    parser.add_argument("--preflight", action="store_true", help="Read-only, no decoding/extraction or file creation")
    parser.add_argument("--captions", choices=["first", "pilot", "all"], default="all")
    parser.add_argument("--continuity", choices=["first", "all", "none"], default="all")
    parser.add_argument("--details", action="store_true", help="Include all layout records in read-only preflight stdout")
    args = parser.parse_args()
    try:
        report, okay = verify(args)
    except (ValueError, KeyError, FileNotFoundError, RuntimeError, StopIteration) as error:
        report, okay = {"status": "blocked", "error": str(error), "limitations": LIMITS}, False
    if not args.preflight:
        tag = "pilot" if args.pilot else "only" if args.only else "full"
        OUT.mkdir(parents=True, exist_ok=True)
        target = OUT / f"{tag}-verification.json"
        target.write_text(json.dumps(report, ensure_ascii=False, indent=2))
        print(target)
    else:
        if not args.details and "allExpectedTextBounds" in report:
            report = {**report, "textBounds": {"status": "passed",
                        "beats": len(report["allExpectedTextBounds"]),
                        "captions": len(report["allExpectedCaptionBounds"])}}
            report.pop("allExpectedTextBounds")
            report.pop("allExpectedCaptionBounds")
        print(json.dumps(report, ensure_ascii=False, indent=2))
    sys.exit(0 if okay else 1)


if __name__ == "__main__":
    main()
