"""Burn SRT captions into a separate footer for players without subtitle support."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Literal


def review_ass(
    source: str,
    width: int,
    height: int,
    band: int,
    caption_position: Literal["bottom", "top"] = "bottom",
) -> str:
    """Size FFmpeg's converted ASS captions in actual pixels below the source UI."""
    if min(width, height, band) <= 0 or band < width * 0.07:
        raise ValueError("Caption footer must fit three lines at the review font size")
    if caption_position not in {"bottom", "top"}:
        raise ValueError("Caption position must be top or bottom")
    result = re.sub(r"(?m)^PlayResX:.*$", f"PlayResX: {width}", source)
    result = re.sub(r"(?m)^PlayResY:.*$", f"PlayResY: {height + band}", result)
    if "PlayResX:" not in result or "PlayResY:" not in result:
        raise ValueError("ASS script has no render dimensions")
    style_format = re.search(r"(?m)^Format: (Name, Fontname, Fontsize,.*)$", result)
    style = re.search(r"(?m)^Style: Default,(.*)$", result)
    if not style_format or not style:
        raise ValueError("ASS script has no default style")
    names = [name.strip() for name in style_format[1].split(",")]
    values = ("Default," + style[1]).split(",")
    changes = {
        "Fontname": "Arial",
        "Fontsize": f"{width / 64:g}",
        "PrimaryColour": "&H00FFFFFF",
        "Bold": "0",
        "BorderStyle": "1",
        "Outline": "0",
        "Shadow": "0",
        "Alignment": "8" if caption_position == "top" else "2",
        "MarginL": str(round(width / 24)),
        "MarginR": str(round(width / 24)),
        "MarginV": str(height + round(band / 8) if caption_position == "top" else round(band / 8)),
    }
    for name, value in changes.items():
        values[names.index(name)] = value
    return result[: style.start()] + "Style: " + ",".join(values) + result[style.end() :]


def burn_review(
    video: Path,
    captions: Path,
    output: Path,
    duration: float | None = None,
    caption_position: Literal["bottom", "top"] = "bottom",
) -> None:
    """Render a review derivative while preserving the original video and its UI framing."""
    video, captions, output = video.resolve(), captions.resolve(), output.resolve()
    if not video.is_file() or not captions.is_file():
        raise FileNotFoundError("Video and caption inputs must exist")
    if output.exists() or output in {video, captions}:
        raise FileExistsError(output)
    if duration is not None and duration <= 0:
        raise ValueError("Preview duration must be positive")
    probe = json.loads(
        subprocess.check_output(
            [
                "ffprobe",
                "-v",
                "error",
                "-select_streams",
                "v:0",
                "-show_entries",
                "stream=width,height",
                "-of",
                "json",
                str(video),
            ],
            text=True,
        )
    )
    width, height = int(probe["streams"][0]["width"]), int(probe["streams"][0]["height"])
    band = 2 * round(width * 0.075 / 2)
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="clio-caption-review-") as temporary:
        ass = Path(temporary) / "review.ass"
        subprocess.run(
            [
                "ffmpeg",
                "-v",
                "error",
                "-i",
                str(captions),
                str(ass),
            ],
            check=True,
        )
        ass.write_text(
            review_ass(ass.read_text(encoding="utf-8-sig"), width, height, band, caption_position),
            encoding="utf-8",
        )
        args = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(video)]
        if duration is not None:
            args += ["-t", str(duration)]
        args += [
            "-map",
            "0:v:0",
            "-map",
            "0:a?",
            "-vf",
            f"pad=iw:ih+{band}:0:0:color=0x14232c,ass=review.ass",
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "16",
            "-threads",
            "8",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "copy",
            "-movflags",
            "+faststart",
            "-color_range",
            "tv",
            "-colorspace",
            "bt709",
            "-color_primaries",
            "bt709",
            "-color_trc",
            "bt709",
            str(output),
        ]
        subprocess.run(args, cwd=temporary, check=True)


def main() -> None:
    """Create a visibly captioned review copy without changing the clean master."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video", type=Path)
    parser.add_argument("captions", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--duration", type=float, help="Only encode this many seconds for review")
    parser.add_argument("--caption-position", choices=["bottom", "top"], default="bottom")
    args = parser.parse_args()
    burn_review(args.video, args.captions, args.output, args.duration, args.caption_position)


if __name__ == "__main__":
    main()
