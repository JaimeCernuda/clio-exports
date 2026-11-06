# 6. Your tools. Your sources. Your science.

Your scientific tools and sources can work together in a program.

**Visible proof:** A genuine PTC program performs four source reads and produces a concise count summary with source references.

**Evidence:** `genomics.json; execution/tools-*.json; product/requests/count-analysis.kernel`. See [campaign source ledger](../../SOURCES.md).

**Presentation limits:** CSC cells are columns; data vector entries are not cells. Displayed program is a condensed excerpt.

**Difficult mechanic:** Clear surrounding source/tool cards before the result expands; no idle toolbar.

## Timed shots

| Time    | Beat                      |
| ------- | ------------------------- |
| 0–4 s   | Your workbench            |
| 4–10 s  | Connect sources           |
| 10–17 s | A program calls the tools |
| 17–22 s | Compute the summary       |
| 22–27 s | An inspectable result     |
| 27–32 s | Build with us             |

## On-screen copy

- 5.8–9 s: Bring the sources and tools your work needs.
- 13–18.2 s: One program handles the reads, checks and calculation.
- 22–26 s: Keep the useful result—and where it came from.

## Edit and render

`scene.tsx` is the editable composition; `storyboard.json` is its shot/copy handoff.
From the campaign root, run `node render.mjs tools --draft`, inspect, revise,
then `node render.mjs tools` and `node scripts/review.mjs tools`.
The latest local output is `../../output/06-tools.mp4`.
Review findings belong in [the campaign review history](../../REVIEW.md).
