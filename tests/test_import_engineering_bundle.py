"""Exercise the real bounded ZIP and native-export import path."""

import base64
import gzip
import json
import zipfile
from pathlib import Path
from typing import Any

import pytest
from import_engineering_bundle import SELECTED, import_bundle


def archive_bytes(kind: str) -> bytes:
    """Build an actual compressed export envelope for importer tests."""
    payload: dict[str, Any] = (
        {"report": {"id": "saved"}, "snapshot": {"responses": {}}}
        if kind == "dashboards"
        else {
            "transcript": {"session": {"id": "real-session"}},
            "transcript_views": {
                "real-session": {"messages": [{"id": "real-message"}], "tools": []}
            },
        }
    )
    variable = "CLIO_DASHBOARD_DATA" if kind == "dashboards" else "CLIO_EXPORT_DATA"
    encoded = base64.b64encode(gzip.compress(json.dumps(payload).encode(), mtime=0))
    return b"<script>window." + variable.encode() + b'="' + encoded + b'";</script>'


def test_import_reads_real_envelopes_preserves_originals_and_rejects_changed_copies(
    tmp_path: Path,
) -> None:
    """The import is repeatable and cannot overwrite an altered source copy."""
    source = tmp_path / "sessions.zip"
    with zipfile.ZipFile(source, "w") as archive:
        for name, kind in SELECTED.items():
            archive.writestr(f"CLIO demo/{kind}/{name}", archive_bytes(kind))
        archive.writestr("unrelated/ignore.html", b"Not part of this story")
    original = source.read_bytes()
    output = tmp_path / "imported"
    first = import_bundle(source, output)
    assert len(first["files"]) == 5
    assert source.read_bytes() == original
    assert import_bundle(source, output) == first
    native = json.loads((output / "E4_cantilever_parameter_sweep.root-view.json").read_text())
    assert native["messages"][0]["id"] == "real-message"
    target = output / "conversations/E4_cantilever_parameter_sweep.html"
    target.write_bytes(b"Changed source")
    with pytest.raises(ValueError, match="Existing original differs"):
        import_bundle(source, output)
    assert target.read_bytes() == b"Changed source"


def test_missing_exports_fail_explicitly(tmp_path: Path) -> None:
    """A partial download cannot silently produce an incomplete film source."""
    source = tmp_path / "empty.zip"
    with zipfile.ZipFile(source, "w"):
        pass
    with pytest.raises(ValueError, match="Missing selected exports"):
        import_bundle(source, tmp_path / "imported")
