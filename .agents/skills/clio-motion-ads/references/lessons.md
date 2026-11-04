# Lessons from the composability advertisement

These are observations from the user's feedback and the V1–V14 revisions, not a
universal visual template. The complete
[creative brief and message summary](../../../../composability/ad/HANDOFF.md),
[art direction](../../../../composability/ad/ART-DIRECTION.md) and
[review history](../../../../composability/ad/docs/reviews/) retain the detail.
The current retained movie is V14: 36 seconds, 1080p60. Historical movie files were
pruned at the user's request; their source history and review receipts remain.

| What went wrong                                                                                     | What to carry into the next ad                                                                                                             |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| A full app header, large title row and static information panels made an ad feel like a slide deck. | Design the visual argument first. Use familiar product pieces in a composition suited to the claim.                                        |
| Literal compliance with a long list of suggestions produced no coherent story.                      | Interpret the intended outcome and select actions that make that outcome visible.                                                          |
| A ten-second keyword opening delayed the hook.                                                      | Land the idea early. V13 resolves the wheel at four seconds and is already quick by Materials/Chemistry.                                   |
| Three domains suggested three fixed presets.                                                        | When breadth is the claim, convey more possibilities; do not apply an arbitrary domain count to unrelated subjects.                        |
| Combining delete/retype and rotation made the opening inconsistent.                                 | Commit to one device for a given phrase.                                                                                                   |
| Blur appeared too early, or vanished when acceleration was revised.                                 | Tie blur to actual movement and a gradually shortening interval; clear it on the resolved state.                                           |
| Identity changed, but skills, tools, hooks and MCPs were effectively absent.                        | Show the real consequence of a configuration change, with contributions visibly owned by their plugin.                                     |
| The active Manufacturing plugin retained an unrelated CLIO identity.                                | The settled identity and instructions must match the active domain.                                                                        |
| New plugins appeared before the cursor clicked their local plus.                                    | Use the actual causal sequence: global plus, chooser, select, dismiss, insert, reveal contributions.                                       |
| Plus changed into X under the cursor, making addition look like removal.                            | Confirm the add, move away, then expose removal. Show an explicit removal before its effects withdraw.                                     |
| Each addition enlarged and shrank the same prompt, creating repeated visual resets.                 | A stable prompt and persistent tree worked for this film. Reuse that stability principle without forcing every future ad into that layout. |
| Subtle changes were hard to see; unchanging material competed with them.                            | Highlight changed fragments with their owner's color, preserve stable text and give the change one clear visual focus.                     |
| Text matches pulled repeated words across unrelated sections.                                       | Match ordered phrases within their source fragment and measure the destination wrapping.                                                   |
| Clean held frames concealed collisions during menu extraction and object travel.                    | Inspect the transitions. Preserve source geometry at detachment and clear occupied space before expansion or travel.                       |
| Hidden text leaked outside moving cards in the encoded result.                                      | Unmount hidden contents, use paint containment/clipping and inspect encoded frames across render workers.                                  |
| Cursor fades, teleports and uneven speeds distracted from the action.                               | Use a continuous route and frame-derived feedback; include the whole entry/exit path in review.                                            |
| A completed morph had only a few frames to register before the next transformation.                 | Budget settled viewing time after completion. A long transition is not a readable hold.                                                    |
| Tiny URL/QR and added arrow decoration weakened the close.                                          | Give the requested next action enough size and a stationary hold. Keep credits subordinate and logos transparent.                          |
| Many review rounds accumulated duplicate movies and caches.                                         | Keep a portable source project and latest delivered movie; document obsolete local paths and remove authorized redundant outputs.          |

## What is specific to this film

The white/navy/pastel palette, accelerating vertical domain wheel, fixed prompt,
persistent plugin tree, retained Reports plugin and “Build your own” close form
the composability treatment. The transparent GRC credit was a later explicit user
request. Treat these as reusable ingredients and case evidence, rather than the
required art direction or wording for the next capability.

The supplied Quests video and the creator references in the art-direction note
were craft references. The implementation uses editable React/DOM/SVG in Remotion,
frame-derived motion, measured text morphing and original procedural audio.
There is no requirement to introduce GSAP or rebuild the toolchain to achieve a
different effect.

## Where the reusable implementation lives

- [Story, copy and timing](../../../../composability/ad/story/composable-ad.json)
- [Scoped word matching](../../../../composability/ad/src/prompt-morph.ts)
  and [measured prompt rendering](../../../../composability/ad/src/AdPrompt.tsx)
- [Wheel clock](../../../../composability/ad/src/wheel-timing.mjs)
  and [causal chooser clock](../../../../composability/ad/src/plugin-choice-timing.mjs)
- [Render entrypoint](../../../../composability/ad/render.mjs),
  [sound generator](../../../../composability/ad/scripts/finish.mjs)
  and [encoded/geometry reviewer](../../../../composability/ad/scripts/review.ts)
- [Source-ledger files and craft references](../../../../composability/ad/references/)
- [Independent website loops](../../../../composability/website/README.md)

These helpers are available to adapt. Their current story timings, selectors and
pixel bounds belong to the composability film and must be remeasured for a new
composition. The fact that V14 passes technical checks is not blanket creative
approval of the treatment or of a new film made with the same code.
