"""Cut photographic footage and guided scenes on actual speech; composite type last."""
import argparse
import hashlib
import json
import math
import subprocess
import wave
from fractions import Fraction
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
FPS, SR = 24, 48000
OUT = ROOT / "output"
OUT.mkdir(exist_ok=True)


def run(args):
    result = subprocess.run([str(arg) for arg in args], capture_output=True, text=True, cwd=ROOT)
    if result.returncode:
        raise RuntimeError(result.stderr[-8000:])
    return result.stdout


def probe(file):
    return json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", file]))


def sha(file):
    result = hashlib.sha256()
    with Path(file).open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def anchor(scene, text):
    norm = lambda x: "".join(c for c in x if c.isalnum())
    full = "".join(norm(w["text"]) for w in scene["words"])
    pos = full.find(norm(text))
    if pos < 0:
        raise ValueError(f"Missing speech anchor: {scene['id']}/{text}")
    cursor = 0
    for word in scene["words"]:
        cursor += len(norm(word["text"]))
        if cursor > pos:
            return word["start"]
    raise ValueError("Uncalibrated word anchor")


def mix_audio(timeline, output):
    with wave.open(str(ROOT / "assets/narration.wav")) as source:
        assert source.getframerate() == SR and source.getnchannels() == 1
        voice = np.frombuffer(source.readframes(source.getnframes()), dtype="<i2").astype(np.float32) / 32768
    duration = timeline["duration"]
    length = round(duration * SR)
    assert abs(len(voice) - length) <= 2
    t = np.arange(length) / SR
    bed = np.zeros(length, dtype=np.float32)
    for f, gain in [(110, .006), (164.8138, .004), (220, .0028), (277.1826, .002)]:
        bed += gain * np.sin(2 * np.pi * f * t + .08 * np.sin(2 * np.pi * .1 * t))
    bed *= np.minimum(t / .8, 1) * np.minimum((duration - t) / 1.8, 1)
    envelope = np.convolve(np.abs(voice[::240]), np.ones(30) / 30, mode="same")
    duck = 1 / (1 + np.interp(t, np.arange(len(envelope)) * .005, envelope) * 22)
    mix = voice + bed * duck
    with wave.open(str(ROOT / "opening/assets/mix.wav")) as source:
        opening = np.frombuffer(source.readframes(source.getnframes()), dtype="<i2").astype(np.float32) / 32768
    n = min(len(opening), round(timeline["openingDuration"] * SR))
    mix[:n] = opening[:n]
    events = []
    for scene in timeline["scenes"]:
        if scene["id"] not in ["reduction", "seed", "slice", "lapping", "clean", "inspect"]:
            continue
        keyword = {"reduction": "高温", "seed": "向上", "slice": "切成",
                   "lapping": "研磨", "clean": "去掉", "inspect": "检查"}[scene["id"]]
        at = anchor(scene, keyword)
        x = np.arange(round(.36 * SR)) / SR
        sound = .017 * np.sin(2 * np.pi * (220 * x + 950 * x * x)) * np.sin(np.pi * x / .36) ** 2
        start = round(at * SR)
        count = min(len(sound), length - start)
        mix[start:start + count] += sound[:count]
        events.append({"scene": scene["id"], "word": keyword, "time": at, "duration": .36})
    with wave.open(str(output), "wb") as target:
        target.setparams((1, 2, SR, 0, "NONE", "not compressed"))
        target.writeframes((np.clip(mix, -1, 1) * 32767).astype("<i2").tobytes())
    return events


def caption_lines(text, font):
    if font.getlength(text) <= 930:
        return [text]
    candidates = []
    for i in range(1, len(text)):
        if text[i] in "，。！？；：、）》】」』”’" or text[i - 1] in "（《【「『“‘":
            continue
        widths = [font.getlength(text[:i]), font.getlength(text[i:])]
        if max(widths) <= 930:
            candidates.append((abs(widths[0] - widths[1]), i))
    if candidates:
        _, index = min(candidates)
        return [text[:index], text[index:]]
    raise ValueError(f"Caption does not fit: {text}")


def caption_layer(cues, duration, path):
    file = ROOT / "assets/fonts/NotoSansSC-Bold.otf"
    font = ImageFont.truetype(str(file), 55)
    cmap = TTFont(str(file)).getBestCmap()
    for cue in cues:
        missing = [c for c in cue["text"] if not c.isspace() and ord(c) not in cmap]
        if missing:
            raise ValueError(f"Missing required font glyphs: {missing}")
    rendered = []
    for cue in cues:
        image = Image.new("RGBA", (1080, 280))
        lines = caption_lines(cue["text"], font)
        draw = ImageDraw.Draw(image)
        for i, text in enumerate(lines):
            draw.text((540, 100 + i * 73 - (len(lines) - 1) * 36), text, anchor="mm",
                      font=font, fill="white", stroke_width=3, stroke_fill=(16, 16, 16, 255))
        rendered.append((cue, image))
    empty = Image.new("RGBA", (1080, 280))
    process = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgba",
                                "-s", "1080x280", "-r", str(FPS), "-i", "pipe:0",
                                "-an", "-c:v", "qtrle", "-pix_fmt", "argb", str(path)], stdin=subprocess.PIPE)
    index = 0
    try:
        for frame in range(round(duration * FPS)):
            time = frame / FPS
            while index < len(rendered) and time >= rendered[index][0]["end"]:
                index += 1
            image = empty
            if index < len(rendered):
                cue, layer = rendered[index]
                if cue["start"] <= time < cue["end"]:
                    image = layer
            process.stdin.write(image.tobytes())
        process.stdin.close()
        if process.wait():
            raise RuntimeError("Caption layer encoding failed")
    except BaseException:
        process.kill()
        process.wait()
        raise
    return {"font": str(file.relative_to(ROOT)), "size": 55, "glyphsVerified": True,
            "maximumWidth": 930, "safeY": [1490, 1660], "cueCount": len(cues)}


def stamp(seconds):
    ms = round(seconds * 1000)
    hours, rest = divmod(ms, 3600000)
    minutes, rest = divmod(rest, 60000)
    seconds, millis = divmod(rest, 1000)
    return f"{hours:02}:{minutes:02}:{seconds:02},{millis:03}"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--picture-only", action="store_true")
    parser.add_argument("--pilot", action="store_true")
    args = parser.parse_args()
    timeline = json.loads((ROOT / "timeline.json").read_text())
    clips = {s["id"]: f"generated/{s['id']}.mp4" for s in timeline["scenes"]}
    clips["opening"] = "opening/sample-9x16-v3.mp4"
    if (ROOT / "production/selected-clips.json").is_file():
        clips.update(json.loads((ROOT / "production/selected-clips.json").read_text()))
    for name in ["hot-crystal", "silicon-seed", "silicon-shoulder"]:
        clips[name] = clips.get(name.replace("-", "_"), f"generated/{name}.mp4")
    segments = OUT / "segments"
    segments.mkdir(exist_ok=True)
    records, parts = [], []

    def add(name, start_frame, end_frame, source, source_start=0, native_duration=None):
        count = end_frame - start_frame
        if count <= 0:
            return
        if not source.is_file():
            raise FileNotFoundError(source)
        data = probe(source)
        stream = next(s for s in data["streams"] if s["codec_type"] == "video")
        available = float(stream.get("duration", data["format"]["duration"]))
        desired = count / FPS
        native_duration = native_duration if native_duration is not None else desired
        if source_start + native_duration > available + .08:
            raise ValueError(f"Source range exceeds generated clip {name}: {source_start}+{native_duration}>{available}")
        native_duration = min(native_duration, available - source_start)
        target = segments / f"{len(parts):02}-{name}.mp4"
        filters = [f"trim=start={source_start}:duration={native_duration}", "setpts=PTS-STARTPTS"]
        factor = desired / native_duration
        if abs(factor - 1) > .002:
            filters += [f"setpts=PTS*{factor:.10f}"]
        # Interpolate at diffusion resolution, before upscale; never freeze a still to fill time.
        rate = float(Fraction(stream["avg_frame_rate"]))
        filters += ([f"tpad=stop_mode=clone:stop_duration={3*factor/rate+2/FPS:.6f}",
                     "minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=fdiff:scd_threshold=5"]
                    if rate / factor < 23 else ["fps=24"])
        filters += ["scale=1080:1920:flags=lanczos", "setsar=1", "format=yuv420p",
                    "setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709"]
        run(["ffmpeg", "-y", "-v", "error", "-i", source, "-vf", ",".join(filters),
             "-frames:v", count, "-an", "-c:v", "libx264", "-crf", "17", "-preset", "fast",
             "-pix_fmt", "yuv420p", "-color_range", "tv", "-colorspace", "bt709",
             "-color_primaries", "bt709", "-color_trc", "bt709", target])
        actual = next(s for s in probe(target)["streams"] if s["codec_type"] == "video")
        if int(actual["nb_frames"]) != count:
            raise ValueError(f"Wrong segment length: {name} {actual['nb_frames']} != {count}")
        records.append({"name": name, "startFrame": start_frame, "endFrame": end_frame,
                        "source": str(source.relative_to(ROOT)), "sourceStart": source_start,
                        "sourceDuration": native_duration, "timeScale": factor,
                        "nativeSize": [stream["width"], stream["height"]], "nativeFrameRate": rate})
        parts.append(target)
        print(f"Cut {name}: {start_frame / FPS:.3f}..{end_frame / FPS:.3f}", flush=True)

    opening_end = round(timeline["openingDuration"] * FPS)
    add("opening", 0, opening_end, ROOT / clips["opening"])
    scenes = timeline["scenes"][:2] if args.pilot else timeline["scenes"]
    for scene in scenes:
        start, end = round(scene["start"] * FPS), round(scene["end"] * FPS)
        source = ROOT / clips[scene["id"]]
        if scene["id"] == "silica":
            cut = round(anchor(scene, "二氧化硅") * FPS)
            add("quartz-return", start, cut, ROOT / "opening/edit/v3/generated/quartz-macro.mp4", 0,
                min(2.6, (cut - start) / FPS))
            add(scene["id"], cut, end, source, (cut - start) / FPS)
        elif scene["id"] in ["seed", "trim"]:
            photo, phrase = {"seed": ("silicon-seed", "接触"),
                             "trim": ("silicon-shoulder", "切去")}[scene["id"]]
            cut = round(anchor(scene, phrase) * FPS)
            cut = max(start + 12, min(start + 60, cut))
            add(photo, start, cut, ROOT / clips[photo], 0, min((cut - start) / FPS, 65 / 24))
            add(scene["id"], cut, end, source, (cut - start) / FPS)
        elif scene["id"] == "polish":
            cut = round(scene["captions"][2]["end"] * FPS)
            add(scene["id"], start, cut, source)
            add("mirror-result", cut, end, ROOT / "opening/edit/v3/generated/blank.mp4", .1, (end - cut) / FPS)
        elif scene["id"] == "ending":
            cut1 = round(scene["captions"][1]["start"] * FPS)
            cut2 = round(scene["captions"][2]["start"] * FPS)
            add(scene["id"], start, cut1, source)
            add("blank-ending", cut1, cut2, ROOT / "opening/edit/v3/generated/blank.mp4", 0,
                min(81 / 24, (cut2 - cut1) / FPS))
            add("chip-ending", cut2, end, ROOT / "opening/edit/v3/generated/chip.mp4", 0,
                min(49 / 24, (end - cut2) / FPS))
        else:
            add(scene["id"], start, end, source)
    for a, b in zip(records, records[1:]):
        assert a["endFrame"] == b["startFrame"], "Picture gap or overlap"
    duration = records[-1]["endFrame"] / FPS
    concat = segments / "concat.txt"
    concat.write_text("".join(f"file '{part.name}'\n" for part in parts))
    picture = OUT / ("pilot-picture.mp4" if args.pilot else "picture.mp4")
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", concat, "-c", "copy", picture])
    (ROOT / "review/assembly-plan.json").write_text(json.dumps({"duration": duration, "shots": records}, ensure_ascii=False, indent=2))
    if args.picture_only:
        return
    cues = [cue.copy() for cue in timeline["captions"] if cue["start"] < duration]
    for first, second in zip(cues, cues[1:]):
        first["end"] = min(first["end"], second["start"] - .02)
    # Opening captions are already burned into the approved film. New captions start at its end.
    caption_report = caption_layer(cues, duration, OUT / "caption-layer.mov")
    srt = "".join(f"{i+1}\n{stamp(c['start'])} --> {stamp(c['end'])}\n{c['text']}\n\n" for i, c in enumerate(cues))
    (OUT / "captions-new.srt").write_text(srt)
    opening_cues = json.loads((ROOT / "opening/edit/v3/review/assembly.json").read_text())["captions"]
    all_cues = opening_cues + cues
    (OUT / "captions.srt").write_text("".join(
        f"{i+1}\n{stamp(c['start'])} --> {stamp(c['end'])}\n{c['text']}\n\n"
        for i, c in enumerate(all_cues)))
    events = mix_audio(timeline, OUT / "mix.wav")
    output = OUT / ("pilot.mp4" if args.pilot else "silicon-wafer-explainer-9x16.mp4")
    run(["ffmpeg", "-y", "-v", "warning", "-i", picture, "-i", OUT / "mix.wav",
         "-i", OUT / "caption-layer.mov", "-filter_complex", "[0:v][2:v]overlay=0:1490:format=auto,fps=24[v]",
         "-map", "[v]", "-map", "1:a:0", "-c:v", "libx264", "-preset", "fast", "-crf", "17",
         "-pix_fmt", "yuv420p", "-r", "24", "-frames:v", round(duration * FPS),
         "-af", f"afade=t=out:st={duration-.08}:d=0.08,loudnorm=I=-16:TP=-1.5:LRA=8",
         "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-t", duration,
         "-metadata", "title=From quartz to silicon wafer",
         "-metadata", "comment=Illustrative real-photo I2V and guided 3D. Attribution and licenses in THIRD_PARTY.md. CC BY-SA 4.0.",
         "-movflags", "+faststart", output])
    report = {"file": str(output.relative_to(ROOT)), "sha256": sha(output), "duration": duration,
              "width": 1080, "height": 1920, "fps": FPS, "frames": round(duration * FPS),
              "shots": records, "captions": cues, "captionRendering": caption_report,
              "soundEvents": events, "speechTiming": timeline["timeTruth"],
              "timeInterpolation": "Native 6–9fps guide resynthesis -> 24fps motion-compensated interpolation; I2V photos natively 24fps",
              "decodeAndOCR": "Run production/verify.py on this output; assembly alone does not imply approval"}
    (ROOT / ("review/pilot-assembly.json" if args.pilot else "review/assembly.json")).write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(output, flush=True)


if __name__ == "__main__":
    main()
