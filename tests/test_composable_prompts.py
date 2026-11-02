"""Source and provenance checks for the composable-agent social film."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, cast

import pytest
from prepare_composable_prompts import file_receipt, prepare

ROOT = Path(__file__).resolve().parents[1]


def test_real_composer_excerpts_keep_source_identity_and_content_digests() -> None:
    """Every displayed configuration retains its real role and composed-text hash."""
    payload = cast(
        dict[str, Any],
        json.loads((ROOT / "motion/data/composable-prompts.json").read_text("utf-8")),
    )
    assert payload["schema"] == "clio.composable-prompts.v1"
    assert len(payload["snapshots"]) == 7
    for snapshot in payload["snapshots"]:
        prompt, agent = snapshot["prompt"], snapshot["agent"]
        fragments = [
            fragment for section in prompt["sections"] for fragment in section["fragments"]
        ]
        text = "\n\n".join(fragment["text"] for fragment in fragments if fragment["text"])
        assert text == prompt["text"]
        assert hashlib.sha256(text.encode()).hexdigest() == prompt["digest"]
        assert fragments[0]["text"] == f"You are {agent['name']}, {agent['role']}."
        assert not prompt["warnings"]
    files = payload["marketplace"]["files"]
    assert len({file["path"] for file in files}) == len(files)
    assert all(len(file["sha256"]) == 64 and not Path(file["path"]).is_absolute() for file in files)


def test_receipt_preserves_exact_utf8_bytes(tmp_path: Path) -> None:
    """Receipts hash source bytes, including non-ASCII punctuation and newlines."""
    path = tmp_path / "fragment.md"
    content = "Source → prompt\n".encode()
    path.write_bytes(content)
    assert file_receipt(path, tmp_path) == {
        "path": "fragment.md",
        "sha256": hashlib.sha256(content).hexdigest(),
    }


def test_missing_source_fails_before_importing_or_writing(tmp_path: Path) -> None:
    """A missing backend never silently substitutes an invented prompt."""
    with pytest.raises(FileNotFoundError):
        prepare(tmp_path / "backend", tmp_path / "marketplace")
