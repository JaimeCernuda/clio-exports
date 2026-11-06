import test from "node:test";
import assert from "node:assert/strict";
import { phase, pointerAt, linePath } from "../src/motion";
import { films, getFilm } from "../src/registry";
import { mercator, fitOutline, simplifyPolyline } from "../src/maps";
import science from "../evidence/science.json";
import { sensorRowCount, sourceTimeForRow } from "../films/08-streams/timing";
import recordedQuery from "../evidence/stream-query.json";

test("stream editing preserves query, simulation and completion dependencies", () => {
  assert.equal(sensorRowCount(19), recordedQuery.sourceIndex + 1);
  assert.equal(
    science.burn[sensorRowCount(19) - 1].local_label,
    recordedQuery.latest.local_label,
  );
  assert.equal(sensorRowCount(31), 60);
  assert.equal(sensorRowCount(sourceTimeForRow(41)), 41);
  assert.ok(sourceTimeForRow(41) > 19);
  let previous = 0;
  for (let frame = 0; frame < 40 * 60; frame++) {
    const now = sensorRowCount(frame / 60);
    assert.ok(now >= previous && now >= 2 && now <= 60);
    previous = now;
  }
});

test("the display outline has bounded subpixel error while retaining the full measurement geometry", () => {
  const source = fitOutline(science.boundary.polygon, 370, 450);
  const result = simplifyPolyline(source, 0.4);
  assert.ok(result.length < source.length / 10);
  assert.deepEqual(result[0], source[0]);
  assert.deepEqual(result.at(-1), source.at(-1));
  for (const point of source) {
    // Closest segment distance is independent of the simplifier's implementation.
    const error = Math.min(
      ...result.slice(1).map((b, i) => {
        const a = result[i],
          dx = b[0] - a[0],
          dy = b[1] - a[1];
        const u =
          dx || dy
            ? Math.max(
                0,
                Math.min(
                  1,
                  ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) /
                    (dx * dx + dy * dy),
                ),
              )
            : 0;
        return Math.hypot(point[0] - a[0] - u * dx, point[1] - a[1] - u * dy);
      }),
    );
    assert.ok(error <= 0.400001);
  }
  assert.equal(science.boundary.polygon.length, 20472);
});

test("geography preserves equal local x/y scale and its center", () => {
  const project = mercator(940, 490, -77, 27, [21, 33]);
  assert.deepEqual(project(-77, 27), [470, 245]);
  const dx = project(-76.999, 27)[0] - 470;
  const dy = 245 - project(-77, 27 + 0.001 * Math.cos((27 * Math.PI) / 180))[1];
  assert.ok(Math.abs(dx / dy - 1) < 0.00001);
  assert.ok(project(-77, 30)[1] < project(-77, 25)[1]);
});
test("timeline phases are seekable and reversible without retained state", () => {
  const times = [8, 0, 3, 8, 4, 1];
  const result = times.map((t) => phase(t, 3, 2));
  assert.equal(result[0], result[3]);
  assert.equal(result[1], 0);
  assert.equal(phase(4, 3, 2), 0.5);
  assert.equal(phase(5, 3, 2), 1);
});
test("pointer interpolates continuously, holds on the control, then leaves", () => {
  const keys = [
    { at: 0, x: 2000, y: 900 },
    { at: 1, x: 500, y: 400 },
    { at: 1.4, x: 500, y: 400, press: true },
    { at: 2, x: 2000, y: 900 },
  ];
  assert.equal(pointerAt(1.4, keys).x, 500);
  assert.equal(pointerAt(1.4, keys).press, 1);
  let previous = pointerAt(0, keys);
  for (let frame = 1; frame < 120; frame++) {
    const now = pointerAt(frame / 60, keys);
    assert.ok(Math.hypot(now.x - previous.x, now.y - previous.y) < 75);
    previous = now;
  }
  assert.equal(pointerAt(3, keys).x, 2000);
});
test("chart paths honor the scientific domain at both ends", () => {
  assert.equal(
    linePath([0, 5, 10], 10, 20, 100, 50, 0, 10),
    "M10.00,70.00 L60.00,45.00 L110.00,20.00",
  );
});
test("all films leave five seconds after their stationary close marker", () => {
  assert.equal(films.length, 8);
  assert.equal(new Set(films.map((f) => f.id)).size, 8);
  for (const film of films) {
    assert.equal(film.markers.at(-1)!.at, film.seconds - 5);
    assert.ok(film.markers[1].at <= 4);
    for (let i = 1; i < film.markers.length; i++)
      assert.ok(film.markers[i].at > film.markers[i - 1].at);
  }
  assert.throws(() => getFilm("unknown"));
});
