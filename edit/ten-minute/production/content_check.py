"""Validate narration identity, real speech anchors, captions, and contiguous frame timing."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def norm(text):
    return "".join(c for c in text if c.isalnum()).lower()


def main():
    plan = json.loads((ROOT / "script.json").read_text())
    timeline = json.loads((ROOT / "timeline.json").read_text())
    assert timeline["originalTextSHA256"] == hashlib.sha256((ROOT / "script.json").read_bytes()).hexdigest()
    assert not timeline["uncalibratedAnchors"]
    assert 570 <= timeline["duration"] <= 600
    beats = [b for s in timeline["scenes"] for b in s["beats"]]
    assert len(beats) == 84 and beats[0]["start"] == 0 and beats[-1]["end"] == timeline["duration"]
    assert timeline.get("semanticVersion") == 3
    for first, second in zip(beats, beats[1:]):
        assert first["end"] == second["start"], (first["id"], second["id"])
    for beat in beats:
        assert beat["start"] < beat["actionStart"] < beat["actionEnd"] <= beat["end"]
        assert beat["words"] and beat["captions"] and beat["actionAnchor"] in beat["text"]
        assert beat["end"] - beat["start"] > 2
        assert beat["end"] - beat["actionEnd"] >= .5, f"Action leaves no reading hold: {beat['id']}"
        assert beat.get("semanticVersion") == 3 and beat.get("semanticPlan")
        joined = norm("".join(w["text"] for w in beat["words"]))
        for event in beat["semanticPlan"]:
            assert norm(event["phrase"]) in joined, (beat["id"], event["phrase"])
            assert beat["start"] <= event["start"] < event["end"] <= beat["end"]
        assert len(beat["labels"]) <= 2
    for first, second in zip(timeline["captions"], timeline["captions"][1:]):
        assert first["start"] < first["end"] <= second["start"]
    for cue in timeline["captions"]:
        assert len(cue["text"]) <= 24, cue
        assert cue["end"] - cue["start"] >= .25, cue
    text = "\n\n".join(f'{s["chapter"]} / {s["title"]}\n' +
                        "\n".join(b["text"] for b in s["beats"]) for s in plan["scenes"])
    (ROOT / "NARRATION.md").write_text("# 旁白全文\n\n" + text + "\n")
    result = {"duration": timeline["duration"], "scenes": len(timeline["scenes"]), "beats": len(beats),
              "captions": len(timeline["captions"]), "allWordAnchorsCalibrated": True,
              "contiguousFrameBoundaries": True, "captionTimingChecked": True,
              "sourceRecordingCount": len(timeline["scenes"]), "tempo": timeline["tempo"],
              "minimumReadingHold": min(b["end"]-b["actionEnd"] for b in beats),
              "semanticVersion": 3,
              "semanticActionCount": sum(len(b["semanticPlan"]) for b in beats),
              "shortFinalHoldsRequireVisualReview": [
                  {"beat": b["id"], "seconds": b["end"]-b["actionEnd"],
                   "finalPhrase": b["semanticPlan"][-1]["phrase"]}
                  for b in beats if b["end"]-b["actionEnd"] < 1],
              "semanticMeaningApprovedByTimingCheck": False,
              "humanListeningReview": False}
    (ROOT / "review").mkdir(exist_ok=True)
    (ROOT / "review/content-check.json").write_text(json.dumps(result, indent=2))
    print(json.dumps(result))


if __name__ == "__main__":
    main()
