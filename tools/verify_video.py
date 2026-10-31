"""Verify a delivered video with FFprobe and a full FFmpeg decode."""

from __future__ import annotations

import argparse
import json
import subprocess
from dataclasses import dataclass
from fractions import Fraction
from pathlib import Path
from typing import Any, Literal


@dataclass(frozen=True)
class VideoSpec:
    """Expected output properties; creative and source acceptance are separate."""

    width: int
    height: int
    fps: Fraction = Fraction(60)
    frames: int | None = None
    audio: Literal["any", "present", "absent"] = "any"

    def __post_init__(self) -> None:
        if self.width <= 0 or self.height <= 0 or self.fps <= 0:
            raise ValueError("Dimensions and frame rate must be positive")
        if self.frames is not None and self.frames <= 0:
            raise ValueError("Frame count must be positive")
        if self.audio not in {"any", "present", "absent"}:
            raise ValueError("Invalid audio policy")


def check_metadata(probe: dict[str, Any], spec: VideoSpec) -> dict[str, Any]:
    """Validate actual stream metadata and return the measured video properties."""
    videos = [stream for stream in probe["streams"] if stream.get("codec_type") == "video"]
    audios = [stream for stream in probe["streams"] if stream.get("codec_type") == "audio"]
    if len(videos) != 1:
        raise ValueError(f"Expected one video stream; found {len(videos)}")
    video = videos[0]
    expected = {
        "codec_name": "h264",
        "width": spec.width,
        "height": spec.height,
        "pix_fmt": "yuv420p",
    }
    for field, value in expected.items():
        if video.get(field) != value:
            raise ValueError(f"{field}: expected {value}, got {video.get(field)}")
    rate = Fraction(video["avg_frame_rate"])
    nominal = Fraction(video["r_frame_rate"])
    if rate != spec.fps or nominal != spec.fps:
        raise ValueError(f"Expected constant {spec.fps} fps, got {rate} / {nominal}")
    frames = int(video["nb_read_frames"])
    if spec.frames is not None and frames != spec.frames:
        raise ValueError(f"Expected {spec.frames} frames; decoded {frames}")
    if spec.audio == "present" and not audios:
        raise ValueError("Expected audio but found none")
    if spec.audio == "absent" and audios:
        raise ValueError("Unexpected audio stream")
    duration = float(video.get("duration") or probe["format"]["duration"])
    if abs(duration - float(Fraction(frames, 1) / rate)) > float(1 / rate):
        raise ValueError("Duration and decoded frame count disagree by more than one frame")
    return {
        "width": video["width"],
        "height": video["height"],
        "fps": str(rate),
        "frames": frames,
        "seconds": duration,
        "codec": video["codec_name"],
        "pixelFormat": video["pix_fmt"],
        "colorRange": video.get("color_range"),
        "matrix": video.get("color_space"),
        "audioStreams": len(audios),
    }


def verify_video(path: Path, spec: VideoSpec) -> dict[str, Any]:
    """Probe and fully decode an existing output, failing on malformed streams or tool errors."""
    if not path.is_file():
        raise FileNotFoundError(path)
    probe = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-count_frames",
            "-show_streams",
            "-show_format",
            "-of",
            "json",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    if probe.stderr.strip():
        raise ValueError(f"FFprobe reported a stream error: {probe.stderr.strip()}")
    measured = check_metadata(json.loads(probe.stdout), spec)
    decode = subprocess.run(
        ["ffmpeg", "-v", "error", "-xerror", "-i", str(path), "-f", "null", "-"],
        check=True,
        capture_output=True,
        text=True,
    )
    if decode.stderr.strip():
        raise ValueError(f"FFmpeg reported a decode error: {decode.stderr.strip()}")
    return {
        "path": str(path),
        "video": measured,
        "fullDecode": "passed",
        "creativeAcceptance": "not established by this verifier",
    }


def main() -> None:
    """Check a final or draft render against explicitly requested output properties."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video", type=Path)
    parser.add_argument("--width", type=int, required=True)
    parser.add_argument("--height", type=int, required=True)
    parser.add_argument("--fps", type=Fraction, default=Fraction(60))
    parser.add_argument("--frames", type=int)
    parser.add_argument("--audio", choices=["any", "present", "absent"], default="any")
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    if args.out and args.out.resolve() == args.video.resolve():
        parser.error("The report must not overwrite the video")
    report = verify_video(
        args.video, VideoSpec(args.width, args.height, args.fps, args.frames, args.audio)
    )
    text = json.dumps(report, indent=2) + "\n"
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(text, encoding="utf-8")
    print(text)


if __name__ == "__main__":
    main()
