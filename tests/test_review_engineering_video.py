"""Verify exact frame coverage and robust encoded-motion statistics parsing."""

import subprocess
from pathlib import Path

from review_engineering_video import parse_differences, scan_video


def test_parse_preserves_small_exponents_and_frame_identity() -> None:
    """Tiny compression noise must not become a large flicker false positive."""
    values = parse_differences(
        "frame:0 pts:1 pts_time:0.0166667\nlavfi.signalstats.YAVG=1.25e-05\n"
    )
    assert values == [{"frame": 1.0, "seconds": 0.0166667, "difference": 0.0000125}]


def test_scan_decodes_every_adjacent_pair_of_a_real_encoded_clip(tmp_path: Path) -> None:
    """Run FFmpeg and the scanner together; a settled synthetic test clip has no flicker."""
    movie = tmp_path / "tiny.mp4"
    subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "color=c=white:s=32x32:r=5:d=0.6",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            str(movie),
        ],
        check=True,
    )
    report = scan_video(movie, tmp_path / "receipt.json")
    assert report["adjacentPairs"] == 2
    assert report["isolatedFlickerCandidates"] == []
    assert not list(tmp_path.glob("*.motion.txt"))


def test_repeated_flicker_is_flagged_even_without_quiet_neighbours(tmp_path: Path) -> None:
    """An alternating worker-style artifact cannot evade the isolated-flash detector."""
    movie = tmp_path / "alternating.mp4"
    subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "color=c=white:s=32x32:r=5:d=1",
            "-vf",
            "geq=lum='if(mod(N,2),0,255)':cb=128:cr=128",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            str(movie),
        ],
        check=True,
    )
    report = scan_video(movie, tmp_path / "receipt.json")
    assert report["adjacentPairs"] == 4
    assert report["sustainedDifferenceRuns"][0]["pairs"] == 4
