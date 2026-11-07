"""Read actual encoded caption crops with macOS Vision and retain every mismatch."""
import argparse
import json
import subprocess
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT.parents[1]


def normalized(text):
    return "".join(c for c in unicodedata.normalize("NFKC", text) if c.isalnum())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pilot", action="store_true")
    parser.add_argument("--labels", action="store_true", help="Also inspect every beat's encoded final-hold explanation")
    args = parser.parse_args()
    tag = "pilot" if args.pilot else "full"
    verification = ROOT / "output" / f"{tag}-verification.json"
    data = json.loads(verification.read_text())
    cues = data["captionFrames"]["checks"]
    target = ROOT / "review" / f"ocr-{tag}.json"
    if sys.platform != "darwin":
        report = {"status": "not-run", "reason": "This adapter needs macOS Vision",
                  "encodedSha256": data["sha256"]}
        target.write_text(json.dumps(report, ensure_ascii=False, indent=2))
        raise SystemExit("OCR unavailable; no text approval recorded")
    binary = ROOT / "output" / "vision-ocr"
    subprocess.run(["swiftc", str(PROJECT / "opening/ocr.swift"), "-o", str(binary)], check=True)
    observed = {}
    for start in range(0, len(cues), 24):
        batch = cues[start:start + 24]
        result = subprocess.run([str(binary), *[cue["crop"] for cue in batch]],
                                capture_output=True, text=True, check=True)
        for entry in json.loads(result.stdout):
            observed[entry["file"]] = "".join(entry["text"])
        print(f"OCR {min(start + 24, len(cues))}/{len(cues)}", flush=True)
    results = []
    for cue in cues:
        actual = observed[Path(cue["crop"]).name]
        results.append({"time": cue["time"], "beat": cue["beat"], "expected": cue["expected"],
                        "observed": actual, "match": normalized(actual) == normalized(cue["expected"]),
                        "crop": str(Path(cue["crop"]).relative_to(ROOT))})
    passed = sum(entry["match"] for entry in results)
    report = {"status": "passed" if passed == len(results) else "mismatches-need-visual-review",
              "engine": "Apple Vision accurate / zh-Hans,en-US / correction disabled",
              "encodedSha256": data["sha256"], "count": len(results), "matched": passed,
              "comparison": "letters and digits; punctuation and whitespace excluded",
              "limits": "Caption OCR does not verify explanatory labels, narration or scientific meaning.",
              "results": results}
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(f"{passed}/{len(results)} matched; {target}")
    if args.labels:
        from assemble import mechanism_labels
        assembly = json.loads((ROOT / "output" / f"{tag}-assembly.json").read_text())
        timeline = json.loads((ROOT / "timeline.json").read_text())
        selected = {entry["beat"] for entry in assembly["selection"]}
        checks = []
        for scene in timeline["scenes"]:
            for beat in scene["beats"]:
                if beat["id"] not in selected:
                    continue
                frame = ROOT / "output" / f"review-{tag}" / f"action-{beat['id']}-7.jpg"
                if not frame.is_file():
                    raise FileNotFoundError(f"Run verifier --continuity all first: {frame}")
                last = [event for event in assembly["projectionTracking"]["events"]
                        if event["beat"] == beat["id"]][-1]
                expected = [scene["title"], *mechanism_labels(beat)]
                if last["block"]["boxes"]:
                    expected.append(last["block"]["text"])
                expected.extend(block["text"] for block in last.get("extraBlocks", []))
                checks.append({"beat": beat["id"], "file": str(frame), "expected": expected})
        seen = {}
        for start in range(0, len(checks), 16):
            result = subprocess.run([str(binary), *[check["file"] for check in checks[start:start+16]]],
                                    capture_output=True, text=True, check=True)
            seen.update({entry["file"]: "".join(entry["text"]) for entry in json.loads(result.stdout)})
        for check in checks:
            check["observed"] = seen[Path(check["file"]).name]
            check["missing"] = [text for text in check["expected"]
                                if normalized(text) not in normalized(check["observed"])]
            check["file"] = str(Path(check["file"]).relative_to(ROOT))
        label_report = {"status": "passed" if not any(c["missing"] for c in checks)
                        else "mismatches-need-visual-review",
                        "encodedSha256": data["sha256"], "beatCount": len(checks),
                        "exactlyMatchedBeats": sum(not c["missing"] for c in checks),
                        "limits": "OCR mismatches may be recognition errors; retain and inspect them.",
                        "checks": checks}
        label_target = ROOT / "review" / f"ocr-labels-{tag}.json"
        label_target.write_text(json.dumps(label_report, ensure_ascii=False, indent=2))
        print(f"Explanatory OCR {label_report['exactlyMatchedBeats']}/{len(checks)} beats; {label_target}")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
