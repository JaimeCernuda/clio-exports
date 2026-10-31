# Conversation replay

Native inspections now maximize the real canvas over a frozen source clock. See
[the inspection and connected-film workflow](../story/README.md) for source-linked
observations, chart reflow and frame-exact replacement renders. Whole-window
camera scaling is not an adequate data inspection.

The campaign now uses one growing native CLIO conversation. The older two-column
`NativeNarrativeMovie` is retained as a previous treatment, not the campaign layout.
The landscape cut removes the navigation rail and frames the continuing chat at
center-left. The production `ClioWorkbench` on the right carries the NDP dataset selection and
recorded rich views. Those are a canvas beside the log, not replacement transcript
slides. Its header starts at the top of the workspace, with native file icons,
tab overflow, close affordances, launcher and maximize control. A small controlled
state/content port is added by the Vite adapter; the pinned checkout stays clean.
Inline maps, images and tables retain their full layout height. Do not cap or crop
individual results to make the log fit; move the conversation viewport instead.

`NativeConversationReplay` feeds a frame-dependent projection to the production
`ArchiveConversation`. Source tool calls accumulate in the current native activity
group. Public replies stream into that same log, closing prior activity groups.
Generated maps, figures, charts and tables appear at their recorded block position.
New questions type into the fixed native composer and enter at the bottom.
`ReplayWorkbench` binds the source search/connect/download calls, dataset ID and
surface tabs. Change those bindings for another session, or omit the prop for a
plain conversation. Checkbox selections come from the recorded connect input.

## New sessions

Import with `tools/prepare_native_scene.py` as described in [README.md](README.md).
The replay component accepts any imported `NativeScene`; it derives messages,
tools and rich surfaces from that scene. It does not run the recorded tools.
Pass a frame, duration in frames, number of turns and optional `ReplayEdits`.
Without edits it retains source text and all supported blocks in those turns.
The campaign's `sceneFile` selects its input. For another campaign, replace that
file and remove the Tahoe-specific selection in `campaign-story.json.replay`.

## Editable timing and selection

`replay-plan.ts` generates a deterministic event schedule. Each event retains its
message/part/call/surface IDs. `ReplayEdits` accepts:

- `toolIds`, `reasoningIds`: optional source ID selections, preserving source order.
- `omitBlockIds`: editorial omissions, including unwanted retries or setup steps.
- `weightsByBlockId`: relative duration overrides; larger values slow a beat.
- `answerParagraphs`: optional contiguous opening paragraphs of final answers.
- `includeInjections`: retain or omit recorded harness receipts.

These change the presentation projection. The imported scene and original export
are never rewritten. Keep outcome-changing omissions visible in the accompanying
review notes. Do not fabricate a clean execution outcome from an unsuccessful run.

The NDP pitch selects the discovery/access, geometry, measurement and widget work
from the first two Tahoe turns. It omits packaging/debug iterations and artifact
attachments. Public progress updates remain verbatim. Its final answers use their
opening two paragraphs. The social cut uses the first turn of that same replay.
Canvas tabs appear only after their source surface is emitted. The dataset result
appears after NDP search completes. The inspection stages the three resource choices
from the next recorded connection's input before that call continues. Requested
downloads retain their recorded state; collection is
shown by the corresponding completed tool, not a fabricated success toast.

`presentation-plan.ts` separates the source replay clock from the film clock.
Optional `FocusBeat` entries target a source tool, surface or text block. Each
inserts a pause for the entire approach, interaction and pullback. The source
clock resumes only after the camera returns. `campaign-story.json.focuses` stages
NDP resource selection, the real MapLibre zoom control, a native Vega hover tooltip
and browser selection of a phrase in CLIO's reply. Gesture timing and camera
scale are frame controlled. Resource choices and chart values come from the
archive. These are authored presentation interactions, not a new agent run.

## Continuous layout motion

The chat column keeps its width when the workbench opens. Native activity bodies
ease closed over 36 source frames, new inline views expand over 36 frames, and
canvas content fades out before the next native tab is activated and fades in.
Partial prose uses the same `remend` parser used by CLIO's streaming Markdown, so
unclosed bold/code markers do not flash and then reflow the paragraph.

The viewport follows a measured path rather than snapping to the bottom at every
line wrap. After changing the transcript, selection, timing, font or geometry:

1. Build and open `/?mode=campaign&cut=pitch&bake=1` at the intended landscape
   aspect ratio. Click **Measure native layout**. This measures actual native content and assets; no tools are run. Tahoe uses every source frame. Alta and Konza measure at six-frame intervals (10 Hz), including both endpoints; the viewport targets are interpolated before the bounded spring is applied. The video and text still render at 60 fps.
2. Download the measured JSON and save it as the campaign's `pitch.layoutFile`
   under `native/public/`. It contains raw native positions plus a bounded damped
   path. The supplied Tahoe path is `tahoe-pitch-layout.json`.
3. Rebuild, open the normal campaign preview and inspect a moving transition
   proof. The layout key includes the export checksum, session, source duration,
   turn selection, format and edits; stale measurements are rejected. Increment
   the layout version and measure again when changing component geometry.

`smoothScroll` limits viewport movement to nine local CSS pixels per source frame.
The film still freezes that path during inspection shots. This numerical bound is
a rendering check, not a substitute for watching encoded footage. The landscape
cut adds four seconds of final-answer reading time before its closing card.

## Render and review

From `motion/`, run the native build/preview using the pinned production checkout.
Then open `/?mode=campaign&cut=pitch` for the editable playback and frame scrubber.
`NdpClioFlowProof` renders 18 seconds starting at film frame 2740, covering the
follow-up question, tools, progressively written reply and the chart inspection.
`NdpClioTransitionProof` renders nine seconds around the map's arrival, inspection
and pullback. `npm run campaign:pitch` renders the current landscape cut; `campaign:social`
renders the 36-second portrait cut. Both are 1080p, 60 fps, silent.

Review the encoded playback for tool accumulation, collapsing, streamed replies,
scrolling, widget generation and the next question. Stills alone cannot approve
this behavior. The frame bridge waits for native fonts, maps, charts and images.
It also verifies every displayed text prefix and every declared rich image/chart/
table has mounted, then settles viewport placement and gestures before capture.
Film scrolling translates the complete native content within its viewport, so
Chromium's asynchronous scroll compositor cannot capture an earlier position.
Static native Markdown rendering avoids a second wall-clock text stream. These
changes keep the renderer deterministic without altering the source transcript.
Film-only source transforms keep rich surfaces mounted and measure chart
width in local CSS pixels, so camera scale cannot enlarge its Vega viewport.

Source: [Lake Tahoe conversation](https://clio.iowarp.ai/conversations/ndp/tahoe/).
The NDP/TRPA measurements are recorded results. USGS geographic context is an
added offline map background. This is a proposed NDP + CLIO campaign asset; the
user controls distribution and any partnership announcement.

## Additional NDP sessions

The shared renderer now selects a campaign by ID. `campaign-catalog.ts` binds Tahoe, Alta and Konza to independent source/timing manifests. Open `/?mode=campaign&campaign=alta` or `/?mode=campaign&campaign=konza`; add `&bake=1` to measure a changed selection. The scene defaults to the campaign's source; an explicit scene must match it. The measured download uses each manifest's filename.

- `NdpClioAlta`: discover current and historical Alta-Collins collections, connect/download, inspect coverage, compare winters, follow up on the monthly surplus. Genuine seasonal and February hover details, then select the reply's January–March finding. Omits turn 3's reproducibility package.
- `NdpClioKonza`: inspect retained measurements/provenance, recompute comparisons, generate the multi-signal explorer, ask whether particle/CO₂ extremes coincide, inspect the rank counterexample. Genuine chart tooltips and selection of the window-dependent conclusion. Starts with data already present; no fictitious NDP download. The collaborator handoff in turn 3 is omitted from the film.

Both use contiguous openings of final answers and preserve all public next-thought passages in those turns. Alta’s last answer ends after its complete first paragraph, avoiding a dangling introduction to an omitted list. Private reasoning, setup/debug/presentation-review iterations, attached-file blocks and packaging are editorially omitted. The rich surfaces show the final saved revision from the archive rather than a reconstruction of each edit revision. All displayed tools are real recorded calls; their names and outcomes are retained.

A `FocusBeat` may supply `targetLabel` (a substring of the native Vega mark's accessible label) and `selectionText` (a verbatim phrase in its source block). Never reuse a Tahoe value for another dataset. Verify the selected mark, tooltip and text range in the actual preview and encode. Camera interactions are authored locally; no remote tools execute. Landscape is the authored format for these cuts. The old Tahoe portrait composition remains separate.

Render from motion/: `npm run campaign:alta` or `npm run campaign:konza`. The current manifest sets each duration, including its native interactions. Short proof compositions share the same source and timing. Rebuild the native stage only between renders because hashed assets are served to active render pages. The connected-story workflow is in [story/README.md](../story/README.md).

The film adapter caches parsed immutable archive surfaces by identity. This prevents each new typed character from recreating the native chart model and refetching the same captured tables. Source objects and final chart content are unchanged; a new archive/revision object gets a new parsed model.

Canvas scrolling retains its completed position during later prose instead of snapping back to the top. The controlled workbench mounts the presentation only in its active native tab; the frame bridge checks the visible drawer’s measured scroll range before capture. Current inspections use the native maximize control to expand the canvas over the frozen conversation, operate its real controls, then restore it before chat resumes. Alta's seasonal chart reflows to a shorter plot height. Partial links display their label as plain text until their URL completes, avoiding a transient blocked-placeholder marker. Follow the inspection capture, pointer composition and final conformance commands in [story/README.md](../story/README.md) for the delivered edit.

The optional USGS reference raster is scoped to the Tahoe scene/campaign. Other sessions receive CLIO’s ordinary offline map style until a suitable context asset is deliberately added for them.
