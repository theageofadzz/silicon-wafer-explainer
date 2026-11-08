"""Package tracked source plus explicit ten-minute renders; no runtime or model weights."""
import hashlib
import json
import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT.parents[1]
RELEASE = PROJECT / "release"
VERSION = "2.2.0"


def stream_sha(stream):
    value = hashlib.sha256()
    for chunk in iter(lambda: stream.read(1024 * 1024), b""):
        value.update(chunk)
    return value.hexdigest()


def sha(file):
    with file.open("rb") as stream:
        return stream_sha(stream)


def optional_outputs(film_sha, timeline_sha):
    files = {ROOT / "output" / name for name in
             ("only.mp4", "only-assembly.json", "only-verification.json", "only-captions.srt")
             if (ROOT / "output" / name).is_file()}
    if files:
        sample = (ROOT / "output/only.mp4").resolve()
        sample_sha = sha(sample)
        for name in ("only-assembly.json", "only-verification.json"):
            record = json.loads((ROOT / "output" / name).read_text())
            if not isinstance(record.get("file"), str) or not record["file"]:
                raise ValueError(f"{name} must name the exact sample file")
            recorded_sample = Path(record["file"])
            recorded_sample = (recorded_sample if recorded_sample.is_absolute()
                               else ROOT / recorded_sample).resolve()
            if (recorded_sample != sample or record.get("sha256") != sample_sha
                    or record.get("timelineSha256") != timeline_sha):
                raise ValueError(f"Stale sample record: {name} must match current only.mp4 and timeline")
            if name == "only-verification.json" and record.get("fullDecode") != "passed":
                raise ValueError("Sample encoded verification must pass before packaging")
    evidence_file = ROOT / "output/semantic-encoded.json"
    if evidence_file.is_file():
        evidence = json.loads(evidence_file.read_text())
        if (evidence.get("encodedSha256") != film_sha
                or evidence.get("timelineSha256") != timeline_sha
                or evidence.get("assemblySha256") != sha(ROOT / "output/full-assembly.json")):
            raise ValueError("Semantic evidence must describe the exact current film, timeline and assembly")
        files.add(evidence_file)
        # Keep the evidence JSON byte-for-byte; package only its two sheet lists, not frame samples.
        for sheets in (evidence["contactSheets"], evidence["continuous"]["contactSheets"]):
            for sheet in sheets:
                file = Path(sheet["file"])
                file = (file if file.is_absolute() else ROOT / file).resolve()
                file.relative_to((ROOT / "output").resolve())
                if not file.is_file():
                    raise FileNotFoundError(file)
                files.add(file)
    return files


def main():
    timeline = json.loads((ROOT / "timeline.json").read_text())
    report = json.loads((ROOT / "output/full-verification.json").read_text())
    if not report.get("file"):
        raise ValueError("Verification must name the exact encoded file")
    film = Path(report["file"])
    film = (film if film.is_absolute() else ROOT / film).resolve()
    film.relative_to((ROOT / "output").resolve())
    film_sha = sha(film)
    if report.get("fullDecode") != "passed" or film_sha != report.get("sha256"):
        raise ValueError("Full encoded verification must pass for this exact film before packaging")
    assembly = json.loads((ROOT / "output/full-assembly.json").read_text())
    assembled_file = Path(assembly["file"])
    assembled_file = (assembled_file if assembled_file.is_absolute() else ROOT / assembled_file).resolve()
    if assembled_file != film or assembly.get("sha256") != film_sha:
        raise ValueError("Assembly and verification describe different encoded files")
    timeline_sha = sha(ROOT / "timeline.json")
    if any(record.get("timelineSha256") != timeline_sha for record in (report, assembly)):
        raise ValueError("Timeline changed since assembly or verification; rebuild and verify first")
    if timeline.get("semanticVersion") != 3 or timeline.get("visualRevision") != 4:
        raise ValueError("Calibrate the semantic actions and detailed scenes before packaging v2.2")
    # The index includes tracked files and explicitly staged additions, never arbitrary untracked files.
    tracked = subprocess.check_output(["git", "ls-files", "--cached", "-z"], cwd=PROJECT).decode().split("\0")
    files = {PROJECT / name for name in tracked if name}
    untracked = subprocess.check_output(
        ["git", "ls-files", "--others", "--exclude-standard", "-z", "--",
         str(ROOT.relative_to(PROJECT))], cwd=PROJECT).decode().split("\0")
    new_sources = [name for name in untracked if name and Path(name).suffix in {".py", ".mjs", ".html"}]
    if new_sources:
        raise ValueError("Explicitly stage new source files before packaging: " + ", ".join(new_sources))
    files.update([film, ROOT / "output/full-captions.srt", ROOT / "output/full-assembly.json",
                  ROOT / "output/full-verification.json"])
    for workflow in ("photos", "cached", "cached-only"):
        for suffix in ("-job.json", "-history.json"):
            evidence = ROOT / "workflows" / (workflow + suffix)
            if evidence.is_file():
                files.add(evidence)
    if not (ROOT / "workflows/photos-history.json").is_file():
        raise ValueError("New Comfy photography execution history is required for v2.2")
    optional = optional_outputs(film_sha, timeline_sha)
    files.update(optional)
    model_sources = {f"model/{file.name}": sha(file) for file in (ROOT / "model").glob("*.mjs")
                     if not file.name.startswith(".")}
    required_sources = [ROOT / name for name in model_sources]
    required_sources.extend(ROOT / name for name in
                            ("SEMANTIC-STORYBOARD.md", "CINEMATOGRAPHY.md", "DETAIL-PLAN-v4.md"))
    missing_sources = [str(file.relative_to(PROJECT)) for file in required_sources if file not in files]
    if missing_sources:
        raise ValueError("Required source paths must be tracked or explicitly staged: " + ", ".join(missing_sources))
    for scene in timeline["scenes"]:
        for beat in scene["beats"]:
            record = json.loads((ROOT / "model/renders" / (beat["id"] + ".json")).read_text())
            if (record.get("semanticVersion") != 3 or not beat.get("semanticPlan")
                    or record.get("semanticPlan") != beat["semanticPlan"]
                    or record.get("modelSources") != model_sources
                    or record.get("visualRevision") != 4
                    or len(record.get("cameraPlan", [])) < 2
                    or record.get("cameraPlan") != beat.get("cameraPlan")):
                raise ValueError(f"Stale actions, camera plan or model sources; rerender {beat['id']}")
            for suffix in (".mp4", ".json"):
                files.add(ROOT / "model/renders" / (beat["id"] + suffix))
    for shot in assembly["shots"]:
        source = Path(shot["source"])
        source = source if source.is_absolute() else PROJECT / source
        if sha(source) != shot["sourceSha256"]:
            raise ValueError(f"Assembly source changed: {source}")
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
    archive = RELEASE / f"silicon-wafer-explainer-v{VERSION}-project.zip"
    metadata = {"version": VERSION, "duration": timeline["duration"],
                "format": "1080x1920 / 24fps / 9:16", "codeLicense": "MIT",
                "filmLicense": "CC BY-SA 4.0", "notices": "THIRD_PARTY.md",
                "weightsIncluded": False, "referenceMediaIncluded": False,
                "film": str(film.relative_to(PROJECT)), "encodedSha256": film_sha,
                "semanticVersion": timeline["semanticVersion"],
                "visualRevision": timeline["visualRevision"],
                "cameraShotCount": sum(len(beat["cameraPlan"])
                                       for scene in timeline["scenes"] for beat in scene["beats"]),
                "semanticActionCount": sum(len(beat["semanticPlan"])
                                           for scene in timeline["scenes"] for beat in scene["beats"]),
                "sourceSelection": "git index paths (including staged additions), working-tree bytes",
                "semanticMeaningApprovedByPackaging": False,
                "files": manifest}
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED, compresslevel=4) as output:
        for entry in manifest:
            output.write(PROJECT / entry["file"], "silicon-wafer-explainer/" + entry["file"])
        output.writestr("silicon-wafer-explainer/SHA256-MANIFEST.json",
                        json.dumps(metadata, ensure_ascii=False, indent=2))
    with zipfile.ZipFile(archive) as check:
        if check.testzip() is not None:
            raise ValueError("Corrupt ZIP")
        checked = {str(file.relative_to(PROJECT)) for file in optional | {film}}
        for entry in manifest:
            if entry["file"] in checked:
                expected = film_sha if entry["file"] == str(film.relative_to(PROJECT)) else entry["sha256"]
                with check.open("silicon-wafer-explainer/" + entry["file"]) as stream:
                    if stream_sha(stream) != expected:
                        raise ValueError(f"Packaged film or evidence differs from its SHA: {entry['file']}")
    checksums = RELEASE / f"SHA256SUMS-v{VERSION}.txt"
    checksum_files = [film, archive, ROOT / "output/full-captions.srt"]
    sample = ROOT / "output/only.mp4"
    if sample in optional:
        checksum_files.append(sample)
    checksums.write_text("".join(f"{film_sha if file == film else sha(file)}  {file.name}\n"
                                for file in checksum_files))
    print(json.dumps({"archive": str(archive), "files": len(files),
                      "bytes": archive.stat().st_size}, indent=2))


if __name__ == "__main__":
    main()
