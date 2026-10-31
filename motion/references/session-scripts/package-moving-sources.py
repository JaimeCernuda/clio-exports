"""Preserve exact cached moving actors alongside the editable code package."""

from __future__ import annotations

import hashlib
import json
import zipfile
from pathlib import Path


def main() -> None:
    """Validate the three original movie identities and archive their original bytes."""
    motion = Path("D:/Libraries/Documents/projects/clio-exports/motion")
    output = Path(__file__).resolve().parents[1] / "outputs/ndp-clio-moving-sources.zip"
    actors = {
        "ndp-clio-pitch-v3.mp4": "b95d88d561e301d303eaa6ad11be7c54778d016310fa7d9655ebe066d08388a4",
        "ndp-clio-alta-v1.mp4": "5e82b661b07de897631c8bd6c396a8fd9685af3e2d8b0051a2388341299d097c",
        "ndp-clio-konza-v1.mp4": "6c461dfee4bf4196ae77b711abe30e904359205836bfa7c06e70dbcc8ac265b1",
    }
    records: list[dict[str, str | int]] = []
    temporary = output.with_suffix(".tmp.zip")
    with zipfile.ZipFile(temporary, "w", zipfile.ZIP_STORED) as archive:
        for filename, expected in actors.items():
            source = motion / "out" / filename
            actual = hashlib.file_digest(source.open("rb"), "sha256").hexdigest()
            if actual != expected:
                raise ValueError(f"Unexpected cached actor: {filename}")
            relative = f"clio-editable-ui/motion/out/{filename}"
            archive.write(source, relative)
            records.append({"path": relative, "sha256": actual, "bytes": source.stat().st_size})
        archive.writestr("MOVING-MEDIA-MANIFEST.json", json.dumps(records, indent=2) + "\n")
    with zipfile.ZipFile(temporary) as archive:
        if archive.testzip() is not None:
            raise ValueError("Cached media archive failed its integrity check")
    temporary.replace(output)
    print(json.dumps({"path": str(output), "bytes": output.stat().st_size, "actors": len(records)}))


if __name__ == "__main__":
    main()
