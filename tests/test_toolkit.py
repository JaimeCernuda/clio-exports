"""Verify reusable selection, delivery checks and portable source handoffs."""

from __future__ import annotations

import copy
import hashlib
import json
import re
import subprocess
import sys
import zipfile
from fractions import Fraction
from pathlib import Path
from typing import Any

import pytest
from package_motion import package_motion, package_sources
from select_session import SelectionSpec, select_session
from verify_video import VideoSpec, check_metadata, verify_video

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
def reading_index() -> dict[str, Any]:
    """Load the real compact index without copying or executing the original HTML."""
    return json.loads((ROOT / "motion/evidence/reading-guide.json").read_text(encoding="utf-8"))


def test_generic_selection_is_bounded_and_source_linked(reading_index: dict[str, Any]) -> None:
    """A general recipe must retain exact identities and content while bounding render inputs."""
    selection = select_session(reading_index, SelectionSpec(tool_limit=3, prompt_sentences=1))
    sessions = {session["id"]: session for session in reading_index["sessions"]}
    assert len(selection["agents"]) == 10
    assert selection["prompt"]["fullText"].startswith(selection["prompt"]["displayText"])
    assert selection["prompt"]["displayText"].endswith("folder.")
    for agent in selection["agents"]:
        original = sessions[agent["id"]]
        assert agent["tools"] == original["tools"][:3]
        assert agent["toolRecordCount"] == len(original["tools"])
        assert agent["toolsTruncated"] == (len(original["tools"]) > 3)
        assert agent["excerpt"] == original["messages"][-1]["excerpts"][-1]


def test_subsets_and_pending_children_remain_honest(reading_index: dict[str, Any]) -> None:
    """A still-running child must not acquire a manufactured response or terminal status."""
    child = reading_index["sessions"][1]
    child["messages"] = []
    selection = select_session(reading_index, SelectionSpec(child_ids=(child["id"],)))
    assert len(selection["agents"]) == 1
    agent = selection["agents"][0]
    assert agent["excerpt"] is None and agent["stopReason"] is None
    assert agent["terminalMessageId"] is None
    assert selection["selectedAgentId"] == child["id"]


@pytest.mark.parametrize(
    "spec",
    [
        SelectionSpec(session_id="missing"),
        SelectionSpec(child_ids=("missing",)),
        SelectionSpec(selected_agent_id="missing"),
        SelectionSpec(prompt_message_id="missing"),
        SelectionSpec(result_message_id="missing"),
        SelectionSpec(max_agents=1),
    ],
)
def test_bad_selection_fails_instead_of_substituting_data(
    reading_index: dict[str, Any], spec: SelectionSpec
) -> None:
    """Explicit source requests must not fall back to unrelated content."""
    with pytest.raises(ValueError):
        select_session(reading_index, spec)


def test_selection_without_children_and_truncated_prompt(reading_index: dict[str, Any]) -> None:
    """Single-session shots work; an incomplete indexed prompt cannot be called full text."""
    selection = select_session(reading_index, SelectionSpec(child_ids=()))
    assert selection["agents"] == [] and selection["selectedAgentId"] is None
    root = reading_index["sessions"][0]
    prompt = next(message for message in root["messages"] if message["role"] == "user")
    prompt["excerpts"][0]["truncated"] = True
    with pytest.raises(ValueError, match="truncated"):
        select_session(reading_index, SelectionSpec())


@pytest.mark.parametrize(
    "values",
    [
        {"tool_limit": 0},
        {"max_agents": 0},
        {"prompt_sentences": 0},
        {"child_ids": ("same", "same")},
    ],
)
def test_invalid_selection_limits(values: dict[str, Any]) -> None:
    """Reject invalid bounds at the API boundary."""
    with pytest.raises(ValueError):
        SelectionSpec(**values)


def test_generic_selector_cli(tmp_path: Path, reading_index: dict[str, Any]) -> None:
    """Another agent can run the documented CLI with an index outside the current directory."""
    index, output = tmp_path / "input.json", tmp_path / "data/selected.json"
    index.write_text(json.dumps(reading_index), encoding="utf-8")
    subprocess.run(
        [
            sys.executable,
            str(ROOT / "tools/select_session.py"),
            str(index),
            "--out",
            str(output),
            "--tool-limit",
            "2",
        ],
        check=True,
        capture_output=True,
    )
    selected = json.loads(output.read_text(encoding="utf-8"))
    assert selected["rootSessionId"] == reading_index["rootSessionId"]
    assert all(len(agent["tools"]) <= 2 for agent in selected["agents"])


@pytest.fixture
def metadata() -> dict[str, Any]:
    """Minimal valid FFprobe output for focused mismatch tests."""
    return {
        "streams": [
            {
                "codec_type": "video",
                "codec_name": "h264",
                "width": 320,
                "height": 180,
                "pix_fmt": "yuv420p",
                "avg_frame_rate": "60/1",
                "r_frame_rate": "60/1",
                "nb_read_frames": "12",
                "duration": "0.2",
            }
        ],
        "format": {"duration": "0.2"},
    }


@pytest.mark.parametrize(
    "field,value",
    [
        ("width", 1920),
        ("height", 1080),
        ("avg_frame_rate", "30/1"),
        ("r_frame_rate", "30/1"),
        ("nb_read_frames", "11"),
        ("pix_fmt", "yuvj420p"),
        ("codec_name", "vp9"),
        ("duration", "0.5"),
    ],
)
def test_video_mismatches_are_failures(metadata: dict[str, Any], field: str, value: Any) -> None:
    """Resolution, timing, codec and pixel-format mismatches cannot pass verification."""
    metadata["streams"][0][field] = value
    with pytest.raises(ValueError):
        check_metadata(metadata, VideoSpec(320, 180, frames=12))


def test_audio_and_multiple_stream_policies(metadata: dict[str, Any]) -> None:
    """Audio requirements are explicit per film and extra video tracks are rejected."""
    with pytest.raises(ValueError, match="audio"):
        check_metadata(metadata, VideoSpec(320, 180, audio="present"))
    metadata["streams"].append({"codec_type": "audio"})
    assert check_metadata(metadata, VideoSpec(320, 180, audio="present"))["audioStreams"] == 1
    with pytest.raises(ValueError, match="audio"):
        check_metadata(metadata, VideoSpec(320, 180, audio="absent"))
    metadata["streams"].append(copy.deepcopy(metadata["streams"][0]))
    with pytest.raises(ValueError, match="one video"):
        check_metadata(metadata, VideoSpec(320, 180))


def test_video_verifier_with_real_encoder_and_corrupt_file(tmp_path: Path) -> None:
    """Exercise actual FFmpeg/FFprobe, not a fake verifier implementation."""
    path = tmp_path / "real.mp4"
    subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "color=c=white:s=320x180:r=60",
            "-frames:v",
            "12",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-an",
            str(path),
        ],
        check=True,
        capture_output=True,
    )
    assert (
        verify_video(path, VideoSpec(320, 180, Fraction(60), 12, "absent"))["fullDecode"]
        == "passed"
    )
    path.write_bytes(b"invalid mp4")
    with pytest.raises(subprocess.CalledProcessError):
        verify_video(path, VideoSpec(320, 180))


def test_source_package_contains_portable_skills_and_matching_hashes(tmp_path: Path) -> None:
    """A handoff includes the actual kit and skills while omitting archives/dependencies/renders."""
    output = tmp_path / "kit.zip"
    result = package_motion(ROOT, output)
    with zipfile.ZipFile(output) as archive:
        names = archive.namelist()
        assert "clio-editable-ui/motion/src/ui/index.ts" in names
        assert "clio-editable-ui/.agents/skills/clio-motion-scenes/SKILL.md" in names
        assert "clio-editable-ui/.agents/skills/clio-videos/SKILL.md" in names
        assert "clio-editable-ui/.agents/skills/clio-videos/references/lessons.md" in names
        assert "clio-editable-ui/motion/scripts/review-connected.ts" in names
        assert "clio-editable-ui/motion/scripts/review-joins.ts" in names
        assert "clio-editable-ui/tools/verify_video.py" in names
        assert "clio-editable-ui/motion/native/workspace.tsx" in names
        assert "clio-editable-ui/motion/native/public/tahoe.native.json" in names
        assert "clio-editable-ui/tools/prepare_native_scene.py" in names
        assert "clio-editable-ui/motion/story/ndp-connected.json" in names
        assert "clio-editable-ui/motion/story/RESEARCH.md" in names
        assert "clio-editable-ui/motion/scripts/assemble-story.ts" in names
        assert "clio-editable-ui/motion/scripts/compose-cursor.ts" in names
        assert "clio-editable-ui/motion/native/cursor-plan.ts" in names
        assert "clio-editable-ui/motion/src/CursorComposite.tsx" in names
        assert "clio-editable-ui/motion/native/recorded-chart-layout.tsx" in names
        assert not any(
            name.endswith(".html")
            and any(f"/{folder}/" in name for folder in ("ndp", "delegation", "studies"))
            for name in names
        )
        assert not any(
            "/node_modules/" in name or "/out/" in name or "/.native-ui/" in name for name in names
        )
        manifest = json.loads(archive.read("clio-editable-ui/SOURCE-MANIFEST.json"))
        assert result["files"] == len(manifest)
        for record in manifest:
            content = archive.read("clio-editable-ui/" + record["path"])
            assert content == (ROOT / record["path"]).read_bytes()
            assert hashlib.sha256(content).hexdigest() == record["sha256"]


def test_package_manifest_cannot_read_outside_repository(tmp_path: Path) -> None:
    """A future manifest edit cannot silently include another workspace's files."""
    repo = tmp_path / "repo"
    (repo / "motion").mkdir(parents=True)
    (tmp_path / "outside.txt").write_text("outside", encoding="utf-8")
    (repo / "motion/package-manifest.json").write_text(
        json.dumps({"files": ["../outside.txt"], "directories": [], "motionFiles": []}),
        encoding="utf-8",
    )
    with pytest.raises(ValueError):
        package_sources(repo)


def test_package_destination_cannot_contaminate_its_sources() -> None:
    """Reject output locations that would be included as input on the next packaging run."""
    with pytest.raises(ValueError, match="outside source"):
        package_motion(ROOT, ROOT / "motion/src/not-created.zip")
    with pytest.raises(ValueError, match=".zip"):
        package_motion(ROOT, ROOT / "motion/out/not-created.txt")


def test_skill_references_are_portable_and_resolve() -> None:
    """Every local skill reference must resolve from a checkout without machine-specific paths."""
    skills = list((ROOT / ".agents/skills").glob("*/SKILL.md"))
    assert {skill.parent.name for skill in skills} == {
        "clio-videos",
        "clio-motion-stack",
        "clio-motion-scenes",
        "clio-motion-review",
    }
    for skill in (ROOT / ".agents/skills").rglob("*.md"):
        for reference in re.findall(r"\[[^]]+\]\(([^)]+)\)", skill.read_text(encoding="utf-8")):
            if "://" in reference:
                continue
            resolved = (skill.parent / reference.split("#")[0]).resolve()
            assert resolved.is_relative_to(ROOT) and resolved.is_file(), reference
