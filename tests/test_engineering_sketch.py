"""Verify source-preserving engineering dashboard reflow."""

import base64
import gzip
import json
from copy import deepcopy
from pathlib import Path
from typing import Any

import pytest
from index_exports import sha256_file
from prepare_engineering_sketch import curate_report, prepare


def fixture(kind: str) -> dict[str, Any]:
    """Make a small catalog-shaped source for transformation tests."""
    identifiers = (
        ["root", "matrix", "inspView", "tableFrame", "inspFrame", "caseTable"]
        + [f"c{n:02}" for n in range(1, 13)]
        if kind == "e4"
        else [
            "root",
            "tMesh",
            "fMc",
            "tSetup",
            "tRes",
            "resViews",
            "v1",
            "histChart",
            "tSaved",
            "savedT",
        ]
    )
    components: list[dict[str, Any]] = [
        {"id": identity, "component": "Column", "meshUri": "artifact://real"}
        for identity in identifiers
    ]
    if kind == "e4":
        components[5]["columns"] = [
            {"key": key}
            for key in [
                "case",
                "volume_fraction",
                "filter_radius",
                "compliance_final",
                "runtime",
                "node",
            ]
        ]
    definition = {"components": components, "data_model": {"threshold": 0.5}}
    return {
        "report": {
            "definition": definition,
            "surface": {"messages": [{"updateComponents": {"components": deepcopy(components)}}]},
        },
        "snapshot": {"artifacts": {"real": {"base64": "AA=="}}},
    }


@pytest.mark.parametrize("kind", ["e4", "e5"])
def test_reflow_preserves_originals_dependencies_and_both_definitions(kind: str) -> None:
    """Changing layout never changes original bytes, data or artifact identities."""
    original = fixture(kind)
    before = deepcopy(original)
    result = curate_report(original, kind)
    assert original == before
    assert result["snapshot"] == original["snapshot"]
    for key, value in original["report"]["definition"]["data_model"].items():
        assert result["report"]["definition"]["data_model"][key] == value
    components = result["report"]["definition"]["components"]
    assert (
        components == result["report"]["surface"]["messages"][0]["updateComponents"]["components"]
    )
    assert all(c["meshUri"] == "artifact://real" for c in components)
    by_id = {c["id"]: c for c in components}
    if kind == "e4":
        assert by_id["matrix"]["columns"] == 3
        assert len(by_id["matrix"]["children"]) == 6
        assert len([key for key in by_id if key.startswith("c") and key[1:].isdigit()]) == 12
    else:
        assert by_id["resViews"]["children"] == ["v1", "histChart"]
        assert not any(c.get("label") == "Iteration slider" for c in components)


def test_unknown_report_is_an_error() -> None:
    """Unknown kinds cannot silently produce an incomplete sketch."""
    with pytest.raises(ValueError, match="Unknown report kind"):
        curate_report(fixture("e4"), "other")


def test_prepare_decodes_real_export_envelope_and_keeps_source_order(tmp_path: Path) -> None:
    """Exercise the compressed export decoder, bounded selection and disk handoff together."""
    source = tmp_path / "conversations/E4_cantilever_parameter_sweep.html"
    source.parent.mkdir()
    payload = {"transcript": {"export_schema": "clio.session-export.v2", "session": {"id": "root"}}}
    encoded = base64.b64encode(gzip.compress(json.dumps(payload).encode(), mtime=0))
    source.write_bytes(b'<script>window.CLIO_EXPORT_DATA="' + encoded + b'";</script>')
    digest = sha256_file(source)
    ids = [
        "part_9bf7633cb257",
        "live_call_23277d5d44c4_call",
        "part_96e693507d0f",
        "live_call_3f18681336ca_call",
        "part_fb6ffff07447",
        "live_call_91db385f0ba0_call",
        "part_cc9122f681de",
        "part_509df9b4aea1",
    ]
    blocks: list[dict[str, Any]] = []
    tools: list[dict[str, Any]] = []
    for identity in ids:
        block: dict[str, Any] = {"id": identity, "type": "text", "text": "Captured public text"}
        if identity.startswith("live_"):
            call = identity.removeprefix("live_").removesuffix("_call")
            block = {"id": identity, "type": "tool", "tool_id": call}
            tools.append({"id": call, "state": "completed"})
        blocks.append(block)
    blocks.insert(2, {"id": "excluded", "type": "reasoning", "text": "Unselected source passage"})
    view = {"messages": [{"id": "message", "role": "assistant", "blocks": blocks}], "tools": tools}
    (tmp_path / "E4_cantilever_parameter_sweep.root-view.json").write_text(
        json.dumps(view), "utf-8"
    )
    for kind, filename in [
        ("e4", "E4_cantilever_parameter_sweep_dashboard_2.data.json"),
        ("e5", "E5_topology_optimization_studio_dashboard.data.json"),
    ]:
        report = fixture(kind)
        report["snapshot"]["sessions"] = {"root": []}
        (tmp_path / filename).write_text(json.dumps(report), "utf-8")
    receipt = prepare(tmp_path, tmp_path / "out")
    scene = json.loads((tmp_path / "out/engineering-scene.json").read_text("utf-8"))
    assert receipt["blocks"] == ids
    assert [block["id"] for block in scene["view"]["messages"][0]["blocks"]] == ids
    assert scene["source"]["sha256"] == digest == sha256_file(source)
    assert len(scene["view"]["tools"]) == 3
    assert scene["snapshot"]["artifacts"] == {"real": {"base64": "AA=="}}
    assert receipt["liveJobs"] is False
    view["messages"][0]["blocks"] = blocks[:-1]
    (tmp_path / "E4_cantilever_parameter_sweep.root-view.json").write_text(
        json.dumps(view), "utf-8"
    )
    with pytest.raises(ValueError, match="Missing native blocks"):
        prepare(tmp_path, tmp_path / "invalid")
