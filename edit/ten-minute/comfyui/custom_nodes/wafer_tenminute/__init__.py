"""Ten-minute silicon film: missing exact renders, native LTX photos, final assembly."""
import gc
import hashlib
import importlib.util
import json
import os
import shlex
import subprocess
import sys
from pathlib import Path

ROOT = Path(os.environ.get("SILICON_TENMIN_ROOT", Path(__file__).resolve().parents[3])).resolve()
PROJECT = ROOT.parents[1]
KEYS = ["quartz", "quartz-macro", "boule", "blank", "chip", "silicon-seed", "silicon-shoulder"]
PHOTOS = {key: PROJECT / "opening/assets/v3-real" / f"input-{key}.png"
          for key in ["quartz", "quartz-macro", "boule", "chip"]}
PHOTOS["blank"] = PROJECT / "opening/assets/v3-real/input-wafer.png"
PHOTOS.update({key: PROJECT / "assets/inputs" / f"{key}.png"
               for key in ["silicon-seed", "silicon-shoulder"]})


def digest(file):
    value = hashlib.sha256()
    with Path(file).open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def compositor():
    file = ROOT / "production/assemble.py"
    spec = importlib.util.spec_from_file_location("silicon_tenminute_assembly", file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def cached_photo(key):
    if key not in KEYS:
        raise ValueError(f"Unknown approved photo: {key}")
    old = PROJECT / ("generated" if key.startswith("silicon-") else "opening/edit/v3/generated")
    return next((p for p in [ROOT / "generated" / f"{key}.mp4", old / f"{key}.mp4"] if p.is_file()), None)


def release_models():
    import comfy.model_management
    comfy.model_management.unload_all_models()
    gc.collect()
    comfy.model_management.soft_empty_cache()


class WTPrepare:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {
            "only": ("STRING", {"default": ""}),
            "pilot": ("BOOLEAN", {"default": False}),
            "render_missing": ("BOOLEAN", {"default": True}),
            "render_command": ("STRING", {"default": "",
                "tooltip": "Optional argv template with {ids}; no shell. Default: node production/render.mjs --render --only={ids}"}),
        }}

    RETURN_TYPES = ("WT_PROJECT",)
    RETURN_NAMES = ("exact_code_manifest",)
    FUNCTION = "prepare"
    CATEGORY = "Silicon Ten Minute/Preparation"

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        # Recheck external files on every queue, including deletion after a prior successful run.
        return float("nan")

    def prepare(self, only, pilot, render_missing, render_command):
        if not (ROOT / "assets/narration.wav").is_file():
            before = json.loads((ROOT / "timeline.json").read_text()) if (ROOT / "timeline.json").is_file() else None
            plan = json.loads((ROOT / "script.json").read_text())
            for scene in plan["scenes"]:
                stem = ROOT / "assets/voice" / scene["id"]
                cache = stem.with_suffix(".json")
                if not cache.is_file() or not stem.with_suffix(".mp3").is_file():
                    raise FileNotFoundError(f"Offline narration needs cached MP3 + WordBoundary JSON: {stem}")
                expected = {"text": "".join(b["text"] for b in scene["beats"]),
                            "voice": plan["voice"], "rate": plan["rate"]}
                if json.loads(cache.read_text()).get("config") != expected:
                    raise ValueError(f"Cached narration differs from script: {scene['id']}; no new TTS is authorized")
            python = Path(os.environ.get("SILICON_TENMIN_PYTHON", PROJECT / ".venv/bin/python3"))
            if not python.is_file():
                raise FileNotFoundError(f"Repository Python required for offline cached narration: {python}")
            subprocess.run([str(python), str(ROOT / "production/narrate.py"), "--fit"],
                           cwd=ROOT, env=dict(os.environ, SILICON_TENMIN_ROOT=str(ROOT)), check=True)
            if before is not None and json.loads((ROOT / "timeline.json").read_text()) != before:
                raise ValueError("Offline narration reconstruction changed timeline hash; calibrate and re-export before generation")
        module = compositor()
        timeline = module.load_timeline()
        items = module.select_beats(timeline, only, pilot)
        ids = [item["beat"]["id"] for item in items]
        # The visual source owns the explicit action plan. Re-resolve it against
        # actual cached words before deciding whether old footage is reusable.
        release_models()
        subprocess.run([os.environ.get("SILICON_NODE", "node"),
                        str(ROOT / "production/render.mjs"), "--calibrate",
                        "--w=576", "--h=1024", "--only=" + ",".join(ids)],
                       cwd=ROOT, env=dict(os.environ, SILICON_TENMIN_ROOT=str(ROOT)), check=True)
        timeline = module.load_timeline()
        items = module.select_beats(timeline, only, pilot)
        module.preflight(timeline, items)
        expected_sources = {f"model/{p.name}": digest(p) for p in (ROOT / "model").glob("*.mjs")
                            if not p.name.startswith(".")}
        planned = {item["beat"]["id"]: item["beat"].get("semanticPlan") for item in items}
        missing = []
        for bid in ids:
            video = ROOT / "model/renders" / f"{bid}.mp4"
            sidecar = video.with_suffix(".json")
            record = json.loads(sidecar.read_text()) if sidecar.is_file() else {}
            if (not video.is_file() or record.get("semanticVersion") != 3
                    or record.get("modelSources") != expected_sources
                    or record.get("semanticPlan") != planned[bid]):
                missing.append(bid)
        if missing:
            if not render_missing:
                raise FileNotFoundError(f"Missing exact code renders: {', '.join(missing)}")
            if render_command.strip():
                if "{ids}" not in render_command:
                    raise ValueError("render_command must include {ids}; only missing beat IDs may be rendered")
                argv = [arg.replace("{ids}", ",".join(missing)).replace("{root}", str(ROOT))
                        for arg in shlex.split(render_command)]
            else:
                script = next((f for f in [ROOT / "model/render.mjs", ROOT / "production/render.mjs"]
                               if f.is_file()), None)
                if script is None:
                    raise FileNotFoundError("Provide production/render.mjs or model/render.mjs supporting --render --only=IDs")
                if "--only" not in script.read_text():
                    raise ValueError(f"{script} does not declare --only; refusing an accidental full render")
                argv = [os.environ.get("SILICON_NODE", "node"), str(script), "--render",
                        "--w=1080", "--h=1920", "--capture-fps=24", "--only=" + ",".join(missing)]
            release_models()
            subprocess.run(argv, cwd=ROOT, env=dict(os.environ, SILICON_TENMIN_ROOT=str(ROOT)), check=True)
        code = {bid: str(module.inside(f"model/renders/{bid}.mp4")) for bid in ids}
        # Existing bad/stale-length renders block instead of being silently regenerated.
        module.picture_plan(items, {bid: Path(file) for bid, file in code.items()}, {})
        return (json.dumps({"root": str(ROOT), "timelineSha256": digest(ROOT / "timeline.json"),
                            "narrationSha256": digest(ROOT / "assets/narration.wav"),
                            "only": only, "pilot": pilot, "code": code,
                            "codeSha256": {bid: digest(file) for bid, file in code.items()}},
                           ensure_ascii=False),)


class WTPhoto:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"photo": (KEYS, {"default": "quartz"})},
                "optional": {"project": ("WT_PROJECT",)}}

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "load"
    CATEGORY = "Silicon Ten Minute/Photographic I2V"

    @classmethod
    def IS_CHANGED(cls, photo, project=None):
        return digest(PHOTOS[photo])

    def load(self, photo, project=None):
        import numpy as np
        import torch
        from PIL import Image, ImageOps
        if project is not None and json.loads(project)["root"] != str(ROOT):
            raise ValueError("Project manifest belongs to another ten-minute folder")
        with Image.open(PHOTOS[photo]) as source:
            image = ImageOps.exif_transpose(source).convert("RGB")
        return (torch.from_numpy(np.asarray(image).copy().astype(np.float32) / 255.0)[None],)


class WTExisting:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"project": ("WT_PROJECT",), "photo": (KEYS, {"default": "quartz"})}}

    RETURN_TYPES = ("WT_CLIP",)
    FUNCTION = "load"
    CATEGORY = "Silicon Ten Minute/Cached photography"

    @classmethod
    def IS_CHANGED(cls, project, photo):
        file = cached_photo(photo)
        return digest(file) if file else "optional-photo-absent"

    def load(self, project, photo):
        file = cached_photo(photo)
        return (str(file) if file else "",)


class WTSave:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"images": ("IMAGE",), "photo": (KEYS, {"default": "quartz"}),
                             "fps": ("FLOAT", {"default": 24, "min": 24, "max": 24})},
                "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"}}

    RETURN_TYPES = ("WT_CLIP",)
    RETURN_NAMES = ("photographed_clip",)
    FUNCTION = "save"
    CATEGORY = "Silicon Ten Minute/Photographic I2V"
    OUTPUT_NODE = True

    def save(self, images, photo, fps, prompt=None, extra_pnginfo=None):
        import numpy as np
        if photo not in KEYS or fps != 24:
            raise ValueError("Approved photograph keys and 24fps required")
        count, height, width, channels = images.shape
        if [count, width, height, channels] != [65, 576, 1024, 3]:
            raise ValueError(f"Expected native 65-frame 576x1024 RGB LTX output, got {list(images.shape)}")
        folder = ROOT / "generated"
        folder.mkdir(parents=True, exist_ok=True)
        output = folder / f"{photo}.mp4"
        temp = output.with_suffix(".part.mp4")
        process = subprocess.Popen([
            "ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
            "-s", f"{width}x{height}", "-r", str(fps), "-i", "pipe:0", "-an",
            "-c:v", "libx264", "-crf", "16", "-preset", "fast", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", str(temp)], stdin=subprocess.PIPE)
        try:
            for frame in images:
                process.stdin.write(np.clip(frame.detach().cpu().numpy() * 255, 0, 255).astype(np.uint8).tobytes())
            process.stdin.close()
            if process.wait():
                raise RuntimeError("Photographic clip encoding failed")
        except BaseException:
            process.kill()
            process.wait()
            temp.unlink(missing_ok=True)
            raise
        temp.replace(output)
        metadata = {"file": str(output.relative_to(PROJECT)), "pathBase": "repository-root",
                    "frames": count, "fps": fps, "width": width, "height": height,
                    "sha256": digest(output), "sourcePhoto": str(PHOTOS[photo].relative_to(PROJECT)),
                    "sourcePhotoSha256": digest(PHOTOS[photo]),
                    "method": "Photograph -> LTXVImgToVideo -> SamplerCustom -> tiled VAE decode",
                    "prompt": prompt, "workflow": (extra_pnginfo or {}).get("workflow")}
        output.with_suffix(".json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2))
        return {"ui": {"text": [str(output)]}, "result": (str(output),)}


class WTAssemble:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"project": ("WT_PROJECT",),
                             "picture_only": ("BOOLEAN", {"default": False})},
                "optional": {key.replace("-", "_"): ("WT_CLIP",) for key in KEYS}}

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("finished_film",)
    FUNCTION = "assemble"
    CATEGORY = "Silicon Ten Minute/Final film"
    OUTPUT_NODE = True

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("nan")

    def assemble(self, project, picture_only=False, **clips):
        manifest = json.loads(project)
        if manifest["root"] != str(ROOT) or manifest["timelineSha256"] != digest(ROOT / "timeline.json"):
            raise ValueError("Project root/timeline changed after preparation; requeue")
        if manifest["narrationSha256"] != digest(ROOT / "assets/narration.wav"):
            raise ValueError("Narration changed after preparation; requeue")
        for bid, file in manifest["code"].items():
            if digest(file) != manifest["codeSha256"][bid]:
                raise ValueError(f"Exact code render changed during generation: {bid}")
        photos = {name.replace("_", "-"): file for name, file in clips.items() if file}
        module = compositor()
        for file in photos.values():
            module.inside(file, PROJECT)
        actual_inputs = {"code": manifest["code"], "photos": photos}
        argv = [sys.executable, str(ROOT / "production/assemble.py"),
                "--inputs-json", json.dumps(actual_inputs, ensure_ascii=False)]
        if manifest["pilot"]:
            argv.append("--pilot")
        if manifest["only"]:
            argv.extend(["--only", manifest["only"]])
        if picture_only:
            argv.append("--picture-only")
        release_models()
        subprocess.run(argv, cwd=ROOT, env=dict(os.environ, SILICON_TENMIN_ROOT=str(ROOT)), check=True)
        tag = "pilot" if manifest["pilot"] else "only" if manifest["only"] else "full"
        record = json.loads((ROOT / "output" / f"{tag}-assembly.json").read_text())
        return {"ui": {"text": [record["file"]]}, "result": (record["file"],)}


NODE_CLASS_MAPPINGS = {"WTPrepare": WTPrepare, "WTPhoto": WTPhoto, "WTExisting": WTExisting,
                       "WTSave": WTSave, "WTAssemble": WTAssemble}
NODE_DISPLAY_NAME_MAPPINGS = {
    "WTPrepare": "Ten minute: validate speech + render ONLY missing exact beats",
    "WTPhoto": "Ten minute: real reference photograph",
    "WTExisting": "Ten minute: reuse approved photographic insert",
    "WTSave": "Ten minute: save native LTX photographic clip",
    "WTAssemble": "Ten minute: exact picture + labels + captions LAST",
}
