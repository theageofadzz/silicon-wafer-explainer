"""Record original narration and calibrate every beat to actual word events."""
import argparse
import asyncio
import hashlib
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


def norm(text):
    return "".join(re.findall(r"[\u3400-\u9fffA-Za-z0-9]", text)).lower()


def save_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2))


def read_pcm(path):
    with wave.open(str(path)) as source:
        assert source.getframerate() == SR and source.getnchannels() == 1
        return np.frombuffer(source.readframes(source.getnframes()), dtype="<i2").copy()


def write_pcm(path, pcm):
    with wave.open(str(path), "wb") as target:
        target.setparams((1, 2, SR, 0, "NONE", "not compressed"))
        target.writeframes(pcm.tobytes())


def boundaries(text, limit=18):
    # Prefer grammatical punctuation; long clauses break on actual provider words below.
    parts, pos = [], 0
    for piece in re.findall(r"[^，。！？；：、]+[，。！？；：、]?", text):
        length = len(norm(piece))
        if length:
            parts.append((pos, pos + length, piece.rstrip("，。！？；：、")))
            pos += length
    return parts


async def record(spec, plan, semaphore):
    async with semaphore:
        stem = ROOT / "assets/voice" / spec["id"]
        stem.parent.mkdir(parents=True, exist_ok=True)
        config = {"text": "".join(b["text"] for b in spec["beats"]),
                  "voice": plan["voice"], "rate": plan["rate"]}
        cache = stem.with_suffix(".json")
        old = json.loads(cache.read_text()) if cache.is_file() else None
        if old and old.get("config") == config and stem.with_suffix(".mp3").is_file():
            if not stem.with_suffix(".wav").is_file():
                subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(stem.with_suffix(".mp3")),
                                "-ac", "1", "-ar", str(SR), str(stem.with_suffix(".wav"))], check=True)
            return spec, old, read_pcm(stem.with_suffix(".wav"))
        for attempt in range(4):
            try:
                data, events = bytearray(), []
                async for event in edge_tts.Communicate(**config, boundary="WordBoundary").stream():
                    if event["type"] == "audio":
                        data.extend(event["data"])
                    elif event["type"] == "WordBoundary":
                        events.append(event)
                assert data and events, "No real word boundaries returned"
                assert norm(config["text"]) == "".join(norm(e["text"]) for e in events)
                break
            except Exception:
                if attempt == 3:
                    raise
                await asyncio.sleep(attempt + 1)
        stem.with_suffix(".mp3").write_bytes(data)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(stem.with_suffix(".mp3")),
                        "-ac", "1", "-ar", str(SR), str(stem.with_suffix(".wav"))], check=True)
        result = {"config": config, "events": events, "timestampUnits": "100ns from segment audio",
                  "audioSHA256": hashlib.sha256(stem.with_suffix(".wav").read_bytes()).hexdigest()}
        save_json(cache, result)
        print("Recorded", spec["id"], flush=True)
        return spec, result, read_pcm(stem.with_suffix(".wav"))


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pilot", action="store_true")
    parser.add_argument("--fit", action="store_true",
                        help="Fit total duration with <=10 percent measured audio tempo change")
    args = parser.parse_args()
    plan = json.loads((ROOT / "script.json").read_text())
    previous_path = ROOT / "timeline.json"
    previous = json.loads(previous_path.read_text()) if previous_path.is_file() else {}
    previous_beats = {b["id"]: b for s in previous.get("scenes", []) for b in s["beats"]}
    specs = plan["scenes"][:3] if args.pilot else plan["scenes"]
    semaphore = asyncio.Semaphore(2)
    recordings = await asyncio.gather(*(record(s, plan, semaphore) for s in specs))
    cursor, scenes, captions, audio = 0.0, [], [], []
    for spec, recorded, pcm in recordings:
        word_events, pos = [], 0
        for event in recorded["events"]:
            length = len(norm(event["text"]))
            word_events.append({"text": event["text"], "a": pos, "b": pos + length,
                                "start": cursor + event["offset"] / 1e7,
                                "end": cursor + (event["offset"] + event["duration"]) / 1e7})
            pos += length
        duration = math.ceil((len(pcm) / SR + .6) * FPS) / FPS
        beats, pos = [], 0
        for index, original in enumerate(spec["beats"]):
            text, begin = original["text"], pos
            pos += len(norm(text))
            words = [w.copy() for w in word_events if w["a"] < pos and w["b"] > begin]
            assert words, f"Missing timing: {spec['id']}/{index}"
            local = norm(text).find(norm(original["actionAnchor"]))
            if local < 0:
                raise ValueError(f"Uncalibrated anchor: {spec['id']} {original['actionAnchor']}")
            action_word = next(w for w in words if w["b"] > begin + local)
            cues = []
            for a, b, phrase in boundaries(text):
                matched = [w for w in words if w["a"] < begin + b and w["b"] > begin + a]
                if not matched:
                    raise ValueError(f"Uncalibrated caption: {phrase}")
                if len(norm(phrase)) <= 18:
                    chunks = [matched]
                else:
                    chunks, current = [], []
                    for word in matched:
                        if current and len(norm("".join(w["text"] for w in current) + word["text"])) > 18:
                            chunks.append(current)
                            current = []
                        current.append(word)
                    if current:
                        chunks.append(current)
                for chunk in chunks:
                    caption = phrase if len(chunks) == 1 else "".join(w["text"] for w in chunk)
                    cues.append({"text": caption, "start": chunk[0]["start"],
                                 "end": chunk[-1]["end"] + .1,
                                 "scene": spec["id"], "beat": f"{spec['id']}-{index+1:02}"})
            beats.append({**original, "id": f"{spec['id']}-{index+1:02}",
                          "start": cursor if index == 0 else words[0]["start"] - .08,
                          "end": words[-1]["end"] + .2,
                          "speechStart": words[0]["start"], "speechEnd": words[-1]["end"],
                          "actionStart": action_word["start"],
                          "actionEnd": min(words[-1]["end"] + .12,
                                           action_word["start"] + float(original.get("actionSeconds", 1.5))),
                          "words": words, "captions": cues})
            captions.extend(cues)
        for i, beat in enumerate(beats):
            beat["end"] = beats[i + 1]["start"] if i + 1 < len(beats) else cursor + duration
            beat["actionEnd"] = max(beat["actionStart"] + .1,
                                    min(beat["actionEnd"], beat["end"] - .15))
            beat["readingHold"] = beat["end"] - beat["actionEnd"]
        scenes.append({k: v for k, v in spec.items() if k != "beats"} |
                      {"start": cursor, "end": cursor + duration, "beats": beats})
        # Soft fades preserve all spoken samples, with silence in the final provider tail.
        fade = min(1440, len(pcm) // 20)
        pcm = pcm.astype(np.float32)
        pcm[:fade] *= np.linspace(0, 1, fade)
        pcm[-fade:] *= np.linspace(1, 0, fade)
        pcm = pcm.astype("<i2")
        audio.extend([pcm, np.zeros(round(duration * SR) - len(pcm), dtype="<i2")])
        cursor += duration
    for first, second in zip(captions, captions[1:]):
        first["end"] = min(first["end"], second["start"] - .015)
    full = np.concatenate(audio)
    (ROOT / "assets").mkdir(exist_ok=True)
    raw = ROOT / "assets/narration-source.wav"
    write_pcm(raw, full)
    tempo = 1.0
    if args.fit:
        tempo = cursor / plan["targetSeconds"]
        if not .9 <= tempo <= 1.1:
            raise ValueError(f"Narration {cursor:.2f}s requires tempo {tempo:.4f}; revise script/rate, do not pad or rush.")
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(raw), "-af", f"atempo={tempo:.10f}",
                        "-ac", "1", "-ar", str(SR), str(ROOT / "assets/narration.wav")], check=True)
        actual = len(read_pcm(ROOT / "assets/narration.wav")) / SR
        target_duration = math.ceil(actual * FPS) / FPS
        final = read_pcm(ROOT / "assets/narration.wav")
        final = np.pad(final, (0, round(target_duration * SR) - len(final)))
        write_pcm(ROOT / "assets/narration.wav", final)

        def scale(item):
            for key in ["start", "end", "speechStart", "speechEnd", "actionStart", "actionEnd", "readingHold"]:
                if key in item:
                    item[key] /= tempo
        for scene in scenes:
            scale(scene)
            for beat in scene["beats"]:
                scale(beat)
                for word in beat["words"]:
                    scale(word)
                for cue in beat["captions"]:
                    scale(cue)
        # captions and beat.captions share dicts, so they were already scaled.
        scenes[-1]["end"] = scenes[-1]["beats"][-1]["end"] = target_duration
        cursor = target_duration
    else:
        write_pcm(ROOT / "assets/narration.wav", full)
    for scene in scenes:
        scene["start"], scene["end"] = round(scene["start"] * FPS) / FPS, round(scene["end"] * FPS) / FPS
        for beat in scene["beats"]:
            beat["start"], beat["end"] = round(beat["start"] * FPS) / FPS, round(beat["end"] * FPS) / FPS
            beat["readingHold"] = beat["end"] - beat["actionEnd"]
    timeline = {"fps": FPS, "width": 1080, "height": 1920, "duration": cursor,
                "scenes": scenes, "captions": captions, "uncalibratedAnchors": [],
                "timingMethod": "Actual WordBoundary /1e7 + segment offset, then measured global tempo transform",
                "tempo": tempo, "voice": plan["voice"], "rate": plan["rate"],
                "originalTextSHA256": hashlib.sha256((ROOT / "script.json").read_bytes()).hexdigest()}
    for scene in scenes:
        for beat in scene["beats"]:
            old = previous_beats.get(beat["id"], {})
            if old.get("semanticVersion") != 3:
                continue
            if beat["text"] != old["text"]:
                raise ValueError(f"Rewrite requires a new semantic storyboard: {beat['id']}")
            joined = "".join(norm(w["text"]) for w in beat["words"])
            events = []
            for entry in old["semanticPlan"]:
                needle = norm(entry["phrase"])
                at = joined.find(needle)
                if at < 0:
                    raise ValueError(f"Missing semantic phrase after narration: {beat['id']}/{entry['phrase']}")
                position, matches = 0, []
                for word in beat["words"]:
                    stop = position + len(norm(word["text"]))
                    if position < at + len(needle) and stop > at:
                        matches.append(word)
                    position = stop
                start = matches[0]["start"] - entry.get("lead", 0)
                events.append({**entry, "start": start, "end": start + entry["seconds"],
                               "wordStart": matches[0]["start"], "wordEnd": matches[-1]["end"]})
            beat.update(semanticVersion=3, semanticPlan=events, localLabels=old.get("localLabels", []),
                        actionAnchor=events[0]["phrase"],
                        actionStart=min(e["start"] for e in events),
                        actionEnd=max(e["end"] for e in events))
            beat["readingHold"] = beat["end"] - beat["actionEnd"]
            if old.get("visualRevision") == 4:
                cameras = []
                for shot in old.get("cameraPlan", []):
                    event = next((e for e in events if e["phrase"] == shot["phrase"]), None)
                    if event is None:
                        raise ValueError(f"Missing camera phrase after narration: {beat['id']}/{shot['phrase']}")
                    cameras.append({**shot, "at": beat["start"] if not cameras else event["wordStart"],
                                    "wordStart": event["wordStart"]})
                if len(cameras) < 2:
                    raise ValueError(f"Detailed scene needs a camera plan: {beat['id']}")
                beat.update(visualRevision=4, cameraPlan=cameras)
    if all(b.get("semanticVersion") == 3 for s in scenes for b in s["beats"]):
        timeline["semanticVersion"] = 3
        timeline["timingMethod"] += "; each visual action separately bound to its spoken phrase"
    if all(b.get("visualRevision") == 4 for s in scenes for b in s["beats"]):
        timeline["visualRevision"] = 4
    # Preserve calibrated bytes when offline recovery reconstructs identical values.
    if timeline != previous:
        save_json(ROOT / "timeline.json", timeline)
    lines = ["# 台词与动作台账", "", f"真实录音时长：{cursor:.3f} 秒；语速换算：{tempo:.6f}。", "",
             "|时间|台词锚点|对象|动作目标|画面短标注|动作后阅读秒数|",
             "|---|---|---|---|---|---|"]
    for scene in scenes:
        for beat in scene["beats"]:
            lines.append(f'|{beat["start"]:.2f}–{beat["end"]:.2f}|{beat["actionAnchor"]}|'
                         f'{beat["visual"]}|{beat["text"]}|{"；".join(beat["labels"])}|{beat["readingHold"]:.2f}|')
    (ROOT / "BEATS.md").write_text("\n".join(lines) + "\n")
    print(json.dumps({"duration": cursor, "scenes": len(scenes), "beats": sum(len(s["beats"]) for s in scenes),
                      "captions": len(captions), "tempo": tempo}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    asyncio.run(main())
