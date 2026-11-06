# 5. Show me where that came from.

You can inspect where a result came from.

**Visible proof:** Follow one boundary-area result through its measurement and polygon to its dataset, then return.

**Evidence:** `boundary.geojson; tahoe.json; science.json`. See [campaign source ledger](../../SOURCES.md).

**Presentation limits:** Mapped boundary area is not current water extent.

**Difficult mechanic:** Keep the result identity continuous through the backward and forward inspection.

## Timed shots

| Time | Beat |
| --- | --- |
| 0–4 s | A result |
| 4–10 s | Inspect evidence |
| 10–16 s | The geometry |
| 16–21 s | The source |
| 21–25 s | Return to the result |
| 25–30 s | Build with us |

## On-screen copy

- 6–10 s: Follow the result back to its evidence.
- 21.8–24.5 s: A result you can inspect, all the way back.

## Edit and render

`scene.tsx` is the editable composition; `storyboard.json` is its shot/copy handoff.
From the campaign root, run `node render.mjs provenance --draft`, inspect, revise,
then `node render.mjs provenance` and `node scripts/review.mjs provenance`.
The latest local output is `../../output/05-provenance.mp4`.
Review findings belong in [the campaign review history](../../REVIEW.md).
