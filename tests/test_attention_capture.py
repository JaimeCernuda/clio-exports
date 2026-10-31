"""Validate bundle integrity and exact replay capture over a loopback HTTP service."""

from __future__ import annotations

import hashlib
import json
import struct
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

import pytest
from audit_attention_bundle import audit_bundle
from capture_replay_attention import (
    capture_attention,
    inspection_plan,
    merge_captures,
    replay_aliases,
    selection,
    source_selection,
)


def bundle_fixture(root: Path) -> Path:
    """Write a minimal valid tensor container and its recorded descriptor."""
    path = root / "captures/workflow/tensor.safetensors"
    path.parent.mkdir(parents=True)
    header = json.dumps(
        {"weights": {"dtype": "F32", "shape": [1], "data_offsets": [0, 4]}}
    ).encode()
    raw = struct.pack("<Q", len(header)) + header + struct.pack("<f", 1.0)
    path.write_bytes(raw)
    (root / "flowcept").mkdir()
    descriptor = {
        "uri": "file:///capture/tensor.safetensors",
        "bytes": len(raw),
        "sha256": hashlib.sha256(raw).hexdigest(),
        "tensors": {"weights": {"shape": [1]}},
    }
    (root / "flowcept/decode_attention.json").write_text(
        json.dumps(
            [
                {
                    "workflow_id": "workflow",
                    "attention_stats": descriptor,
                    "used": {"request_id": "call", "num_decode_tokens": 1},
                }
            ]
        ),
        encoding="utf8",
    )
    (root / "metadata.json").write_text("{}", encoding="utf8")
    return path


def test_bundle_integrity_checks_content_and_shape(tmp_path: Path) -> None:
    """Same-size corruption fails SHA, missing bytes fail size, shape lies fail layout."""
    path = bundle_fixture(tmp_path)
    assert audit_bundle(tmp_path)["verified"] == 1
    original = path.read_bytes()
    path.write_bytes(original[:-1] + b"x")
    with pytest.raises(ValueError, match="hash mismatch"):
        audit_bundle(tmp_path)
    path.write_bytes(original[:-1])
    with pytest.raises(ValueError, match="size mismatch"):
        audit_bundle(tmp_path)
    path.write_bytes(original)
    manifest = tmp_path / "flowcept/decode_attention.json"
    tasks = json.loads(manifest.read_text(encoding="utf8"))
    tasks[0]["attention_stats"]["tensors"]["weights"]["shape"] = [2]
    manifest.write_text(json.dumps(tasks), encoding="utf8")
    with pytest.raises(ValueError, match="shape mismatch"):
        audit_bundle(tmp_path)
    tasks[0]["workflow_id"] = "../../outside"
    manifest.write_text(json.dumps(tasks), encoding="utf8")
    with pytest.raises(ValueError, match="escapes"):
        audit_bundle(tmp_path)


def shot_fixture() -> dict[str, Any]:
    """Keep the six-answer recipe source-bound while exercising Unicode offsets."""
    return {
        "source": {"sha256": "source-hash"},
        "attention": {"knownAnswers": ["m0", "m4"]},
        "sessions": [
            {
                "role": "primary",
                "session": {"id": "main"},
                "view": {
                    "messages": [
                        {
                            "id": f"m{i}",
                            "role": "assistant",
                            "blocks": [
                                {
                                    "type": "text",
                                    "id": f"p{i}",
                                    "text": "\nANSWER: 100"
                                    if i == 0
                                    else "\nANSWER: 73; MATCHES\n\nReason 😀",
                                }
                            ],
                        }
                        for i in range(6)
                    ]
                },
            }
        ],
    }


def test_selection_and_alias_identity() -> None:
    """Code point spans bind the entire part, and duplicate aliases are never guessed."""
    assert selection("😀73", "p", 1, 3)["text"] == "73"
    assert (
        selection("😀73", "p", 1, 3)["content_revision"]
        == hashlib.sha256("😀73".encode()).hexdigest()
    )
    with pytest.raises(ValueError):
        selection("73", "p", 0, 3)
    aliases = [
        {"id": "new", "title": "OPAL (replay main)"},
        {"id": "stale", "title": "OPAL (replay main)"},
    ]
    with pytest.raises(ValueError, match="Ambiguous"):
        replay_aliases(aliases, {"main"})
    assert replay_aliases(aliases, {"main"}, {"main": "new"}) == {"main": "new"}
    with pytest.raises(ValueError, match="do not match"):
        replay_aliases(aliases, {"main"}, {"main": "wrong"})
    plan = inspection_plan(shot_fixture())
    assert plan[1]["request"]["text"] == "73"
    assert plan[-1]["request"]["text"].endswith("Reason 😀")
    shot = plan[-1]
    assert (
        source_selection(shot_fixture(), shot["sessionId"], shot["messageId"], shot["request"])
        == shot["request"]["text"]
    )
    with pytest.raises(ValueError, match="source part"):
        source_selection(
            shot_fixture(),
            shot["sessionId"],
            shot["messageId"],
            {**shot["request"], "content_revision": "stale"},
        )


def test_capture_records_real_http_bodies_and_raw_receipts(tmp_path: Path) -> None:
    """Exercise transport, derivative item spans, raw hashes and bounded projection together."""

    class Service(BaseHTTPRequestHandler):
        def log_message(self, format: str, *args: Any) -> None:
            """Silence test-only HTTP access logging."""

        def respond(self, value: Any) -> None:
            """Return a valid JSON response."""
            raw = json.dumps(value).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)

        def do_GET(self) -> None:
            """List an explicitly source-labeled alias."""
            self.respond({"sessions": [{"id": "alias", "title": "OPAL (replay main)"}]})

        def do_POST(self) -> None:
            """Supply native-shaped captured heat and item replies for this test only."""
            body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            if self.path.endswith("/items/export"):
                self.respond({"available": True, "csv": "item,share\n73,0.2"})
            elif self.path.endswith("/items"):
                self.respond({"available": True, "items": [{**body["items"][0], "index": 0}]})
            else:
                self.respond(
                    {
                        "available": True,
                        "selection": body,
                        "blocks": [
                            {
                                "part_id": "source",
                                "runs": [{"start": 0, "end": 1, "intensity": 0.2}],
                            }
                        ],
                        "profile": {"mode": "native"},
                        "tokens": ["retained only in raw"],
                    }
                )

    server = ThreadingHTTPServer(("127.0.0.1", 0), Service)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        captured = capture_attention(
            shot_fixture(), f"http://127.0.0.1:{server.server_port}", tmp_path
        )
    finally:
        server.shutdown()
        server.server_close()
        thread.join()
    assert len(captured["records"]) == 5
    assert len(captured["requests"]) == 10
    for record in captured["records"]:
        raw = (tmp_path / record["rawResponse"]["file"]).read_bytes()
        assert hashlib.sha256(raw).hexdigest() == record["rawResponse"]["sha256"]
        assert "tokens" in json.loads(raw)["response"]
        assert "tokens" not in record["response"]
        assert record["response"]["blocks"]
    with pytest.raises(ValueError, match="local recorded"):
        capture_attention(shot_fixture(), "https://example.com", tmp_path)


def test_merge_preserves_native_selection_and_rejects_changed_evidence() -> None:
    """Rendered and raw text with the same coordinates remain distinct native requests."""
    base: dict[str, Any] = {
        "schema": "clio.replay-attention.v1",
        "sourceSha256": "hash",
        "records": [
            {
                "sessionId": "s",
                "messageId": "m",
                "start": 1,
                "end": 5,
                "text": "**73**",
                "response": {"available": True},
            }
        ],
        "requests": [],
    }
    added: dict[str, Any] = {**base, "records": [{**base["records"][0], "text": "73"}]}
    assert len(merge_captures(base, added)["records"]) == 2
    assert len(merge_captures(base, base)["records"]) == 1
    with pytest.raises(ValueError, match="another source"):
        merge_captures(base, {**added, "sourceSha256": "other"})
    with pytest.raises(ValueError, match="conflicting"):
        merge_captures(
            base, {**base, "records": [{**base["records"][0], "response": {"available": False}}]}
        )
