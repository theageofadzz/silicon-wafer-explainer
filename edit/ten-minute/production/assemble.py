"""Speech-timed vertical compositor. Importing this module never starts a render.

SILICON_TENMIN_ROOT is the folder containing timeline.json, assets/, and model/.
Code clips contain the entire corresponding beat at 24 fps, without burned text.
Photography is an optional, unstretched introduction before the exact action.
"""
import argparse
import hashlib
import json
import math
import os
import re
import subprocess
import wave
from fractions import Fraction
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont

ROOT = Path(os.environ.get("SILICON_TENMIN_ROOT", Path(__file__).resolve().parents[1])).resolve()
PROJECT = ROOT.parents[1]
FPS, WIDTH, HEIGHT = 24, 1080, 1920
FONTS = PROJECT / "assets/fonts"
OUT = ROOT / "output"
PHOTO_KEYS = ("quartz", "quartz-macro", "boule", "blank", "chip",
              "silicon-seed", "silicon-shoulder")
ID = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_-]*$")
SAFE = (64, 80, 1016, 1752)
CAPTION_Y, CAPTION_HEIGHT = 1480, 270
LABEL_Y, LABEL_HEIGHT = 345, 1050
SUBSCRIPTS = dict(zip("₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎", "0123456789+-=()"))
OBJECT_LABELS = {
    "wafer": {"空白硅片", "一片硅", "硅片"},
    "silica": {"石英", "石英：SiO₂", "硅—氧网络"},
    "grains": {"多晶：不同晶粒"}, "lattice": {"单晶"},
    "siemens": {"高纯多晶硅", "硅芯"},
    "melt": {"石英坩埚"}, "seed": {"籽晶"}, "neck": {"缩颈"},
    "shoulder": {"放肩"}, "growth": {"等径生长", "真实单晶硅表面", "晶棒"},
    "trim": {"定位缺口"}, "defects": {"空位"}, "epitaxy": {"衬底"},
    "focus": {"焦平面"}, "cassette": {"专用洁净运输盒"},
}
# These old generic rig slots do not identify the named object. A renderer may
# certify a corrected target with anchor.objectLabel == the exact noun label.
UNVERIFIED_TARGETS = {
    ("melt", "石英坩埚"): "legacy first slot is the melt surface",
    ("seed", "籽晶"): "legacy first slot is the neck",
    ("shoulder", "放肩"): "legacy first slot is the neck",
    ("growth", "等径生长"): "legacy first slot is the neck",
    ("growth", "真实单晶硅表面"): "legacy first slot is the neck",
    ("trim", "定位缺口"): "legacy first slot is the rod, without a notch target",
    ("defects", "空位"): "legacy rig first slot is a neck/dislocation target",
    ("focus", "焦平面"): "legacy first slot is a surface spot, not the focal plane",
    ("cassette", "专用洁净运输盒"): "legacy first slot is a wafer inside the box",
}
LIMITS = [
    "Automated timing, glyph and pixel-bound checks are not OCR or a human reading check.",
    "Scientific accuracy, semantic action alignment and normal-speed audiovisual review require a person.",
    "Generated photographic motion is illustrative; exact mechanisms come from code footage.",
]


def run(args, cwd=ROOT):
    result = subprocess.run([str(x) for x in args], cwd=cwd, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(f"{args[0]} failed:\n{result.stderr[-7000:]}")
    return result.stdout


def probe(file):
    return json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format",
                           "-of", "json", file]))


def sha(file):
    digest = hashlib.sha256()
    with Path(file).open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def norm(text):
    return "".join(c for c in text if c.isalnum())


def word_window(beat, phrase):
    joined = "".join(norm(w["text"]) for w in beat["words"])
    phrase = norm(phrase)
    begin = joined.find(phrase)
    if begin < 0:
        return None
    end, cursor, matches = begin + len(phrase), 0, []
    for word in beat["words"]:
        stop = cursor + len(norm(word["text"]))
        if cursor < end and stop > begin:
            matches.append(word)
        cursor = stop
    return (matches[0]["start"], matches[-1]["end"]) if matches else None


def frame_at(t):
    return math.floor(float(t) * FPS + .5)


def inside(file, base=ROOT, must_exist=True):
    file = Path(file)
    file = (base / file).resolve() if not file.is_absolute() else file.resolve()
    if not file.is_relative_to(base.resolve()):
        raise ValueError(f"Path escapes {base}: {file}")
    if must_exist and not file.is_file():
        raise FileNotFoundError(file)
    return file


def check_interval(item, start, end, name):
    a, b = item["start"], item["end"]
    if (not isinstance(a, (int, float)) or not isinstance(b, (int, float))
            or not math.isfinite(a + b) or not start - 1e-6 <= a < b <= end + 1e-6):
        raise ValueError(f"Invalid absolute seconds in {name}: {a}..{b}, expected {start}..{end}")


def check_cues(cues, start, end, name):
    previous = start
    for i, cue in enumerate(cues):
        if not isinstance(cue.get("text"), str) or not cue["text"].strip():
            raise ValueError(f"Empty text in {name}/{i}")
        check_interval(cue, start, end, f"{name}/{i}")
        if cue["start"] < previous - 1e-6:
            raise ValueError(f"Overlapping/out-of-order {name}/{i}")
        previous = cue["end"]


def load_timeline():
    timeline = json.loads(inside("timeline.json").read_text())
    if [timeline.get(k) for k in ("fps", "width", "height")] != [FPS, WIDTH, HEIGHT]:
        raise ValueError("Timeline requires fps=24, width=1080, height=1920")
    duration = timeline.get("duration", 0)
    if not isinstance(duration, (int, float)) or not math.isfinite(duration) or duration <= 0:
        raise ValueError("Timeline duration must be real, finite positive seconds")
    if timeline.get("uncalibratedAnchors") != []:
        raise ValueError("uncalibratedAnchors must exist and be empty; calibrate against actual speech")
    if not timeline.get("scenes"):
        raise ValueError("Timeline has no scenes")
    scene_ids, beat_ids, flat = set(), set(), []
    previous_scene = 0
    for scene in timeline["scenes"]:
        sid = scene.get("id", "")
        if not ID.fullmatch(sid) or sid in scene_ids:
            raise ValueError(f"Invalid/duplicate scene id: {sid}")
        scene_ids.add(sid)
        check_interval(scene, 0, duration, sid)
        if abs(scene["start"] - previous_scene) > 1e-6:
            raise ValueError(f"Scene gap/overlap before {sid}")
        if not isinstance(scene.get("title"), str) or not scene["title"].strip() or "chapter" not in scene:
            raise ValueError(f"Missing literal chapter title/number: {sid}")
        previous_scene, previous_beat = scene["end"], scene["start"]
        if not scene.get("beats"):
            raise ValueError(f"No beats: {sid}")
        for beat in scene["beats"]:
            bid = beat.get("id", "")
            if not ID.fullmatch(bid) or bid in beat_ids:
                raise ValueError(f"Invalid/duplicate beat id: {bid}")
            beat_ids.add(bid)
            check_interval(beat, scene["start"], scene["end"], bid)
            if abs(beat["start"] - previous_beat) > 1e-6:
                raise ValueError(f"Beat gap/overlap before {bid}")
            previous_beat = beat["end"]
            if frame_at(beat["end"]) <= frame_at(beat["start"]):
                raise ValueError(f"Beat shorter than a video frame: {bid}")
            for key in ("text", "visual", "actionAnchor"):
                if not isinstance(beat.get(key), str) or not beat[key].strip():
                    raise ValueError(f"Missing {key}: {bid}")
            labels = beat.get("labels")
            if (not isinstance(labels, list) or not 1 <= len(labels) <= 3
                    or any(not isinstance(s, str) or not s.strip() for s in labels)):
                raise ValueError(f"{bid}: labels need one factual object label and at most two mechanism labels")
            if beat.get("media") and beat["media"] not in PHOTO_KEYS:
                raise ValueError(f"{bid}: unapproved photo key {beat['media']}")
            check_interval({"start": beat["actionStart"], "end": beat["actionEnd"]},
                           beat["start"], beat["end"], f"{bid}/action")
            if not beat.get("words"):
                raise ValueError(f"Missing actual word timestamps: {bid}")
            check_cues(beat["words"], beat["start"], beat["end"], f"{bid}/words")
            check_cues(beat["captions"], beat["start"], beat["end"], f"{bid}/captions")
            if norm(beat["text"]) != norm("".join(w["text"] for w in beat["words"])):
                raise ValueError(f"Transcript/word text differs: {bid}")
            spoken = "".join(norm(w["text"]) for w in beat["words"])
            if norm(beat["actionAnchor"]) not in spoken:
                raise ValueError(f"Uncalibrated speech anchor {bid}: {beat['actionAnchor']}")
            flat.append((scene, beat))
        if abs(previous_beat - scene["end"]) > 1e-6:
            raise ValueError(f"Beats do not cover scene: {sid}")
    if abs(previous_scene - duration) > 1e-6:
        raise ValueError("Scenes do not cover real timeline duration")
    check_cues(timeline["captions"], 0, duration, "master captions")
    beat_cues = [c for _, b in flat for c in b["captions"]]
    signature = lambda cues: [(c["text"], c["start"], c["end"]) for c in cues]
    if signature(beat_cues) != signature(timeline["captions"]):
        raise ValueError("Master captions must equal the flattened beat captions (absolute seconds)")
    return timeline


def select_beats(timeline, only="", pilot=False):
    tokens = {s.strip() for s in only.split(",") if s.strip()}
    scenes = timeline["scenes"]
    known = {s["id"] for s in scenes} | {b["id"] for s in scenes for b in s["beats"]}
    if tokens - known:
        raise ValueError(f"Unknown --only IDs: {sorted(tokens - known)}")
    selected = [(s, b) for s in scenes for b in s["beats"]
                if not tokens or s["id"] in tokens or b["id"] in tokens]
    if pilot:
        # Whole selected scenes, so the pilot cannot end midway through a spoken explanation.
        chosen, count = [], 0
        for scene in scenes:
            pairs = [(s, b) for s, b in selected if s["id"] == scene["id"]]
            if not pairs:
                continue
            if len(pairs) != len(scene["beats"]):
                raise ValueError("--pilot requires complete scenes; use scene IDs with --only")
            frames = frame_at(scene["end"]) - frame_at(scene["start"])
            if count + frames >= 60 * FPS:
                break
            chosen.extend(pairs)
            count += frames
        selected = chosen
    if not selected:
        raise ValueError("No complete scenes fit the pilot (<60s); select a shorter scene with --only")
    result, cursor = [], 0
    for scene, beat in selected:
        first, last = frame_at(beat["start"]), frame_at(beat["end"])
        result.append({"scene": scene, "beat": beat, "sourceStartFrame": first,
                       "sourceEndFrame": last, "startFrame": cursor,
                       "endFrame": cursor + last - first})
        cursor += last - first
    return result


def text_runs(text, font):
    """Compose scientific subscripts from the explicit Noto face, without font fallback."""
    runs = []
    small = font.font_variant(size=round(font.size * .72))
    for char in text:
        if char in SUBSCRIPTS:
            runs.append((SUBSCRIPTS[char], small, round(font.size * .16)))
        elif runs and runs[-1][1] is font and runs[-1][2] == 0:
            runs[-1] = (runs[-1][0] + char, font, 0)
        else:
            runs.append((char, font, 0))
    return runs


def text_width(text, font):
    return sum(face.getlength(value) for value, face, _ in text_runs(text, font))


def caption_lines(text, font, maximum=920, max_lines=2):
    """Measured glyph widths; punctuation cannot begin the second line."""
    text = text.replace("\r", "").strip()
    explicit = text.split("\n")
    if len(explicit) > 1:
        if len(explicit) > max_lines or any(text_width(t, font) > maximum for t in explicit):
            raise ValueError(f"Text exceeds {max_lines} lines / {maximum}px: {text}")
        return explicit
    if text_width(text, font) <= maximum:
        return [text]
    if max_lines < 2:
        raise ValueError(f"Label too long ({maximum}px): {text}")
    candidates = []
    for i in range(1, len(text)):
        if text[i] in "，。！？；：、）》】」』”’,.!?;:" or text[i - 1] in "（《【「『“‘":
            continue
        left, right = text[:i].rstrip(), text[i:].lstrip()
        widths = [text_width(left, font), text_width(right, font)]
        if max(widths) <= maximum:
            candidates.append((abs(widths[0] - widths[1]), left, right))
    if not candidates:
        raise ValueError(f"Text does not fit {max_lines} readable lines: {text}")
    _, left, right = min(candidates)
    return [left, right]


def fonts():
    return {name: ImageFont.truetype(str(inside(f"NotoSansSC-{weight}.otf", FONTS)), size)
            for name, weight, size in [("chapter", "Bold", 30), ("title", "Bold", 64),
                                      ("label", "Bold", 44), ("summary", "Regular", 38),
                                      ("caption", "Bold", 54)]}


def expected_strings(timeline):
    values = []
    for scene in timeline["scenes"]:
        values.extend([str(scene["chapter"]), scene["title"]])
        for beat in scene["beats"]:
            values.extend([beat["text"], beat["visual"], beat["actionAnchor"], *beat["labels"]])
            values.extend(beat.get("localLabels", []))
            values.extend(mechanism_labels(beat))
            values.extend(w["text"] for w in beat["words"])
            values.extend(c["text"] for c in beat["captions"])
    values.extend(c["text"] for c in timeline["captions"])
    return list(dict.fromkeys(values))


def glyph_checks(timeline):
    strings = expected_strings(timeline)
    report = {}
    for weight in ("Regular", "Bold"):
        file = inside(f"NotoSansSC-{weight}.otf", FONTS)
        with TTFont(str(file)) as face:
            cmap = face.getBestCmap()
        characters = {c for text in strings for c in text if not c.isspace()}
        missing = sorted(c for c in characters if ord(c) not in cmap and
                         (c not in SUBSCRIPTS or ord(SUBSCRIPTS[c]) not in cmap))
        if missing:
            raise ValueError(f"{file.name} missing glyphs: {''.join(missing)}")
        report[weight] = {"path": str(file), "sha256": sha(file),
                          "strings": len(strings), "missing": [],
                          "composedSubscripts": {c: SUBSCRIPTS[c] for c in sorted(characters & SUBSCRIPTS.keys())},
                          "subscriptMethod": "same explicit Noto face, 72% size, 16% baseline descent"}
    return report


def draw_block(image, text, font, center, width, max_lines, allowed, kind):
    lines = caption_lines(text, font, width, max_lines)
    spacing = round(font.size * 1.3)
    draw, boxes = ImageDraw.Draw(image), []
    for i, line in enumerate(lines):
        x, y = center[0], center[1] + (i - (len(lines) - 1) / 2) * spacing
        runs = text_runs(line, font)
        width, cursor, parts = text_width(line, font), 0, []
        for value, face, offset in runs:
            a, b, c, d = draw.textbbox((cursor, offset), value, font=face, anchor="ls", stroke_width=2)
            parts.append((a, b, c, d))
            cursor += face.getlength(value)
        left, top = min(p[0] for p in parts), min(p[1] for p in parts)
        right, bottom = max(p[2] for p in parts), max(p[3] for p in parts)
        origin_x, baseline = x - width / 2, y - (top + bottom) / 2
        box = (origin_x + left, baseline + top, origin_x + right, baseline + bottom)
        if not (allowed[0] <= box[0] < box[2] <= allowed[2]
                and allowed[1] <= box[1] < box[3] <= allowed[3]):
            raise ValueError(f"{kind} outside safe bounds: {text} {box}")
        # A close, dark backing follows the actual glyph bounds, not a leader to a guessed object.
        draw.rectangle((box[0] - 8, box[1] - 5, box[2] + 8, box[3] + 5), fill=(12, 17, 19, 215))
        cursor = 0
        for value, face, offset in runs:
            draw.text((origin_x + cursor, baseline + offset), value, font=face, anchor="ls",
                      fill=(247, 248, 246, 255), stroke_width=2, stroke_fill=(12, 17, 19, 255))
            cursor += face.getlength(value)
        boxes.append([int(v) for v in box])
    return {"kind": kind, "text": text, "lines": lines, "boxes": boxes, "fontSize": font.size}


def anchor_position(anchors, bid):
    """Optional screen-space label center; moving/world-space data needs a renderer adapter.

    Accepted: {"beats": {"beat-id": {"label": {"x":540,"y":480,
               "space":"pixels","static":true}}}}. Never infer a pointer from a world point.
    """
    entry = anchors.get("beats", anchors).get(bid, {})
    label = entry.get("label", {}) if isinstance(entry, dict) else {}
    if label.get("static") is not True or label.get("space") not in ("pixels", "normalized"):
        return (540, 395), "static-upper-area"
    x, y = float(label["x"]), float(label["y"])
    if label["space"] == "normalized":
        x, y = x * WIDTH, y * HEIGHT
    if not math.isfinite(x + y):
        raise ValueError(f"Invalid projected label center: {bid}")
    return (x, y), "explicit-static-screen-projection"


def mechanism_labels(beat):
    if beat["id"] == "11-seed-01":
        # The direction is already labeled at the lattice axis itself.
        return []
    labels = beat["labels"][1:]
    if beat["visual"] == "trim" and "定位缺口" in beat["text"]:
        return ["缺口尺寸放大 · 晶向参照"]
    prefix = ("起伏放大示意 · " if beat["visual"] in ("flatness", "focus") else
              "原子尺度放大 · " if beat["visual"] == "epitaxy" else "")
    return [f"截面放大 · {label}" if beat["visual"] == "wafer-measure" and "厚度" in label and "放大" not in label
            else prefix + label for label in labels]


def graphics(item, faces, anchors, directory=None, object_label=True):
    scene, beat = item["scene"], item["beat"]
    image = Image.new("RGBA", (WIDTH, HEIGHT))
    records = [
        draw_block(image, str(scene["chapter"]), faces["chapter"], (540, 104),
                   920, 1, (64, 80, 1016, 130), "chapter"),
        draw_block(image, scene["title"], faces["title"], (540, 225),
                   920, 2, (64, 140, 1016, 330), "literal-question-title"),
    ]
    position, mode = anchor_position(anchors, beat["id"])
    if object_label:
        records.append(draw_block(image, beat["labels"][0], faces["label"], position,
                                  min(920, 2 * min(position[0] - 64, 1016 - position[0])),
                                  2, (64, 345, 1016, 1210), "object-fact"))
    summaries = mechanism_labels(beat)
    for i, label in enumerate(summaries):
        records.append(draw_block(image, label, faces["summary"], (540, 1440 - (len(summaries)-1-i)*76),
                                  920, 1, (64, 1325, 1016, 1475), "mechanism"))
    for i, first in enumerate(records):
        for second in records[i + 1:]:
            for a in first["boxes"]:
                for b in second["boxes"]:
                    if a[0] < b[2] and a[2] > b[0] and a[1] < b[3] and a[3] > b[1]:
                        raise ValueError(f"Overlapping text: {beat['id']}/{first['kind']}/{second['kind']}")
    if directory is not None:
        image.save(directory / f"{beat['id']}.png")
    return {"beat": beat["id"], "labelPlacement": mode, "blocks": records}


def label_kind(beat):
    label = beat["labels"][0]
    return "object-noun" if label in OBJECT_LABELS.get(beat["visual"], set()) else "upper-explanation"


def label_picture(beat, face, anchor=None, extra_anchors=None):
    image = Image.new("RGBA", (WIDTH, HEIGHT))
    label, kind = beat["labels"][0], label_kind(beat)
    reason, point = None, None
    if kind == "object-noun" and anchor is not None:
        mismatch = UNVERIFIED_TARGETS.get((beat["visual"], label))
        if mismatch and anchor.get("objectLabel") != label:
            reason = mismatch
        else:
            x, y = float(anchor["x"]) * WIDTH, float(anchor["y"]) * HEIGHT
            if math.isfinite(x + y) and 64 <= x <= 1016 and 385 <= y <= 1195:
                point = [round(x, 1), round(y, 1)]
            else:
                reason = "projected object is outside the label-safe region"
    if label in ("三项材料控制", "直径与厚度"):
        block = {"kind": "omitted-redundant-heading", "text": label, "lines": [], "boxes": [], "fontSize": face.size}
    elif point is None:
        block = draw_block(image, label, face, (540, 395), 920, 2,
                           (64, 345, 1016, 1210), "object-fact" if kind == "object-noun" else "explanation")
    else:
        lines = caption_lines(label, face, 600, 2)
        half = max(text_width(s, face) for s in lines) / 2 + 14
        x, y = point
        cx = min(1004 - half, max(76 + half, x + (-1 if x < 540 else 1) * (half + 55)))
        cy = min(1125, max(430, y - 116))
        block = draw_block(image, label, face, (cx, cy), 600, 2,
                           (64, 345, 1016, 1210), "projected-object-noun")
        boxes = block["boxes"]
        bounds = [min(b[0] for b in boxes)-10, min(b[1] for b in boxes)-7,
                  max(b[2] for b in boxes)+10, max(b[3] for b in boxes)+7]
        bx, by = (bounds[0]+bounds[2])/2, (bounds[1]+bounds[3])/2
        dx, dy = x-bx, y-by
        factor = min((bounds[2]-bounds[0])/2/max(abs(dx), .001),
                     (bounds[3]-bounds[1])/2/max(abs(dy), .001))
        begin = (bx+dx*factor, by+dy*factor)
        draw = ImageDraw.Draw(image)
        draw.line([begin, (x, y)], fill=(218, 233, 226, 240), width=2)
        draw.ellipse((x-4, y-4, x+4, y+4), fill=(237, 247, 240, 255),
                     outline=(20, 28, 26, 255), width=1)
    extra_blocks = []
    for entry in extra_anchors or []:
        if entry["text"] == label:
            continue
        if entry["text"] not in beat.get("localLabels", []):
            raise ValueError(f"Unspecified local explanatory label: {beat['id']}/{entry['text']}")
        dx, dy = entry.get("offset", [0, -65])
        x = min(970, max(110, entry["x"] * WIDTH + dx))
        y = min(1350, max(505, entry["y"] * HEIGHT + dy))
        half = max(text_width(s, face) for s in caption_lines(entry["text"], face, 600, 2)) / 2 + 12
        x = min(1004-half, max(76+half, x))
        local = None
        for shift in (0, -100, 100, -200, 200):
            proposed_y = min(1350, max(505, y + shift))
            layer = Image.new("RGBA", (WIDTH, HEIGHT))
            proposed = draw_block(layer, entry["text"], face, (x, proposed_y), 600, 2,
                                  (64, 470, 1016, 1390), "local-explanation")
            occupied = [block, *extra_blocks]
            if any(a[0]-12 < b[2] and a[2]+12 > b[0] and a[1]-12 < b[3] and a[3]+12 > b[1]
                   for existing in occupied for a in proposed["boxes"] for b in existing["boxes"]):
                continue
            local, y = proposed, proposed_y
            image.alpha_composite(layer)
            break
        if local is None:
            raise ValueError(f"No readable space for local label: {beat['id']}/{entry['text']}")
        extra_blocks.append(local)
        local_point = (entry["x"] * WIDTH, entry["y"] * HEIGHT)
        boxes = local["boxes"]
        low, high = min(b[1] for b in boxes)-5, max(b[3] for b in boxes)+5
        join = (x, high if local_point[1] > y else low)
        draw = ImageDraw.Draw(image)
        draw.line([join, local_point], fill=(218, 233, 226, 220), width=2)
        draw.ellipse((local_point[0]-3, local_point[1]-3, local_point[0]+3, local_point[1]+3),
                     fill=(237, 247, 240, 255))
    all_blocks = [block, *extra_blocks]
    for i, first in enumerate(all_blocks):
        for second in all_blocks[i+1:]:
            if any(a[0] < b[2] and a[2] > b[0] and a[1] < b[3] and a[3] > b[1]
                   for a in first["boxes"] for b in second["boxes"]):
                raise ValueError(f"Overlapping projected labels: {beat['id']}/{first['text']}/{second['text']}")
    return image.crop((0, LABEL_Y, WIDTH, LABEL_Y+LABEL_HEIGHT)), {
        "kind": kind, "text": label, "projectedPoint": point, "leader": point is not None,
        "fallbackReason": reason, "block": block, "extraBlocks": extra_blocks,
    }


def label_track(items, shots=None, directory=None):
    """Map source-render anchor frame numbers to final output; merge unchanged poses."""
    faces = fonts()
    shots = shots or []
    events, records = [], []
    for item in items:
        beat, bid = item["beat"], item["beat"]["id"]
        shot = next((s for s in shots if s["beat"] == bid and s["kind"] == "exact-code"), None)
        photo_windows = [(s["startFrame"]-item["startFrame"], s["endFrame"]-item["startFrame"])
                         for s in shots if s["beat"] == bid and s["kind"] == "photographic-i2v"]
        source = Path(shot["source"]) if shot else ROOT / "model/renders" / f"{bid}.mp4"
        sidecar = source.with_suffix(".json")
        metadata = json.loads(sidecar.read_text()) if sidecar.is_file() else {}
        samples = metadata.get("anchorFrames", [])
        previous, by_frame = -1, {}
        for sample in samples:
            frame = sample["frame"]
            if not isinstance(frame, int) or frame <= previous:
                raise ValueError(f"Out-of-order projection frames: {bid}")
            previous = frame
            if abs(sample["time"] - (beat["start"]+frame/FPS)) > 1e-5:
                raise ValueError(f"Wrong projection frame/time origin: {bid}/{frame}")
            if not 0 <= sample["time"]-sample["sourceTime"] < 1/12+.002:
                raise ValueError(f"Projection capture time does not match source render: {bid}/{frame}")
            by_frame[frame] = sample
        count = item["endFrame"]-item["startFrame"]
        # Follow each native frame; explicit 12fps draft captures repeat their recorded projection.
        eligible = label_kind(beat) == "object-noun"
        has_extras = any(s.get("extraAnchors") for s in samples)
        points = sorted({0, count, *(p for window in photo_windows for p in window),
                         *(range(0, count) if eligible or has_extras else [])})
        last_key, last_record, pictures = None, None, {}
        for a, b in zip(points, points[1:]):
            sample = None
            photographic = any(begin <= a < end for begin, end in photo_windows)
            if not photographic and samples:
                sample = by_frame.get(a)
                if sample is None:
                    older = [n for n in by_frame if n <= a]
                    sample = by_frame[max(older)] if older else None
            anchor = next((v for v in (sample or {}).get("anchors", [])
                           if v["text"] == beat["labels"][0]), None)
            anchor = anchor if eligible and not photographic else None
            extra = [] if photographic else (sample or {}).get("extraAnchors", [])
            mismatch = UNVERIFIED_TARGETS.get((beat["visual"], beat["labels"][0]))
            if anchor is None:
                pose_key = "upper-band"
            elif mismatch and anchor.get("objectLabel") != beat["labels"][0]:
                pose_key = "unverified-target"
            else:
                pose_key = json.dumps([round(anchor["x"]*WIDTH, 1), round(anchor["y"]*HEIGHT, 1)])
            pose_key += json.dumps(extra, sort_keys=True)
            if pose_key not in pictures:
                pictures[pose_key] = label_picture(beat, faces["label"], anchor, extra)
            image, original_record = pictures[pose_key]
            record = {**original_record}
            record.update({"beat": bid, "sourceFrame": a,
                           "anchorFrame": sample["frame"] if sample else None,
                           "sourceTime": (sample or {}).get("sourceTime"),
                           "outputStartFrame": item["startFrame"]+a,
                           "outputEndFrame": item["startFrame"]+b, "sourceEndFrame": b,
                           "photographic": photographic})
            key = json.dumps({k: record[k] for k in ("kind", "text", "projectedPoint", "leader", "fallbackReason", "photographic", "extraBlocks")},
                             ensure_ascii=False, sort_keys=True)
            if key == last_key:
                events[-1][1] = item["startFrame"]+b
                last_record["outputEndFrame"] = item["startFrame"]+b
                last_record["sourceEndFrame"] = b
                continue
            file = None
            if directory is not None:
                file = directory / f"label-{bid}-{a:05}.png"
                image.save(file)
            events.append([item["startFrame"]+a, item["startFrame"]+b, file])
            records.append(record)
            last_key, last_record = key, record
    return events, {"updateFPS": FPS, "coordinates": "normalized projection -> 1080x1920 pixels",
                    "source": "per-beat model/renders/<beatId>.json anchorFrames",
                    "captionAppliedAfterLabels": True, "events": records,
                    "leaderEvents": sum(r["leader"] for r in records),
                    "unverifiedTargets": sorted({r["fallbackReason"] for r in records if r["fallbackReason"]})}


def caption_image(text, face):
    image = Image.new("RGBA", (WIDTH, CAPTION_HEIGHT))
    block = draw_block(image, text, face, (540, 112), 920, 2,
                       (64, 20, 1016, 232), "caption")
    return image, block


def mapped_captions(items):
    cues = []
    for item in items:
        beat = item["beat"]
        shift = (item["startFrame"] - item["sourceStartFrame"]) / FPS
        for cue in beat["captions"]:
            start = max(item["startFrame"], frame_at(cue["start"] + shift))
            end = min(item["endFrame"], frame_at(cue["end"] + shift))
            if end <= start:
                raise ValueError(f"Caption vanishes at 24fps: {beat['id']}/{cue['text']}")
            if cues and start < cues[-1]["endFrame"]:
                raise ValueError("Caption overlap after frame quantization")
            cues.append({"text": cue["text"], "start": start / FPS, "end": end / FPS,
                         "startFrame": start, "endFrame": end, "beat": beat["id"],
                         "sourceStart": cue["start"], "sourceEnd": cue["end"]})
    return cues


def audio_check(timeline):
    file = inside("assets/narration.wav")
    with wave.open(str(file)) as audio:
        duration = audio.getnframes() / audio.getframerate()
        report = {"path": str(file), "duration": duration, "sampleRate": audio.getframerate(),
                  "channels": audio.getnchannels(), "samples": audio.getnframes()}
    if abs(duration - timeline["duration"]) > 1 / FPS:
        raise ValueError(f"Narration {duration:.6f}s != timeline {timeline['duration']:.6f}s; no silent padding")
    return report


def preflight(timeline, items):
    faces = fonts()
    anchor_file = ROOT / "model/anchors.json"
    anchors = json.loads(anchor_file.read_text()) if anchor_file.is_file() else {}
    layout = [graphics(item, faces, anchors) for item in items]
    cues = mapped_captions(items)
    caption_layout = [caption_image(cue["text"], faces["caption"])[1] for cue in cues]
    return {"glyphs": glyph_checks(timeline), "audio": audio_check(timeline),
            "layout": layout, "captionLayout": caption_layout,
            "captions": cues, "frames": items[-1]["endFrame"],
            "duration": items[-1]["endFrame"] / FPS, "limitations": LIMITS}


def media_info(file):
    data = probe(file)
    video = next((s for s in data["streams"] if s["codec_type"] == "video"), None)
    if video is None:
        raise ValueError(f"Not video: {file}")
    duration = float(video.get("duration", data.get("format", {}).get("duration", 0)))
    frames = int(video["nb_frames"]) if str(video.get("nb_frames", "")).isdigit() else None
    return {"duration": duration, "frames": frames, "fps": float(Fraction(video["avg_frame_rate"])),
            "width": video["width"], "height": video["height"]}


def resolve_inputs(items, supplied=None):
    supplied = supplied or {}
    if set(supplied) - {"code", "photos"}:
        raise ValueError("Input manifest accepts only code and photos mappings")
    code, photos = {}, {}
    for item in items:
        bid = item["beat"]["id"]
        code[bid] = inside(supplied.get("code", {}).get(bid, f"model/renders/{bid}.mp4"))
    for key in PHOTO_KEYS:
        if key in supplied.get("photos", {}):
            photos[key] = inside(supplied["photos"][key], PROJECT)
        else:
            old = (PROJECT / ("generated" if key.startswith("silicon-") else "opening/edit/v3/generated")
                   / f"{key}.mp4")
            candidates = [ROOT / "generated" / f"{key}.mp4", old]
            match = next((file for file in candidates if file.is_file()), None)
            if match:
                photos[key] = inside(match, PROJECT)
    return code, photos


def picture_plan(items, code, photos):
    shots = []
    for item in items:
        beat, bid = item["beat"], item["beat"]["id"]
        data = media_info(code[bid])
        metadata = json.loads(code[bid].with_suffix(".json").read_text())
        if metadata.get("semanticVersion") != 3 or not beat.get("semanticPlan"):
            raise ValueError(f"Legacy generic footage cannot enter the semantic revision: {bid}")
        if metadata.get("semanticPlan") != beat["semanticPlan"]:
            raise ValueError(f"Semantic action plan changed; rerender {bid}")
        expected_sources = {f"model/{p.name}": sha(p) for p in (ROOT / "model").glob("*.mjs")
                            if not p.name.startswith(".")}
        if metadata.get("modelSources") != expected_sources:
            raise ValueError(f"Model source changed; rerender {bid}")
        if metadata.get("visual") != beat["visual"]:
            raise ValueError(f"Model visual changed; rerender {bid}")
        for state in metadata.get("states", []):
            if (abs(state["action"]["start"]-beat["actionStart"]) > 1e-6
                    or abs(state["action"]["end"]-beat["actionEnd"]) > 1e-6):
                raise ValueError(f"Speech action anchors changed; rerender {bid}")
        needed = item["sourceEndFrame"] - item["sourceStartFrame"]
        if (abs(data["fps"] - FPS) > .001 or abs(data["duration"] - needed / FPS) > 1 / FPS + .002
                or (data["frames"] is not None and abs(data["frames"] - needed) > 1)):
            raise ValueError(f"{bid}: exact code render must cover {needed} frames at 24fps (+/-1 rounding frame); got {data}")
        if abs(data["width"] / data["height"] - WIDTH / HEIGHT) > .002:
            raise ValueError(f"{bid}: code render is not vertical 9:16: {data}")
        sidecar = code[bid].with_suffix(".json")
        if sidecar.is_file():
            record = json.loads(sidecar.read_text())
            if record.get("synthetic") is True:
                raise ValueError(f"Synthetic fixture cannot be used for production: {bid}")
            for field in ("start", "end"):
                if field in record and abs(record[field] - beat[field]) > 1e-6:
                    raise ValueError(f"Stale code timing {bid}/{field}; remove and render this beat again")
            if "visual" in record and record["visual"] != beat["visual"]:
                raise ValueError(f"Stale code mechanism for {bid}")
        key, count, photo_start, note = beat.get("media"), 0, 0, "code-only beat"
        if key and key in photos:
            photo = media_info(photos[key])
            available = math.floor(photo["duration"] * FPS + 1e-6)
            if bid == "01-start-01" and key == "blank":
                mirror = word_window(beat, "表面亮得像镜子")
                if mirror is None:
                    raise ValueError("Opening mirror appearance needs its spoken phrase")
                photo_start = max(1, math.ceil(mirror[0]*FPS-1e-7)-item["sourceStartFrame"])
                count = max(0, min(60, available, needed-photo_start))
                note = "real blank-wafer appearance at the spoken mirror-reflection phrase; no repeated introductory insert"
            elif key == "chip":
                note = "patterned-wafer photograph omitted so each subsequent fabrication action remains visible"
            else:
                # Introductory photos end before the modeled semantic action starts.
                before_action = max(0, math.floor(beat["actionStart"] * FPS + 1e-7)
                                    - item["sourceStartFrame"])
                count = max(0, min(60, before_action, available, needed - 1))
                note = "photo capped at action start, 2.5s, and source duration; no retiming"
        elif key:
            note = f"optional photographic asset {key} absent; exact code used throughout"

        def code_part(a, b):
            if b > a:
                shots.append({"beat": bid, "kind": "exact-code", "source": str(code[bid]),
                              "sourceStartFrame": a, "startFrame": item["startFrame"]+a,
                              "endFrame": item["startFrame"]+b, "native": data, "selection": note,
                              "roundingFrameAdjustment": (needed-(data["frames"] or frame_at(data["duration"])))
                              if b == needed else 0})

        if count:
            code_part(0, photo_start)
            shots.append({"beat": bid, "kind": "photographic-i2v", "media": key,
                          "source": str(photos[key]), "sourceStartFrame": 0,
                          "startFrame": item["startFrame"]+photo_start,
                          "endFrame": item["startFrame"]+photo_start+count,
                          "native": photo, "selection": note,
                          "openingOutlineMatch": bid == "01-start-01" and key == "blank"})
            code_part(photo_start+count, needed)
        else:
            code_part(0, needed)
    return shots


def concat_quote(file):
    return "'" + str(file).replace("'", "'\\''") + "'"


def encode_picture(shots, cache):
    parts = []
    for shot in shots:
        count = shot["endFrame"] - shot["startFrame"]
        config = {"shot": shot, "sourceHash": sha(shot["source"]), "version": sha(Path(__file__))}
        key = hashlib.sha256(json.dumps(config, sort_keys=True).encode()).hexdigest()[:20]
        output = cache / f"{shot['beat']}-{shot['kind']}-{key}.mp4"
        if not output.is_file():
            temp = output.with_suffix(".part.mp4")
            correction = ("tpad=stop_mode=clone:stop_duration=0.041666667,"
                          if shot.get("roundingFrameAdjustment") == 1 else "")
            if shot.get("openingOutlineMatch"):
                # Preserve the wafer and its reflections while feathering the unrelated room background.
                weight = "clip((1.2-(pow((X-287)/280,2)+pow((Y-465)/240,2)))/.2,0,1)"
                feather = ":".join(f"{channel}='{channel}(X,Y)*({weight})+{background}*(1-({weight}))'"
                                   for channel, background in [("r", 26), ("g", 27), ("b", 29)])
                framing = (f"format=gbrp,geq={feather},scale=702:1248:flags=lanczos,"
                           "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x1a1b1d,")
            else:
                framing = (f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase:flags=lanczos,"
                           f"crop={WIDTH}:{HEIGHT},")
            filters = (f"trim=start={shot['sourceStartFrame']/FPS:.9f},setpts=PTS-STARTPTS,{correction}"
                       f"fps={FPS},{framing}setsar=1,format=yuv420p")
            run(["ffmpeg", "-y", "-v", "error", "-i", shot["source"], "-vf", filters,
                 "-frames:v", count, "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "0",
                 "-pix_fmt", "yuv420p", "-r", FPS, "-video_track_timescale", "24000",
                 "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709",
                 "-color_trc", "bt709", temp])
            if media_info(temp)["frames"] != count:
                temp.unlink(missing_ok=True)
                raise ValueError(f"Source ended early; refusing to freeze/loop: {shot['source']}")
            temp.replace(output)
        elif media_info(output)["frames"] != count:
            raise ValueError(f"Invalid cached picture segment; remove {output}")
        shot["segment"] = str(output)
        shot["sourceSha256"] = config["sourceHash"]
        parts.append(output)
    listing = cache / "concat.txt"
    listing.write_text("ffconcat version 1.0\n" + "".join(f"file {concat_quote(p)}\n" for p in parts))
    return listing


def sparse_layer(events, frames, directory, name, size):
    """One encoded RGBA frame per text change, never a raw full-length frame stream."""
    empty = directory / f"{name}-empty.png"
    Image.new("RGBA", size).save(empty)
    previous, records = 0, []
    for start, end, image in events:
        if start < previous or end <= start or end > frames:
            raise ValueError(f"Invalid sparse {name} event: {start}..{end}")
        if start > previous:
            records.append((empty, start - previous))
        records.append((image, end - start))
        previous = end
    if previous < frames:
        records.append((empty, frames - previous))
    listing = directory / f"{name}.ffconcat"
    text = "ffconcat version 1.0\n"
    for file, count in records:
        text += f"file {concat_quote(file)}\noption framerate 24\nduration {count/FPS:.12f}\n"
    # The sentinel closes the last sample's duration and clears any final caption.
    text += f"file {concat_quote(empty)}\noption framerate 24\n"
    listing.write_text(text)
    output = directory / f"{name}.mov"
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", listing,
         "-an", "-fps_mode", "vfr", "-c:v", "qtrle", "-pix_fmt", "argb",
         "-video_track_timescale", "24000", output])
    return output


def audio_ranges(items):
    ranges = []
    for item in items:
        a, b = item["sourceStartFrame"], item["sourceEndFrame"]
        if ranges and ranges[-1][1] == a:
            ranges[-1][1] = b
        else:
            ranges.append([a, b])
    return ranges


def timestamp(t):
    ms = round(t * 1000)
    h, rem = divmod(ms, 3600000)
    m, rem = divmod(rem, 60000)
    s, ms = divmod(rem, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def build(args):
    timeline = load_timeline()
    items = select_beats(timeline, args.only, args.pilot)
    validation = preflight(timeline, items)
    supplied = json.loads(args.inputs_json) if args.inputs_json else None
    code, photos = resolve_inputs(items, supplied)
    shots = picture_plan(items, code, photos)
    _, tracking = label_track(items, shots)
    validation["projectionTracking"] = tracking
    if args.check:
        print(json.dumps({**validation, "shots": shots, "status": "preflight-only"}, ensure_ascii=False, indent=2))
        return
    OUT.mkdir(parents=True, exist_ok=True)
    tag = "pilot" if args.pilot else "only" if args.only else "full"
    work = OUT / f"work-{tag}"
    cache = OUT / "segments"
    work.mkdir(exist_ok=True)
    cache.mkdir(exist_ok=True)
    listing = encode_picture(shots, cache)
    picture = OUT / f"{tag}-picture.mp4"
    picture_temp = picture.with_suffix(".part.mp4")
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", listing,
         "-map", "0:v:0", "-c", "copy", "-movflags", "+faststart", picture_temp])
    picture_temp.replace(picture)
    if media_info(picture)["frames"] != validation["frames"]:
        raise ValueError("Picture concat frame count mismatch")
    report = {"mode": tag, "timelineSha256": sha(ROOT / "timeline.json"),
              "narrationSha256": sha(ROOT / "assets/narration.wav"),
              "duration": validation["duration"], "timelineDuration": timeline["duration"],
              "frames": validation["frames"], "width": WIDTH, "height": HEIGHT, "fps": FPS,
              "shots": shots, "selection": [{"scene": i["scene"]["id"], "beat": i["beat"]["id"],
                                            **{k: v for k, v in i.items() if k not in ("scene", "beat")}}
                                           for i in items],
              "validation": validation, "captions": validation["captions"],
              "audioRanges": audio_ranges(items), "textAppliedAfterAI": True,
              "subtitleAppliedLast": True, "limitations": LIMITS}
    if args.picture_only:
        report.update({"file": str(picture), "pictureOnly": True})
        (OUT / f"{tag}-assembly.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
        print(picture)
        return
    faces = fonts()
    anchor_file = ROOT / "model/anchors.json"
    anchors = json.loads(anchor_file.read_text()) if anchor_file.is_file() else {}
    graphic_events, caption_events = [], []
    for item in items:
        graphics(item, faces, anchors, work, object_label=False)
        graphic_events.append((item["startFrame"], item["endFrame"], work / f"{item['beat']['id']}.png"))
    for index, cue in enumerate(validation["captions"]):
        image, _ = caption_image(cue["text"], faces["caption"])
        file = work / f"caption-{index:04}.png"
        image.save(file)
        caption_events.append((cue["startFrame"], cue["endFrame"], file))
    text_track = sparse_layer(graphic_events, validation["frames"], work, "graphics", (WIDTH, HEIGHT))
    label_events, tracking = label_track(items, shots, work)
    object_track = sparse_layer(label_events, validation["frames"], work, "object-labels", (WIDTH, LABEL_HEIGHT))
    report["projectionTracking"] = tracking
    caption_track = sparse_layer(caption_events, validation["frames"], work, "captions",
                                 (WIDTH, CAPTION_HEIGHT))
    srt = "".join(f"{i+1}\n{timestamp(c['start'])} --> {timestamp(c['end'])}\n{c['text']}\n\n"
                  for i, c in enumerate(validation["captions"]))
    (OUT / f"{tag}-captions.srt").write_text(srt)
    filters = ["[0:v][1:v]overlay=0:0:format=auto:repeatlast=1[text]",
               f"[text][2:v]overlay=0:{LABEL_Y}:format=auto:repeatlast=1[labeled]",
               f"[labeled][3:v]overlay=0:{CAPTION_Y}:format=auto:repeatlast=1,format=yuv420p[v]"]
    ranges = audio_ranges(items)
    # No audio joins at visual beat cuts: adjacent selections share one continuous voice range.
    if len(ranges) > 1:
        filters.append(f"[4:a]asplit={len(ranges)}" + "".join(f"[voice{i}]" for i in range(len(ranges))))
    for i, (a, b) in enumerate(ranges):
        input_name = f"voice{i}" if len(ranges) > 1 else "4:a"
        filters.append(f"[{input_name}]atrim=start={a/FPS:.9f}:end={b/FPS:.9f},asetpts=PTS-STARTPTS,"
                       f"afade=t=in:st=0:d=0.03,afade=t=out:st={max(0,(b-a)/FPS-.03):.9f}:d=0.03[a{i}]")
    if len(ranges) > 1:
        filters.append("".join(f"[a{i}]" for i in range(len(ranges))) + f"concat=n={len(ranges)}:v=0:a=1[voice]")
    else:
        filters.append("[a0]anull[voice]")
    filters.append("[voice]loudnorm=I=-16:TP=-1.5:LRA=9[a]")
    report["audioMaster"] = {"filter": "loudnorm=I=-16:TP=-1.5:LRA=9",
                             "targetLUFS": -16, "targetTruePeakDBTP": -1.5,
                             "method": "whole continuous narration; no beat-based voice cuts"}
    output = OUT / ("pilot.mp4" if args.pilot else "only.mp4" if args.only
                    else "silicon-wafer-10min-9x16-v3.mp4")
    temp = output.with_suffix(".part.mp4")
    run(["ffmpeg", "-y", "-v", "warning", "-i", picture, "-i", text_track, "-i", object_track, "-i", caption_track,
         "-i", ROOT / "assets/narration.wav", "-filter_complex", ";".join(filters),
         "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "fast", "-crf", "17",
         "-pix_fmt", "yuv420p", "-r", FPS, "-frames:v", validation["frames"],
         "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
         "-t", f"{validation['duration']:.9f}", "-map_metadata", "-1", "-movflags", "+faststart", temp])
    temp.replace(output)
    report.update({"file": str(output), "sha256": sha(output), "pictureOnly": False,
                   "sparseTextTracks": [str(text_track), str(object_track), str(caption_track)]})
    (OUT / f"{tag}-assembly.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(output, flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pilot", action="store_true", help="Complete scenes totaling strictly less than 60s")
    parser.add_argument("--only", default="", help="Comma-separated scene and/or beat IDs, in timeline order")
    parser.add_argument("--picture-only", action="store_true", help="Lossless picture concat without text or sound")
    parser.add_argument("--check", action="store_true", help="Read-only input, timing, glyph and bounds checks")
    parser.add_argument("--inputs-json", help="JSON {code:{beatId:path},photos:{mediaKey:path}} from ComfyUI")
    args = parser.parse_args()
    try:
        build(args)
    except (ValueError, KeyError, FileNotFoundError, RuntimeError, wave.Error) as error:
        parser.exit(1, f"Assembly blocked: {error}\n")


if __name__ == "__main__":
    main()
