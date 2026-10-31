"""Import only the selected engineering exports; never execute exported HTML."""

from __future__ import annotations

import argparse
import base64
import gzip
import json
import re
import shutil
import zipfile
import zlib
from pathlib import Path
from typing import Any

from index_exports import sha256_file
from prepare_native_scene import read_value, select_session_record

SELECTED = {
    "E4_cantilever_parameter_sweep.html": "conversations",
    "E5_topology_optimization_studio.html": "conversations",
    "E4_cantilever_parameter_sweep_dashboard_2.html": "dashboards",
    "E4b_smoothed_designs_dashboard.html": "dashboards",
    "E5_topology_optimization_studio_dashboard.html": "dashboards",
}


def import_bundle(source: Path, output: Path) -> dict[str, Any]:
    """Extract exact allowlisted members and preserve their source hashes and native projections."""
    output.mkdir(parents=True, exist_ok=True)
    records: list[dict[str, Any]] = []
    seen: set[str] = set()
    with zipfile.ZipFile(source) as archive:
        for item in archive.infolist():
            name = Path(item.filename).name
            category = SELECTED.get(name)
            if category is None:
                continue
            if name in seen or Path(item.filename).parent.name != category:
                raise ValueError(f"Ambiguous selected archive member: {item.filename}")
            seen.add(name)
            target = output / category / name
            target.parent.mkdir(parents=True, exist_ok=True)
            if target.exists():
                crc = 0
                with target.open("rb") as stream:
                    while block := stream.read(1024 * 1024):
                        crc = zlib.crc32(block, crc)
                if target.stat().st_size != item.file_size or crc != item.CRC:
                    raise ValueError(
                        f"Existing original differs from the supplied archive: {target}"
                    )
            else:
                with archive.open(item) as incoming, target.open("wb") as outgoing:
                    shutil.copyfileobj(incoming, outgoing)
            if category == "dashboards":
                match = re.search(
                    rb'window\.CLIO_DASHBOARD_DATA="([A-Za-z0-9+/=]+)"', target.read_bytes()
                )
                if match is None:
                    raise ValueError(f"No native dashboard payload: {target}")
                payload = json.loads(gzip.decompress(base64.b64decode(match[1], validate=True)))
                if not isinstance(payload, dict) or not {"report", "snapshot"} <= payload.keys():
                    raise ValueError(f"Invalid dashboard export: {target}")
                (output / f"{target.stem}.data.json").write_text(json.dumps(payload), "utf-8")
            else:
                session = select_session_record(target, None)
                view = read_value(target, "transcript_views." + session["id"])
                (output / f"{target.stem}.root-view.json").write_text(json.dumps(view), "utf-8")
            records.append(
                {
                    "path": str(target.relative_to(output)),
                    "bytes": item.file_size,
                    "sha256": sha256_file(target),
                }
            )
    if seen != SELECTED.keys():
        raise ValueError(f"Missing selected exports: {SELECTED.keys() - seen}")
    receipt = {
        "schema": "clio.engineering-import.v1",
        "archive": str(source),
        "sha256": sha256_file(source),
        "files": records,
    }
    (output / "source-import.json").write_text(json.dumps(receipt, indent=2) + "\n", "utf-8")
    return receipt


def main() -> None:
    """Import the supplied ZIP onto the project drive, with no OS-drive fallback."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--out", type=Path, default=Path("motion/.native-ui/engineering-inputs"))
    args = parser.parse_args()
    project = Path(__file__).resolve().parents[1]
    if args.out.resolve().drive.lower() != project.drive.lower():
        parser.error("Keep imported engineering work on the project drive")
    receipt = import_bundle(args.source, args.out)
    print(json.dumps({"imported": len(receipt["files"]), "archiveSha256": receipt["sha256"]}))


if __name__ == "__main__":
    main()
