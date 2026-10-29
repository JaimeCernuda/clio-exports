---
name: clio-motion-review
description: Review a reconstructed CLIO UI film for source fidelity, transition quality and encoded output correctness. Use before handing over a moving cut or diagnosing a bad render.
---

# CLIO film review

Review the requested outcome against the [brief](../../../motion/BRIEF.md).
Keep evidence fidelity, rendering correctness and creative judgment distinct.
Apply [clio-videos](../clio-videos/SKILL.md): the final NDP cut was rejected for
unnecessary full-screen selection, a generic lake zoom and arbitrary highlights.
Passing a pointer proof did not approve the complete edit.
The [SPOTTER full cut also needs revision](../clio-videos/references/spotter-lessons.md):
the user reported incorrect reviewer stalls, pointer disappearance and pointer
occlusion. Existing source-order tests and sampled review did not catch all of them.

## Source and component checks

Confirm the selected request, child identities, tool calls and results occur in
the indexed archive. Read truncation flags and stop reasons; an `end_turn` is not
proof that every requested task succeeded. Do not turn an author's coverage claim
into an independently verified result. The proof's reading-guide run has recorded
limits and is not a completeness benchmark.

Check that panels/text are independent components. Start fidelity review against
the pinned production components in [native/](../../../motion/native/README.md).
The earlier editable kit was rejected for product fidelity; passing its tests
does not reverse that judgment. Use native saved projections and the necessary
captured dependencies instead of flattening a rich conversation to text excerpts.
Verify A2UI actually loads: a map control with a blank canvas is not a working map.
For Tahoe check all three exchanges, four saved views, ten table rows, figure
previews and the artifact canvas. A source author's reproduction claims remain
recorded claims unless independently rerun. Keep uncaptured file bytes unavailable.
Preserve original archive checksums. Labels and shortening should not imply that
the source run completed in the film's elapsed time.

Run the relevant checks:

```text
uv run pytest -q
uv run ruff check
uv run ruff format --check
uv run pyright
```

From `motion/`, run `npm test`, `npm run typecheck`, `npm run format:check`.
For native changes also run `native:check` and `native:build` against the pinned
source. Inspect the browser at intended viewing size; do not hand off a compiler
success as visual proof. Use [the native film workflow](../../../motion/native/FILM.md)
for `ClioNativePromo`, including the local server and frame readiness bridge.
No failed or skipped tests count as a passing result.

## Visual and motion checks

For conversation replay, check actual encoded playback for growing tool groups,
collapse at a new public reply, streamed text, inline generated UI and a new turn
at the bottom. A static held transcript or two-column excerpt layout does not meet
the requested agentic flow. See [REPLAY.md](../../../motion/native/REPLAY.md).
Inspect consecutive frames around the start of a new public reply: text must grow
as a contiguous prefix, and remain visible above the composer. Check that all
declared image/chart/table components have loaded before frame acknowledgement;
a chart SVG alone does not establish its accompanying table is ready. During a
focus shot the source clock must remain frozen from approach through pullback.
For an authored interaction, verify its meaningful effect appears in the encode,
then check the chat resumes. First decide whether the inspection deserves its
time; no gesture is obligatory. Compare the complete drawer header, file icons and top alignment with
the pinned UI. Reject artificial inline widget height caps.
Scan adjacent encoded frames around native activity collapse, view arrival and
line wrapping. A source-prefix test does not establish continuous layout motion.
Use the measured layout workflow in REPLAY.md after changing source or geometry;
reject stale tracks. Check native Markdown formatting during partial tokens and
leave enough time to read the completed answer before the closing card.

Check causality before aesthetics: can a viewer follow why CLIO chooses a method,
what it runs, what comes back, and how that produces the displayed widget/result?
Tool-name flashes followed by a visual do not establish this. Check reading time
for the actual native passages. Keep production/disclosure notes outside the film.

Inspect readable framing at output size and actual intended viewing size. Check
CLIO's recognizability, hierarchy, typography, source content, clipping and label
collisions. Sample entrances, exits and mid-morph frames as well as held layouts.
Verify source fonts/brand assets finish loading. Use the component lab's alternate
layout to check a shared-component change without relying only on one film.

Play the encoded file through. Look for accidental holds, distracting motion,
overlapping fades, unreadable detail and inadequate result holds. Captions,
audio and transitions should make CLIO's capability clearer. Sampled stills cannot
establish temporal quality; if playback review is limited, say so. Do not call the
art direction approved because a file decodes or matches resolution metadata.

For paired agents, inspect both panes during every long main-agent thinking
passage. Classify reviewer stillness against recorded wake/consumption/work
intervals and explicit editorial pause reasons; do not excuse all stalls as
waiting. Trace the visible pointer across setup, native menus, attention banners,
scrolling, return and the next selection. Check clipping and portal/iframe
stacking as well as coordinates and opacity. Record unresolved user findings in
the review receipt even when earlier technical checks passed.

## Encoding verification and handoff

From the repo root, for the current native cut:

```text
uv run python tools/verify_video.py motion/out/ndp-clio-pitch-v3.mp4 --width 1920 --height 1080 --fps 60 --frames 5520 --audio absent --out motion/review/campaign-verification.json
```

Adjust expected dimensions, frame count and audio policy for the actual film.
The verifier uses FFprobe and a full FFmpeg decode. It checks technical properties,
not visual merit or the truth of the source run. Do not silently upscale a low-DPI
UI capture and represent that as a fresh vector render.

For worker-specific chart flicker, inspect consecutive frames and samples covering
all workers. With six workers, 3fps/6fps can miss alternating workers; 12fps covers
them. See [story/README.md](../../../motion/story/README.md) for the vector-paint
and cursor workaround. A frame-difference threshold flags candidates, not approval.
Never auto-fill human review or test-pass claims from a historical report generator.

Deliver the moving cut, editable sources and a short account of what was actually
reviewed, including material limitations. Use `tools/package_motion.py` for a
portable source handoff. State the repository branch/publication state accurately.
Keep the older rejected screenshot cut separate from new treatments.
