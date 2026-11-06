# 2. What if we’re wrong?

A useful scientific agent tests and revises a claim.

**Visible proof:** The nonlinear period diverges from the small-angle prediction; linked graph entries preserve why the claim changed.

**Evidence:** `science.json; science-log.json; execution/hypothesis-*.json`. See [campaign source ledger](../../SOURCES.md).

**Presentation limits:** Ideal numerical pendulum, not physical measurements. 60° result is +7.3182%.

**Difficult mechanic:** Shrinking the plot while graph nodes grow without collisions or clipping the pendulum.

## Timed shots

| Time | Beat |
| --- | --- |
| 0–4 s | The claim |
| 4–11 s | Numerical experiment |
| 11–17 s | Where it breaks |
| 17–24 s | Science log grows |
| 24–29 s | A better claim |
| 29–34 s | Build with us |

## On-screen copy

- 11.4–16 s: A useful agent tests the assumption.
- 25.3–28 s: Keep the evidence. Follow the next question.

## Edit and render

`scene.tsx` is the editable composition; `storyboard.json` is its shot/copy handoff.
From the campaign root, run `node render.mjs hypothesis --draft`, inspect, revise,
then `node render.mjs hypothesis` and `node scripts/review.mjs hypothesis`.
The latest local output is `../../output/02-hypothesis.mp4`.
Review findings belong in [the campaign review history](../../REVIEW.md).
