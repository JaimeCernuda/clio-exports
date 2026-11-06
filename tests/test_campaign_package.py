"""Campaign handoffs retain editable source without walking generated runtime trees."""

from __future__ import annotations

import json
from pathlib import Path

from package_motion import package_sources


def test_campaign_sources_exclude_generated_state_but_include_selected_evidence(
    tmp_path: Path,
) -> None:
    """Non-movie runtime files are just as important to omit as movie intermediates."""
    (tmp_path / "motion").mkdir()
    (tmp_path / "motion/package-manifest.json").write_text(
        json.dumps({"files": [], "motionFiles": [], "directories": ["ads"]}), encoding="utf-8"
    )
    for name in [
        "src/scene.tsx",
        "evidence/source.json",
        ".cache/runtime/private.json",
        "output/manifest.json",
        "review/frame.png",
        "node_modules/dependency/index.js",
    ]:
        target = tmp_path / "ads/capabilities" / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(
            "selected" if name.startswith(("src/", "evidence/")) else "generated", encoding="utf-8"
        )
    assert {p.relative_to(tmp_path).as_posix() for p in package_sources(tmp_path)} == {
        "ads/capabilities/src/scene.tsx",
        "ads/capabilities/evidence/source.json",
    }
