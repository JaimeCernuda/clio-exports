"""Cache a georeferenced USGS reference map for deterministic offline presentation."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

SERVICE = "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer"
RADIUS = 6378137.0


def lon_lat(x: float, y: float) -> list[float]:
    """Convert a returned EPSG:3857 image extent corner to longitude/latitude."""
    if not math.isfinite(x) or not math.isfinite(y):
        raise ValueError("Map extent coordinates must be finite")
    return [
        math.degrees(x / RADIUS),
        math.degrees(2 * math.atan(math.exp(y / RADIUS)) - math.pi / 2),
    ]


def image_corners(extent: dict[str, Any]) -> list[list[float]]:
    """Use the service's adjusted image extent, not an assumed requested aspect ratio."""
    spatial = extent["spatialReference"]
    if spatial.get("latestWkid", spatial.get("wkid")) not in {3857, 102100}:
        raise ValueError("Expected a Web Mercator image extent")
    west, south, east, north = (float(extent[key]) for key in ["xmin", "ymin", "xmax", "ymax"])
    if west >= east or south >= north:
        raise ValueError("Map extent must have positive area")
    return [lon_lat(west, north), lon_lat(east, north), lon_lat(east, south), lon_lat(west, south)]


def fetch(url: str) -> bytes:
    """Fetch a bounded public USGS response with an explicit timeout and client identity."""
    if urlparse(url).scheme != "https" or urlparse(url).hostname != "basemap.nationalmap.gov":
        raise ValueError("Only the official USGS basemap host is supported")
    request = Request(
        url,
        headers={"User-Agent": "clio-motion-authoring/1.0 (github.com/jaimecernuda/clio-exports)"},
    )
    with urlopen(request, timeout=45) as response:
        value = response.read(16 * 1024 * 1024 + 1)
    if len(value) > 16 * 1024 * 1024:
        raise ValueError("Reference map exceeded the 16 MiB cache limit")
    return value


def cache_context(destination: Path, metadata: Path) -> dict[str, Any]:
    """Save the reference map and its real footprint separately from scientific evidence."""
    parameters = {
        "bbox": "-120.65,38.60,-119.40,39.60",
        "bboxSR": 4326,
        "imageSR": 3857,
        "size": "2560,2304",
        "dpi": 144,
        "format": "png32",
        "transparent": "false",
        "f": "json",
    }
    request = SERVICE + "/export?" + urlencode(parameters)
    result = json.loads(fetch(request))
    if "error" in result:
        raise ValueError(f"USGS export refused: {result['error']}")
    corners = image_corners(result["extent"])
    content = fetch(result["href"])
    if not content.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("USGS did not return a PNG reference map")
    record = {
        "schema": "clio.map-context.v1",
        "image": "map-context/" + destination.name,
        "coordinates": corners,
        "width": result["width"],
        "height": result["height"],
        "attribution": "USGS The National Map · cached reference map",
        "service": SERVICE,
        "request": request,
        "retrievedAt": datetime.now(UTC).isoformat(),
        "sha256": hashlib.sha256(content).hexdigest(),
        "role": "Presentation background only; recorded NDP/TRPA scientific geometry is unchanged",
    }
    destination.parent.mkdir(parents=True, exist_ok=True)
    metadata.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(content)
    metadata.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    return record


def main() -> None:
    """Cache one reference-map export; renders subsequently use only local files."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--out", type=Path, default=Path("motion/native/public/map-context/tahoe-usgs.png")
    )
    parser.add_argument(
        "--metadata", type=Path, default=Path("motion/native/map-context/tahoe-usgs.json")
    )
    args = parser.parse_args()
    record = cache_context(args.out, args.metadata)
    print(json.dumps({"sha256": record["sha256"], "size": [record["width"], record["height"]]}))


if __name__ == "__main__":
    main()
