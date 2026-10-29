# One NDP + CLIO film

Status: the final full cut was rejected for unnecessary full-screen data selection,
an uninteresting lake zoom and arbitrary text highlights. Work on the video is
stopped. This document preserves its technical pipeline, not an approved shot
template. Read [clio-videos](../../.agents/skills/clio-videos/SKILL.md) before
designing another film; expansion and interaction are choices, not obligations.

`ndp-connected.json` separates the editorial sequence, source movies, frame ranges,
publisher identities, bridge copy and overlap lengths. `src/ConnectedStory.tsx`
provides editable vector bridges and a Remotion timeline over continuous native UI
actors rendered from the native React replay.

The organization research is in [RESEARCH.md](RESEARCH.md). Keep producers,
repositories and NDP discovery distinct.

## Regenerate

From `motion/`, with the pinned native UI build serving on port 3357:

Run `node scripts/capture-native-exports.mjs` in a second terminal for the native
download shot. It preserves the actual PNG Blob produced by CLIO under
`out/native-downloads/`, with a byte count and SHA-256 receipt. The original
browser download handler still runs.

1. `npx tsx scripts/render-inspections.ts --plan` lists the frozen-source shot ranges.
2. `npx tsx scripts/render-inspections.ts` renders every native inspection.
   Pass shot IDs to replace selected shots. Renders run sequentially because
   `render.mjs` owns a shared bundle directory.
3. `npx tsx scripts/conform-inspections.ts` verifies original moving source hashes,
   replaces their inspection intervals and updates the connected-story manifest.
   Original source movies must be in `out/`: `ndp-clio-pitch-v3.mp4`,
   `ndp-clio-alta-v1.mp4` and `ndp-clio-konza-v1.mp4`. The delivered
   `ndp-clio-moving-sources.zip` contains these exact cached actors; extract it
   over the source kit's root. They are separate from the smaller code package.
4. `npx tsx scripts/assemble-story.ts` renders editable bridges, stages the verified
   moving actors for Studio, trims exact source frames and combines them. It
   verifies frame count, format, hashes and complete decode.

Review existing local renders without making a new film:

```text
npx tsx scripts/verify-cursors.ts
npx tsx scripts/verify-ui-holds.ts
npx tsx scripts/review-connected.ts
npx tsx scripts/review-joins.ts
```

The last two CLIs resolve paths from the repository and accept `--video` and
`--out`. The join reviewer also accepts `--scan`. They measure actual decoded
frames, verify receipts and generate boundary contact sheets; they do not assert
human approval. Review notes and test results must reflect work actually done.
One-off authoring scripts and player sources are preserved separately in
[`references/session-scripts`](../references/session-scripts/README.md), with a
hash manifest. They contain historical paths/values and must not be rerun as a
replacement for the maintained workflow.

Regenerate `konza-inspect-counterexample` for the current selection and native
canvas expansion. The older hover-only proof is not the current shot.

The final film is `out/ndp-clio-connected-v1.mp4`; its JSON receipt records exact
source identities. Select `NdpClioConnectedStory` in Studio to edit the composition.
Cached MP4 actors are excluded from the portable source ZIP; distribute delivered
movies alongside it or regenerate the native actors.

## Inspection language

An inspection opens CLIO's native maximize control and expands its canvas over
the frozen conversation. Its header, icons, tabs and restore control come from
the production component. The real Vega view changes size; pointer events open
its recorded-data tooltip. Long native views scroll between observations. Chat
resumes after the original canvas geometry returns.

`FocusBeat.observations` specifies accessible mark labels, relative frame times
and scroll positions. `chartHeights` reflows a plot to a different aspect ratio,
changing presentation dimensions only. Source rows, scales, marks and archived
messages stay intact. Ordinary transcript views retain their saved layout.

`controls` drives real ChoicePicker chips and slider keyboard handlers. Alta
switches historical cohorts and narrows to January–March; Konza widens from
16:00–17:00 to 08:00–20:00 and returns. Every control track restores the captured
values before chat resumes. Point selection updates the native linked table;
the scatter shot selects the particle peak and its CO₂ counterexample while
retaining the surrounding observations. `download` schedules the native More → Download → PNG menu. Frame readiness
waits for the requested control values, selection, zoom and captured export.

The capture defaults to SwiftShader (`swangle`). Chromium's transformed SVG text
cache can still enlarge chart labels on individual capture workers. Film capture
paints the native Vega vectors as isolated SVG images with explicit typography;
the original native SVG remains mounted for data and input events. No plot rows
or encodings are substituted. The paint stays vector based at output resolution.
`verify-ui-holds.ts` scans every adjacent frame during identical UI states to flag
unexpected changes. Sampling at12fps covers all six capture workers;3fps or6fps
can miss alternating workers. Inspect the candidates rather than treating the
threshold as automatic visual approval. `--reuse-cards` skips bridge rendering
only when those exact bridge files have already been reviewed and verified.

## Pointer choreography

Native inspections are captured without a painted cursor. The capture records
the actual DOM target positions in `.base.mp4.cursor.raw.json`; `cursor-plan.ts`
connects action endpoints with one seek-independent path and short speed ramps. Hover dismissal uses
the same departure times. `CursorComposite.tsx` paints the arrow with its tip on
the target, follows slider drags and preserves position between gestures.

`render-inspections.ts` produces each `.base.mp4`, binds its pointer track and
renders the final shot. After changing only pointer styling or interpolation,
run `npx tsx scripts/compose-cursor.ts <shot-id>` to reuse the native capture.
The generated `.cursor.props.json` is also editable in `NdpCursorComposite`.
Changes to actions, UI geometry or tooltip timing require a fresh native base.

During frozen-source inspections, identical UI states can reuse a capture frame.
Every resize, map zoom, slider transition and scroll frame remains at 60 fps;
button, selection, tooltip and menu changes retain their exact event frames.
The pointer remains animated at 60 fps throughout the holds.
