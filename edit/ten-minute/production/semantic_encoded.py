"""Plan and extract final-encode evidence; never approve meaning from pixel changes."""
import json
import math
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from assemble import FONTS, FPS, ROOT, run, sha, word_window


REVIEW_LIMIT = ("Encoded samples are evidence for a critic, not semantic approval. "
                "Pixel differences, planned actions and extraction coverage do not prove meaning. "
                "No audio listening or normal-speed audiovisual review is performed here.")
ROLES = ("before", "mid", "end", "phrase", "phrase-end")


def review_window(value):
    try:
        start, end = (float(part) for part in value.split(":"))
    except (ValueError, TypeError):
        raise ValueError("Semantic window must be START:END in absolute timeline seconds") from None
    if not math.isfinite(start + end) or not 0 <= start < end:
        raise ValueError("Semantic window needs finite 0 <= START < END")
    return start, end


def ceil_frame(time):
    return math.ceil(time * FPS - 1e-7)


def nearest_frame(time):
    return math.floor(time * FPS + .5)


def selection_records(items):
    return [{"scene": item["scene"]["id"], "beat": item["beat"]["id"],
             **{key: item[key] for key in ("sourceStartFrame", "sourceEndFrame",
                                          "startFrame", "endFrame")}} for item in items]


def validate_shots(assembly, items):
    """Use recorded output ranges, not a newly guessed photographic picture plan."""
    if assembly.get("selection") != selection_records(items):
        raise ValueError("Semantic evidence selection differs from assembly output offsets")
    if assembly.get("fps") != FPS or assembly.get("frames") != items[-1]["endFrame"]:
        raise ValueError("Semantic evidence needs the exact assembled 24fps frame extent")
    lookup = {item["beat"]["id"]: item for item in items}
    shots, previous = assembly["shots"], 0
    for index, shot in enumerate(shots):
        a, b, source = (shot[key] for key in ("startFrame", "endFrame", "sourceStartFrame"))
        if any(type(value) is not int for value in (a, b, source)) or source < 0:
            raise ValueError(f"Non-integer/negative assembly shot frames: {index}")
        item = lookup.get(shot["beat"])
        if item is None or not item["startFrame"] <= a < b <= item["endFrame"] or a != previous:
            raise ValueError(f"Assembly shot outside its beat or picture gap/overlap: {index}")
        if shot["kind"] == "exact-code":
            if source != a - item["startFrame"]:
                raise ValueError(f"Code source does not preserve beat time: {index}")
        elif shot["kind"] != "photographic-i2v":
            raise ValueError(f"Unrecognized picture provenance: {shot['kind']}")
        previous = b
    if previous != assembly["frames"]:
        raise ValueError("Assembly shots do not cover semantic evidence output")
    return shots


def picture_at(frame, shots):
    if shots is None:
        return None
    for index, shot in enumerate(shots):
        if shot["startFrame"] <= frame < shot["endFrame"]:
            local = shot["sourceStartFrame"] + frame - shot["startFrame"]
            native = shot.get("native", {})
            record = {"shotIndex": index, "kind": shot["kind"], "media": shot.get("media"),
                      "file": shot["source"], "sha256": shot.get("sourceSha256"),
                      "outputStartFrame": shot["startFrame"], "outputEndFrame": shot["endFrame"],
                      "requestedSourceTime": local / FPS,
                      "sourceTime": local / FPS, "nativeFPS": native.get("fps")}
            if native.get("fps") == FPS:
                count = native.get("frames")
                if count is not None and local >= count:
                    if (shot["kind"] != "exact-code" or shot.get("roundingFrameAdjustment") != 1
                            or local != count):
                        raise ValueError(f"Sample outside recorded source: shot {index}, frame {frame}")
                    record.update(sourceFrame=count - 1, sourceTime=(count - 1) / FPS,
                                  repeatedTerminalFrame=True)
                else:
                    record["sourceFrame"] = local
            # Non-24fps photography is resampled by assemble.py's fps filter.
            # Its source timestamp is exact; do not invent a native frame index.
            return record
    raise ValueError(f"No assembled shot for semantic sample frame {frame}")


def sample(item, requested, shots):
    frame = max(item["startFrame"], min(item["endFrame"] - 1, requested))
    timeline_frame = item["sourceStartFrame"] + frame - item["startFrame"]
    return {"outputFrame": frame, "outputTime": frame / FPS,
            "timelineFrame": timeline_frame, "timelineTime": timeline_frame / FPS,
            "requestedOutputFrame": requested, "clampedToBeat": frame != requested,
            "picture": picture_at(frame, shots)}


def plan(timeline, items, assembly=None, window=(188, 207)):
    shots = validate_shots(assembly, items) if assembly is not None else None
    beats, events_count, continuous = [], 0, []
    for item in items:
        beat = item["beat"]
        entries = beat.get("semanticPlan")
        if not isinstance(entries, list) or not entries:
            raise ValueError(f"Missing semanticPlan; refusing generic action fallback: {beat['id']}")
        offset = item["startFrame"] - item["sourceStartFrame"]
        events, seen = [], set()
        for index, event in enumerate(entries):
            for key in ("phrase", "object", "action", "fact"):
                if not isinstance(event.get(key), str) or not event[key].strip():
                    raise ValueError(f"Missing semantic {key}: {beat['id']}/{index}")
            phrase = event["phrase"]
            if phrase in seen:
                raise ValueError(f"Duplicate semantic phrase: {beat['id']}/{phrase}")
            seen.add(phrase)
            for key in ("start", "end", "wordStart", "wordEnd", "seconds", "lead"):
                value = event.get(key)
                if type(value) not in (float, int) or not math.isfinite(value):
                    raise ValueError(f"Missing/nonfinite semantic {key}: {beat['id']}/{phrase}")
            a, b = event["start"], event["end"]
            word = word_window(beat, phrase)
            if word is None or any(abs(actual - expected) > 1e-6
                                   for actual, expected in zip(word, (event["wordStart"], event["wordEnd"]))):
                raise ValueError(f"Semantic phrase differs from actual word events: {beat['id']}/{phrase}")
            if (not beat["start"] <= a < b <= beat["end"] or event["seconds"] <= 0
                    or abs(a - (word[0] - event["lead"])) > 1e-6
                    or abs(b - a - event["seconds"]) > 1e-6):
                raise ValueError(f"Semantic action outside beat or uncalibrated: {beat['id']}/{phrase}")
            requested = {"before": ceil_frame(a) - 1 + offset,
                         "mid": nearest_frame((a + b) / 2) + offset,
                         "end": ceil_frame(b) + offset,
                         "phrase": nearest_frame(sum(word) / 2) + offset,
                         "phrase-end": ceil_frame(word[1]) - 1 + offset}
            samples = {role: sample(item, requested[role], shots) for role in ROLES}
            for role, point in samples.items():
                reference = ({"before": a, "mid": (a + b) / 2, "end": b,
                              "phrase": sum(word) / 2, "phrase-end": word[1]})[role]
                point["deltaFromReferenceSeconds"] = point["timelineTime"] - reference
            start_frame = max(item["startFrame"], ceil_frame(a) + offset)
            end_frame = min(item["endFrame"], ceil_frame(b) + offset)
            photo_spans = []
            for shot_index, shot in enumerate(shots or []):
                left, right = max(start_frame, shot["startFrame"]), min(end_frame, shot["endFrame"])
                if shot["kind"] == "photographic-i2v" and left < right:
                    photo_spans.append({"shotIndex": shot_index, "media": shot.get("media"),
                                        "outputStartFrame": left, "outputEndFrame": right,
                                        "frames": right - left})
            events.append({"index": index, "phrase": phrase, "object": event["object"],
                           "action": event["action"], "fact": event["fact"],
                           "timelineStart": a, "timelineEnd": b,
                           "wordStart": word[0], "wordEnd": word[1],
                           "outputStart": a + offset / FPS, "outputEnd": b + offset / FPS,
                           "outputWordStart": word[0] + offset / FPS,
                           "outputWordEnd": word[1] + offset / FPS,
                           "outputStartFrame": start_frame, "outputEndFrameExclusive": end_frame,
                           "photographicActionSpans": photo_spans,
                           "provenanceStatus": "recorded-assembly" if shots is not None else "assembly-pending",
                           "completionFrameAvailable": samples["end"]["timelineTime"] >= b - 1e-7,
                           "samples": samples})
        for timeline_frame in range(max(item["sourceStartFrame"], ceil_frame(window[0])),
                                    min(item["sourceEndFrame"], ceil_frame(window[1]))):
            continuous.append({"beat": beat["id"], **sample(item, timeline_frame + offset, shots)})
        beats.append({"id": beat["id"], "scene": item["scene"]["id"], "text": beat["text"],
                      "timelineStart": beat["start"], "timelineEnd": beat["end"],
                      "sourceStartFrame": item["sourceStartFrame"], "sourceEndFrame": item["sourceEndFrame"],
                      "outputStartFrame": item["startFrame"], "outputEndFrame": item["endFrame"],
                      "outputOffsetFrames": offset, "outputOffsetSeconds": offset / FPS, "events": events})
        events_count += len(events)
    return {"schemaVersion": 1, "status": "planned-no-encoded-review",
            "fps": FPS, "frames": items[-1]["endFrame"], "beatCount": len(beats),
            "eventCount": events_count, "sampleRoles": list(ROLES),
            "mapping": "assembly-selection-and-shots" if shots is not None else "planned-selection-only",
            "frameConvention": "zero-based output frames; all ranges end-exclusive",
            "sampling": {"before": "last frame strictly before action start, clamped within beat",
                         "mid": "nearest frame to action midpoint",
                         "end": "first frame at/after action completion, clamped within beat",
                         "phrase": "nearest frame to actual spoken phrase midpoint",
                         "phrase-end": "last frame before actual spoken phrase end"},
            "photography": "Recorded replacement shots; never shift or skip a covered event to find code footage.",
            "semanticApproval": "pending independent critic", "limitations": REVIEW_LIMIT,
            "beats": beats, "continuous": {"requestedTimelineStart": window[0],
                                         "requestedTimelineEnd": window[1],
                                         "strideFrames": 1, "samples": continuous}}


def points(evidence):
    for beat in evidence["beats"]:
        for event in beat["events"]:
            yield from event["samples"].values()
    yield from evidence["continuous"]["samples"]


def summary(evidence):
    frames = {point["outputFrame"] for point in points(evidence)}
    return {"status": evidence["status"], "mapping": evidence["mapping"],
            "beats": evidence["beatCount"], "events": evidence["eventCount"],
            "sampleRoles": evidence["sampleRoles"], "uniqueEncodedFrames": len(frames),
            "contactSheets": math.ceil(evidence["beatCount"] / 4),
            "continuousFrames": len(evidence["continuous"]["samples"]),
            "continuousContactSheets": math.ceil(len(evidence["continuous"]["samples"]) / FPS),
            "continuousTimelineWindow": [evidence["continuous"]["requestedTimelineStart"],
                                         evidence["continuous"]["requestedTimelineEnd"]],
            "eventsWithPhotographicActionCoverage": (sum(bool(event["photographicActionSpans"])
                for beat in evidence["beats"] for event in beat["events"])
                if evidence["mapping"] == "assembly-selection-and-shots" else None),
            "semanticApproval": evidence["semanticApproval"], "limitations": REVIEW_LIMIT}


def preflight(timeline, items, record_file, window):
    """No extraction, writes or render dependencies; stale assembly is explicitly pending."""
    evidence = plan(timeline, items, window=window)
    readiness = {"status": "waiting-for-current-assembly", "record": str(record_file)}
    if record_file.is_file():
        try:
            assembly = json.loads(record_file.read_text())
            if assembly.get("timelineSha256") != sha(ROOT / "timeline.json"):
                raise ValueError("Assembly references an older timeline")
            if assembly.get("pictureOnly"):
                raise ValueError("Assembly is picture-only; final composited encode required")
            file = Path(assembly["file"])
            file = file if file.is_absolute() else ROOT / file
            if not file.is_file() or not assembly.get("sha256") or sha(file) != assembly["sha256"]:
                raise ValueError("Final encoded file missing or differs from assembly hash")
            if assembly.get("narrationSha256") != sha(ROOT / "assets/narration.wav"):
                raise ValueError("Assembly references different narration")
            evidence = plan(timeline, items, assembly, window)
            readiness.update(status="current-assembly-ready", file=str(file),
                             encodedSha256=assembly["sha256"])
        except (ValueError, KeyError, OSError) as error:
            readiness["reason"] = str(error)
    else:
        readiness["reason"] = "No assembly record; exact photographic provenance remains pending"
    return {**summary(evidence), "assembly": readiness}


def balanced_sum(values):
    if len(values) == 1:
        return values[0]
    middle = len(values) // 2
    return f"({balanced_sum(values[:middle])}+{balanced_sum(values[middle:])})"


def extract_frames(file, evidence, directory):
    requested = sorted({point["outputFrame"] for point in points(evidence)})
    spans = []
    for frame in requested:
        if spans and frame == spans[-1][1] + 1:
            spans[-1][1] = frame
        else:
            spans.append([frame, frame])
    expression = balanced_sum([f"eq(n\\,{a})" if a == b else f"between(n\\,{a}\\,{b})"
                               for a, b in spans])
    frames = directory / "frames"
    frames.mkdir(parents=True, exist_ok=True)
    # Decode from frame zero once: n is the final encoded frame index, without
    # seek rounding, source screenshots, or photo-to-code substitution.
    with tempfile.TemporaryDirectory(prefix=".extract-", dir=directory) as temporary:
        pattern = Path(temporary) / "sample-%06d.jpg"
        run(["ffmpeg", "-y", "-v", "error", "-i", file, "-map", "0:v:0",
             "-vf", f"select={expression}", "-fps_mode", "vfr", "-an",
             "-q:v", "2", "-start_number", "0", pattern])
        extracted = sorted(Path(temporary).glob("sample-*.jpg"))
        if len(extracted) != len(requested):
            raise ValueError(f"Semantic frame extraction incomplete: {len(extracted)} != {len(requested)}")
        for frame, source in zip(requested, extracted):
            source.replace(frames / f"frame-{frame:06d}.jpg")
    for point in points(evidence):
        point["file"] = str(frames / f"frame-{point['outputFrame']:06d}.jpg")
    return len(requested)


def wrapped(draw, text, face, width):
    lines, current = [], ""
    for char in text:
        if char == "\n" or (current and draw.textlength(current + char, font=face) > width):
            lines.append(current)
            current = "" if char == "\n" else char
        else:
            current += char
    return lines + ([current] if current else [])


def panel(canvas, point, x, y, width, face, title):
    with Image.open(point["file"]) as source:
        image = source.convert("RGB")
    image.thumbnail((width - 6, 320), Image.Resampling.LANCZOS)
    canvas.paste(image, (x + (width - image.width) // 2, y))
    draw = ImageDraw.Draw(canvas)
    kind = point["picture"]["kind"]
    lines = wrapped(draw, title, face, width - 10)
    lines += [f"F{point['outputFrame']}  {point['outputTime']:.3f}s",
              "PHOTO" if kind == "photographic-i2v" else "CODE"]
    for index, line in enumerate(lines):
        draw.text((x + 5, y + 325 + index * 19), line, font=face, fill="#152027")
    return len(lines)


def contact_sheets(evidence, directory):
    face = ImageFont.truetype(str(FONTS / "NotoSansSC-Regular.otf"), 16)
    heading = ImageFont.truetype(str(FONTS / "NotoSansSC-Regular.otf"), 19)
    paths, cell = [], 180
    for offset in range(0, len(evidence["beats"]), 4):
        beats = evidence["beats"][offset:offset + 4]
        columns = max(8, 2 * max(len(beat["events"]) for beat in beats))
        width = columns * cell
        meter = ImageDraw.Draw(Image.new("RGB", (1, 1)))
        title_lines = max(len(wrapped(meter, f"{event['phrase']} / {label}", face, cell - 10))
                          for beat in beats for event in beat["events"]
                          for label in ("词中", "动作后", "结束帧受截断"))
        heading_lines = [wrapped(meter, f"{beat['id']}  "
                         f"{beat['outputStartFrame']/FPS:.3f}-{beat['outputEndFrame']/FPS:.3f}s  "
                         f"{beat['text']}", heading, width - 20) for beat in beats]
        header_height = 14 + 26 * max(len(lines) for lines in heading_lines)
        row_height = header_height + 330 + (title_lines + 2) * 19 + 18
        canvas = Image.new("RGB", (width, row_height * len(beats) + 36), "#eef0f0")
        draw = ImageDraw.Draw(canvas)
        for row, (beat, lines) in enumerate(zip(beats, heading_lines)):
            y = row * row_height
            for line_index, line in enumerate(lines):
                draw.text((10, y + 5 + 26 * line_index), line, font=heading, fill="#152027")
            for event_index, event in enumerate(beat["events"]):
                for subcolumn, (role, label) in enumerate((("phrase", "词中"), ("end", "动作后"))):
                    if role == "end" and not event["completionFrameAvailable"]:
                        label = "结束帧受截断"
                    panel(canvas, event["samples"][role], (event_index * 2 + subcolumn) * cell,
                          y + header_height, cell, face, f"{event['phrase']} / {label}")
        draw.text((10, canvas.height - 28), "FINAL ENCODE / 待独立语义审阅；PHOTO 表示摄影替换，不能视为机制已解释",
                  font=face, fill="#152027")
        file = directory / f"beats-{offset // 4 + 1:02d}.jpg"
        canvas.save(file, quality=92)
        paths.append({"file": str(file), "beats": [beat["id"] for beat in beats],
                      "panels": ["phrase", "end"]})
    return paths


def continuous_sheets(evidence, directory):
    face = ImageFont.truetype(str(FONTS / "NotoSansSC-Regular.otf"), 14)
    samples, paths = evidence["continuous"]["samples"], []
    for offset in range(0, len(samples), FPS):
        page = samples[offset:offset + FPS]
        canvas = Image.new("RGB", (6 * 180, 4 * 406 + 48), "#eef0f0")
        draw = ImageDraw.Draw(canvas)
        draw.text((8, 7), f"连续编码帧 / {page[0]['outputTime']:.3f}-{page[-1]['outputTime']:.3f}s / "
                  "逐行阅读，帧间隔 1/24 秒", font=face, fill="#152027")
        for index, point in enumerate(page):
            panel(canvas, point, (index % 6) * 180, 40 + (index // 6) * 406,
                  180, face, point["beat"])
        file = directory / f"continuous-{offset // FPS + 1:03d}.jpg"
        canvas.save(file, quality=92)
        paths.append({"file": str(file), "outputFrames": [point["outputFrame"] for point in page]})
    return paths


def write_evidence(timeline, items, assembly, file, record_file, review, manifest, window):
    evidence = plan(timeline, items, assembly, window)
    encoded_hash, record_hash, timeline_hash = sha(file), sha(record_file), sha(ROOT / "timeline.json")
    if (assembly.get("pictureOnly") or encoded_hash != assembly.get("sha256")
            or timeline_hash != assembly.get("timelineSha256")
            or json.loads(record_file.read_text()) != assembly
            or json.loads((ROOT / "timeline.json").read_text()) != timeline):
        raise ValueError("Final semantic evidence requires the current composited file and assembly identity")
    directory = review / f"semantic-encoded-{encoded_hash[:16]}"
    directory.mkdir(parents=True, exist_ok=True)
    count = extract_frames(file, evidence, directory)
    sheets = contact_sheets(evidence, directory)
    continuity = continuous_sheets(evidence, directory)
    if (sha(file) != encoded_hash or sha(record_file) != record_hash
            or sha(ROOT / "timeline.json") != timeline_hash):
        raise ValueError("Encoded file, assembly or timeline changed during evidence extraction")
    evidence.update(status="encoded-evidence-ready-human-review-pending",
                    encodedFile=str(file), encodedSha256=encoded_hash,
                    assemblyFile=str(record_file), assemblySha256=record_hash,
                    timelineSha256=timeline_hash, extractedFrameCount=count,
                    contactSheets=sheets)
    evidence["continuous"]["contactSheets"] = continuity
    temporary = manifest.with_suffix(".part.json")
    temporary.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(manifest)
    return {**summary(evidence), "manifest": str(manifest),
            "encodedSha256": encoded_hash, "directory": str(directory)}
