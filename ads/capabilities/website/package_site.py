"""Build a checksummed, deployment-only website handoff without external ZIP tools."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import TypedDict, cast
from zipfile import ZIP_DEFLATED, ZipFile


class MediaFile(TypedDict):
    """A rendered deployment file and its recorded identity."""

    name: str
    bytes: int
    sha256: str


class Asset(TypedDict):
    """Fields required from a website render manifest."""

    key: str
    id: str
    variant: str
    files: list[MediaFile]


class Verification(TypedDict):
    """Review identity used to prevent packaging an unchecked replacement."""

    key: str
    files: list[MediaFile]
    status: str


def package_site(root: Path, destination: Path, expected_assets: int = 16) -> dict[str, str]:
    """Validate every media identity before atomically replacing the deployment archive."""
    root = root.resolve()
    assets = cast(list[Asset], json.loads((root / "manifest.json").read_text(encoding="utf-8")))
    if len(assets) != expected_assets or len({a["key"] for a in assets}) != expected_assets:
        raise ValueError(f"Expected {expected_assets} distinct, complete website placements")
    checks = cast(
        list[Verification], json.loads((root / "verification.json").read_text(encoding="utf-8"))
    )
    checked = {check["key"]: check for check in checks}
    entries: dict[str, Path] = {}
    for asset in assets:
        check = checked.get(asset["key"])
        if (
            not check
            or check["files"] != asset["files"]
            or not check["status"].startswith("technical-passed")
        ):
            raise ValueError(f"Missing matching technical review for {asset['key']}")
        relative = Path(asset["id"]) / asset["variant"]
        folder = (root / relative).resolve()
        if not folder.is_relative_to(root) or asset["variant"] not in {"short", "long"}:
            raise ValueError("Asset path escapes the website root")
        files = asset["files"]
        if {f["name"] for f in files} != {"loop.mp4", "loop.webm", "loop.gif", "poster.png"}:
            raise ValueError(f"Incomplete deployment formats for {asset['key']}")
        for media in files:
            file = folder / "output" / media["name"]
            data = file.read_bytes()
            if len(data) != media["bytes"] or hashlib.sha256(data).hexdigest() != media["sha256"]:
                raise ValueError(f"Changed deployment file: {asset['key']}/{media['name']}")
            entries[(relative / "output" / media["name"]).as_posix()] = file
        for name in ["embed.html", "README.md"]:
            file = folder / name
            if not file.is_file():
                raise ValueError(f"Missing integration guide {file}")
            entries[(relative / name).as_posix()] = file
        entries[(relative / "output/manifest.json").as_posix()] = folder / "output/manifest.json"
    for name in ["README.md", "manifest.json", "verification.json", "gallery.html", "REVIEW.md"]:
        entries[name] = root / name
    # Validate guide existence before creating even a partial replacement.
    for file in entries.values():
        if not file.is_file():
            raise ValueError(f"Missing handoff file {file}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(".partial.zip")
    try:
        with ZipFile(temporary, "w", compression=ZIP_DEFLATED, compresslevel=1) as archive:
            for name, file in sorted(entries.items()):
                archive.write(file, name)
            archive.writestr(
                "START-HERE.txt",
                "Serve this folder with any static web server. Open gallery.html.\n"
                "Copy an asset folder (including output/) to use its embed.html.\n"
                "Use MP4/WebM for websites; GIF is an image-only fallback.\n"
                "Editable rendering source: github.com/JaimeCernuda/clio-exports, "
                "ads/capabilities/website/. This archive contains deployment files.\n",
            )
        with ZipFile(temporary) as archive:
            bad = archive.testzip()
            if bad:
                raise ValueError(f"Archive integrity failure: {bad}")
        temporary.replace(destination)
    finally:
        temporary.unlink(missing_ok=True)
    return {
        "path": str(destination),
        "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
        "files": str(len(entries) + 1),
        "bytes": str(destination.stat().st_size),
    }


if __name__ == "__main__":
    website = Path(__file__).resolve().parent
    result = package_site(website, website / "output/clio-capabilities-website.zip")
    (website / "handoff.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
