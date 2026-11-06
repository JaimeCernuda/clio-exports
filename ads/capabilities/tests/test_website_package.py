"""Exercise the actual deployment packager, including refusal of incomplete media."""

from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path
from zipfile import ZipFile

import pytest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("website_package", ROOT / "website/package_site.py")
assert spec and spec.loader
packager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packager)


def deployment(root: Path) -> Path:
    """Create a small deployment fixture inside the isolated test directory."""
    folder = root / "selection/short"
    (folder / "output").mkdir(parents=True)
    media: list[dict[str, str | int]] = []
    for name in ["loop.mp4", "loop.webm", "loop.gif", "poster.png"]:
        data = f"test-only {name}".encode()
        (folder / "output" / name).write_bytes(data)
        media.append({"name": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
    assets = [{"key": "selection-short", "id": "selection", "variant": "short", "files": media}]
    (root / "manifest.json").write_text(json.dumps(assets), encoding="utf-8")
    (root / "verification.json").write_text(
        json.dumps(
            [
                {
                    "key": "selection-short",
                    "files": media,
                    "status": "technical-passed-visual-review-required",
                }
            ]
        ),
        encoding="utf-8",
    )
    for file in [
        folder / "embed.html",
        folder / "README.md",
        folder / "output/manifest.json",
        root / "README.md",
        root / "gallery.html",
        root / "REVIEW.md",
    ]:
        file.write_text("test-only guide", encoding="utf-8")
    return folder


def test_package_retains_relative_embeds_and_exact_media(tmp_path: Path) -> None:
    """The ZIP must preserve paths and media bytes, rather than flattening asset folders."""
    folder = deployment(tmp_path)
    archive = tmp_path / "output/site.zip"
    packager.package_site(tmp_path, archive, expected_assets=1)
    with ZipFile(archive) as zipped:
        assert zipped.testzip() is None
        assert (
            zipped.read("selection/short/output/loop.gif")
            == (folder / "output/loop.gif").read_bytes()
        )
        assert "selection/short/embed.html" in zipped.namelist()
        assert not any(name.endswith(".tsx") for name in zipped.namelist())


def test_changed_or_incomplete_media_cannot_replace_valid_handoff(tmp_path: Path) -> None:
    """A failed package must leave the previous validated handoff untouched."""
    folder = deployment(tmp_path)
    archive = tmp_path / "output/site.zip"
    packager.package_site(tmp_path, archive, expected_assets=1)
    before = archive.read_bytes()
    (folder / "output/loop.gif").write_bytes(b"corrupt-test-only")
    with pytest.raises(ValueError, match="Changed deployment file"):
        packager.package_site(tmp_path, archive, expected_assets=1)
    assert archive.read_bytes() == before
    with pytest.raises(ValueError, match="Expected 16"):
        packager.package_site(tmp_path, archive)


def test_unreviewed_replacement_cannot_be_packaged(tmp_path: Path) -> None:
    """Even valid media needs an identity-matched review receipt."""
    deployment(tmp_path)
    (tmp_path / "verification.json").write_text("[]", encoding="utf-8")
    with pytest.raises(ValueError, match="Missing matching technical review"):
        packager.package_site(tmp_path, tmp_path / "output/site.zip", expected_assets=1)
