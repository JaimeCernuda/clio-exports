"""Export editorial captions or offset actual ElevenLabs alignment onto the film timeline."""

from __future__ import annotations

import argparse
import json
import math
import re
import textwrap
from pathlib import Path
from typing import Any, cast


def alignment_words(response: dict[str, Any]) -> list[dict[str, Any]]:
    """Read actual With Timestamps character arrays or forced-alignment word records."""
    words: list[dict[str, Any]] = []
    if isinstance(response.get("words"), list):
        words = [
            {"text": str(w["text"]), "start": float(w["start"]), "end": float(w["end"])}
            for w in response["words"]
            if str(w["text"]).strip()
        ]
    else:
        alignment = response.get("alignment") or response.get("normalized_alignment")
        if not isinstance(alignment, dict):
            raise TypeError("No ElevenLabs alignment in response")
        chars = cast(list[str], alignment["characters"])
        starts = cast(list[float], alignment["character_start_times_seconds"])
        ends = cast(list[float], alignment["character_end_times_seconds"])
        if not (len(chars) == len(starts) == len(ends)):
            raise ValueError("Character alignment arrays have different lengths")
        current: dict[str, Any] | None = None
        for char, start, end in zip(chars, starts, ends, strict=True):
            if char.isspace():
                if current:
                    words.append(current)
                    current = None
            elif current:
                current["text"] += char
                current["end"] = float(end)
            else:
                current = {"text": char, "start": float(start), "end": float(end)}
        if current:
            words.append(current)
    previous = -1.0
    for word in words:
        start, end = word["start"], word["end"]
        if (
            not math.isfinite(start)
            or not math.isfinite(end)
            or start < 0
            or end < start
            or start < previous
        ):
            raise ValueError("Alignment is non-finite, negative or out of order")
        previous = start
    if not words:
        raise ValueError("Alignment contains no words")
    return words


def caption_chunks(words: list[dict[str, Any]], offset: float = 0) -> list[dict[str, Any]]:
    """Group real word timings into at most two readable caption lines."""
    result: list[dict[str, Any]] = []
    group: list[dict[str, Any]] = []
    for word in words:
        joined = " ".join(str(w["text"]) for w in [*group, word])
        if group and (len(joined) > 80 or word["end"] - group[0]["start"] > 6):
            result.append(
                {
                    "start": offset + group[0]["start"],
                    "end": offset + group[-1]["end"],
                    "text": "\n".join(textwrap.wrap(" ".join(w["text"] for w in group), 42)),
                }
            )
            group = []
        group.append(word)
    if group:
        result.append(
            {
                "start": offset + group[0]["start"],
                "end": offset + group[-1]["end"],
                "text": "\n".join(textwrap.wrap(" ".join(w["text"] for w in group), 42)),
            }
        )
    return result


def timestamp(seconds: float, separator: str) -> str:
    """Format a global millisecond timestamp without rounding past a minute boundary."""
    value = round(seconds * 1000)
    hours, value = divmod(value, 3_600_000)
    minutes, value = divmod(value, 60_000)
    whole, millis = divmod(value, 1000)
    return f"{hours:02}:{minutes:02}:{whole:02}{separator}{millis:03}"


def write_captions(captions: list[dict[str, Any]], output: Path, stem: str) -> None:
    """Write SRT and WebVTT sidecars with the same global cue boundaries."""
    output.mkdir(parents=True, exist_ok=True)
    for extension, separator, prefix in (("srt", ",", ""), ("vtt", ".", "WEBVTT\n\n")):
        blocks: list[str] = []
        for index, cue in enumerate(captions, 1):
            if cue["end"] <= cue["start"]:
                raise ValueError("A caption must have positive duration")
            blocks.append(
                f"{index}\n{timestamp(cue['start'], separator)} --> {timestamp(cue['end'], separator)}\n{cue['text']}\n"
            )
        (output / f"{stem}.{extension}").write_text(prefix + "\n".join(blocks), encoding="utf-8")


def prepare_captions(plan: dict[str, Any], output: Path) -> None:
    """Export a presenter draft and per-cue jobs; no voice service is contacted."""
    captions: list[dict[str, Any]] = []
    jobs: list[dict[str, Any]] = []
    output.mkdir(parents=True, exist_ok=True)
    text_dir = output / "narration"
    text_dir.mkdir(exist_ok=True)
    previous = 0.0
    for cue in plan["cues"]:
        start, end = float(cue["start"]), float(cue["end"])
        if start < previous or end <= start or end > plan["durationSeconds"]:
            raise ValueError(f"Invalid film window for {cue['id']}")
        previous = end
        tokens = re.findall(r"\S+", cue["text"])
        duration = end - start
        words = [
            {
                "text": token,
                "start": i * duration / len(tokens),
                "end": (i + 1) * duration / len(tokens),
            }
            for i, token in enumerate(tokens)
        ]
        captions.extend(caption_chunks(words, start))
        (text_dir / f"{cue['id']}.txt").write_text(cue["text"] + "\n", encoding="utf-8")
        jobs.append(
            {
                "cue": cue["id"],
                "globalStartSeconds": start,
                "windowEndSeconds": end,
                "textFile": f"narration/{cue['id']}.txt",
                "requestBody": {"text": cue["text"]},
                "responseFile": f"alignment/{cue['id']}.json",
                "audioFile": f"audio/{cue['id']}.mp3",
            }
        )
    write_captions(captions, output, "wordle-planned")
    (output / "elevenlabs-jobs.json").write_text(
        json.dumps(
            {
                "schema": "clio.narration-jobs.v1",
                "timing": "editorial_not_audio_aligned",
                "ttsEndpoint": "/v1/text-to-speech/{voice_id}/with-timestamps",
                "forcedAlignmentEndpoint": "/v1/forced-alignment",
                "clips": jobs,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    (output / "presenter-script.txt").write_text(
        "\n\n".join(f"{timestamp(c['start'], '.')} — {c['id']}\n{c['text']}" for c in plan["cues"])
        + "\n",
        encoding="utf-8",
    )


def align_captions(plan: dict[str, Any], manifest: Path, output: Path) -> None:
    """Place actual local alignment on global anchors and reject narration overruns."""
    jobs = json.loads(manifest.read_text(encoding="utf-8"))
    by_id = {cue["id"]: cue for cue in plan["cues"]}
    aligned: list[dict[str, Any]] = []
    seen: set[str] = set()
    for clip in jobs["clips"]:
        identity = clip["cue"]
        if identity in seen or identity not in by_id:
            raise ValueError(f"Duplicate or unknown cue: {identity}")
        seen.add(identity)
        cue = by_id[identity]
        response = json.loads((manifest.parent / clip["responseFile"]).read_text(encoding="utf-8"))
        words = alignment_words(response)
        if words[-1]["end"] > cue["end"] - cue["start"]:
            raise ValueError(
                f"Audio exceeds the film window for {identity}; revise the clip or retime the film"
            )
        aligned.extend(caption_chunks(words, float(cue["start"])))
    if seen != set(by_id):
        raise ValueError(f"Missing audio alignment for {sorted(set(by_id) - seen)}")
    aligned.sort(key=lambda c: c["start"])
    write_captions(aligned, output, "wordle-audio-aligned")
    (output / "wordle-audio-aligned.json").write_text(
        json.dumps(
            {"schema": "clio.captions.v1", "timing": "audio_aligned", "captions": aligned}, indent=2
        )
        + "\n",
        encoding="utf-8",
    )


def main() -> None:
    """Prepare presenter sidecars or import saved API alignment without network requests."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("prepare", "align"))
    parser.add_argument("--plan", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--manifest", type=Path)
    args = parser.parse_args()
    plan = json.loads(args.plan.read_text(encoding="utf-8"))
    if args.mode == "prepare":
        prepare_captions(plan, args.out)
    elif args.manifest:
        align_captions(plan, args.manifest, args.out)
    else:
        parser.error("align requires --manifest")


if __name__ == "__main__":
    main()
