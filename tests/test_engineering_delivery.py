"""Check the visible-review sidecars and future voice-alignment handoff."""

import json
from pathlib import Path

from prepare_engineering_delivery import prepare


def test_delivery_keeps_global_cues_chapters_and_visible_player_captions(tmp_path: Path) -> None:
    """The local player works without browser subtitle support, and voice anchors match the film."""
    plan = prepare(tmp_path)
    previous = 0.0
    for cue in plan["cues"]:
        assert previous <= cue["start"] < cue["end"] <= 356
        previous = cue["end"]
    assert plan["chapters"][0]["end"] == plan["chapters"][1]["start"] == 195
    jobs = json.loads((tmp_path / "engineering-elevenlabs-jobs.json").read_text("utf-8"))
    assert jobs["timing"] == "editorial_not_audio_aligned"
    assert len(jobs["clips"]) == len(plan["cues"])
    for job, cue in zip(jobs["clips"], plan["cues"], strict=True):
        assert job["globalStartSeconds"] == cue["start"]
        assert (tmp_path / job["textFile"]).read_text("utf-8").strip() == cue["text"]
    player = (tmp_path / "engineering-review.html").read_text("utf-8")
    assert "engineering-demo-captioned.mp4" in player
    assert 'src="engineering-demo-captioned.mp4"' in player
    assert ">Show clean master</button>" in player
    assert "timeupdate" in player and "textContent" in player
    assert "WEBVTT" in (tmp_path / "engineering-demo.vtt").read_text("utf-8")
