"""Integration checks against retained real CLIO execution, not generated success flags."""

from __future__ import annotations

import ast
import json
from datetime import datetime
from pathlib import Path
from typing import Any

import pytest

ROOT = Path(__file__).resolve().parents[1]


def read(name: str) -> Any:
    """Load an independently retained execution receipt."""
    return json.loads((ROOT / "evidence" / name).read_text(encoding="utf-8"))


def parts(film: str) -> list[dict[str, Any]]:
    """Flatten source messages while retaining the native tool-call records."""
    return [
        part
        for message in read(f"execution/{film}-messages.json")["messages"]
        for part in message["parts"]
    ]


def test_specialist_assignments_really_overlap_and_all_finish() -> None:
    """Concurrent cards require actual overlapping child tasks, not staggered serial calls."""
    tasks = read("execution/team-children.json")["tasks"]
    assert len(tasks) == 3
    assert len({task["child_session_id"] for task in tasks}) == 3
    assert all(task["status"] == "completed" and not task["error_reason"] for task in tasks)
    assert max(datetime.fromisoformat(task["created_at"]) for task in tasks) < min(
        datetime.fromisoformat(task["updated_at"]) for task in tasks
    )


def test_ptc_child_reads_join_the_actual_program_and_conserve_counts() -> None:
    """Four scientific reads belong to the completed program that produced the pictured result."""
    source = parts("tools")
    parent = next(p for p in source if p["type"] == "tool_call" and p["tool_name"] == "run_code")
    children = [
        p
        for p in source
        if p["type"] == "tool_call"
        and p.get("metadata", {}).get("parent_call_id") == parent["call_id"]
    ]
    assert len(children) == 4
    assert sorted(p["tool_name"] for p in children) == ["read_count_component"] * 3 + [
        "read_dataset_record"
    ]
    result = next(
        p for p in source if p["type"] == "tool_result" and p["call_id"] == parent["call_id"]
    )
    text = result["metadata"]["result"].splitlines()[0]
    value = ast.literal_eval(text)
    matrix = read("genomics.json")
    assert value["cells"] == matrix["cells"]
    assert value["median_counts"] == matrix["median_counts"]
    assert value["total_counts"] == sum(matrix["cell_totals"])
    assert value["source"] == "10.5281/zenodo.14884845"


def test_science_log_records_an_evidenced_revision() -> None:
    """A refuted hypothesis and finished experiment must be linked to native tool provenance."""
    entries = read("science-log.json")["entries"]
    hypothesis = next(e for e in entries if e["type"] == "hypothesis")
    experiment = next(e for e in entries if e["type"] == "experiment")
    observation = next(e for e in entries if e["type"] == "observation")
    assert hypothesis["status"] == "refuted"
    assert experiment["status"] == "done"
    assert observation["fields"]["from_calls"]
    assert all(
        m["source"]["call"].startswith("call:") for m in observation["fields"]["measurements"]
    )


def test_live_window_evolves_while_background_code_survives_the_first_answer() -> None:
    """Native snapshots prove live query access, bounded retention, and an eventual genuine stop."""
    snapshots = read("execution/stream-snapshots.json")
    opened = [s for s in snapshots if s["reference"]["stream"]["state"] == "open"]
    assert len(opened) > 10
    assert len({tuple(s["table"]["columns"]["local_label"]) for s in opened}) > 10
    assert all(s["table"]["returnedRows"] <= 18 for s in snapshots)
    code = [t for t in read("execution/streams-tasks.json")["tasks"] if t["kind"] == "Code"]
    assert len(code) == 1 and code[0]["status"] == "completed"
    sensor = read("execution/burn-observations-final.json")
    simulation = read("execution/pendulum-simulation-final.json")
    assert (
        sensor["reference"]["stream"]["state"]
        == simulation["reference"]["stream"]["state"]
        == "stopped"
    )
    assert sensor["table"]["columns"]["local_label"][-1].endswith("16:59 CDT")
    actual = simulation["table"]["columns"]["angle_rad"]
    expected = [r["angle_rad"] for r in read("science.json")["simulation"]][-18:]
    assert actual == pytest.approx(expected, abs=1e-12)
    queries = [
        p
        for p in parts("streams")
        if p["type"] == "tool_call"
        and p.get("metadata", {}).get("parent_call_id")
        and p["tool_name"] == "read_stream"
    ]
    assert len(queries) == 1
    notifications = [
        p
        for p in parts("streams")
        if p["type"] == "injection" and "clio.code.notify" in p.get("text", "")
    ]
    assert notifications and "completed" in notifications[0]["text"]


@pytest.mark.parametrize("name", ["count-analysis", "watch-experiment"])
def test_kernel_programs_compile_with_the_real_top_level_await_contract(name: str) -> None:
    """These are kernel submissions, not standalone modules with undefined asynchronous entrypoints."""
    source = (ROOT / "product/requests" / f"{name}.kernel").read_text(encoding="utf-8")
    compile(source, name, "exec", flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
