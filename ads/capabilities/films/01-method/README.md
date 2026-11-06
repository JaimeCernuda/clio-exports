# 1. Bring your method.

Your procedure can run, review its result and revise the relevant step.

**Visible proof:** A deflecting beam travels through the flow and returns through simulation after review.

**Evidence:** `beam.json; execution/method-*.json`. See [campaign source ledger](../../SOURCES.md).

**Presentation limits:** Euler–Bernoulli analytical beam, not a Slurm/finite-element run.

**Difficult mechanic:** Unfolding text into nodes, then routing the same result around the revision loop.

## Timed shots

| Time    | Beat               |
| ------- | ------------------ |
| 0–4 s   | The method         |
| 4–10 s  | A flow takes shape |
| 10–17 s | Execute            |
| 17–23 s | Review and revise  |
| 23–27 s | Updated result     |
| 27–32 s | Build with us      |

## On-screen copy

- 7.7–15.5 s: Your procedure. Executed as connected work.
- 20.8–26 s: Review changes the next step.

## Edit and render

`scene.tsx` is the editable composition; `storyboard.json` is its shot/copy handoff.
From the campaign root, run `node render.mjs method --draft`, inspect, revise,
then `node render.mjs method` and `node scripts/review.mjs method`.
The latest local output is `../../output/01-method.mp4`.
Review findings belong in [the campaign review history](../../REVIEW.md).
