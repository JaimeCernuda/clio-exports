# Engineering studies with CLIO

The 5:56 film connects two genuine Daisy Quach exports: the twelve-case E4
parameter study, then the separate E5 individual-trial studio. E5 was recorded
earlier. This chapter order is editorial; it is not a fabricated continuation.

The first rendered cut was rejected: it exposed raw troubleshooting, cut a numbered
list after its empty second item, relied on experiment names the audience did not
know, and made Slurm completion appear immediate. Its technical review did not
establish an effective product story.

The revision uses `motion/story/engineering-film-copy.json` for complete, short
film passages and meaningful tool labels. These are faithful editorial
condensations, **not verbatim dialogue**. Original exports stay unchanged; each
prepared scene retains the original passage, its hash and the displayed copy.
Failed attempts are omitted from this selection and never relabeled successful.
Do not use a character-count excerpt cutter to select film copy: it can leave an
unfinished table, heading or numbered list even if it ends at a full stop.

Use standalone names in the film: Parameter study, Design comparison and Topology
studio. Internal E1/E4/E4b/E5 names belong in the source ledger, not its prompts,
headings or captions. Actual case and file identities remain linked to the data.

The Slurm passage uses the actual background-array watcher, a progress check,
an explicit “Later” time cut, and the recorded completion checks. A previous
revision's job grid and interpolated clock were rejected: holding a stale queue
snapshot while advancing a clock falsely made cases 10–12 appear to run in
seconds. Sparse snapshots do not establish transition times. Do not animate
per-case start/end times without the corresponding scheduler records.

The whole-array watcher (`call_bb2c24f185ff`) was accepted in 944 ms. The 332 ms
call (`call_448626966f6a`) starts a separate watcher for case 1. Both are background
launch acknowledgements, not optimization runtimes or completed waits. The film
now selects the whole-array watcher and labels its start explicitly.

The captured case-summary table records these runtimes in case order:
18:45, 18:43, 17:14, 16:57, 18:34, 16:51, 17:39, 10:04, 10:16, 10:07, 10:10, 10:05.
Read them from `E4_cantilever_parameter_sweep_dashboard_2.data.json`, under
`snapshot.responses["POST /v1/artifacts/artifact_025fbea3a5ad4c7fa5d8d152c617e7b9/table-query"].json.columns`.
This is columnar data: join `case`, `slurm_job`, `runtime`, `node` and `iterations`
by index; there is no `rows` array.
All twelve completed 50 iterations. A check about two minutes after submission
shows nine running and three queued; a later check already shows case 12 running
for 9:47. The submission-to-final-check span is about 23 minutes, including queue
and observation delays. Keep invocation, background-task, queue and solver timing
separate. Never infer a solver runtime from a tool duration or film timing.

The maintained plan is `motion/story/engineering-demo-plan.json`. The implemented
frame clock is `engineering-film-plan.ts`; presenter cues and review delivery
come from `tools/prepare_engineering_delivery.py`.

## Rebuild

Keep work and temporary files on D:. The source ZIP stays in Downloads; only five
allowlisted HTML exports are extracted. HTML is decoded as data and never executed.

From the repository root:

```powershell
$env:TEMP = 'D:\Libraries\Documents\projects\clio-exports\motion\.native-ui\tmp'
$env:TMP = $env:TEMP
$env:TMPDIR = $env:TEMP
$env:CLIO_UI_SOURCE = 'D:\Libraries\Documents\projects\clio-exports\motion\.native-ui\source-ui-f333d67d'
uv run python tools/import_engineering_bundle.py 'D:\Libraries\Downloads\CLIO demo - conversations and dashboards-20261030T010137Z-1-001.zip'
uv run python tools/prepare_engineering_sketch.py motion/.native-ui/engineering-inputs
uv run python tools/prepare_engineering_video.py motion/.native-ui/engineering-inputs
uv run python tools/prepare_engineering_delivery.py --out motion/out/engineering-v2
```

The UI checkout must be the clean pinned `f333d67d490174d2f2b82d7c0671e08ee0943ceb`
revision already used for the OPAL replay. Use the native setup instructions to
obtain that source and its locked dependencies. No agent backend, LLM or cluster
connection is needed for this film.

From `motion/`:

```powershell
npm run engineering:check
npm run engineering:build
npm run engineering:preview
```

With that preview running, `npm run engineering:native-test` exercises adjacent
case selections and real WebGL loss/recovery in the native browser.

The preview serves port 3365. In a second terminal run `npm run engineering:measure`,
then build again so the measured pointer and scroll tracks are in the static
bundle. Finally run `npm run engineering:render`.

The range variables `ENGINEERING_START_FRAME` and `ENGINEERING_END_FRAME` select a
moving proof without changing its global source clock. Set
`ENGINEERING_KEEP_CHUNKS=1` for proofs if the same source fingerprint will be used
for the full render. A normal full render validates frame count and fully decodes
the result before removing successful chunk intermediates. Each ten-second chunk
uses a fresh browser to bound native mesh/DOM memory. Failed chunks are rebuilt;
validated chunks can be resumed. The renderer checks free space before each chunk.

Chunks are assembled using their exact video frame durations, with audio omitted.
Do not concatenate using the container's duration: Remotion can pad a nominally
silent ten-second chunk with AAC, adding 48 ms at each join. The assembler checks
60 fps, total frame count, duration, dimensions and absence of audio, and has an
integration test using deliberately padded AAC inputs.

For visible captions in the Codex player:

```powershell
uv run python tools/burn_review_captions.py motion/out/engineering-v2/engineering-demo-clean.mp4 motion/out/engineering-v2/engineering-demo.srt motion/out/engineering-v2/engineering-demo-captioned.mp4 --caption-position top
```

The footer preserves the full 1080p UI. Review the result at
`http://127.0.0.1:3365/review/engineering-v2/engineering-review.html`; it includes global chapter
jumps, an ordinary captions track, a visible cue display and a burned-caption
version toggle. The silent master remains separate.
This film's short captions sit at the top of the footer so fullscreen playback
controls do not cover them. Longer multiline scripts can use the bottom-aligned
default; in either position text stays outside the source UI.

## Evidence and presentation limits

- E4 frames 0–11 are different parameter cases, all at iteration 50. They are not
  an optimization time series. All twelve cases appear through a real scrollable
  grid; case selection updates the native viewport and file table together.
- E5 T001 contains eleven actual density frames, iterations 0–10. The saved
  definition lacks an iteration slider. The film replays the stored history with
  an explicit iteration label; it does not invent a slider gesture.
- Show the final design when Results first opens. Lower the display threshold
  before going back to iteration zero, whose initial density would otherwise
  disappear at threshold 0.50.
- The short T001/T009 trials are not converged production designs. Their meshes
  and objective scales differ. The unitless E=1 test does not justify the saved
  stress field's MPa label; a scoped viewer adapter suppresses stress/displacement
  unit labels while preserving all original GLB bytes and numeric values.
- The final dashboard was published after the recorded trials. The film shows
  recorded execution first and inspects the dashboard afterward. Its Run/Save/
  Discard buttons have not been qualified as live routes and are not staged as
  causes of those historical jobs.
- Native tool states are repaired only for identities with completion receipts
  in the source ledger. Failed attempts are not relabeled successful.
- Captions and ElevenLabs jobs use global editorial windows. Import actual
  returned alignment before describing them as speech-aligned. No voice service
  is called by the preparation scripts.

## Review lessons

Wait for the model **and the requested native tab** before acknowledging a frame.
An empty mesh list alone is not readiness for Setup. Native Radix tab activation
uses a mouse-down event; a synthetic `.click()` alone can leave the old tab open.

Scope table targets to the canvas. The same case identifier can also occur in an
earlier Markdown table in the chat. Normalize numeric selection values and do
not issue the same click repeatedly while the native selection settles.
Remember a pending click across render-frame effects: a new frame/nonce can
supersede the acknowledgement before React commits the selection. Retrying that
native toggle would clear the row. Test adjacent frames around case changes,
not only isolated settled poses.

Measure the actual mesh host, not a `display:contents` wrapper with a zero-sized
rectangle. Bound the canvas scroll viewport explicitly. Check legends and linked
file rows as well as the 3D geometry.

Prewarming thirteen mesh views also requires accounting for feature-detection
contexts. The pinned WebGL check creates an additional context on every call.
The scoped adapter caches its actual capability result and releases the probe;
it does not substitute a positive answer. Mark intentionally disposed native
scenes so their cleanup cannot poison a replacement viewer's loss gate. Genuine
unmarked context loss still displays the native Reload view control; the browser
test explicitly loses and recovers a real WebGL context.

Pointer targets are measured once from stable native poses. Travel starts shortly
before an action, never at frame zero toward a late target. The pointer stays in
a top-level portal, remains visible across chapters, and follows each threshold
thumb and orbit gesture continuously. Tool collapses and scrolling use the native
replay plus a baked, damped viewport track. Inspection holds include expansion and
restoration; both sources resume only after the return.

Measure at the encoded film's device scale factor (1.5 for the 1920×1080 output).
A 1× measurement moved Vega's first plotted point about 13 CSS pixels from its
1.5× position because the auto-fitted axis margin differed; the final point stayed
put. A cursor near a dot is not a hover. The native browser check must see the
actual value tooltip at both measured endpoints. Readiness also waits for the
requested trial data and stable mark geometry, not merely an existing SVG.

Give both meshes in the comparison explicit equal tracks. The native lazy-view
wrapper sits outside the mesh's flex-weight host, so weights alone do not fix
intrinsic-width feedback. The film scopes equal two-column grids to `filmPair`
and the studio's `hexViews`.
Test direct seeks and arrival through drawer expansion, measuring actual
`data-slot="a2ui-mesh-viewport"` hosts, not zero-sized `display:contents` wrappers.
Require positive widths, then inspect the encoded boundary pair.
An isolated-flicker scan misses a persistent layout jump. Large frame differences
may also be legitimate scrolling or a chapter cut; inspect their cause.

The stress inspection uses the native mesh probe, followed by the first and last
native convergence points. Pointer coordinates are measured from the actual
canvas and SVG marks. Dispatch the renderer's pointer events and wait for its
real tooltip before acknowledging the frame: MouseEvent alone does not activate
the pinned Vega SVG tooltip. The browser test checks two distinct field samples,
the source curve values and tooltip cleanup before the next tab.

Finish this film on the expanded saved result. Returning to a split layout made
the convergence plot extend below the viewport and exposed a stale baked chat
offset after text reflow. The closing instead shows an explicit Results-tab
click and one short orbit; the result, legend and curve remain completely in view.

Check the encoded footage. Stills, passing tests and successful decoding cannot
establish readable motion or a convincing story. Keep concrete findings in
`motion/review/engineering/` and the review receipt beside the final deliverables.
