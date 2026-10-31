"""Check real response formats and strict global caption placement."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from study_captions import (
    align_captions,
    alignment_words,
    caption_chunks,
    prepare_captions,
    timestamp,
)


def test_character_and_forced_alignment_formats() -> None:
    """Both documented API response shapes produce the same local word intervals."""
    response = {
        "alignment": {
            "characters": list("Hi all"),
            "character_start_times_seconds": [0, 0.1, 0.2, 0.3, 0.4, 0.5],
            "character_end_times_seconds": [0.1, 0.2, 0.3, 0.4, 0.5, 0.6],
        }
    }
    expected = [{"text": "Hi", "start": 0.0, "end": 0.2}, {"text": "all", "start": 0.3, "end": 0.6}]
    assert alignment_words(response) == expected
    assert alignment_words({"words": expected}) == expected
    assert caption_chunks(expected, 100)[0] == {"text": "Hi all", "start": 100, "end": 100.6}


def test_alignment_rejects_invalid_arrays_and_time() -> None:
    """Untrustworthy timing never silently becomes an accepted caption track."""
    with pytest.raises(ValueError, match="different lengths"):
        alignment_words(
            {
                "alignment": {
                    "characters": ["a"],
                    "character_start_times_seconds": [],
                    "character_end_times_seconds": [1],
                }
            }
        )
    with pytest.raises(ValueError, match="out of order"):
        alignment_words(
            {"words": [{"text": "a", "start": 2, "end": 3}, {"text": "b", "start": 1, "end": 2}]}
        )


def test_offset_and_overrun_validation(tmp_path: Path) -> None:
    """A segment's real audio remains local until explicitly offset onto its film cue."""
    plan = {
        "durationSeconds": 20,
        "cues": [{"id": "a", "start": 10, "end": 20, "text": "One two."}],
    }
    prepare_captions(plan, tmp_path)
    (tmp_path / "alignment.json").write_text(
        json.dumps({"words": [{"text": "One", "start": 1, "end": 2}]}), encoding="utf-8"
    )
    manifest = tmp_path / "clips.json"
    manifest.write_text(
        json.dumps({"clips": [{"cue": "a", "responseFile": "alignment.json"}]}), encoding="utf-8"
    )
    align_captions(plan, manifest, tmp_path)
    assert "00:00:11,000 --> 00:00:12,000" in (tmp_path / "wordle-audio-aligned.srt").read_text()
    (tmp_path / "alignment.json").write_text(
        json.dumps({"words": [{"text": "Long", "start": 1, "end": 11}]}), encoding="utf-8"
    )
    with pytest.raises(ValueError, match="exceeds the film window"):
        align_captions(plan, manifest, tmp_path)
    assert timestamp(59.9996, ",") == "00:01:00,000"


def test_full_presenter_sidecars(tmp_path: Path) -> None:
    """The checked-in script yields valid nonempty sidecars without contacting a service."""
    plan = json.loads(
        (Path(__file__).resolve().parents[1] / "motion/story/wordle-narration.json").read_text(
            encoding="utf-8"
        )
    )
    prepare_captions(plan, tmp_path)
    assert len(plan["cues"]) == 35
    assert (tmp_path / "wordle-planned.vtt").read_text(encoding="utf-8").startswith("WEBVTT")
    jobs = json.loads((tmp_path / "elevenlabs-jobs.json").read_text())
    assert jobs["clips"][-1]["globalStartSeconds"] == 550
    assert jobs["timing"] == "editorial_not_audio_aligned"
