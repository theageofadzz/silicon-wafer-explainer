"""Portable native LTX inputs, encoded scene clips, and word-timed final assembly."""
import hashlib
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
import torch
from PIL import Image, ImageOps

ROOT = Path(os.environ.get("SILICON_EXPLAINER_ROOT", Path(__file__).resolve().parents[3])).resolve()
SCENES = ["silica", "reduction", "distill", "deposition", "polycrystal", "melt",
          "doping", "seed", "growth", "trim", "slice", "lapping", "polish",
          "clean", "inspect", "ending"]
PHOTOS = {"silicon_seed": "silicon-seed", "silicon_shoulder": "silicon-shoulder"}


def local(relative):
    file = (ROOT / relative).resolve()
    if ROOT not in file.parents:
        raise ValueError("Path must remain inside SILICON_EXPLAINER_ROOT")
    if not file.is_file():
        raise FileNotFoundError(file)
    return file


def digest(file):
    result = hashlib.sha256()
    with file.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


class SWEInput:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"relative_path": ("STRING", {"default": "assets/inputs/silicon-seed.png"})},
                "optional": {"project": ("SWE_PROJECT",)}}

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "load"
    CATEGORY = "Silicon Explainer/Native generation"

    @classmethod
    def IS_CHANGED(cls, relative_path, project=None):
        file = ROOT / relative_path
        return digest(file) if file.is_file() else "prepare-required"

    def load(self, relative_path, project=None):
        file = local(relative_path)
        if file.suffix.lower() == ".mp4":
            stream = json.loads(subprocess.check_output(
                ["ffprobe", "-v", "error", "-show_streams", "-of", "json", str(file)]))["streams"][0]
            count, width, height = int(stream["nb_frames"]), stream["width"], stream["height"]
            if count > 129 or count % 8 != 1 or width % 32 or height % 32:
                raise ValueError("Guide must have 8*n+1 frames, at most 129, and 32-pixel dimensions")
            data = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(file),
                                            "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"])
            array = np.frombuffer(data, dtype=np.uint8).reshape(count, height, width, 3)
        else:
            array = np.asarray(ImageOps.exif_transpose(Image.open(file)).convert("RGB"))[None]
        return (torch.from_numpy(array.copy().astype(np.float32) / 255),)


class SWESave:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"images": ("IMAGE",), "fps": ("FLOAT", {"default": 8, "min": 1, "max": 60}),
                             "relative_path": ("STRING", {"default": "generated/reduction.mp4"})},
                "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"}}

    RETURN_TYPES = ("SWE_CLIP",)
    FUNCTION = "save"
    CATEGORY = "Silicon Explainer/Native generation"
    OUTPUT_NODE = True

    def save(self, images, fps, relative_path, prompt=None, extra_pnginfo=None):
        output = (ROOT / relative_path).resolve()
        if ROOT not in output.parents or output.suffix != ".mp4":
            raise ValueError("Output must be an MP4 inside the project")
        output.parent.mkdir(parents=True, exist_ok=True)
        count, height, width, _ = images.shape
        process = subprocess.Popen(
            ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
             "-s", f"{width}x{height}", "-r", str(fps), "-i", "pipe:0", "-an",
             "-c:v", "libx264", "-crf", "16", "-preset", "fast", "-pix_fmt", "yuv420p",
             "-movflags", "+faststart", str(output)], stdin=subprocess.PIPE)
        try:
            for frame in images:
                process.stdin.write(np.clip(frame.detach().cpu().numpy() * 255, 0, 255).astype(np.uint8).tobytes())
            process.stdin.close()
            if process.wait():
                raise RuntimeError("FFmpeg scene encoding failed")
        except BaseException:
            process.kill()
            process.wait()
            raise
        record = {"file": relative_path, "fps": fps, "frames": count, "width": width, "height": height,
                  "sha256": digest(output), "method": "Native LTXV diffusion sampling and VAE decode",
                  "prompt": prompt, "workflow": (extra_pnginfo or {}).get("workflow")}
        output.with_suffix(".json").write_text(json.dumps(record, ensure_ascii=False, indent=2))
        import folder_paths
        preview = Path(folder_paths.get_output_directory()) / "silicon-explainer" / output.name
        preview.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(output, preview)
        return {"ui": {"gifs": [{"filename": output.name, "subfolder": "silicon-explainer",
                                 "type": "output", "format": "video/mp4"}]},
                "result": (str(output),)}


class SWEExisting:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"relative_path": ("STRING", {"default": "generated/reduction.mp4"})}}

    RETURN_TYPES = ("SWE_CLIP",)
    FUNCTION = "load"
    CATEGORY = "Silicon Explainer/Reuse"

    @classmethod
    def IS_CHANGED(cls, relative_path):
        return digest(local(relative_path))

    def load(self, relative_path):
        return (str(local(relative_path)),)


class SWEAssemble:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"opening": ("SWE_CLIP",), **{name: ("SWE_CLIP",) for name in SCENES},
                             **{name: ("SWE_CLIP",) for name in PHOTOS}}}

    RETURN_TYPES = ("STRING",)
    FUNCTION = "assemble"
    CATEGORY = "Silicon Explainer/Final film"
    OUTPUT_NODE = True

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        output = ROOT / "output/silicon-wafer-explainer-9x16.mp4"
        return "".join(digest(ROOT / file) for file in ["timeline.json", "production/assemble.py", "production/shot_plan.py"]) + str(output.is_file())

    def assemble(self, opening, **clips):
        import gc
        import comfy.model_management
        comfy.model_management.unload_all_models()
        gc.collect()
        comfy.model_management.soft_empty_cache()
        paths = {name: str(Path(file).relative_to(ROOT)) for name, file in {"opening": opening, **clips}.items()}
        (ROOT / "production/selected-clips.json").write_text(json.dumps(paths, indent=2))
        subprocess.run([sys.executable, str(ROOT / "production/assemble.py")], cwd=ROOT, check=True)
        output = ROOT / "output/silicon-wafer-explainer-9x16.mp4"
        return {"ui": {"text": [str(output)]}, "result": (str(output),)}


class SWEPrepare:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"regenerate_narration": ("BOOLEAN", {"default": False}),
                             "regenerate_guides": ("BOOLEAN", {"default": False}),
                             "prepare_guides": ("BOOLEAN", {"default": True})}}

    RETURN_TYPES = ("SWE_PROJECT",)
    FUNCTION = "prepare"
    CATEGORY = "Silicon Explainer/Preparation"

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        if kwargs.get("regenerate_narration") or kwargs.get("regenerate_guides"):
            return float("nan")
        files = ["script.json", "timeline.json", "model/scene.mjs", "production/render.mjs"]
        artifacts = ["timeline.json", "assets/narration.wav"]
        if kwargs.get("prepare_guides", True):
            artifacts += [f"model/guides/{name}.mp4" for name in SCENES]
            artifacts += ["opening/edit/v3/model/model.mp4", "opening/edit/v3/model/wafer-guide.mp4"]
        return ("".join(digest(ROOT / file) for file in files if (ROOT / file).is_file())
                + "".join(str((ROOT / file).is_file()) for file in artifacts))

    def prepare(self, regenerate_narration, regenerate_guides, prepare_guides=True):
        if regenerate_narration:
            before = digest(ROOT / "timeline.json")
            subprocess.run([sys.executable, str(ROOT / "production/narrate.py")], cwd=ROOT, check=True)
            if digest(ROOT / "timeline.json") != before:
                raise ValueError("Narration timing changed. Rebuild the shot plan and guides, then re-export the graph before generation; see README.")
        for file in ["timeline.json", "assets/narration.wav"]:
            local(file)
        script = json.loads(local("script.json").read_text())
        timeline = json.loads(local("timeline.json").read_text())
        expected = [(scene["id"], scene["clauses"], scene["anchor"], scene["hold"]) for scene in script["scenes"]]
        actual = [(scene["id"], scene["clauses"], scene["anchor"], scene["hold"]) for scene in timeline["scenes"]]
        if expected != actual or script["openingDuration"] != timeline["openingDuration"]:
            raise ValueError("Script changed. Run the narration, shot plan and guide steps in README, then re-export the graph.")
        for scene in timeline["scenes"]:
            record = json.loads(local(f"assets/voice/{scene['id']}.json").read_text())
            config = {"text": "".join(scene["clauses"]), "voice": script["voice"], "rate": script["rate"]}
            if record["config"] != config:
                raise ValueError(f"Stale recorded voice for {scene['id']}; regenerate narration and timing first.")
        if prepare_guides and (regenerate_guides or any(not (ROOT / f"model/guides/{name}.mp4").is_file() for name in SCENES)):
            subprocess.run(["node", str(ROOT / "production/render.mjs"), "--render"], cwd=ROOT, check=True)
        if prepare_guides and not (ROOT / "opening/edit/v3/model/model.mp4").is_file():
            render = str(ROOT / "opening/edit/v3/model/render.mjs")
            subprocess.run(["node", render], cwd=ROOT, check=True)
            subprocess.run(["node", render, "--render"], cwd=ROOT, check=True)
        if prepare_guides and not (ROOT / "opening/edit/v3/model/wafer-guide.mp4").is_file():
            subprocess.run(["node", str(ROOT / "opening/edit/v3/model/wafer-guide.mjs")],
                           cwd=ROOT, check=True)
        return (str(ROOT),)


class SWEOpening:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"project": ("SWE_PROJECT",), "rebuild": ("BOOLEAN", {"default": True}),
                             **{name: ("SWE_CLIP",) for name in ["chip", "blank", "boule", "quartz", "quartz_macro"]}}}

    RETURN_TYPES = ("SWE_CLIP",)
    FUNCTION = "prepare"
    CATEGORY = "Silicon Explainer/Approved opening"

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return digest(ROOT / "opening/edit/v3/assemble.py") + str((ROOT / "opening/sample-9x16-v3.mp4").is_file())

    def prepare(self, project, rebuild=True, **clips):
        output = ROOT / "opening/sample-9x16-v3.mp4"
        for file in clips.values():
            if not Path(file).is_file():
                raise FileNotFoundError(file)
        approved = ROOT / "opening/approved.json"
        if not rebuild and output.is_file() and approved.is_file():
            if digest(output) == json.loads(approved.read_text())["sha256"]:
                return (str(output),)
        paths = {name.replace("_", "-"): str(Path(file).relative_to(ROOT / "opening"))
                 for name, file in clips.items()}
        (ROOT / "opening/edit/v3/generated-inputs.json").write_text(json.dumps(paths, indent=2))
        subprocess.run([sys.executable, str(ROOT / "opening/edit/v3/assemble.py")],
                       cwd=ROOT / "opening", check=True)
        return (str(output),)


NODE_CLASS_MAPPINGS = {"SWEInput": SWEInput, "SWESave": SWESave, "SWEExisting": SWEExisting,
                       "SWEAssemble": SWEAssemble, "SWEPrepare": SWEPrepare, "SWEOpening": SWEOpening}
NODE_DISPLAY_NAME_MAPPINGS = {"SWEInput": "Silicon: photo / precise video guide",
                            "SWESave": "Silicon: save native LTX scene",
                            "SWEExisting": "Silicon: cached scene",
                            "SWEAssemble": "Silicon: word-timed film + captions",
                            "SWEPrepare": "Silicon: recorded speech + exact guides",
                            "SWEOpening": "Silicon: reconstruct approved opening"}
