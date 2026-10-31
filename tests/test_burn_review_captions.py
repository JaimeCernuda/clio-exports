"""Validate footer styling and a real encoded caption review."""

import json
import subprocess
from pathlib import Path
from typing import Literal

import pytest
from burn_review_captions import burn_review, review_ass


@pytest.mark.parametrize("position", ["bottom", "top"])
def test_real_caption_review(tmp_path: Path, position: Literal["bottom", "top"]) -> None:
    """Encode actual subtitles and retain every source frame above the new footer."""
    video, captions, output = (tmp_path / name for name in ("in.mp4", "in.srt", "out.mp4"))
    subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "color=white:s=640x360:r=60",
            "-t",
            "1",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            str(video),
        ],
        check=True,
    )
    captions.write_text(
        "1\n00:00:00,000 --> 00:00:01,000\nVisible review caption\n", encoding="utf-8"
    )
    burn_review(video, captions, output, caption_position=position)
    probe = json.loads(
        subprocess.check_output(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "stream=width,height,nb_frames",
                "-of",
                "json",
                str(output),
            ],
            text=True,
        )
    )["streams"][0]
    assert (probe["width"], probe["height"], probe["nb_frames"]) == (640, 408, "60")
    pixels = subprocess.check_output(
        [
            "ffmpeg",
            "-v",
            "error",
            "-ss",
            "0.5",
            "-i",
            str(output),
            "-vf",
            "crop=640:48:0:360,format=gray",
            "-frames:v",
            "1",
            "-f",
            "rawvideo",
            "-",
        ]
    )
    assert max(pixels) - min(pixels) > 100, "Caption footer contains no visible text"
    ink_rows = [index // 640 for index, value in enumerate(pixels) if value > 180]
    if position == "top":
        assert max(ink_rows) < 24, "Caption overlaps the player-control half of the footer"
    else:
        assert min(ink_rows) >= 24
    with pytest.raises(FileExistsError):
        burn_review(video, captions, output)


def test_caption_style_uses_output_pixels(tmp_path: Path) -> None:
    """Prevent huge default ASS fonts and keep all three lines inside the footer."""
    captions, converted = tmp_path / "in.srt", tmp_path / "in.ass"
    captions.write_text("1\n00:00:00,000 --> 00:00:01,000\nOne\nTwo\nThree\n", encoding="utf-8")
    subprocess.run(["ffmpeg", "-v", "error", "-i", str(captions), str(converted)], check=True)
    styled = review_ass(converted.read_text(encoding="utf-8-sig"), 1920, 1080, 144)
    assert "PlayResX: 1920" in styled
    assert "PlayResY: 1224" in styled
    assert "Style: Default,Arial,30," in styled
    assert r"One\NTwo\NThree" in styled
    with pytest.raises(ValueError):
        review_ass(styled, 1920, 1080, 40)
