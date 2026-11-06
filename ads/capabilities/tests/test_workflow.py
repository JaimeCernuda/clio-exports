"""Scientific policy checks; actual SDK scheduling is covered by retained native receipts."""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace
from typing import Any

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
def workflow(monkeypatch: pytest.MonkeyPatch) -> Any:
    """Load real mathematical functions, isolating only the unused SDK declaration base."""
    monkeypatch.setitem(sys.modules, "clio_agent", ModuleType("clio_agent"))
    monkeypatch.setitem(sys.modules, "clio_agent.sdk", SimpleNamespace(Flow=object))
    file = ROOT / "product/plugins/campaign-methods/ai.iowarp.clio/flows/burn_workflow.py"
    spec = importlib.util.spec_from_file_location("burn_workflow", file)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_join_and_followup_match_independent_array_calculation(workflow: Any) -> None:
    """The conditional scientific result agrees with an independent covariance implementation."""
    rows = json.loads((ROOT / "evidence/science.json").read_text())["burn"]
    result = workflow.compare_joint_response(workflow.align_minutes(rows))
    x = np.array([r["particle_mean_ug_m3"] for r in rows])
    y = np.array([r["CO2MFd_mean"] for r in rows])
    assert result["correlation"] == pytest.approx(np.corrcoef(x, y)[0, 1])
    assert result["top_ten_overlap"] == len(set(np.argsort(x)[-10:]) & set(np.argsort(y)[-10:]))
    assert workflow.check_coverage(rows)["excluded_wind_records"] == 256


def test_decision_changes_only_when_peak_gap_exceeds_policy(workflow: Any) -> None:
    """Aligned peaks do not request unnecessary work, while a two-minute gap does."""
    a = {"peak": {"timestamp_utc": "2022-04-15T21:41:00+00:00", "local_label": "16:41"}}
    b = {"peak": {"timestamp_utc": "2022-04-15T21:42:00+00:00", "local_label": "16:42"}}
    assert not workflow.compare_reports([a, b, {}])["needs_review"]
    b["peak"]["timestamp_utc"] = "2022-04-15T21:43:00+00:00"
    assert workflow.compare_reports([a, b, {}])["needs_review"]
    with pytest.raises(RuntimeError):
        workflow.compare_reports([a, {"pending": True}, {}])


def test_alignment_rejects_ambiguous_keys_and_incomplete_science(workflow: Any) -> None:
    """Missing/invalid values cannot silently become observations or inflate peak overlap."""
    row = {"timestamp_utc": "2022-04-15T21:41:00+00:00", **dict.fromkeys(workflow.CHANNELS, 1)}
    with pytest.raises(ValueError, match="Duplicate"):
        workflow.align_minutes([row, row])
    invalid = {**row, "CO2MFd_mean": float("nan")}
    assert workflow.align_minutes([invalid, row]) == [row]
    with pytest.raises(ValueError):
        workflow.check_coverage([invalid])
    with pytest.raises(ValueError):
        workflow.compare_joint_response([row])
    with pytest.raises(ValueError, match="constant"):
        workflow.compare_joint_response([row] * 10)
