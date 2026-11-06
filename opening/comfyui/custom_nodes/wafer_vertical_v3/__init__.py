"""Native ComfyUI I2V outputs and final assembly for the third wafer sample."""
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

import numpy as np
import torch
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[3]
EDIT = ROOT / "edit/v3"


def sha256(file):
    result = hashlib.sha256()
    with Path(file).open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def local_path(relative):
    file = (ROOT / relative).resolve()
    if ROOT not in file.parents:
        raise ValueError("Input must be a file inside this project.")
    if not file.is_file():
        raise FileNotFoundError(file)
    return file


class WV3Photo:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"relative_path": ("STRING", {
            "default": "assets/v3-real/input-quartz.png"})}}

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "load"
    CATEGORY = "Wafer Vertical V3/Real photographs"

    @classmethod
    def IS_CHANGED(cls, relative_path):
        return sha256(local_path(relative_path))

    def load(self, relative_path):
        image = ImageOps.exif_transpose(Image.open(local_path(relative_path))).convert("RGB")
        return (torch.from_numpy(np.array(image).astype(np.float32) / 255.0)[None],)


class WV3Guide:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"relative_path": ("STRING", {
            "default": "edit/v3/model/wafer-guide.mp4"})}}

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "load"
    CATEGORY = "Wafer Vertical V3/Precise motion guide"

    @classmethod
    def IS_CHANGED(cls, relative_path):
        return sha256(local_path(relative_path))

    def load(self, relative_path):
        file = local_path(relative_path)
        data = json.loads(subprocess.check_output(
            ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_streams",
             "-of", "json", str(file)]))
        stream = data["streams"][0]
        width, height = stream["width"], stream["height"]
        count = int(stream["nb_frames"])
        if count > 129 or count % 8 != 1 or width % 32 or height % 32:
            raise ValueError("Guide requires 8*n+1 frames (at most 129) and 32-pixel dimensions.")
        raw = subprocess.check_output(
            ["ffmpeg", "-v", "error", "-i", str(file), "-f", "rawvideo",
             "-pix_fmt", "rgb24", "pipe:1"])
        frames = np.frombuffer(raw, dtype=np.uint8).reshape(count, height, width, 3)
        return (torch.from_numpy(frames.astype(np.float32) / 255.0),)


class WV3SaveShot:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {
            "images": ("IMAGE",),
            "fps": ("FLOAT", {"default": 24.0, "min": 1, "max": 60}),
            "shot_name": ("STRING", {"default": "quartz-wide"}),
        }, "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"}}

    RETURN_TYPES = ("WV3_CLIP",)
    RETURN_NAMES = ("generated_clip",)
    FUNCTION = "save"
    CATEGORY = "Wafer Vertical V3/Native I2V output"
    OUTPUT_NODE = True

    def save(self, images, fps, shot_name, prompt=None, extra_pnginfo=None):
        if not shot_name or any(c not in "abcdefghijklmnopqrstuvwxyz0123456789-_" for c in shot_name):
            raise ValueError("Shot names use lowercase letters, numbers, '-' and '_'.")
        folder = EDIT / "generated"
        folder.mkdir(parents=True, exist_ok=True)
        output = folder / f"{shot_name}.mp4"
        count, height, width, _ = images.shape
        command = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                   "-s", f"{width}x{height}", "-r", str(fps), "-i", "pipe:0",
                   "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "16",
                   "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output)]
        process = subprocess.Popen(command, stdin=subprocess.PIPE)
        try:
            for frame in images:
                array = np.clip(frame.detach().cpu().numpy() * 255, 0, 255).astype(np.uint8)
                process.stdin.write(array.tobytes())
            process.stdin.close()
            if process.wait() != 0:
                raise RuntimeError("FFmpeg could not save the generated video.")
        except BaseException:
            process.kill()
            process.wait()
            raise
        record = {"file": str(output.relative_to(ROOT)), "frames": count,
                  "width": width, "height": height, "fps": fps,
                  "method": "Native LTXVImgToVideo -> diffusion sampling -> VAE decoding",
                  "sha256": sha256(output), "prompt": prompt}
        (folder / f"{shot_name}.json").write_text(json.dumps(record, indent=2, ensure_ascii=False))
        if extra_pnginfo and extra_pnginfo.get("workflow"):
            (folder / f"{shot_name}-workflow.json").write_text(
                json.dumps(extra_pnginfo["workflow"], indent=2, ensure_ascii=False))
        # Keep generated previews in ComfyUI's normal output browser as well.
        import folder_paths
        preview = Path(folder_paths.get_output_directory()) / "wafer-v3" / output.name
        preview.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(output, preview)
        return {"ui": {"gifs": [{"filename": output.name, "subfolder": "wafer-v3",
                                "type": "output", "format": "video/mp4"}]},
                "result": (str(output),)}


class WV3Assemble:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {
            "chip": ("WV3_CLIP",), "blank": ("WV3_CLIP",), "boule": ("WV3_CLIP",),
            "quartz": ("WV3_CLIP",), "quartz_macro": ("WV3_CLIP",),
            "render_models": ("BOOLEAN", {"default": True}),
        }}

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("finished_video",)
    FUNCTION = "assemble"
    CATEGORY = "Wafer Vertical V3/Final assembly"
    OUTPUT_NODE = True

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        files = [EDIT / "assemble.py", ROOT / "timeline.json", ROOT / "text-plan.json"]
        files.extend((EDIT / "model").glob("*.mjs"))
        return "".join(sha256(f) for f in files if f.is_file())

    def assemble(self, chip, blank, boule, quartz, quartz_macro, render_models):
        clips = {"chip": chip, "blank": blank, "boule": boule,
                 "quartz": quartz, "quartz-macro": quartz_macro}
        for file in clips.values():
            if not Path(file).is_file():
                raise FileNotFoundError(file)
        (EDIT / "generated-inputs.json").write_text(json.dumps(
            {name: str(Path(file).relative_to(ROOT)) for name, file in clips.items()}, indent=2))
        import gc
        import comfy.model_management
        comfy.model_management.unload_all_models()
        gc.collect()
        comfy.model_management.soft_empty_cache()
        import sys
        args = [sys.executable, str(EDIT / "assemble.py")]
        if render_models:
            args.append("--render-models")
        subprocess.run(args, cwd=ROOT, check=True)
        output = ROOT / "sample-9x16-v3.mp4"
        return {"ui": {"text": [str(output)]}, "result": (str(output),)}


class WV3ExistingClip:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"relative_path": ("STRING", {
            "default": "edit/v3/generated/quartz.mp4"})}}

    RETURN_TYPES = ("WV3_CLIP",)
    FUNCTION = "load"
    CATEGORY = "Wafer Vertical V3/Reuse generated footage"

    @classmethod
    def IS_CHANGED(cls, relative_path):
        return sha256(local_path(relative_path))

    def load(self, relative_path):
        return (str(local_path(relative_path)),)


NODE_CLASS_MAPPINGS = {
    "WV3Photo": WV3Photo, "WV3SaveShot": WV3SaveShot, "WV3Assemble": WV3Assemble,
    "WV3ExistingClip": WV3ExistingClip, "WV3Guide": WV3Guide,
}
NODE_DISPLAY_NAME_MAPPINGS = {
    "WV3Photo": "V3 Real photograph",
    "WV3SaveShot": "V3 Save native I2V shot",
    "WV3Assemble": "V3 Assemble and subtitle",
    "WV3ExistingClip": "V3 Reuse generated footage",
    "WV3Guide": "V3 Precise 3D motion guide",
}
