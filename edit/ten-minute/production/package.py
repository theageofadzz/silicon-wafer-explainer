"""Package tracked source plus explicit ten-minute renders; no runtime or model weights."""
import hashlib
import json
import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT.parents[1]
RELEASE = PROJECT / "release"


def sha(file):
    value = hashlib.sha256()
    with file.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def main():
    tracked = subprocess.check_output(["git", "ls-files", "-z"], cwd=PROJECT).decode().split("\0")
    files = {PROJECT / name for name in tracked if name}
    timeline = json.loads((ROOT / "timeline.json").read_text())
    film = ROOT / "output/silicon-wafer-10min-9x16.mp4"
    report = json.loads((ROOT / "output/full-verification.json").read_text())
    if report.get("fullDecode") != "passed" or sha(film) != report.get("sha256"):
        raise ValueError("Full encoded verification must pass for this exact film before packaging")
    files.update([film, ROOT / "output/full-captions.srt", ROOT / "output/full-assembly.json",
                  ROOT / "output/full-verification.json"])
    for scene in timeline["scenes"]:
        for beat in scene["beats"]:
            for suffix in (".mp4", ".json"):
                files.add(ROOT / "model/renders" / (beat["id"] + suffix))
    manifest = []
    for file in sorted(files):
        relative = file.relative_to(PROJECT)
        if not file.is_file():
            raise FileNotFoundError(relative)
        if any(p in {".git", ".venv", "node_modules", "comfy-runtime", "v3-reference"}
               or p.startswith("._") for p in relative.parts):
            raise ValueError(f"Forbidden package entry: {relative}")
        if file.suffix in {".safetensors", ".ckpt", ".pth", ".pt"} or ".env" in relative.parts:
            raise ValueError(f"Model weight or secret file: {relative}")
        manifest.append({"file": str(relative), "bytes": file.stat().st_size, "sha256": sha(file)})
    RELEASE.mkdir(exist_ok=True)
    archive = RELEASE / "silicon-wafer-explainer-v2.0.0-project.zip"
    metadata = {"version": "2.0.0", "duration": timeline["duration"],
                "format": "1080x1920 / 24fps / 9:16", "codeLicense": "MIT",
                "filmLicense": "CC BY-SA 4.0", "notices": "THIRD_PARTY.md",
                "weightsIncluded": False, "referenceMediaIncluded": False,
                "files": manifest}
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED, compresslevel=4) as output:
        for entry in manifest:
            output.write(PROJECT / entry["file"], "silicon-wafer-explainer/" + entry["file"])
        output.writestr("silicon-wafer-explainer/SHA256-MANIFEST.json",
                        json.dumps(metadata, ensure_ascii=False, indent=2))
    with zipfile.ZipFile(archive) as check:
        if check.testzip() is not None:
            raise ValueError("Corrupt ZIP")
    checksums = RELEASE / "SHA256SUMS-v2.0.0.txt"
    checksums.write_text("".join(f"{sha(file)}  {file.name}\n"
                                for file in [film, archive, ROOT / "output/full-captions.srt"]))
    print(json.dumps({"archive": str(archive), "files": len(files),
                      "bytes": archive.stat().st_size}, indent=2))


if __name__ == "__main__":
    main()
