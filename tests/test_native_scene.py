"""Validate native projection preservation and the real Tahoe dependency bundle."""

from __future__ import annotations

import base64
import copy
import gzip
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest
from prepare_native_scene import prepare_native_scene, read_value, register_scene

ROOT = Path(__file__).resolve().parents[1]


def archive_payload() -> dict[str, Any]:
    """Return an isolated test archive with interleaved native conversation blocks."""
    return {
        "transcript": {
            "export_schema": "clio.session-export.v2",
            "session": {"id": "root", "title": "Test"},
            "tool_records": [{"output": "raw ledger must not enter a native scene"}],
        },
        "transcript_views": {
            "root": {
                "messages": [
                    {
                        "id": "m1",
                        "session_id": "root",
                        "blocks": [
                            {
                                "id": "p1",
                                "type": "text",
                                "text": "Commentary",
                                "channel": "commentary",
                            },
                            {"id": "p2", "type": "tool", "tool_id": "t1"},
                            {"id": "p3", "type": "a2ui", "surface_id": "s1"},
                            {"id": "p4", "type": "text", "text": "**Answer**", "channel": "answer"},
                            {"id": "p5", "type": "artifact", "artifact_id": "a1"},
                        ],
                    }
                ],
                "tools": [{"id": "t1", "duration_ms": 12.5, "presentation": {"title": "Read"}}],
                "artifacts": [{"id": "a1", "name": "figure.png"}],
            }
        },
        "snapshot": {
            "sessions": {"root": [{"id": "s1", "messages": [{"component": "Map"}]}]},
            "responses": [{"url": "/saved", "body": {"data": [1, 2, 3]}}],
            "tables": {},
            "failures": [],
        },
    }


def write_archive(path: Path, payload: dict[str, Any]) -> Path:
    """Write a compressed native-format fixture for exercising the real decoder."""
    encoded = base64.b64encode(gzip.compress(json.dumps(payload).encode(), mtime=0))
    path.write_bytes(b'<script>window.CLIO_EXPORT_DATA="' + encoded + b'";</script>')
    return path


def test_native_projection_is_preserved(tmp_path: Path) -> None:
    """Keep channels, block order, tool presentation and saved dependencies unchanged."""
    payload = archive_payload()
    source = write_archive(tmp_path / "native.html", payload)
    scene = prepare_native_scene(source)
    assert scene["view"] == payload["transcript_views"]["root"]
    assert scene["snapshot"] == payload["snapshot"]
    assert scene["session"] == payload["transcript"]["session"]
    assert scene["coverage"] == {
        "messages": 1,
        "tools": 1,
        "surfaces": 1,
        "artifacts": 1,
        "snapshotFailures": [],
    }
    encoded = json.dumps(scene)
    assert "12.5" in encoded
    assert "raw ledger" not in encoded
    assert "transcript" not in scene


@pytest.mark.parametrize("failure", ["schema", "session", "message", "tool", "artifact", "surface"])
def test_reject_ambiguous_native_identities(tmp_path: Path, failure: str) -> None:
    """Do not create an apparently usable scene from ambiguous or dangling evidence."""
    payload = archive_payload()
    view = payload["transcript_views"]["root"]
    if failure == "schema":
        payload["transcript"]["export_schema"] = "unknown"
    elif failure == "session":
        view["messages"][0]["session_id"] = "other"
    elif failure == "message":
        view["messages"].append(view["messages"][0])
    elif failure in {"tool", "artifact"}:
        key = "tools" if failure == "tool" else "artifacts"
        view[key].append(view[key][0])
    else:
        payload["snapshot"]["sessions"]["root"] = []
    with pytest.raises(ValueError):
        prepare_native_scene(write_archive(tmp_path / "bad.html", payload))


def test_missing_object_and_unknown_session(tmp_path: Path) -> None:
    """Unknown sessions and missing dependencies must fail explicitly."""
    source = write_archive(tmp_path / "test.html", archive_payload())
    with pytest.raises(ValueError, match="No exported session record"):
        prepare_native_scene(source, "child")
    with pytest.raises(ValueError, match="no snapshot.missing"):
        read_value(source, "snapshot.missing")


@pytest.mark.parametrize("native_json", [False, True])
def test_select_nested_session_without_fabricating_a_user_message(
    tmp_path: Path, native_json: bool
) -> None:
    """HTML and full JSON exports both support a nested assistant-only session."""
    payload = archive_payload()
    child = {"id": "child", "title": "Actual child", "parent_session_id": "root"}
    grandchild = {"id": "grandchild", "title": "Nested child", "parent_session_id": "child"}
    payload["transcript"]["children"] = [{"session": child, "children": [{"session": grandchild}]}]
    child_view = copy.deepcopy(payload["transcript_views"]["root"])
    child_view["messages"][0].update({"session_id": "grandchild", "role": "assistant"})
    payload["transcript_views"]["grandchild"] = child_view
    payload["snapshot"]["sessions"]["grandchild"] = payload["snapshot"]["sessions"]["root"]
    if native_json:
        source = tmp_path / "native.json"
        source.write_text(json.dumps(payload), encoding="utf-8")
    else:
        source = write_archive(tmp_path / "native.html", payload)
    scene = prepare_native_scene(source, "grandchild")
    assert scene["session"] == grandchild
    assert scene["view"] == child_view
    assert scene["view"]["messages"][0]["role"] == "assistant"
    assert len(scene["view"]["messages"]) == 1


def test_register_scenes_and_reject_unsafe_catalog_outputs(tmp_path: Path) -> None:
    """Keep unrelated catalog entries and replace a scene by its local file path."""
    scene = prepare_native_scene(write_archive(tmp_path / "source.html", archive_payload()))
    catalog = tmp_path / "public/scenes.json"
    output = catalog.parent / "new-session.native.json"
    register_scene(catalog, output, scene)
    register_scene(catalog, catalog.parent / "other.native.json", scene)
    scene["session"]["title"] = "Updated title"
    register_scene(catalog, output, scene)
    values = json.loads(catalog.read_text(encoding="utf-8"))["scenes"]
    assert len(values) == 2
    assert values[-1] == {
        "file": "new-session.native.json",
        "title": "Updated title",
        "sessionId": "root",
    }
    before = catalog.read_bytes()
    for rejected in [catalog, tmp_path / "outside.json", catalog.parent / "wrong.html"]:
        with pytest.raises(ValueError):
            register_scene(catalog, rejected, scene)
        assert catalog.read_bytes() == before
    catalog.write_text('{"schema":"unknown","scenes":[]}', encoding="utf-8")
    with pytest.raises(ValueError, match="scene-catalog"):
        register_scene(catalog, output, scene)


def test_projection_surfaces_are_used_when_snapshot_has_no_session(tmp_path: Path) -> None:
    """Match the native renderer's fallback to projection surfaces."""
    payload = archive_payload()
    payload["transcript_views"]["root"]["surfaces"] = payload["snapshot"]["sessions"].pop("root")
    source = write_archive(tmp_path / "native.html", payload)
    assert prepare_native_scene(source)["coverage"]["surfaces"] == 1


def test_empty_recorded_session_remains_empty(tmp_path: Path) -> None:
    """A valid new session does not need fabricated conversation content."""
    payload = archive_payload()
    payload["transcript_views"]["root"]["messages"] = []
    scene = prepare_native_scene(write_archive(tmp_path / "empty.html", payload))
    assert scene["view"]["messages"] == []
    assert scene["coverage"]["messages"] == 0


def test_native_cli_and_source_protection(tmp_path: Path) -> None:
    """Exercise portable file generation and prevent overwriting source evidence."""
    source = write_archive(tmp_path / "test.html", archive_payload())
    output = tmp_path / "scene.json"
    script = str(ROOT / "tools/prepare_native_scene.py")
    result = subprocess.run(
        [sys.executable, script, str(source), "--out", str(output)], capture_output=True, check=True
    )
    assert json.loads(result.stdout)["tools"] == 1
    assert json.loads(output.read_text(encoding="utf-8"))["view"]["tools"][0]["duration_ms"] == 12.5
    before = source.read_bytes()
    rejected = subprocess.run(
        [sys.executable, script, str(source), "--out", str(source)],
        capture_output=True,
        check=False,
    )
    assert rejected.returncode != 0
    assert source.read_bytes() == before
    invalid_output = tmp_path / "invalid.txt"
    rejected_extension = subprocess.run(
        [sys.executable, script, str(source), "--out", str(invalid_output)],
        capture_output=True,
        check=False,
    )
    assert rejected_extension.returncode != 0
    assert not invalid_output.exists()


def test_tahoe_real_projection_and_dependencies() -> None:
    """Lock the three real exchanges, four rich views and ten source artifact identities."""
    scene = json.loads(
        (ROOT / "motion/native/public/tahoe.native.json").read_text(encoding="utf-8")
    )
    assert (
        scene["source"]["sha256"]
        == "e5f762a73eaa749738780b095a24133cec08d8d125c81bd24ecfc8c3bda0dbf4"
    )
    assert scene["session"]["id"] == "sess_9cca40f4085e"
    assert scene["coverage"] == {
        "messages": 6,
        "tools": 110,
        "surfaces": 4,
        "artifacts": 10,
        "snapshotFailures": [],
    }
    messages = scene["view"]["messages"]
    assert [message["role"] for message in messages] == ["user", "assistant"] * 3
    assert [messages[i]["id"] for i in [0, 2, 4]] == [
        "a359ea79-4c95-4063-89a8-f345ed58c687",
        "2a8625f6-7d4f-4c6e-953a-06473215e6a3",
        "825e7fe2-000d-4768-815b-e022be022f63",
    ]
    assert [surface["id"] for surface in scene["snapshot"]["sessions"][scene["session"]["id"]]] == [
        "tahoe-boundary-map",
        "tahoe-area-method-figure",
        "tahoe-shoreline-resolution",
        "tahoe-shoreline-detail-figure",
    ]
    for message in messages[1::2]:
        assert any(block["type"] == "tool" for block in message["blocks"])
        assert any(block["type"] == "artifact" for block in message["blocks"])
    assert len(scene["snapshot"]["tables"]) == 1
    assert len(scene["snapshot"]["responses"]) == 12


def test_other_real_sessions_reuse_the_same_native_schema() -> None:
    """A different parent and assistant-only child load as source data, not new UI code."""
    parent = json.loads(
        (ROOT / "motion/native/public/reading-guide.native.json").read_text(encoding="utf-8")
    )
    child = json.loads(
        (ROOT / "motion/native/public/reading-child.native.json").read_text(encoding="utf-8")
    )
    assert (
        parent["source"]["sha256"]
        == child["source"]["sha256"]
        == "bd505defbd060f243d7a7da315621fdc4e13d97a612d6a0f4e94c28c19d1837a"
    )
    assert parent["coverage"]["messages"] == 2 and parent["coverage"]["tools"] == 15
    assert child["coverage"]["messages"] == 1 and child["coverage"]["tools"] == 28
    assert child["session"]["parent_session_id"] == parent["session"]["id"]
    assert [message["role"] for message in child["view"]["messages"]] == ["assistant"]
