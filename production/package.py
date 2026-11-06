"""Bundle only audited Git files and explicitly allowed render outputs."""
import hashlib
import json
import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RELEASE = ROOT / "release"
RELEASE.mkdir(exist_ok=True)


def sha(file):
    result = hashlib.sha256()
    with file.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


tracked = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT).decode().split("\0")
files = {ROOT / name for name in tracked if name}
files.update((ROOT / "model/guides").glob("*.mp4"))
files.update(ROOT / name for name in [
    "opening/sample-9x16-v3.mp4", "output/silicon-wafer-explainer-9x16.mp4",
    "output/captions.srt", "review/verification.json", "review/playback.json",
    "workflows/all.json", "workflows/all-api.json",
    "workflows/assemble-cached.json", "workflows/assemble-cached-api.json",
])
required = ROOT / "output/silicon-wafer-explainer-9x16.mp4"
if not required.is_file():
    raise FileNotFoundError(required)
manifest = []
for file in sorted(files):
    relative = file.relative_to(ROOT)
    assert file.is_file(), f"Missing package file {relative}"
    assert not any(p in {".git", ".venv", "node_modules", "v3-reference"} for p in relative.parts)
    assert not any(p.startswith("._") for p in relative.parts)
    assert file.suffix not in {".safetensors", ".ckpt", ".pth", ".pt"}
    assert ".env" not in relative.parts
    assert "gsap" not in file.name.lower()
    manifest.append({"file": str(relative), "bytes": file.stat().st_size, "sha256": sha(file)})
data = {"title": "From quartz to silicon wafer", "version": "1.0.0",
        "duration": 174.25, "format": "1080x1920 / 24 fps / 9:16",
        "codeLicense": "MIT", "filmLicense": "CC BY-SA 4.0",
        "thirdPartyNotices": "THIRD_PARTY.md", "weightsIncluded": False,
        "referenceMediaIncluded": False, "files": manifest}
archive = RELEASE / "silicon-wafer-explainer-v1.0.0-project.zip"
with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as target:
    for entry in manifest:
        target.write(ROOT / entry["file"], f"silicon-wafer-explainer/{entry['file']}")
    target.writestr("silicon-wafer-explainer/SHA256-MANIFEST.json", json.dumps(data, ensure_ascii=False, indent=2))
with zipfile.ZipFile(archive) as check:
    assert check.testzip() is None, "Corrupt archive"
checksum = RELEASE / "SHA256SUMS.txt"
checksum.write_text("".join(f"{sha(file)}  {file.name}\n" for file in [
    required, archive, ROOT / "output/captions.srt"]))
print(json.dumps({"archive": str(archive), "files": len(manifest),
                  "bytes": archive.stat().st_size, "sha256": sha(archive)}, indent=2))
