"""Launch an isolated ComfyUI using existing models; never stop another process."""
import argparse
import json
import os
import shutil
import socket
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(os.environ.get("SILICON_TENMIN_ROOT", Path(__file__).resolve().parents[1])).resolve()
PROJECT = ROOT.parents[1]
WORKSPACE = PROJECT.parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--comfy-root", type=Path,
                        default=Path(os.environ.get("SILICON_COMFY_ROOT", WORKSPACE / "ComfyUI/ComfyUI")))
    parser.add_argument("--model-root", type=Path,
                        default=Path(os.environ.get("SILICON_MODEL_ROOT", WORKSPACE / "models")))
    parser.add_argument("--python", type=Path, help="Default: <comfy-root>/.venv/bin/python3")
    parser.add_argument("--port", type=int, default=8196)
    parser.add_argument("--check", "--dry-run", action="store_true",
                        help="Validate paths, model files, dependencies and port; do not start or write anything")
    parser.add_argument("--wait", type=float, default=45, help="Readiness timeout in seconds; 0 returns immediately")
    args = parser.parse_args()
    comfy, models = args.comfy_root.resolve(), args.model_root.resolve()
    python = args.python.absolute() if args.python else comfy / ".venv/bin/python3"
    required = [comfy / "main.py", python,
                ROOT / "comfyui/custom_nodes/wafer_tenminute/__init__.py",
                ROOT / "production/assemble.py"]
    for file in required:
        if not file.is_file():
            parser.exit(1, f"Missing required file: {file}\n")
    for name in ("ffmpeg", "ffprobe", os.environ.get("SILICON_NODE", "node")):
        if not shutil.which(name):
            parser.exit(1, f"Missing executable: {name}\n")
    for name, folders in [
        ("ltxv-2b-0.9.8-distilled.safetensors", ["local", "video", "checkpoints"]),
        ("t5xxl_fp8_e4m3fn.safetensors", ["text_encoders"]),
    ]:
        if not any((models / folder / name).is_file() for folder in folders):
            parser.exit(1, f"Missing {name} under {models}: {', '.join(folders)}\n")
    dependency = subprocess.run([str(python), "-c", "import PIL, fontTools, numpy, torch"],
                                capture_output=True, text=True)
    if dependency.returncode:
        parser.exit(1, f"ComfyUI Python lacks compositor dependencies:\n{dependency.stderr[-3000:]}\n")
    if not 1 <= args.port <= 65535:
        parser.exit(1, "Port must be 1..65535\n")
    with socket.socket() as test:
        try:
            test.bind(("127.0.0.1", args.port))
        except OSError as error:
            parser.exit(1, f"Port {args.port} is occupied; use --port with a free port. No process was stopped. ({error})\n")
    runtime = ROOT / "output/comfy-runtime"
    config_file = runtime / "extra-model-paths.yaml"
    config = {
        "tenminute_nodes": {"base_path": str(ROOT / "comfyui"), "custom_nodes": "custom_nodes"},
        "existing_models": {"base_path": str(models), "checkpoints": "local\nvideo\ncheckpoints",
                            "text_encoders": "text_encoders"},
    }
    argv = [str(python), "-s", str(comfy / "main.py"), "--listen", "127.0.0.1",
            "--port", str(args.port), "--disable-all-custom-nodes",
            "--whitelist-custom-nodes", "wafer_tenminute", "--disable-api-nodes",
            "--extra-model-paths-config", str(config_file),
            "--fp16-unet", "--fp16-text-enc", "--bf16-vae", "--cache-none"]
    for name in ("input", "output", "temp", "user"):
        argv.extend([f"--{name}-directory", str(runtime / name)])
    summary = {"root": str(ROOT), "comfyRoot": str(comfy), "modelRoot": str(models),
               "endpoint": f"http://127.0.0.1:{args.port}", "argv": argv,
               "config": config, "dependencies": "available", "port": "free"}
    if args.check:
        print(json.dumps({**summary, "status": "check-only; no server started"}, ensure_ascii=False, indent=2))
        return
    runtime.mkdir(parents=True, exist_ok=True)
    for name in ("input", "output", "temp", "user"):
        (runtime / name).mkdir(exist_ok=True)
    config_file.write_text(json.dumps(config, ensure_ascii=False, indent=2))
    environment = dict(os.environ, SILICON_TENMIN_ROOT=str(ROOT), SILICON_EXPLAINER_ROOT=str(PROJECT))
    with (runtime / "server.log").open("ab") as log:
        process = subprocess.Popen(argv, cwd=comfy, env=environment,
                                   stdout=log, stderr=log, start_new_session=True)
    summary.update({"pid": process.pid, "log": str(runtime / "server.log"), "status": "starting"})
    (runtime / "server.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    deadline = time.monotonic() + max(0, args.wait)
    while time.monotonic() < deadline:
        if process.poll() is not None:
            parser.exit(1, f"New ComfyUI process exited ({process.returncode}). Inspect {runtime / 'server.log'}\n")
        try:
            with urllib.request.urlopen(summary["endpoint"] + "/object_info/WTPrepare", timeout=2) as response:
                if "WTPrepare" in json.load(response):
                    summary["status"] = "ready"
                    break
        except (OSError, urllib.error.URLError):
            pass
        time.sleep(.5)
    if args.wait and summary["status"] != "ready":
        summary["status"] = "readiness-timeout; process left running"
    (runtime / "server.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if args.wait and summary["status"] != "ready":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
