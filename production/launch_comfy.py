"""Start an isolated local ComfyUI process with the project's nodes and model paths."""
import argparse
import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("--comfy-root", type=Path, required=True)
parser.add_argument("--model-root", type=Path, required=True)
parser.add_argument("--port", type=int, default=8196)
args = parser.parse_args()
comfy = args.comfy_root.resolve()
python = comfy / ".venv/bin/python3"
if not python.is_file():
    raise FileNotFoundError(python)
config = {
    "silicon_nodes": {"base_path": str(ROOT / "comfyui"), "custom_nodes": "custom_nodes"},
    "silicon_models": {"base_path": str(args.model_root.resolve()),
                       "checkpoints": "local\nvideo\ncheckpoints", "text_encoders": "text_encoders"}
}
config_file = ROOT / "comfyui/extra-model-paths.yaml"
config_file.write_text(json.dumps(config, indent=2))
argv = [str(python), "-s", str(comfy / "main.py"), "--listen", "127.0.0.1",
        "--port", str(args.port), "--disable-all-custom-nodes",
        "--whitelist-custom-nodes", "wafer_explainer", "--disable-api-nodes",
        "--extra-model-paths-config", str(config_file),
        "--fp16-unet", "--fp16-text-enc", "--bf16-vae", "--cache-none"]
for name in ["input", "output", "temp", "user"]:
    folder = ROOT / "comfyui" / name
    folder.mkdir(parents=True, exist_ok=True)
    argv.extend([f"--{name}-directory", str(folder)])
environment = dict(os.environ, SILICON_EXPLAINER_ROOT=str(ROOT))
with (ROOT / "review/comfy-server.log").open("ab") as log:
    process = subprocess.Popen(argv, cwd=comfy, env=environment,
                               stdout=log, stderr=log, start_new_session=True)
(ROOT / "review/comfy-server-pid.json").write_text(json.dumps({"pid": process.pid, "port": args.port}))
print("ComfyUI started:", process.pid, "port", args.port)
