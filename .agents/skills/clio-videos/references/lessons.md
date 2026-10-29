# Lessons from the NDP + CLIO work

Use these findings for a new film. The pipeline is reusable; the latest full NDP
edit is not an approved creative template.

## Editorial findings

| Observed failure | Decision it changes |
| --- | --- |
| Invented concept graphics showed little of CLIO. | Make genuine product behavior and results the substance. Reserve conceptual graphics for ideas the UI cannot show. |
| Screenshot crops and held two-column excerpts became slides. | Use native editable components and grow the normal conversation in source order. |
| The science displaced the product story. | Choose actions that explain CLIO's capabilities; the example supplies evidence. |
| Too much was forced into 25 seconds. | Set duration from the causal sequence and reading time. Extra duration must add story. |
| A complete block of text appeared after a transition. | Stream contiguous source prefixes; keep rich blocks mounted; inspect the first frames after collapse and return. |
| Whole-window pseudozooms left duplicate plots on screen. | When detail matters, focus the relevant native view with deliberate reflow or expansion. Do not maximize every view. |
| Initial NDP selection filled the screen without earning attention. | Keep routine acquisition in context unless a specific resource comparison is central to the story. |
| The lake got one generic zoom with no interesting payoff. | Leave it alone and continue, or design a useful pan/comparison supported by the real UI. A background toggle is an option only if that control exists. |
| Arbitrary text highlights felt like filler. | Select text for a meaningful action or comparison; reading a sentence does not require selecting it. |
| Every chart received a hover or click regardless of purpose. | Use an interaction only when its visible effect explains something worth showing. |
| Technical footers and repeated source explanations interrupted the story. | Keep film copy short; retain detailed provenance in research/handoff notes and preserve native map attribution. |
| The pointer teleported, accelerated unevenly or paused too long. | Connect real DOM targets with one editable continuous track, match drags to actual control state, and review travel and holds in playback. |
| A short moving proof passed but the full film lacked judgment. | Approval applies to what the proof demonstrated. Reassess purpose, hierarchy and pacing across the complete edit. |

## Technical findings

- The pinned production gact-tui adapter is the fidelity baseline. A palette,
  logo and approximate panels did not make the earlier handcrafted kit recognizable.
- Preserve `transcript_views`, rich block order and required `snapshot` dependencies.
  An artifact record does not prove file bytes were captured. Keep private reasoning
  separate from public agent explanations.
- Replay timing is editorial; tool identities, actions, results and scientific
  qualifications remain source evidence. Do not invent discovery/download for a
  session that starts with NDP-acquired data already present.
- Freeze the conversation from inspection entry through restore. Regenerate
  source-bound measured scroll tracks after content/geometry changes. Prefix tests
  alone do not establish continuous layout motion.
- Frame readiness covers fonts, Markdown, maps/backgrounds, charts, associated
  tables, selection, controls, menus, downloads and settled geometry. Fixed waits
  alone are insufficient. Cache parsed immutable surfaces by archive/revision
  identity so each typed character does not remount/refetch them.
- Drive native choice, slider and Vega selection handlers. Verify their actual
  data effect and exported file bytes when those actions belong in the story.
- Capture UI without its painted cursor, record native DOM targets and composite
  the editable pointer. Recompose without recapture only when actions, geometry
  and tooltip timing are unchanged. Reuse UI frames only while semantic state is
  unchanged; retain continuous resize/map/scroll and every quantized slider change.
- Giant SVG labels were capture-worker dependent; software GL alone did not fix
  every case. The film-only workaround paints native Vega vectors as isolated SVG
  images with explicit typography, retaining the original SVG for data/events.
  It does not replace chart data or encodings.
- With six workers, samples every 10 or 20 frames can miss faults. At 60fps the
  campaign's 12fps samples step through all six workers. Also scan adjacent frames.
  Minor raster differences and large luma differences are candidates, not verdicts.
- `render.mjs` owns a shared bundle: render serially. Do not rebuild a native
  stage while captures use its hashed assets. Preserve actor hashes, exact frame
  ranges and the common 1/60 timebase for conformance/crossfades.

## Handoff

Keep transcripts, components, shot manifests, scripts, tests and skills in the
repository. Rendered movies and caches stay local unless publishing is requested.
Preserve technical reports with their actual scope, then record later creative
feedback alongside them. Never auto-generate human approval or test-pass claims.
Use [maintained commands](../../../../motion/story/README.md); historical one-off
authoring scripts are evidence, not regeneration commands.
