"""Independent scientific checks, including a numerical ODE cross-check."""

from __future__ import annotations

import importlib.util
import json
import math
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("campaign_science", ROOT / "scripts/science.py")
assert spec and spec.loader
science = importlib.util.module_from_spec(spec)
spec.loader.exec_module(science)


def ode_period(angle: float) -> float:
    """Measure one period from a velocity-Verlet pendulum trajectory."""
    theta = math.radians(angle)
    velocity = 0.0
    dt = 0.0001
    previous = theta
    crossing = None
    for i in range(100000):
        acceleration = -9.80665 * math.sin(theta)
        theta += velocity * dt + 0.5 * acceleration * dt * dt
        velocity += 0.5 * (acceleration - 9.80665 * math.sin(theta)) * dt
        if previous > 0 >= theta and velocity < 0:
            at = (i + previous / (previous - theta)) * dt
            if crossing is not None:
                return at - crossing
            crossing = at
        previous = theta
    raise AssertionError("No complete period measured")


@pytest.mark.parametrize("angle", [5, 30, 60, 85])
def test_quadrature_matches_independent_numerical_trajectory(angle: float) -> None:
    """The plotted period is a physical pendulum calculation, not a curve sketch."""
    assert science.pendulum_period(angle) == pytest.approx(ode_period(angle), rel=1e-6)


def test_source_tables_preserve_all_rows_and_columns() -> None:
    """A missing value remains a missing value when the retained table is reflowed."""
    assert science.rows_of({"columns": {"a": [1, None], "b": ["x", "y"]}}) == [
        {"a": 1, "b": "x"},
        {"a": None, "b": "y"},
    ]


def test_sparse_cell_counts_conserve_matrix_total() -> None:
    """Reconstructed cell columns conserve the count matrix; zeros aren't extra cells."""
    data = json.loads((ROOT / "evidence/genomics.json").read_text())
    assert len(data["cell_totals"]) == data["cells"] == 2753
    assert sum(data["cell_totals"]) == data["total_counts"] == 7441273
    assert len(data["detected_features"]) == data["cells"]


def test_boundary_retains_geodesic_area() -> None:
    """The exact geometry remains tied to the independently measured area."""
    data = json.loads((ROOT / "evidence/science.json").read_text())
    assert data["boundary"]["area_km2"] == pytest.approx(497.7278610831, abs=1e-8)


def test_design_revision_passes_the_recorded_constraint() -> None:
    """The final selected thickness is the first revised candidate that meets the constraint."""
    beam = json.loads((ROOT / "evidence/beam.json").read_text())
    for row in beam["initial"] + beam["revised"]:
        inertia = 0.02 * (row["thickness_mm"] / 1000) ** 3 / 12
        expected = 10 * 0.2**3 / (3 * 70e9 * inertia) * 1000
        assert row["deflection_mm"] == pytest.approx(expected)
    assert beam["initial"][-1]["deflection_mm"] > beam["review"]["limit_mm"]
    assert beam["selected"] == min(
        (row for row in beam["revised"] if row["deflection_mm"] <= 1),
        key=lambda row: row["thickness_mm"],
    )


def test_storm_selection_retains_exact_records_and_peak_times() -> None:
    """The map brush, row reference and answer concern the same twelve NOAA records."""
    storm = json.loads((ROOT / "evidence/hurricane.json").read_text())
    selected = [r for r in storm if -79 <= r["lon"] <= -76 and 25 <= r["lat"] <= 28]
    assert len(selected) == len({r["observation_id"] for r in selected}) == 12
    assert max(r["wind_kt"] for r in selected) == 160
    assert [r["time"][11:16] for r in selected if r["wind_kt"] == 160] == ["16:40", "18:00"]
