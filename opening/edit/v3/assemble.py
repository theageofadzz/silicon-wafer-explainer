"""Cut native I2V footage and precise geometry on the existing spoken-word timeline."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

EDIT = Path(__file__).resolve().parent
ROOT = EDIT.parents[1]
FPS = 24


def run(args):
    result = subprocess.run([str(arg) for arg in args], cwd=ROOT,
                            capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(f"Command failed ({result.returncode}): {result.stderr[-6000:]}")
    return result.stdout


def probe(file):
    data = json.loads(run(["ffprobe", "-v", "error", "-show_streams",
                           "-show_format", "-of", "json", file]))
    return next(stream for stream in data["streams"] if stream["codec_type"] == "video")


def digest(file):
    result = hashlib.sha256()
    with Path(file).open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def ass_time(seconds):
    centiseconds = round(seconds * 100)
    hours, remainder = divmod(centiseconds, 360000)
    minutes, remainder = divmod(remainder, 6000)
    seconds, fraction = divmod(remainder, 100)
    return f"{hours}:{minutes:02}:{seconds:02}.{fraction:02}"


def raster_captions(cues, font_file, output):
    """Keep Chinese captions portable when the local FFmpeg lacks libass."""
    font = ImageFont.truetype(str(font_file), 55)
    layers = []
    for cue in cues:
        image = Image.new("RGBA", (1080, 240))
        ImageDraw.Draw(image).text((540, 118), cue["text"], font=font, anchor="mm",
                                  fill="white", stroke_width=3, stroke_fill=(16, 16, 16, 255))
        layers.append((cue, image))
    empty = Image.new("RGBA", (1080, 240))
    process = subprocess.Popen(
        ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgba",
         "-s", "1080x240", "-r", str(FPS), "-i", "pipe:0", "-an",
         "-c:v", "qtrle", "-pix_fmt", "argb", str(output)], stdin=subprocess.PIPE)
    try:
        for index in range(729):
            time = index / FPS
            frame = empty
            for cue, image in layers:
                if cue["start"] <= time < cue["end"]:
                    fade = max(0, min(1, (time - cue["start"]) / .065,
                                      (cue["end"] - time) / .065))
                    frame = image.copy()
                    frame.putalpha(image.getchannel("A").point(lambda value: round(value * fade)))
                    break
            process.stdin.write(frame.tobytes())
        process.stdin.close()
        if process.wait():
            raise RuntimeError("Could not encode the Chinese caption layer.")
    except BaseException:
        process.kill()
        process.wait()
        raise


parser = argparse.ArgumentParser()
parser.add_argument("--render-models", action="store_true")
args = parser.parse_args()
if args.render_models:
    run(["node", EDIT / "model/render.mjs", "--render"])

timeline = json.loads((ROOT / "timeline.json").read_text())
if round(timeline["duration"] * FPS) != 729:
    raise ValueError("Recalibrate the shot plan when the narration duration changes.")
captions = json.loads(run(["node", "--input-type=module", "-e",
    "import fs from 'node:fs'; import {resolveTextPlan} from './text-plan.mjs';"
    "console.log(JSON.stringify(resolveTextPlan(JSON.parse(fs.readFileSync('text-plan.json')),"
    "JSON.parse(fs.readFileSync('timeline.json'))).captions));"]))
clips = json.loads((EDIT / "generated-inputs.json").read_text())
shot_plan = {shot["id"]: shot for shot in json.loads((EDIT / "shots.json").read_text())["shots"]}
model = EDIT / "model/model.mp4"
if not model.is_file():
    raise FileNotFoundError(f"Render the precise geometry layer first: {model}")
font_dir = ROOT / "assets/fonts"
for name in ["NotoSansSC-Regular.otf", "NotoSansSC-Bold.otf"]:
    if not (font_dir / name).is_file():
        raise FileNotFoundError(font_dir / name)

# Cuts sit in pauses or just before their spoken object/action. Voice audio stays continuous.
edits = [
    ("chip", 0, 36, 0, "芯片", "加工晶圆的真实芯片阵列，近景侧移"),
    ("blank", 36, 115, 0, "最初", "三维运动约束的空白硅片，由ComfyUI生成镜面变化"),
    ("model", 115, 222, 115, "直径／厚度", "全貌尺寸测量→侧面薄边→局部厚度"),
    ("boule", 222, 277, 0, "长成／单晶", "真实晶棒的实体形状及生长纹"),
    ("model", 277, 341, 277, "再切成", "切口与原有片体连续分离，切至端面机位"),
    ("blank", 341, 375, 8, "外面像镜子", "平面约束下的硅片长条反射"),
    ("model", 375, 450, 375, "里面／排列整齐", "尺度切换进入晶格，沿晶向推进"),
    ("blank", 450, 507, 18, "不只是做薄", "回到引导生成的硅片外观，再转向内部要求"),
    ("model", 507, 566, 507, "纯／完整", "突出非预期杂质的位置，再展示完整晶格"),
    ("blank", 566, 622, 23, "表面足够平", "在受平面约束的硅片上观察连续镜面反射"),
    ("quartz", 622, 666, 0, "而这一切／一块", "真实乳白石英全貌与浅角度视差"),
    ("quartz-macro", 666, 729, 0, "石英／开始", "同一真实石英的断口、内部裂纹与透光细节"),
]
if edits[0][1] != 0 or edits[-1][2] != 729:
    raise ValueError("The picture must cover the full narration.")
for first, second in zip(edits, edits[1:]):
    if first[2] != second[1]:
        raise ValueError("Gap or overlap in the frame timeline.")

segments = EDIT / "segments"
segments.mkdir(exist_ok=True)
rows, records = [], []
for i, (name, start, end, source_start, anchor, action) in enumerate(edits):
    source = model if name == "model" else ROOT / clips[name]
    stream = probe(source)
    available = int(stream.get("nb_frames", 0))
    count = end - start
    if available and source_start + count > available:
        raise ValueError(f"Clip {name} is too short; generate more frames, do not freeze a still.")
    target = segments / f"{i:02}-{name}.mp4"
    filters = [f"trim=start_frame={source_start}:end_frame={source_start + count}",
               "setpts=PTS-STARTPTS",
               "scale=1080:1920:flags=lanczos:in_range=auto:out_range=tv:out_color_matrix=bt709",
               "format=yuv420p",
               "setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709",
               "setsar=1", "fps=24"]
    run(["ffmpeg", "-y", "-v", "error", "-i", source, "-vf", ",".join(filters),
         "-frames:v", count, "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "17",
         "-pix_fmt", "yuv420p", "-color_range", "tv", "-colorspace", "bt709",
         "-color_primaries", "bt709", "-color_trc", "bt709",
         "-video_track_timescale", "12288", target])
    normalized = probe(target)
    if (normalized["pix_fmt"], normalized["color_range"], normalized["color_space"]) != (
            "yuv420p", "tv", "bt709"):
        raise ValueError(f"Segment color metadata was not normalized: {normalized}")
    rows.append(f"file '{target.name}'")
    records.append({"source": name, "file": str(source.relative_to(ROOT)),
                    "startFrame": start, "endFrame": end, "sourceStartFrame": source_start,
                    "start": start / FPS, "end": end / FPS, "speechAnchor": anchor,
                    "pictureAction": action, "nativeSize": [stream["width"], stream["height"]],
                    "method": ("exact modeled geometry" if name == "model" else
                               "native ComfyUI LTX guided video" if name == "blank" else
                               "native ComfyUI LTX real-photo I2V"),
                    "inputKind": ("exact 3D" if name == "model" else
                                  shot_plan[name].get("inputKind", "real photograph"))})
concat_list = segments / "concat.txt"
concat_list.write_text("\n".join(rows) + "\n")
picture = EDIT / "picture.mp4"
run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", concat_list,
     "-c", "copy", "-an", picture])
frame_metadata = json.loads(run([
    "ffprobe", "-v", "error", "-select_streams", "v:0", "-show_frames",
    "-show_entries", "frame=pix_fmt,color_range,color_space", "-of", "json", picture]))["frames"]
if len(frame_metadata) != 729 or any(
        (frame["pix_fmt"], frame.get("color_range"), frame.get("color_space")) !=
        ("yuv420p", "tv", "bt709") for frame in frame_metadata):
    raise ValueError("Mixed pixel/color formats would reset the final filter clock.")

ass = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Narration,Noto Sans SC,55,&H00FFFFFF,&H00FFFFFF,&H00101010,&H80000000,-1,0,0,0,100,100,0,0,1,3.4,0.8,5,78,78,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
for cue in captions:
    text = cue["text"].replace("{", r"\{").replace("}", r"\}")
    ass += (f"Dialogue: 0,{ass_time(cue['start'])},{ass_time(cue['end'])},Narration,,0,0,0,,"
            + r"{\pos(540,1588)\fad(65,65)}" + text + "\n")
subtitle = EDIT / "captions.ass"
subtitle.write_text(ass)
output = ROOT / "sample-9x16-v3.mp4"
credit = "Real-photo source credits and adaptation licenses: assets/v3-real/sources.json. AI camera motion is illustrative."
has_libass = any(line.split()[1:2] == ["ass"] for line in
                run(["ffmpeg", "-hide_banner", "-filters"]).splitlines())
command = ["ffmpeg", "-y", "-v", "warning", "-i", picture, "-i", ROOT / "assets/mix.wav"]
if has_libass:
    caption_method = "libass"
    command += ["-map", "0:v:0", "-map", "1:a:0",
                "-vf", f"ass=filename='{subtitle}':fontsdir='{font_dir}',fps=24"]
else:
    caption_method = "Pillow FreeType RGBA strip, overlaid last"
    strip = EDIT / "caption-layer.mov"
    raster_captions(captions, font_dir / "NotoSansSC-Bold.otf", strip)
    command += ["-i", strip, "-filter_complex",
                "[0:v][2:v]overlay=0:1470:format=auto,fps=24[v]",
                "-map", "[v]", "-map", "1:a:0"]
run(command + [
     "-c:v", "libx264", "-preset", "fast", "-crf", "17", "-pix_fmt", "yuv420p",
     "-r", "24", "-fps_mode", "cfr", "-frames:v", "729",
     "-af", "afade=t=in:st=0:d=0.03,afade=t=out:st=30.345:d=0.03,loudnorm=I=-16:TP=-1.5:LRA=8",
     "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-t", timeline["duration"],
     "-metadata", "title=Silicon wafer vertical sample - real materials revision 3",
     "-metadata", f"comment={credit}", "-movflags", "+faststart", output])
result = probe(output)
if (result["width"], result["height"], int(result["nb_frames"])) != (1080, 1920, 729):
    raise ValueError(f"The encoded output format is incorrect: {result}")
i2v_frames = sum(r["endFrame"] - r["startFrame"] for r in records if r["source"] != "model")
photo_frames = sum(r["endFrame"] - r["startFrame"] for r in records
                   if r["inputKind"] == "real photograph")
report = {"revision": 3, "fps": FPS, "duration": timeline["duration"], "frames": 729,
          "nativeI2VFramesInFinal": i2v_frames, "nativeI2VSecondsInFinal": i2v_frames / FPS,
          "nativeDiffusionSecondsInFinal": i2v_frames / FPS,
          "realPhotoI2VSecondsInFinal": photo_frames / FPS,
          "guidedDiffusionSecondsInFinal": (i2v_frames - photo_frames) / FPS,
          "shots": records, "captions": captions, "captionSource": "actual word events, text-plan revision 2",
          "captionRendering": caption_method,
          "segmentColorNormalization": {"framesChecked": len(frame_metadata),
                                        "pixelFormat": "yuv420p", "range": "tv",
                                        "matrix": "bt709", "continuousPTS": True},
          "sha256": digest(output),
          "limits": "Native diffusion is upscaled. Quartz, boule and patterned wafer use real photos; blank wafer uses a precise 3D video guide. This explanatory sample is not documentary footage."}
(EDIT / "review/assembly.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))
print(output)
