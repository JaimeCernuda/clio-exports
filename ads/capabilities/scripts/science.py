"""Recompute the quantities pictured in the ads from retained scientific data."""

from __future__ import annotations

import hashlib
import json
import math
import urllib.request
from itertools import pairwise
from pathlib import Path
from typing import Any

import h5py
import numpy as np
from pyproj import Geod

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "evidence"
DATASET_URL = (
    "https://zenodo.org/records/14884845/files/pbmc3k_filtered_feature_bc_matrix.h5?download=1"
)


def pendulum_period(angle_deg: float, length: float = 1.0, gravity: float = 9.80665) -> float:
    """Integrate the complete elliptic integral by Simpson quadrature (radians)."""
    k2 = math.sin(math.radians(angle_deg) / 2) ** 2
    n = 4096
    step = math.pi / (2 * n)
    values = [1 / math.sqrt(1 - k2 * math.sin(i * step) ** 2) for i in range(n + 1)]
    integral = (
        step / 3 * (values[0] + values[-1] + 4 * sum(values[1:-1:2]) + 2 * sum(values[2:-1:2]))
    )
    return 4 * math.sqrt(length / gravity) * integral


def rows_of(table: dict[str, Any]) -> list[dict[str, Any]]:
    """Convert retained column-oriented table data without inventing missing rows."""
    columns = table["columns"]
    count = len(next(iter(columns.values())))
    return [{key: values[i] for key, values in columns.items()} for i in range(count)]


def prepare() -> dict[str, Any]:
    """Build reproducible numerical results and compact data for editable scenes."""
    angles = list(range(0, 91, 2))
    small = 2 * math.pi * math.sqrt(1 / 9.80665)
    pendulum = [{"angle": a, "period": pendulum_period(a), "prediction": small} for a in angles]
    boundary_bytes = (EVIDENCE / "boundary.geojson").read_bytes()
    boundary = json.loads(boundary_bytes)
    polygon = boundary["features"][0]["geometry"]["coordinates"][0]
    longitude, latitude = zip(*[(point[0], point[1]) for point in polygon], strict=True)
    area, perimeter = Geod(ellps="WGS84").polygon_area_perimeter(longitude, latitude)
    alta = json.loads((EVIDENCE / "alta.json").read_text())
    konza = json.loads((EVIDENCE / "konza.json").read_text())
    pair_rows = rows_of(konza["tables"][1])
    pairs = [r for r in pair_rows if isinstance(r["CO2MFd_mean"], (float, int))]
    correlation = float(
        np.corrcoef([r["particle_mean_ug_m3"] for r in pairs], [r["CO2MFd_mean"] for r in pairs])[
            0, 1
        ]
    )
    minute_rows = rows_of(konza["tables"][0])
    minute_rows = [
        r for r in minute_rows if r["date_local"] == "2022-04-15" and 16 <= r["local_hour"] < 17
    ]
    result = {
        "pendulum": pendulum,
        "pendulum_60": {
            "period": pendulum_period(60),
            "prediction": small,
            "difference_pct": (pendulum_period(60) / small - 1) * 100,
        },
        "boundary": {
            "area_km2": abs(area) / 1e6,
            "perimeter_km": perimeter / 1e3,
            "polygon": polygon,
            "sha256": hashlib.sha256(boundary_bytes).hexdigest(),
        },
        "snowfall": rows_of(alta["tables"][1]),
        "burn": minute_rows,
        "burn_summary": {"paired_minutes": len(pairs), "correlation": correlation},
    }
    theta, velocity, elapsed = 0.1, 0.0, 0.0
    simulation = []
    for _ in range(20):
        for _ in range(30):
            acceleration = -9.80665 * math.sin(theta)
            theta += velocity * 0.01 + 0.5 * acceleration * 0.01**2
            velocity += 0.5 * (acceleration - 9.80665 * math.sin(theta)) * 0.01
            elapsed += 0.01
        simulation.append({"time_s": round(elapsed, 3), "angle_rad": theta})
    result["simulation"] = simulation
    (EVIDENCE / "science.json").write_text(json.dumps(result, indent=2) + "\n")
    return result


def prepare_genomics() -> dict[str, Any]:
    """Read the public CSC matrix correctly and retain per-cell count summaries."""
    directory = ROOT / ".cache" / "datasets"
    directory.mkdir(parents=True, exist_ok=True)
    destination = directory / "pbmc3k.h5"
    if not destination.exists():
        urllib.request.urlretrieve(DATASET_URL, destination)
    raw = destination.read_bytes()
    if hashlib.md5(raw, usedforsecurity=False).hexdigest() != "9bf3c022611fab0f68174ae8bf1cda6b":
        raise ValueError("PBMC dataset checksum differs from its source record")
    with h5py.File(destination, "r") as data:
        matrix = data["matrix"]
        if not isinstance(matrix, h5py.Group):
            raise TypeError("The PBMC matrix must be an HDF5 group")
        counts = np.array(matrix["data"], dtype=np.int64)
        indptr = np.array(matrix["indptr"], dtype=np.int64)
        shape = np.array(matrix["shape"], dtype=np.int64)
        totals = np.array([counts[start:end].sum() for start, end in pairwise(indptr)])
        detected = np.diff(indptr)
    histogram, bins = np.histogram(totals, bins=24)
    result = {
        "url": DATASET_URL,
        "sha256": hashlib.sha256(raw).hexdigest(),
        "shape": shape.tolist(),
        "nonzero_entries": len(counts),
        "cells": int(shape[1]),
        "features": int(shape[0]),
        "total_counts": int(totals.sum()),
        "median_counts": float(np.median(totals)),
        "median_detected_features": float(np.median(detected)),
        "histogram": histogram.tolist(),
        "bins": bins.tolist(),
        "cell_totals": totals.tolist(),
        "detected_features": detected.tolist(),
        "method": "CSC columns are cell barcodes; per-cell sums use indptr boundaries, not data-vector positions.",
    }
    (EVIDENCE / "genomics.json").write_text(json.dumps(result, indent=2) + "\n")
    return result


if __name__ == "__main__":
    computed = prepare()
    print("Boundary area km2:", computed["boundary"]["area_km2"])
    print("Period at 60 degrees:", computed["pendulum_60"])
    print(
        "PBMC:",
        {
            key: value
            for key, value in prepare_genomics().items()
            if key in {"cells", "features", "median_counts", "total_counts"}
        },
    )
