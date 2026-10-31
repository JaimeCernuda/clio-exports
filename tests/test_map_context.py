"""Verify real reference-map georeferencing and cache provenance."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
from typing import Any

import pytest
from cache_map_context import RADIUS, image_corners, lon_lat

ROOT = Path(__file__).resolve().parents[1]


def test_mercator_coordinates_and_adjusted_image_extent() -> None:
    """Project returned image corners in the order MapLibre image sources require."""
    assert lon_lat(0, 0) == [0, 0]
    assert lon_lat(RADIUS * math.pi, 0) == pytest.approx([180, 0], abs=1e-10)
    extent: dict[str, Any] = {
        "xmin": -1,
        "ymin": -2,
        "xmax": 3,
        "ymax": 4,
        "spatialReference": {"wkid": 3857},
    }
    assert image_corners(extent) == [lon_lat(-1, 4), lon_lat(3, 4), lon_lat(3, -2), lon_lat(-1, -2)]
    with pytest.raises(ValueError):
        lon_lat(math.inf, 0)
    with pytest.raises(ValueError):
        image_corners({**extent, "xmax": -3})
    with pytest.raises(ValueError):
        image_corners({**extent, "spatialReference": {"wkid": 4326}})


def test_reference_cache_has_real_bytes_and_covers_tahoe() -> None:
    """Reference imagery is georeferenced and separate from recorded scientific geometry."""
    metadata = json.loads((ROOT / "motion/native/map-context/tahoe-usgs.json").read_text())
    image = (ROOT / "motion/native/public" / metadata["image"]).read_bytes()
    assert image.startswith(b"\x89PNG\r\n\x1a\n")
    assert hashlib.sha256(image).hexdigest() == metadata["sha256"]
    assert metadata["coordinates"][0][0] < -120.16 < metadata["coordinates"][1][0]
    assert metadata["coordinates"][2][1] < 38.92
    assert 39.25 < metadata["coordinates"][0][1]
    assert metadata["width"] == 2560 and metadata["height"] == 2304
    assert metadata["service"].startswith("https://basemap.nationalmap.gov/")
