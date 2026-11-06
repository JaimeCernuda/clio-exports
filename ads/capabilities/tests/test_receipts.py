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
    assert len(tasks) == 6
    assert len({task["child_session_id"] for task in tasks}) == 6
    assert all(task["status"] == "completed" and not task["error_reason"] for task in tasks)
    specialists = [t for t in tasks if t["run_label"] in {"Particles", "CO₂", "Wind / quality"}]
    preparation = [t for t in tasks if t["run_label"] in {"Check coverage", "Align minutes"}]
    review = next(t for t in tasks if t["run_label"] == "Timing review")
    assert len(specialists) == 3 and len(preparation) == 2
    assert max(datetime.fromisoformat(task["created_at"]) for task in specialists) < min(
        datetime.fromisoformat(task["updated_at"]) for task in specialists
    )
    assert max(t["updated_at"] for t in preparation) < min(t["created_at"] for t in specialists)
    assert max(t["updated_at"] for t in specialists) < review["created_at"]
    result = read("workflow.json")
    assert result["comparison"]["needs_review"]
    assert result["comparison"]["separation_minutes"] == 2
    assert result["followup"]["top_ten_overlap"] == 4
    assert result["followup"]["correlation"] == pytest.approx(0.4377377282670324)
    particle = read("execution/team-Particles-flow.json")
    assert particle["status"] == "completed"
    assert particle["result"]["rows"] == 60
    assert particle["result"]["illustrative_bootstrap"]["replicates"] == 500000
    assert particle["result"]["peak"]["local_label"] == result["comparison"]["particle_peak"]
    parent = read("execution/team-parent-flow.json")
    assert len(parent["calls"]) == 6 and parent["status"] == "completed"


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
    computation = next(
        p
        for p in parts("hypothesis")
        if p["type"] == "tool_result" and p["tool_name"] == "compute_pendulum"
    )["metadata"]["result"]
    actual = computation["curve"]
    expected = read("science.json")["pendulum"]
    assert len(actual) == experiment["fields"]["sample_size"] == len(expected) == 46
    for computed, prepared in zip(actual, expected, strict=True):
        assert computed["angle"] == prepared["angle"]
        assert computed["period"] == pytest.approx(prepared["period"], abs=1e-12)


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
    simulation = read("execution/burn-transport-final.json")
    assert (
        sensor["reference"]["stream"]["state"]
        == simulation["reference"]["stream"]["state"]
        == "stopped"
    )
    assert sensor["table"]["columns"]["local_label"][-1].endswith("16:59 CDT")
    actual = simulation["table"]["columns"]["travelled_km"]
    burn = read("science.json")["burn"]
    expected = [
        sum(r["horizontal_speed_mean"] for r in burn[40 : i + 1]) * 0.06 for i in range(40, 60)
    ][-18:]
    assert actual == pytest.approx(expected, abs=1e-12)
    assert (
        simulation["table"]["columns"]["local_label"] == sensor["table"]["columns"]["local_label"]
    )
    assert read("stream-query.json")["streamState"] == "open"
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


def test_selected_records_are_read_by_the_program_that_computes_the_answer() -> None:
    """The answer's maximum and source identity come from the selected NOAA records."""
    source = parts("selection")
    parent = next(p for p in source if p["type"] == "tool_call" and p["tool_name"] == "run_code")
    children = [
        p
        for p in source
        if p["type"] == "tool_call"
        and p.get("metadata", {}).get("parent_call_id") == parent["call_id"]
    ]
    assert [p["tool_name"] for p in children] == ["read_selected_observations"]
    result = next(
        p for p in source if p["type"] == "tool_result" and p["call_id"] == parent["call_id"]
    )
    value = ast.literal_eval(result["metadata"]["result"].splitlines()[0])
    assert value["selected_records"] == 12
    assert value["peak_wind_kt"] == 160
    assert [time[11:16] for time in value["times"]] == ["16:40", "18:00"]
    assert len(value["source_sha256"]) == 64


@pytest.mark.parametrize("name", ["count-analysis", "watch-experiment", "selection-analysis"])
def test_kernel_programs_compile_with_the_real_top_level_await_contract(name: str) -> None:
    """These are kernel submissions, not standalone modules with undefined asynchronous entrypoints."""
    source = (ROOT / "product/requests" / f"{name}.kernel").read_text(encoding="utf-8")
    compile(source, name, "exec", flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
