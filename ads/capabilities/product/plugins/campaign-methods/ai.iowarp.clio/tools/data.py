"""Real bounded reads of the campaign's scientific files."""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import h5py
from clio_agent.sdk import tool
from clio_agent.tools.execution import get_active_tool_workspace_root


@tool(read_only=True)
def read_count_component(component: str) -> dict[str, Any]:
    """Read one CSC component from the workspace's public gene-count matrix."""
    if component not in {"shape", "data", "indptr", "indices"}:
        raise ValueError("Read a known sparse-matrix component")
    root = Path(get_active_tool_workspace_root() or ".")
    with h5py.File(root / "gene-counts.h5", "r") as source:
        matrix = source["matrix"]
        if not isinstance(matrix, h5py.Group):
            raise TypeError("The gene-count matrix is not an HDF5 group")
        column = matrix[component]
        if not isinstance(column, h5py.Dataset):
            raise TypeError("The requested CSC component is not an HDF5 dataset")
        data = column[:]
    return {"component": component, "values": data.tolist(), "length": len(data)}


@tool(read_only=True)
def read_dataset_record() -> dict[str, Any]:
    """Read the retained dataset DOI, source URL, and source checksum."""
    root = Path(get_active_tool_workspace_root() or ".")
    return json.loads((root / "dataset-record.json").read_text())


@tool(read_only=True)
def read_selected_observations() -> dict[str, Any]:
    """Read the retained NOAA records identified by the user's geographic selection."""
    root = Path(get_active_tool_workspace_root() or ".")
    data = json.loads((root / "selected-storm.json").read_text())
    if not data.get("rows"):
        raise ValueError("The selected record set is empty")
    return data


def _period(angle_deg: float) -> float:
    """Compute the nonlinear period by complete elliptic-integral quadrature."""
    k2 = math.sin(math.radians(angle_deg) / 2) ** 2
    n, step = 4096, math.pi / 8192
    values = [1 / math.sqrt(1 - k2 * math.sin(i * step) ** 2) for i in range(n + 1)]
    integral = (
        step / 3 * (values[0] + values[-1] + 4 * sum(values[1:-1:2]) + 2 * sum(values[2:-1:2]))
    )
    return 4 * math.sqrt(1 / 9.80665) * integral


@tool(read_only=True)
def compute_pendulum(angle_deg: float) -> dict[str, Any]:
    """Record the complete angle sweep and requested result in one real tool call."""
    from clio_agent.gact import context
    from clio_agent.gact.artifacts.observer_bridge import current_call_id

    if not 0 <= angle_deg <= 90:
        raise ValueError("The campaign experiment covers release angles from 0 to 90 degrees")
    period = _period(angle_deg)
    prediction = 2 * math.pi * math.sqrt(1 / 9.80665)
    return {
        "period": period,
        "prediction": prediction,
        "difference_pct": (period / prediction - 1) * 100,
        "curve": [
            {"angle": angle, "period": _period(angle), "prediction": prediction}
            for angle in range(0, 91, 2)
        ],
        "source_call": f"call:{context.active_session_id()}/{current_call_id()}",
    }
