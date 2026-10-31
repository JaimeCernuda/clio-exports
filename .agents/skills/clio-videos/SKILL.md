---
name: clio-videos
description: Plan, build or revise CLIO product videos from real exported sessions using the native UI replay in this repository. Use for story, shot selection and the full film workflow; route implementation and review to the motion skills.
---

# CLIO product videos

Start with the [video catalog](../../../videos/README.md) and the selected film's
guide. Shared runtime architecture is in
[EMULATOR.md](../../../motion/native/EMULATOR.md). For manual CLIO + SPOTTER
attention with local tensors/tokenizer, use
[MANUAL-ATTENTION.md](../../../motion/native/MANUAL-ATTENTION.md) and
`tools/launch_attention_replay.py`; a film sidecar cannot answer arbitrary selections.

Campaign-specific direction takes precedence: the OPAL/SPOTTER film centers
SPOTTER-AI. Use its complete supplied logo, with OPAL, CLIO and Flowcept supporting
the investigation. Keep logo backgrounds transparent and omit enclosing cards.

For Daisy's engineering studies, use the [engineering film guide](../../../motion/native/ENGINEERING.md)
and its source-linked plan. Distinguish independent sweep cases from actual
iteration history. Preserve historical execution before dashboard inspection;
an exported Run button is not evidence that it launched a recorded job.
For cluster work, distinguish the invocation acknowledgement from the background
task and solver runtime. A short tool call can start a long watcher. Use scheduler
accounting for per-case durations; never advance an elapsed clock over a stale
queue snapshot, which falsely implies that queued cases started at the next
observation. A brief explicit time cut is preferable when intermediate timings
are absent. The engineering guide records the rejected job-grid treatment and
the verified twelve-case timings.

Read [SPOTTER lessons and open defects](references/spotter-lessons.md) before
reusing that demo. The full cut remains revision required: the user reported
incorrect reviewer stalls, disappearing pointers and pointers below UI elements.
The current code and technical checks do not establish that these are fixed.

CLIO is the subject. A scientific session gives its capabilities something real
to act on; explaining the dataset is not the purpose of the promotion. Read the
[brief](../../../motion/BRIEF.md) and [NDP campaign lessons](references/lessons.md).

## Choose what deserves screen time

Write the viewer takeaway and a short causal sequence: question → relevant work
and public agent explanation → useful result. Select genuine source events before
adding motion. Omit packaging/reproduction exchanges unless the requested story
is about reproducibility. Research actual data producers and repositories when
attribution matters; an NDP collection is not an endorsement.

For each proposed inspection, name the observation or decision it reveals. Keep
routine data selection in the ordinary workspace. Chat can stay at center-left
while native canvas tabs on the right tell the story. Maximizing every panel is
not a default. A map does not earn a zoom merely because it has zoom controls.

Choose the lightest useful treatment:

- Stay wide and move on when the output is already clear.
- Reframe or expand a view when it reveals a meaningful detail.
- Interact when the resulting change advances the point: compare baselines,
  narrow a time interval, select an observation and show its linked row, pan to
  an important map feature, or export a useful figure.

These are options, not a checklist. Avoid arbitrary text selection, token hovering,
resource clicks, map zooms or downloads just to make something move. Use actual
product controls. If an interesting interaction is unavailable, simplify the shot
rather than inventing unsupported behavior.

## Reuse the working pipeline

Use [clio-motion-stack](../clio-motion-stack/SKILL.md) for setup, transcript import,
the pinned production UI adapter and packaging;
[clio-motion-scenes](../clio-motion-scenes/SKILL.md) for source-ordered chat and
editable canvas choreography. Commands are in the [replay guide](../../../motion/native/REPLAY.md)
and [connected-story workflow](../../../motion/story/README.md).

For study/workflow walkthroughs, read the [Wordle replay guide](../../../motion/native/WORDLE.md).
The first Wordle cut was rejected for a dotted label-heavy opening, choppy chat,
long completed-tool holds and a crawling first pointer move. Use the NDP measured
viewport treatment for continuous conversation motion. Give the first pointer
action an explicit travel interval; never interpolate from frame zero to a late
first click. Do not inherit SPOTTER's long-thinking holds for short tool groups.
Wordle now uses a brief completed hold and collapse based on the last activity,
not the arrival of another assistant sentence. Raw export delivery bursts need
readable public-text pacing and idle compression on the common source clock.
Prefer the Science Log graph when the story concerns relationships and growth;
use its native record inspector and Sources rather than switching to long lists.
Expand the canvas when needed to keep the selected record visible. A study's
saved final workflow is a topology reference, not its state at every earlier
frame. Project task lifecycles and scientific status mutations onto the same
source clock as all delegated conversations. Native elapsed timers must use
that recorded clock too. Distinguish independent runs when switching to another
run's views; keep their strategies, seeds and conclusions separate.

Validate interactive view changes against the rendered marks or underlying rows,
not only the selector label. Measure positive geometry on actual native view
hosts; protocol wrappers with `display:contents` return zero-sized rectangles and
can make equality checks pass falsely. Inspect encoded render-worker joins too.
Native query-column projection must retain fields
used by calculated Vega expressions. Re-read a choice binding after a newly
mounted chart subscribes so an early selector update cannot leave stale data.
Use a timestamped presenter script and optional sidecars for a live presentation;
editorial cue times become speech-aligned only after importing actual audio
alignment. The guide includes that reusable workflow.

For caption review in the Codex player, deliver a version with captions burned
into the pixels. The user confirmed that this player does not display the
embedded MP4 subtitle track. An optional mov_text track or external VTT is not a
visible caption review. Use `tools/burn_review_captions.py` to add a caption footer
below the full UI, preserve the clean master and editable sidecars, and inspect
the encoded longest caption as well as its timing. Keep the footer font in actual
output pixels; the ASS defaults otherwise produce oversized text.

Preserve tool accumulation/collapse, progressive public replies, widget generation
and the next turn at the bottom. Freeze the source clock throughout an inspection
and return. Keep the native shell, drawer tabs, icons, composer and rich view
behavior recognizable. Copy, source selection, layout, timing and pointer paths
remain editable.

Do not apply the NDP focus manifest as a template for every new session. The final
5:36 treatment was rejected for unnecessary full-screen data selection, an
uninteresting map zoom and arbitrary text highlights. A 7/10 pointer proof
established confidence in the pipeline, not approval of those editorial choices.

## Review the thing being claimed

For OPAL/SPOTTER, follow the [paired replay contract](../../../motion/native/OPAL.md).
Use one clock for both agents. Link each wake to its triggering answer and keep
receipt, queued work and input consumption distinct. Do not fabricate one review
reply per main answer. Hold both logs during inspections. Captured provider
thinking streams expanded for every primary passage. Use short completed holds
(currently 1.2 seconds; answers 0.6 seconds) and a visible 0.5-second collapse before
the next block. Keep the native content mounted through the frame-driven height
animation; closing a boolean disclosure in one frame is not an animated collapse. Preserve exported model/effort settings separately from playback.

Attention selections are useful for Understand attention: a few tokens, a phrase,
a whole answer and a clean contrast. Require exact native requests/responses,
source revisions and heat runs. Summary totals or another run's attention cannot
supply missing token heat. Reuse native highlights and minimap; do not replace
them with an invented heatmap. Keep source prompt offsets intact.

Use [clio-motion-review](../clio-motion-review/SKILL.md). Review a short moving
sequence containing the meaningful action, its result and the return to chat.
Check pointer travel, pauses and causal continuity, not only settled stills.
Diagnose flicker with adjacent frames and samples covering every capture worker.
Encoding checks and passing tests do not establish narrative quality or taste.

Keep captions short. Put production notes, lengthy provenance and validation in
the handoff. A longer cut needs additional story, not additional holds. Follow a
user's stop instruction: preserve sources and lessons without another unsolicited
render.

For Chain B, read the [current reference notes](../../../motion/native/OPAL.md#current-reference-chain-b-7795459). Check source-bound token heat in the browser; source totals with zero blocks are insufficient. Preserve both rendered selection text and the service canonical source text. Paragraph boundaries and literal prompt lists must pass whole-part projection before highlights can paint. Keep source-timed alerts and quarantine hidden until their actual delivery. Never imply that the later quarantine stopped an earlier answer; in this run all six main answers precede it.

For an attention demonstration, show the entire [native interaction](../../../motion/native/OPAL.md#attention-interaction-preview): drag-select the answer, click Understand attention, then scroll the same log to the source heat. Freeze both agents. Keep the selected answer visible while the banner opens, use a continuous measured pointer, and wait for actual native heat before scrolling. A settled heatmap still does not demonstrate this workflow.

Memoize frozen transcript projections and disclosure contexts while inspection frames advance. Check static regions of the encoded clip too. Parse frame-difference measurements as full floating-point values, including scientific notation; truncating an exponent can falsely report tiny encoding noise as large flicker.

Apply the same visible replay treatment to the reviewer: stream its captured
thinking, animate its spinner from the render frame, briefly disclose actual
notification contents, then compact them as work proceeds. A frozen thinking
summary beside a growing primary chat hides the review. Reduce nested transcript
padding and redundant vertical gaps before shrinking text. Show the native
selection action registry (including Add to chat and More details), not an
attention-only replacement. In the [SPOTTER film](../../../motion/story/spotter-film.md),
the recorded alert triggers the user's attention inspection. Keep that causal
order, including when the user makes a second selection.

Give completed reviewer tool calls a readable beat before the next thought opens.
Keep disclosure bodies mounted through their animated close, then release them at
zero openness; do not retain all completed Markdown/code views for a long replay.
Keep the pointer continuous across adjacent selections, with one deliberate exit
from the interaction rather than a fade-out/fade-in at each shot boundary.
Also inspect its actual visibility and stacking throughout the encode. Audit
reviewer freezes outside intentional inspections; shared-clock ordering and a
passing short proof are insufficient to approve concurrent activity in a full cut.
For fresh manual selections use the [live recorded-bundle setup](../../../motion/native/MANUAL-ATTENTION.md),
not the film's finite attention response sidecar.
