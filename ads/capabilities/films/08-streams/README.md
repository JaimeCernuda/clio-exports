# 8. Tap into your experiment.

A running experiment can feed both an agent and a live view.

**Visible proof:** Background PTC writes a rolling window; another question reads it while it runs; a simulation uses the same stream path.

**Evidence:** `science.json; execution/stream-snapshots.json; execution/*-final.json; execution/streams-*.json`. See [campaign source ledger](../../SOURCES.md).

**Presentation limits:** Sensor replay and numerical simulation. Memory window is 18 rows; snapshots are versioned; task stops on completion.

**Difficult mechanic:** Keep stream/task clocks consistent and separate a one-time answer from changing dashboard values.

## Timed shots

| Time    | Beat                      |
| ------- | ------------------------- |
| 0–4 s   | A changing signal         |
| 4–10 s  | Start background work     |
| 10–17 s | Live context              |
| 17–23 s | Ask without restarting    |
| 23–28 s | A live dashboard          |
| 28–32 s | Simulation source         |
| 32–35 s | A meaningful notification |
| 35–40 s | Build with us             |

## On-screen copy

- 9–13.4 s: Tap the signal once. Keep its recent context.
- 23.3–27 s: One stream. An agent and a dashboard.
- 29–32 s: Instruments and simulations, connected to the same work.

## Edit and render

`scene.tsx` is the editable composition; `storyboard.json` is its shot/copy handoff.
From the campaign root, run `node render.mjs streams --draft`, inspect, revise,
then `node render.mjs streams` and `node scripts/review.mjs streams`.
The latest local output is `../../output/08-streams.mp4`.
Review findings belong in [the campaign review history](../../REVIEW.md).
