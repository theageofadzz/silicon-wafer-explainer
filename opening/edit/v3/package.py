"""Build a portable sample, source and ComfyUI workflow delivery."""
import hashlib
import json
import zipfile
from pathlib import Path

EDIT = Path(__file__).resolve().parent
ROOT = EDIT.parents[1]
OUTPUT = ROOT / "wafer-vertical-v3-comfyui.zip"


def digest_file(file):
    digest = hashlib.sha256()
    with Path(file).open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


required = [
    ROOT / "sample-9x16-v3.mp4", EDIT / "workflows/all.json",
    EDIT / "workflows/all-api.json", EDIT / "workflows/assemble-cached.json",
    EDIT / "review/verification.json", EDIT / "review/workflow-import.json",
    EDIT / "review/playback.json", EDIT / "model/model.mp4",
]
required.extend(EDIT / "generated" / f"{name}.mp4"
                for name in ["chip", "blank", "boule", "quartz", "quartz-macro"])
for file in required:
    if not file.is_file():
        raise FileNotFoundError(file)
with (ROOT / "sample-9x16-v3.mp4").open("rb") as source:
    video_hash = digest_file(ROOT / "sample-9x16-v3.mp4")
for name in ["verification.json", "playback.json"]:
    report = json.loads((EDIT / "review" / name).read_text())
    if report.get("videoSHA256") != video_hash:
        raise ValueError(f"{name} does not verify the final video.")

relative_files = [
    "sample-9x16-v3.mp4", "watch-v3.html", "server.mjs", "launch_comfy.py",
    "REVISION-3.md", "BRIEF.md", "ocr.swift",
    "package.json", "timeline.json", "timeline.js", "text-plan.json", "text-plan.mjs",
    "script.json", "assets/mix.wav", "assets/narration.wav", "assets/silicon-detail.png",
    "review/v3-reference/REFERENCE-ANALYSIS.md", "review/v3-reference/frame-manifest.json",
]
files = [ROOT / p for p in relative_files]
for directory in ["assets/fonts", "assets/vendor", "assets/v3-real",
                  "comfyui/custom_nodes/wafer_vertical_v3"]:
    files.extend(p for p in (ROOT / directory).rglob("*")
                 if p.is_file() and not p.name.startswith("._") and "__pycache__" not in p.parts)
files.extend(p for p in EDIT.rglob("*") if p.is_file()
             and not any(part in {"segments", "node_modules", "__pycache__"} for part in p.parts)
             and not p.name.startswith("._")
             and not p.name.startswith(("frame-", "encoded-", "contact-", "caption-", "playback-"))
             and p.name not in {"picture.mp4", "comfy-server.log", "comfy-server-pid.json",
                                "model.pending.mp4"})
files = sorted(set(files))
manifest = []
for file in files:
    digest = digest_file(file)
    manifest.append({"file": str(file.relative_to(ROOT)), "bytes": file.stat().st_size,
                     "sha256": digest})
with zipfile.ZipFile(OUTPUT, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=3) as archive:
    for file in files:
        archive.write(file, str(Path("wafer-vertical-v3") / file.relative_to(ROOT)))
    archive.writestr("wafer-vertical-v3/sha256-manifest.json",
                     json.dumps(manifest, indent=2, ensure_ascii=False))
    archive.writestr("wafer-vertical-v3/README.md",
                     "# 硅片科普：第三版工程\n\n制作、安装与工作流说明见 `edit/v3/README.md`。\n"
                     "成片为 `sample-9x16-v3.mp4`，播放器为 `watch-v3.html`。\n"
                     "模型权重不包含在本包内；下载与校验信息见 `edit/v3/workflows/models.json`。\n")
with zipfile.ZipFile(OUTPUT) as archive:
    if archive.testzip():
        raise RuntimeError("Delivery ZIP failed its CRC check.")
print(json.dumps({"zip": str(OUTPUT), "bytes": OUTPUT.stat().st_size,
                  "files": len(files), "weightsIncluded": False}, ensure_ascii=False))
