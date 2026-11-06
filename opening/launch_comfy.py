"""Start an isolated ComfyUI process using explicitly located project/model folders."""
import argparse
import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument("--comfy-root", type=Path, default=ROOT.parents[2] / "ComfyUI/ComfyUI")
parser.add_argument("--model-root", type=Path, default=ROOT.parents[2] / "models")
parser.add_argument("--port", type=int, default=8194)
parser.add_argument("--v3", action="store_true", help="Enable the native image-to-video sample nodes.")
args = parser.parse_args()
comfy = args.comfy_root.resolve()
python = comfy / ".venv/bin/python3"
if not python.exists():
    raise FileNotFoundError(f"Specify an existing ComfyUI installation: {python}")
config = {
    "wafer_vertical_nodes":{"base_path":str(ROOT / "comfyui"),"custom_nodes":"custom_nodes"},
    "wafer_vertical_models":{"base_path":str(args.model_root.resolve()),
                             "checkpoints":"local\nvideo","text_encoders":"text_encoders"}
}
config_file = ROOT / "comfyui/extra-model-paths.yaml"
config_file.write_text(json.dumps(config,indent=2))
for name in ["input","output","user","temp"]:
    (ROOT / "comfyui" / name).mkdir(exist_ok=True)
whitelist = ["wafer_vertical", "wafer_vertical_v3"] if args.v3 else ["wafer_vertical"]
argv = [str(python),"-s",str(comfy/"main.py"),"--listen","127.0.0.1","--port",str(args.port),
        "--disable-all-custom-nodes","--whitelist-custom-nodes",*whitelist,"--disable-api-nodes",
        "--extra-model-paths-config",str(config_file),"--fp16-unet","--fp16-text-enc"]
if args.v3:
    argv.extend(["--bf16-vae", "--cache-none"])
else:
    argv.append("--cpu-vae")
for name in ["input","output","user","temp"]:
    argv.extend([f"--{name}-directory",str(ROOT/"comfyui"/name)])
log_file = ROOT / ("edit/v3/review/comfy-server.log" if args.v3 else "review/comfy-server.log")
with log_file.open("ab") as log:
    process = subprocess.Popen(argv,cwd=comfy,stdout=log,stderr=log,start_new_session=True)
(log_file.parent / "comfy-server-pid.json").write_text(json.dumps({"pid":process.pid,"port":args.port}))
print("Started isolated ComfyUI:",process.pid,"port",args.port)
