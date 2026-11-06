# 7. Point at the data you mean.

Point at the records you want to ask about.

**Visible proof:** The same 12 geographic observations become highlighted rows, a composer reference and a source-backed answer.

**Evidence:** `hurricane.json; atlantic-basemap.json`. See [campaign source ledger](../../SOURCES.md).

**Presentation limits:** Authored reference gesture; actual NOAA rows and Natural Earth coastline geometry.

**Difficult mechanic:** Preserve equal map scale and selection identity across reference handoff; align both clicks.

## Timed shots

| Time    | Beat                      |
| ------- | ------------------------- |
| 0–4 s   | Point to evidence         |
| 4–10 s  | Select observations       |
| 10–15 s | Reference this            |
| 15–20 s | Ask a precise question    |
| 20–25 s | Answer from selected rows |
| 25–30 s | Build with us             |

## On-screen copy

- 7.6–10.6 s: A selection carries the actual observations.
- 21.5–24.4 s: Ask about this—not everything.

## Edit and render

`scene.tsx` is the editable composition; `storyboard.json` is its shot/copy handoff.
From the campaign root, run `node render.mjs selection --draft`, inspect, revise,
then `node render.mjs selection` and `node scripts/review.mjs selection`.
The latest local output is `../../output/07-selection.mp4`.
Review findings belong in [the campaign review history](../../REVIEW.md).
