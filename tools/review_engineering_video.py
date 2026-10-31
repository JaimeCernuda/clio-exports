"""Scan every adjacent encoded frame; flag candidate flicker for visual review."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path
from typing import Any


def parse_differences(text: str) -> list[dict[str, float]]:
    """Preserve full floating-point values, including FFmpeg's scientific notation."""
    pairs = re.findall(
        r"frame:\s*(\d+).*?pts_time:([\d.eE+-]+)\s*\n"
        r"lavfi\.signalstats\.YAVG=([\d.eE+-]+)",
        text,
    )
    return [
        {"frame": float(frame) + 1, "seconds": float(seconds), "difference": float(value)}
        for frame, seconds, value in pairs
    ]


def scan_video(video: Path, output: Path) -> dict[str, Any]:
    """Decode a complete movie and measure all adjacent frames without image intermediates."""
    video, output = video.resolve(), output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    probe = json.loads(
        subprocess.check_output(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "stream=codec_type,width,height,avg_frame_rate,nb_frames:format=duration,size",
                "-of",
                "json",
                str(video),
            ],
            text=True,
        )
    )
    stream = next(s for s in probe["streams"] if s["codec_type"] == "video")
    stats_name = re.sub(r"[^A-Za-z0-9_-]", "_", video.stem + "-" + output.stem) + ".motion.txt"
    subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-xerror",
            "-i",
            str(video),
            "-an",
            "-vf",
            "scale=480:270,format=gray,tblend=all_mode=difference,signalstats,metadata=mode=print:key=lavfi.signalstats.YAVG:file="
            + stats_name,
            "-f",
            "null",
            "-",
        ],
        cwd=output.parent,
        check=True,
    )
    statistics = output.parent / stats_name
    pairs = parse_differences(statistics.read_text("utf-8"))
    expected = int(stream["nb_frames"]) - 1
    if len(pairs) != expected:
        raise ValueError(f"Incomplete frame scan: {len(pairs)} pairs, expected {expected}")
    candidates = [
        pair
        for i, pair in enumerate(pairs[1:-1], 1)
        if pair["difference"] > 0.65
        and pairs[i + 1]["difference"] > 0.65
        and pairs[i - 1]["difference"] < 0.06
        and (i + 2 == len(pairs) or pairs[i + 2]["difference"] < 0.06)
    ]
    sustained: list[dict[str, Any]] = []
    active: list[dict[str, float]] = []
    for pair in [*pairs, {"frame": -1.0, "seconds": -1.0, "difference": 0.0}]:
        if pair["difference"] > 0.65:
            active.append(pair)
        else:
            if len(active) >= 4:
                sustained.append(
                    {
                        "start": active[0]["seconds"],
                        "end": active[-1]["seconds"],
                        "pairs": len(active),
                        "peak": max(p["difference"] for p in active),
                    }
                )
            active = []
    report = {
        "schema": "clio.engineering-motion-scan.v1",
        "video": str(video),
        "probe": probe,
        "adjacentPairs": len(pairs),
        "peakDifferences": sorted(pairs, key=lambda pair: pair["difference"], reverse=True)[:40],
        "isolatedFlickerCandidates": candidates,
        "sustainedDifferenceRuns": sustained,
        "reviewBoundary": "All encoded adjacent pairs were scanned. Candidates require visual classification; these metrics alone do not establish narrative or motion quality.",
    }
    output.write_text(json.dumps(report, indent=2) + "\n", "utf-8")
    statistics.unlink()
    return report


def main() -> None:
    """Write a bounded review receipt beside the final media evidence."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    result = scan_video(args.video, args.out)
    print(
        json.dumps(
            {
                "adjacentPairs": result["adjacentPairs"],
                "flickerCandidates": len(result["isolatedFlickerCandidates"]),
            }
        )
    )


if __name__ == "__main__":
    main()
