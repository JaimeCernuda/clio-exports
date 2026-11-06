# 8. Tap into your experiment.

A running experiment can feed both an agent and a live view.

**Visible proof:** A background script replays the burn observations; the agent queries them while a dashboard updates. The same recorded wind readings then drive an illustrative parcel-transport model whose output enters context and the view alongside its inputs.

**Evidence:** `science.json; stream-query.json; execution/stream-snapshots.json; execution/burn-*-final.json; execution/streams-*.json`. See [campaign source ledger](../../SOURCES.md).

**Presentation limits:** Recorded observations and a kinematic model, not live physical sensors or a dispersion forecast. Minute-mean horizontal speed is held spatially uniform for each minute; travelled distance integrates speed × 60 s. No mixing, deposition or geographic displacement is inferred. Each stream keeps 18 rows; saved snapshots are versioned; the task stops on completion.

**Difficult mechanic:** Keep the original observations visible while wind feeds the model; align model output, live dashboard and retained query to the same source rows.

## Timed shots

| Time    | Beat                                  |
| ------- | ------------------------------------- |
| 0–4 s   | A changing signal                     |
| 4–10 s  | Start background work                 |
| 10–17 s | Live context                          |
| 17–23 s | Ask without restarting                |
| 23–28 s | A live dashboard                      |
| 28–32 s | Wind readings drive a transport model |
| 32–35 s | A meaningful notification             |
| 35–40 s | Build with us                         |

## On-screen copy

- 9–13.4 s: Tap the signal once. Keep its recent context.
- 23.3–27 s: One stream. An agent and a dashboard.
- 29–32.5 s: Use the wind readings to drive a model.

## Edit and render

`scene.tsx` is the editable composition; `storyboard.json` is its shot/copy handoff.
From the campaign root, run `node render.mjs streams --draft`, inspect, revise,
then `node render.mjs streams` and `node scripts/review.mjs streams`.
The latest local output is `../../output/08-streams.mp4`.
Review findings belong in [the campaign review history](../../REVIEW.md).
