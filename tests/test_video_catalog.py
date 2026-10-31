"""Keep video projects and the portable source handoff discoverable and complete."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, cast

from package_motion import package_sources

ROOT = Path(__file__).resolve().parents[1]


def test_catalog_points_to_real_guides_sources_and_compositions() -> None:
    """Every project identifies an existing guide, entrypoint, source map and composition."""
    catalog = cast(dict[str, Any], json.loads((ROOT / "videos/catalog.json").read_text("utf-8")))
    assert catalog["schema"] == "clio.video-projects.v1"
    projects = cast(list[dict[str, Any]], catalog["projects"])
    assert {project["id"] for project in projects} == {
        "ndp",
        "spotter-opal",
        "wordle",
        "engineering",
    }
    registrations = "\n".join(
        (ROOT / filename).read_text("utf-8")
        for filename in (
            "motion/src/Root.tsx",
            "motion/src/wordle-index.tsx",
            "motion/src/engineering-index.tsx",
        )
    )
    for project in projects:
        paths = cast(list[str], [project["guide"], project["entrypoint"], *project["files"]])
        for name in paths:
            path = (ROOT / name).resolve()
            assert path.is_relative_to(ROOT), name
            assert path.is_file(), name
        for composition in cast(list[str], project["compositions"]):
            assert f'"{composition}"' in registrations, composition
    assert (ROOT / catalog["emulatorGuide"]).is_file()


def test_portable_package_contains_guides_and_launch_tools_without_runtime_assets() -> None:
    """A source handoff includes instructions and scripts, excluding local recordings and state."""
    files = {path.relative_to(ROOT).as_posix() for path in package_sources(ROOT)}
    for name in (
        "videos/catalog.json",
        "videos/README.md",
        "videos/ndp/README.md",
        "videos/spotter-opal/README.md",
        "videos/wordle/README.md",
        "videos/engineering/README.md",
        "motion/native/EMULATOR.md",
        "motion/native/MANUAL-ATTENTION.md",
        "tools/launch_attention_replay.py",
    ):
        assert name in files
    assert not any(".native-ui" in Path(name).parts for name in files)
    assert not any(name.startswith("work/") for name in files)
    assert not any(Path(name).suffix in {".mp4", ".safetensors"} for name in files)
