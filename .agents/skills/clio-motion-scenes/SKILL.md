---
name: clio-motion-scenes
description: Author or revise CLIO promotional scenes using editable React/DOM/SVG UI components and genuine exported session evidence. Use when panels must reflow, isolate, zoom or transform for a film.
---

# CLIO scene authoring

Read the [brief](../../../motion/BRIEF.md) and [UI API](../../../motion/UI-KIT.md).
Use the example to demonstrate a CLIO capability; avoid turning the film into an
explanation of that example. Decide what the viewer should understand, then stage
the relevant real actions. Write specific copy; the source concept's look and
wording are not a style prescription.

## Build with shared components

Import from `motion/src/ui`, import `ui/theme.css` once, and give the scene root
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
