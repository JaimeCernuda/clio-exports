"""Exercise decoding, indexing and selection against archives and isolated test fixtures."""

from __future__ import annotations

import base64
import gzip
import json
from pathlib import Path
from typing import Any

import pytest
from decode_export import decode_export
from export_stream import ExportStream, payload_chunks
from index_exports import index_export, sha256_file, write_catalog
from select_reading import select_reading

ROOT = Path(__file__).resolve().parents[1]


def write_archive(path: Path, payload: bytes) -> Path:
    """Write a native-format archive fixture without using application implementations."""
    encoded = base64.b64encode(gzip.compress(payload, mtime=0))
    path.write_bytes(b'<html><script>window.CLIO_EXPORT_DATA="' + encoded + b'";</script>')
    return path


def session(identity: str, parent: str | None = None) -> dict[str, Any]:
    """Build a small transcript fixture containing a genuine schema-shaped message/tool."""
    return {
        "export_schema": "clio.session-export.v2",
        "session": {"id": identity, "title": identity, "parent_session_id": parent},
        "messages": [
            {
                "id": "message-" + identity,
                "role": "assistant",
                "parts": [
                    {"id": "part-" + identity, "type": "text", "text": "# Result\n" + "x" * 2500}
                ],
                "stop_reason": "end_turn",
            }
        ],
        "tool_records": [
            {
                "call_id": "call-" + identity,
                "tool": "fs_read_file",
                "status": "completed",
                "input": {"path": "design/real.md"},
            }
        ],
        "children": [],
    }


@pytest.mark.parametrize("chunk_size", [1, 2, 3, 7, 23, 65536])
def test_chunk_boundaries_and_bounded_reads(tmp_path: Path, chunk_size: int) -> None:
    """Decode Unicode across marker, base64 and gzip boundaries and honor requested reads."""
    payload = json.dumps({"text": "CLIO \u2192 caf\u00e9" * 1000}, ensure_ascii=False).encode()
    archive = write_archive(tmp_path / "export.html", payload)
    assert b"".join(payload_chunks(archive, chunk_size)) == payload
    stream = ExportStream(archive, chunk_size)
    assert stream.read(0) == b""
    chunks: list[bytes] = []
    while chunk := stream.read(17):
        assert len(chunk) <= 17
        chunks.append(chunk)
    assert b"".join(chunks) == payload
    stream.close()


@pytest.mark.parametrize(
    "content",
    [
        b"missing",
        b'window.CLIO_EXPORT_DATA="!!!!"',
        b'window.CLIO_EXPORT_DATA="H4sI"',
        b'window.CLIO_EXPORT_DATA="AAAA',
    ],
)
def test_invalid_payload_preserves_destination(tmp_path: Path, content: bytes) -> None:
    """Bad input must fail explicitly and leave an existing decoded file intact."""
    archive, destination = tmp_path / "bad.html", tmp_path / "decoded.json"
    archive.write_bytes(content)
    destination.write_bytes(b"preserved")
    with pytest.raises((ValueError, OSError)):
        decode_export(archive, destination)
    assert destination.read_bytes() == b"preserved"
    assert not list(tmp_path.glob("*.partial"))


def test_invalid_sizes_and_overwrite_protection(tmp_path: Path) -> None:
    """Reject unbounded reads, zero-size chunks and accidental source replacement."""
    archive = write_archive(tmp_path / "export.html", b"{}")
    with pytest.raises(ValueError):
        list(payload_chunks(archive, 0))
    stream = ExportStream(archive)
    with pytest.raises(ValueError):
        stream.read(-1)
    stream.close()
    with pytest.raises(ValueError):
        decode_export(archive, archive)
    destination = tmp_path / "decoded.json"
    decode_export(archive, destination, 7)
    assert destination.read_bytes() == b"{}"


def test_nested_index_and_preview_bounds(tmp_path: Path) -> None:
    """Preserve nested identities, source pointers, headings and bounded excerpts."""
    root, child, grandchild = session("root"), session("child", "root"), session("grand", "child")
    child["children"] = [grandchild]
    root["children"] = [child]
    archive = write_archive(tmp_path / "export.html", json.dumps({"transcript": root}).encode())
    index = index_export(archive, tmp_path)
    assert index["rootSessionId"] == "root"
    assert [item["id"] for item in index["sessions"]] == ["root", "child", "grand"]
    assert index["sessions"][2]["parent_session_id"] == "child"
    excerpt = index["sessions"][1]["messages"][0]["excerpts"][0]
    assert len(excerpt["text"]) == 2400 and excerpt["truncated"]
    assert excerpt["headings"] == ["Result"]
    assert excerpt["partId"] == "part-child"
    assert index["sessions"][1]["tools"][0]["path"] == "design/real.md"
    assert index["source"]["sha256"] == sha256_file(archive)


def test_part_key_order_does_not_change_evidence(tmp_path: Path) -> None:
    """JSON key order cannot drop text or attach a previous part's identity."""
    root = session("root")
    root["messages"][0]["parts"] = [
        {"text": "# Actual result", "id": "actual-part", "type": "text"},
        {"text": "not a visible text part", "id": "reasoning-part", "type": "reasoning"},
    ]
    archive = write_archive(tmp_path / "export.html", json.dumps({"transcript": root}).encode())
    message = index_export(archive, tmp_path)["sessions"][0]["messages"][0]
    assert message["text_chars"] == len("# Actual result")
    assert [part["partId"] for part in message["excerpts"]] == ["actual-part"]


def test_partial_refresh_keeps_other_catalog_entries(tmp_path: Path) -> None:
    """Refreshing one session must retain the rest of the growing collection."""
    for name in ("first", "second"):
        archive = write_archive(
            tmp_path / f"{name}.html", json.dumps({"transcript": session(name)}).encode()
        )
        index = index_export(archive, tmp_path)
        (tmp_path / f"{name}.json").write_text(json.dumps(index), encoding="utf-8")
    (tmp_path / "catalog.json").write_text("[]", encoding="utf-8")
    assert [item["rootSessionId"] for item in write_catalog(tmp_path)] == ["first", "second"]


@pytest.mark.parametrize("failure", ["schema", "duplicate", "missing"])
def test_reject_unsupported_identity_and_schema(tmp_path: Path, failure: str) -> None:
    """Indexing must reject unusable evidence instead of creating ambiguous records."""
    root = session("root")
    if failure == "schema":
        root["export_schema"] = "unknown"
    elif failure == "duplicate":
        root["children"] = [session("root", "root")]
    else:
        del root["session"]["id"]
    archive = write_archive(tmp_path / "export.html", json.dumps({"transcript": root}).encode())
    with pytest.raises(ValueError):
        index_export(archive, tmp_path)


def test_index_stops_before_viewer_assets(tmp_path: Path) -> None:
    """A large trailing viewer region must not be parsed to select transcript evidence."""
    payload = b'{"transcript":' + json.dumps(session("root")).encode()
    payload += b',"embedded_assets":' + b" " * 200000 + b"THIS IS NOT JSON}"
    archive = write_archive(tmp_path / "export.html", payload)
    assert index_export(archive, tmp_path)["rootSessionId"] == "root"


def test_real_reading_selection_has_exact_evidence_links() -> None:
    """The authored scene must select exact saved messages, parts, agents and tool calls."""
    index = json.loads((ROOT / "motion/evidence/reading-guide.json").read_text(encoding="utf-8"))
    selection = select_reading(index)
    saved = json.loads((ROOT / "motion/data/parallel-reading.json").read_text(encoding="utf-8"))
    assert selection == saved
    sessions = {item["id"]: item for item in index["sessions"]}
    assert len(selection["agents"]) == 10
    assert selection["prompt"]["displayText"] in selection["prompt"]["fullText"]
    for agent in selection["agents"]:
        original = sessions[agent["id"]]
        assert original["parent_session_id"] == selection["rootSessionId"]
        assert agent["tools"] == original["tools"]
        assert agent["excerpt"] == original["messages"][-1]["excerpts"][-1]
        assert agent["terminalMessageId"] == original["messages"][-1]["id"]
        assert agent["stopReason"] == "end_turn"


@pytest.mark.parametrize("folder", ["delegation", "studies"])
def test_original_archive_checksums(folder: str) -> None:
    """Authoring must leave every published archive byte-for-byte unchanged."""
    directory = ROOT / folder
    for line in (directory / "SHA256SUMS").read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        digest, name = line.split(maxsplit=1)
        assert sha256_file(directory / name.lstrip("*")) == digest
