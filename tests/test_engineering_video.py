"""Protect the genuine-source selection and native engineering report transformations."""

import copy
import json
import re
from pathlib import Path
from typing import Any

import pytest
from prepare_engineering_video import (
    editorial_scene,
    excerpt,
    nearby_tools,
    reflow_report,
    scheduler_evidence,
)
from test_engineering_sketch import fixture


def test_excerpts_are_contiguous_source_spans() -> None:
    """A shortened source passage cannot silently become new dialogue."""
    original = "This is the captured first sentence. " * 30
    result = excerpt(original, 180)
    assert original.startswith(result)
    assert result.endswith(".")
    assert excerpt("A short real reply.", 180) == "A short real reply."


def test_tool_selection_does_not_cross_another_public_reply(tmp_path: Path) -> None:
    """Only the actual tool after a requested explanation belongs to that beat."""
    blocks: list[dict[str, Any]] = [
        {"id": "a", "type": "text"},
        {"id": "tool", "type": "tool", "tool_id": "real"},
        {"id": "b", "type": "text"},
        {"id": "c", "type": "text"},
        {"id": "later", "type": "tool", "tool_id": "unrelated"},
    ]
    (tmp_path / "run.root-view.json").write_text(
        json.dumps({"messages": [{"blocks": blocks}]}), "utf-8"
    )
    assert nearby_tools(tmp_path, "run", ["a", "b"]) == {"real"}


@pytest.mark.parametrize("kind", ["sweep", "studio"])
def test_film_reflow_keeps_real_assets_and_native_selection_bindings(kind: str) -> None:
    """Film layouts retain meshes and do not add a fabricated Run or iteration control."""
    source = fixture("e4" if kind == "sweep" else "e5")
    if kind == "studio":
        source["report"]["definition"]["components"].extend(
            {"id": identity, "component": "clio.mesh-viewport.v1", "meshUri": "artifact://real"}
            for identity in ("v9s", "hq", "hb")
        )
    result = reflow_report(source, kind)
    components = {c["id"]: c for c in result["report"]["definition"]["components"]}
    assert result["snapshot"] == source["snapshot"]
    if kind == "sweep":
        assert len(components["matrix"]["children"]) == 12
        assert all(components[f"c{n:02}"]["height"] >= 160 for n in range(1, 13))
    else:
        assert components["resViews"]["children"] == ["v1", "histChart"]
        assert "unitless" in components["v9s"]["title"]


def test_standalone_film_copy_has_complete_prose_and_explicit_time_budgets() -> None:
    """Broken list prefixes, internal experiment aliases and repair chatter stay out of film copy."""
    script = json.loads(Path("motion/story/engineering-film-copy.json").read_text("utf-8"))
    assert script["revision"] == "standalone-v2"
    for run, seconds in (("e4", 109.5), ("e5", 62)):
        assert sum(b["seconds"] for b in script[run]["blocks"].values()) == seconds
        for block in script[run]["blocks"].values():
            if "text" in block:
                text = block["text"]
                assert not re.search(r"\bE[1-5][ab]?\b|KeyError|failed|not proven", text)
                assert not re.search(r"(?m)^\s*(?:\d+\.|\|)", text)
                assert text.endswith(".")
    assert "live_call_9a7fa5e2e7e0_call" not in script["e4"]["blocks"]


def test_editorial_scene_retains_original_copy_and_rejects_failed_calls() -> None:
    """Editing a display is explicit and cannot erase or upgrade the source failure."""
    scene: dict[str, Any] = {
        "session": {"title": "E4"},
        "view": {
            "messages": [
                {
                    "blocks": [
                        {"id": "text", "text": "Real source.\n1. An item\n2.", "type": "text"},
                        {"id": "call", "type": "tool", "tool_id": "actual"},
                    ]
                }
            ],
            "tools": [
                {
                    "id": "actual",
                    "title": "Bash",
                    "state": "succeeded",
                    "input": {"command": "a long exact source script"},
                    "presentation": {
                        "blocks": [
                            {
                                "id": "terminal",
                                "type": "terminal",
                                "command": "a long exact source script",
                            }
                        ]
                    },
                }
            ],
        },
    }
    script = {
        "title": "Parameter study",
        "blocks": {
            "text": {"text": "A complete source-grounded passage."},
            "call": {"tool": "actual", "title": "Check the inputs"},
        },
    }
    before = copy.deepcopy(scene)
    result = editorial_scene(scene, script)
    assert scene == before
    assert result["editorial"]["changes"][0]["sourceText"].endswith("2.")
    assert result["view"]["tools"][0]["state"] == "succeeded"
    assert result["view"]["tools"][0]["input"]["command"] == "a long exact source script"
    assert "command" not in result["view"]["tools"][0]["presentation"]["blocks"][0]
    scene["view"]["tools"][0]["state"] = "failed"
    with pytest.raises(ValueError, match="failed call"):
        editorial_scene(scene, script)


def test_scheduler_states_are_read_from_complete_captured_checks() -> None:
    """The time-lapse preserves observed task states and rejects a missing case."""
    identities = [
        "call_cf161d543394",
        "call_945013eb6482",
        "call_466eba64f0b6",
        "call_7cb59c803d27",
    ]
    states = [
        "16435955_[2-12] PENDING (Resources)\n16435955_1 RUNNING node",
        "\n".join(f"16435955_{n} {'RUNNING' if n < 10 else 'PENDING'} node" for n in range(1, 13)),
        "\n".join(
            f"c{n:02} 16435955_{n} {'COMPLETED' if n < 12 else 'RUNNING'}" for n in range(1, 13)
        ),
        "\n".join(f"c{n:02} 16435955_{n} COMPLETED" for n in range(1, 13)),
    ]
    view: dict[str, Any] = {
        "tools": [
            {
                "id": identity,
                "started_at": "2026-10-22T22:28:03-05:00",
                "completed_at": f"2026-10-22T22:{minute:02}:18-05:00",
                "output": {
                    "structuredContent": {
                        "result": {"result": {"structuredContent": {"stdout": stdout}}}
                    }
                },
            }
            for identity, stdout, minute in zip(identities, states, (28, 30, 49, 51), strict=True)
        ]
    }
    result = scheduler_evidence(view)
    assert [o["states"].count("COMPLETED") for o in result["observations"]] == [0, 0, 11, 12]
    assert result["observations"][-1]["elapsedSeconds"] == 1395
    view["tools"][-1]["output"]["structuredContent"]["result"]["result"]["structuredContent"][
        "stdout"
    ] = ""
    with pytest.raises(ValueError, match="Incomplete"):
        scheduler_evidence(view)
