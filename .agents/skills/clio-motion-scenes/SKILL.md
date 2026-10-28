---
name: clio-motion-scenes
description: Author or revise CLIO promotional scenes using editable React/DOM/SVG UI components and genuine exported session evidence. Use when panels must reflow, isolate, zoom or transform for a film.
---

# CLIO scene authoring

Read [clio-videos](../clio-videos/SKILL.md) for shot selection, then the
[brief](../../../motion/BRIEF.md) and [UI API](../../../motion/UI-KIT.md).
Use the example to demonstrate a CLIO capability; avoid turning the film into an
explanation of that example. Decide what the viewer should understand, then stage
the relevant real actions. Write specific copy; the source concept's look and
wording are not a style prescription.

## Build with shared components

For an accelerated conversation, use [REPLAY.md](../../../motion/native/REPLAY.md)
and `NativeConversationReplay`. Keep one native log: calls accumulate, completed
activity collapses, public agent text streams, generated UI appears inline, and
the next turn arrives at the bottom above the composer. The fixed two-column
narrative treatment was rejected for turning this flow into slides. Do not make
it the default for a campaign. Adjust event selection/timing in `ReplayEdits`.
The accepted direction is a slightly wider view with no navigation rail: chat at
center-left, story in native canvas tabs on the right. Show actual NDP selection,
connection/download and generated results there. Freeze the conversation for the
whole inspection and pullback; resume only after returning to the wide view.
A close-up must reveal something worth attention; it does not require a gesture.
Routine resource selection can stay in context. Skip generic map zooms and
arbitrary text highlights. Do not replace
the log with a fixed explanatory excerpt or add camera pulses over advancing text.
Use the complete production `ClioWorkbench`, including native file icons, tab
overflow and controls, aligned to the top of the workspace. Preserve full inline
widget heights; scroll the log rather than imposing artificial image/map crops.

The later review rejected slight whole-window scales and isolated tooltips as
insufficient inspections. When a useful inspection needs more space, the native
canvas maximize control can reflow the actual view. Inspect meaningful observations
or operate relevant local controls, then restore it before resuming chat.
Do not maximize every view. A duplicated inline/drawer plot
must not remain the focus shot. Use `FocusBeat.canvas`, `observations` and optional
`chartHeights`; see [the connected story workflow](../../../motion/story/README.md).
Check plot titles, axes and relevant observations in the rendered moving shot.

When an interaction advances the story, demonstrate its effect on data: change a baseline, select months, move an hour slider,
select a plotted observation and show its linked row, or use native Zoom to
selection and Reset zoom. Use `controls` for deterministic ChoicePicker/slider
tracks and `observations.select` for real Vega selections. Include an actual
native export when useful; run the local export recorder and inspect the saved
file. These are techniques, not required beats. An uninformative cursor pulse,
tooltip or camera move is not a useful payoff.

Use [the pinned production components](../../../motion/native/README.md) to
establish fidelity first. The earlier kit below was rejected for its shell,
oversized hierarchy and inaccurate conversation rendering; palette and icons do
not establish recognizability. Reuse its motion techniques only where useful.
Preserve native Markdown and the ordered text/activity/A2UI/artifact blocks.
For Tahoe, include or deliberately select from all three exchanges; do not flatten
the four rich surfaces to screenshot crops or treat an artifact record as proof
that its file bytes were captured. Keep deliberate editorial omissions explicit.

For the moving native treatment, read [FILM.md](../../../motion/native/FILM.md).
`ClioNativePromo` uses a native React stage with frame-controlled poses and a
paint-acknowledgement bridge. Keep native components mounted/preloaded; wait for
the actual map geometry/background and chart before acknowledging a frame.
The full-session preview's asynchronous loading is not itself a render timeline.
The render path is not a story. Show the recorded question, relevant agent
explanations/thoughts, the work and its outputs, then the generated view and the
agent's conclusion. Retain the actual widget-generation action before revealing
the map or chart. Give those passages enough reading time; the longer cut has no
25-second limit.
Do not put production notes such as "recorded session", "selected activity",
"time condensed", or duplicate source-credit strips over the film. Keep those
details in the handoff. Native map attribution stays with the map.
The current film omits ZIP/reproducibility output per the user's direction;
its map and follow-up chart are the payoff. The USGS cache is geographic context
added for presentation, not captured scientific evidence. Preserve attribution.
New sessions use `tools/prepare_native_scene.py` and the native preview's Session
chooser; see its README. Do not clone a Tahoe component or hardcode new turn
names/counts to ingest another transcript. A source-linked `turn` starts at a
message ID; the host handles assistant-only children without adding a fake prompt.

For historical animation examples only, import from `motion/src/ui`, import
`ui/theme.css` once, and give the scene root
the `clio-ui` class. Wrap with `ClioUIProvider` for film-specific interface labels.
`WorkspaceChrome`, `Composer`, `ConversationMessage`, `AgentCard`, `ActivityRow`,
`Panel` and `SourceText` accept independent content, source IDs and geometry.
See [ComponentGallery.tsx](../../../motion/src/ComponentGallery.tsx) for a runnable
example and [Film.tsx](../../../motion/src/Film.tsx) for the first choreography.

Use saved identities in component provenance props. AgentCard needs only an ID,
name and agent label; do not manufacture terminal status for an unfinished child.
Use its explicit `status` label/kind override for paused or unknown activity;
absence of a final reply does not itself mean the child is running.
SourceText renders escaped editorial text, not executable archived markup.
Preserve truncated excerpt markers in the data and make editorial omission clear
when its absence could change a claim.

Keep copy, evidence and major timing/layout controls separate. Derive motion from
`useCurrentFrame`, props and deterministic math; call hooks at component top level.
Avoid CSS clocks, wall time and uncontrolled randomness. Native text and panels
must remain editable; screenshots may support a shot but cannot replace this UI
reconstruction. Use concept graphics when the product cannot directly show the
idea, keeping the claim grounded in records.

Register a named composition in `src/Root.tsx`. Keep default props as literals so
Studio can find and edit them. Supply Remotion's `Img` through `brandMark` when
asset readiness matters; the shared UI also supports ordinary React images.

## Iterate on the shot

From `motion/`:

```text
npm run studio
npm run stills -- --composition ClioComponents --frames 0,240
npm run stills -- --composition ClioComponents --frames 240 --props examples/gallery-activity.json
npm run render -- --composition YourComposition --scale 1 --output out/draft.mp4
```

`--props` supplies a JSON object; `--scale 2` renders vectors/text at 2x DPI.
`--concurrency` selects 1–8 render pages. Use short draft compositions while
designing, then render the chosen output size. Do not spend a long final render
before checking the transition frames.

Inspect crowded in-between states, not only settled layouts. The first proof
revealed duplicate text under nested fading activity rows in the headless render;
discrete tool-event visibility and separate panel exit/entry fixed that case.
Check the current output before applying a workaround universally.

Use [clio-motion-review](../clio-motion-review/SKILL.md) before delivery. Ask for
creative feedback on a concrete moving cut; engineering checks do not approve
story, taste or pacing. Sound, captions, duration and art direction remain choices
for the actual film rather than fixed rules inherited from this prototype.

Additional NDP films select `campaign=alta` or `campaign=konza` through the shared campaign catalog. Keep each source, event selection, focus mark labels and measured layout separate; do not clone the UI implementation. Alta omits its reproduction turn. Konza starts with retained NDP data and must not depict a new download. See REPLAY.md for exact compositions and editorial scope.
