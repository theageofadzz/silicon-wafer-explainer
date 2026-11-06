"""Build a speech-led film; every clause must match actual provider word events."""
import asyncio
import json
import math
import re
import subprocess
import wave
from pathlib import Path

import edge_tts
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
FPS, SR = 24, 48000


def normalized(text):
    return "".join(re.findall(r"[\u3400-\u9fffA-Za-z0-9]", text)).lower()


async def main():
    plan = json.loads((ROOT / "script.json").read_text())
    opening = json.loads((ROOT / "opening/timeline.json").read_text())
    assert opening["duration"] == plan["openingDuration"]
    scenes, captions = [], []
    cursor = plan["openingDuration"]
    # Reuse the approved opening recording and its original segment offsets.
    with wave.open(str(ROOT / "opening/assets/narration.wav")) as source:
        assert source.getframerate() == SR
        audio = [np.frombuffer(source.readframes(source.getnframes()), dtype="<i2").copy()]
    for spec in plan["scenes"]:
        stem = ROOT / "assets/voice" / spec["id"]
        config = {"text": "".join(spec["clauses"]), "voice": plan["voice"], "rate": plan["rate"]}
        record = json.loads(stem.with_suffix(".json").read_text()) if stem.with_suffix(".json").exists() else None
        if not record or record["config"] != config:
            for attempt in range(4):
                try:
                    data, words = bytearray(), []
                    async for event in edge_tts.Communicate(
                        **config, boundary="WordBoundary"
                    ).stream():
                        if event["type"] == "audio":
                            data.extend(event["data"])
                        elif event["type"] == "WordBoundary":
                            words.append(event)
                    assert data and words, "Audio and actual word boundaries required"
                    break
                except Exception:
                    if attempt == 3:
                        raise
                    await asyncio.sleep(attempt + 1)
            stem.with_suffix(".mp3").write_bytes(data)
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(stem.with_suffix(".mp3")),
                            "-ar", str(SR), "-ac", "1", str(stem.with_suffix(".wav"))], check=True)
            record = {"config": config, "events": words, "timestampUnits": "100ns from segment audio start"}
            stem.with_suffix(".json").write_text(json.dumps(record, ensure_ascii=False, indent=2))
        with wave.open(str(stem.with_suffix(".wav"))) as source:
            assert source.getframerate() == SR
            pcm = np.frombuffer(source.readframes(source.getnframes()), dtype="<i2").copy()
        word_events, pos = [], 0
        for raw in record["events"]:
            n = len(normalized(raw["text"]))
            word_events.append({"text": raw["text"], "a": pos, "b": pos + n,
                                "start": cursor + raw["offset"] / 1e7,
                                "end": cursor + (raw["offset"] + raw["duration"]) / 1e7})
            pos += n
        assert normalized(config["text"]) == "".join(normalized(w["text"]) for w in word_events), spec["id"]
        pos, cues = 0, []
        for clause in spec["clauses"]:
            n = len(normalized(clause))
            matches = [w for w in word_events if w["a"] < pos + n and w["b"] > pos]
            if not matches:
                raise ValueError(f"Uncalibrated speech clause: {clause}")
            cue = {"text": clause.rstrip("，。"), "start": matches[0]["start"],
                   "end": matches[-1]["end"] + .12, "scene": spec["id"]}
            cues.append(cue)
            captions.append(cue)
            pos += n
        scene_duration = math.ceil((len(pcm) / SR + spec["hold"]) * FPS) / FPS
        silence = np.zeros(round(scene_duration * SR) - len(pcm), dtype="<i2")
        audio.extend([pcm, silence])
        scenes.append({**spec, "start": cursor, "end": cursor + scene_duration,
                       "audioStart": cursor, "audioDuration": len(pcm) / SR,
                       "words": word_events, "captions": cues})
        print(spec["id"], f"{cursor:.3f}..{cursor + scene_duration:.3f}", flush=True)
        cursor += scene_duration
    full_audio = np.concatenate(audio)
    with wave.open(str(ROOT / "assets/narration.wav"), "wb") as target:
        target.setparams((1, 2, SR, 0, "NONE", "not compressed"))
        target.writeframes(full_audio.tobytes())
    timeline = {"fps": FPS, "width": 1080, "height": 1920, "duration": cursor,
                "openingDuration": plan["openingDuration"], "scenes": scenes, "captions": captions,
                "openingTimeline": "opening/timeline.json",
                "timeTruth": "Actual provider WordBoundary events /1e7 + verified segment audio offset",
                "uncalibratedAnchors": []}
    (ROOT / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=2))
    print("Full duration:", cursor, flush=True)


if __name__ == "__main__":
    asyncio.run(main())
