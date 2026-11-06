/** Equal x/y Mercator scale; map geometry never inherits a layout's aspect ratio. */
export function mercator(
  width: number,
  height: number,
  longitude: number,
  latitude: number,
  latitudeSpan: [number, number],
) {
  const rad = Math.PI / 180;
  const northing = (degrees: number) =>
    Math.log(Math.tan(Math.PI / 4 + (degrees * rad) / 2));
  const scale =
    height / (northing(latitudeSpan[1]) - northing(latitudeSpan[0]));
  return (lon: number, lat: number): [number, number] => [
    width / 2 + (lon - longitude) * rad * scale,
    height / 2 - (northing(lat) - northing(latitude)) * scale,
  ];
}

export type Point = [number, number];
/** Keep every original point within tolerance of the retained segment, in pixels. */
export function simplifyPolyline(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points;
  const keep = new Set([0, points.length - 1]);
  const ranges: Point[] = [[0, points.length - 1]];
  while (ranges.length) {
    const [first, last] = ranges.pop()!;
    const a = points[first],
      b = points[last],
      dx = b[0] - a[0],
      dy = b[1] - a[1];
    let maximum = tolerance * tolerance,
      selected = -1;
    for (let i = first + 1; i < last; i++) {
      const p = points[i],
        fraction =
          dx || dy
            ? Math.max(
                0,
                Math.min(
                  1,
                  ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) /
                    (dx * dx + dy * dy),
                ),
              )
            : 0;
      const error =
        (p[0] - a[0] - fraction * dx) ** 2 + (p[1] - a[1] - fraction * dy) ** 2;
      if (error > maximum) {
        maximum = error;
        selected = i;
      }
    }
    if (selected >= 0) {
      keep.add(selected);
      ranges.push([first, selected], [selected, last]);
    }
  }
  return [...keep].sort((a, b) => a - b).map((index) => points[index]);
}

/** Fit a local geographic outline with a shared x/y scale rather than stretching axes. */
export function fitOutline(
  points: number[][],
  width: number,
  height: number,
  padding = 30,
): Point[] {
  const rad = Math.PI / 180;
  const projected = points.map(([lon, lat]) => [
    lon * rad,
    Math.log(Math.tan(Math.PI / 4 + (lat * rad) / 2)),
  ]);
  const xs = projected.map((p) => p[0]),
    ys = projected.map((p) => p[1]);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const scale = Math.min(
    (width - padding * 2) / (maxX - minX),
    (height - padding * 2) / (maxY - minY),
  );
  return projected.map(([x, y]) => [
    width / 2 + (x - (maxX + minX) / 2) * scale,
    height / 2 - (y - (maxY + minY) / 2) * scale,
  ]);
}
