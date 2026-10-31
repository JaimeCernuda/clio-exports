"""Package the maintained motion kit, repo-local skills and small evidence without raw archives."""

from __future__ import annotations

import argparse
import hashlib
import json
import tempfile
import zipfile
from pathlib import Path
from typing import Any

EXCLUDED = {"__pycache__", ".pytest_cache", ".ruff_cache", "node_modules", ".venv"}
MOVIE_SUFFIXES = {".mp4", ".webm", ".mov", ".mkv", ".m4v", ".avi"}


def package_sources(repository: Path) -> list[Path]:
    """Resolve the explicit package manifest and reject links outside the repository."""
    repository = repository.resolve()
    manifest = json.loads((repository / "motion/package-manifest.json").read_text(encoding="utf-8"))
    files = [repository / value for value in manifest["files"]]
    files += [repository / "motion" / value for value in manifest["motionFiles"]]
    for value in manifest["directories"]:
        directory = repository / value
        if not directory.is_dir():
            raise FileNotFoundError(directory)
        files.extend(
            path
            for path in directory.rglob("*")
            if path.is_file()
            and not EXCLUDED.intersection(path.relative_to(repository).parts)
            and path.suffix.lower() not in MOVIE_SUFFIXES
        )
    for path in files:
        path.resolve().relative_to(repository)
        if not path.is_file():
            raise FileNotFoundError(path)
    return sorted(set(files))


def package_motion(repository: Path, destination: Path) -> dict[str, Any]:
    """Create an atomic ZIP with per-file hashes and enough selected evidence to render."""
    repository = repository.resolve()
    destination = destination.resolve()
    manifest = json.loads((repository / "motion/package-manifest.json").read_text(encoding="utf-8"))
    if destination.suffix.lower() != ".zip":
        raise ValueError("Source package output must end in .zip")
    if any(
        destination.is_relative_to((repository / value).resolve())
        for value in manifest["directories"]
    ):
        raise ValueError("Write the package outside source directories, such as motion/out/")
    sources = package_sources(repository)
    if destination in {path.resolve() for path in sources}:
        raise ValueError("The package must not overwrite a source file")
    destination.parent.mkdir(parents=True, exist_ok=True)
    records: list[dict[str, Any]] = []
    with tempfile.TemporaryDirectory(dir=destination.parent) as directory:
        temporary = Path(directory) / "source.zip"
        with zipfile.ZipFile(temporary, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for path in sources:
                content = path.read_bytes()
                relative = path.relative_to(repository).as_posix()
                archive.writestr("clio-editable-ui/" + relative, content)
                records.append(
                    {
                        "path": relative,
                        "bytes": len(content),
                        "sha256": hashlib.sha256(content).hexdigest(),
                    }
                )
            archive.writestr("clio-editable-ui/SOURCE-MANIFEST.json", json.dumps(records, indent=2))
            archive.writestr(
                "clio-editable-ui/PACKAGE.txt",
                "Reusable CLIO UI motion toolkit. See motion/README.md.\n"
                "Run npm ci then npm run studio inside motion/.\n"
                "For the native investigation film, see motion/native/FILM.md.\n"
                "For session import/preview, see motion/native/README.md.\n"
                "It requires the pinned clean gact-tui source checkout and its pnpm dependencies.\n"
                "The older ClioProof composition was rejected for UI fidelity.\n"
                "Selected evidence is included; large original HTML archives are omitted.\n"
                "To re-index, overlay this package on https://github.com/jaimecernuda/clio-exports\n"
                "Repo-local skills are in .agents/skills; any agent can read their SKILL.md files.\n",
            )
        with zipfile.ZipFile(temporary) as archive:
            if archive.testzip() is not None:
                raise ValueError("The source ZIP failed its integrity check")
        temporary.replace(destination)
    return {"path": str(destination), "files": len(records), "bytes": destination.stat().st_size}


def main() -> None:
    """Build a portable source handoff from this repository's maintained manifest."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=Path("motion/out/clio-motion-toolkit.zip"))
    args = parser.parse_args()
    print(json.dumps(package_motion(Path(__file__).resolve().parents[1], args.out)))


if __name__ == "__main__":
    main()
