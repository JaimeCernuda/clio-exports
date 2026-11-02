# Creative handoff: CLIO, a composable agent

## Goal and aim

Create a polished motion-graphics advertisement that makes one idea immediately
understandable: **CLIO can become the agent you need by composing plugins.**
The viewer should see both specialization across many domains and the ability to
add capabilities to an existing agent. The intended outcome is interest in
building their own CLIO agent, followed by a clear URL and QR call to action.

This is for PR and social media. Earlier session videos were technical
presentation demos; their transcript pacing, app shell and two-column layout
are not the template for this film. The user wants a designed advertisement with
purposeful motion, strong hierarchy and a coherent visual argument. Follow the
concept, not an arbitrary sequence of interface clicks.

## Summary of the user's messages and ideas

These points summarize the conversation; they are not a verbatim transcript.

1. **Lead with what the agent can become.** The initial suggestion was “A genomic
   agent,” delete/rewrite the domain several times, then “a composable agent.” The
   user later preferred showing many more possibilities and proposed an
   accelerating wheel that resolves into “composable.” Their final correction was
   to choose one device: either a vertical wheel with fixed surrounding words or
   delete/rewrite, never a mixture. The current cut uses the vertical wheel.
2. **Make the brand lockup deliberate.** CLIO joins the phrase on the left and a
   plus appears on the right. The owl, CLIO, words and plus must align as one
   measured composition. The user repeatedly rejected misalignment, excess
   headers, a generic robot replacing the owl, `clio/standard` metadata and a grey
   “System prompt” label. The real CLIO logo matters.
3. **The middle is a stylized product composition.** The opening and ending are
   advertising; the middle can be a pseudo demo using real CLIO visual elements.
   Use the agent/plugin card, plus, chooser, prompt text and contribution rows.
   They may be enlarged, reshaped, reflowed and improved for the film. They do not
   have to remain arranged like the application. Do not reproduce the entire UI.
4. **Show composition changing the prompt.** Their motivating idea was to add a
   domain plugin, see “You are CLIO” become a domain-specific identity, then add
   another plugin and see new instructions inserted into the existing prompt.
   Removal should remove the relevant contribution. Stable text should remain
   anchored while changed words/lines animate. The prompt should feel like a
   real, extendable instruction document rather than three decorative sentences.
5. **Plugins are the unit of addition.** Plugins can change the prompt and bring
   several skills, MCP servers, tools, hooks and other capabilities together.
   Skills and MCP servers are not directly added as independent objects in this
   story. Show their relationship to the owning plugin and the effect of adding
   more than one plugin. Colored sections alone do not communicate this.
6. **Demonstrate addition and different domains.** Showing only a Manufacturing
   build misses breadth; showing only identity replacements misses composition.
   The user compared composition to adding slots or puzzle pieces: bring more
   pieces and build your own agent. Their examples included adding Genomics,
   removing it, adding Manufacturing/Factorio, adding a simulation capability
   such as Abaqus, and trying other domains. These were illustrative suggestions,
   not a requirement to advertise particular installed plugins.
7. **Use concrete, understandable fields.** Manufacturing and genetics/genomics
   are useful examples, alongside many more fields. Three domains make the
   product appear limited to three presets. Avoid OPAL or other scientific case
   names from prior demos, and avoid explaining core, shell, filesystem or
   dependency trees. Those details distract from the concept.
8. **Use restrained, readable art direction.** A white background, navy CLIO
   branding and distinct domain background colors were suggested. Prompt text
   should be uniform and good looking. Identity must agree with the active
   domain; do not show a Manufacturing plugin while leaving an unrelated CLIO
   identity as the settled result. Show enough of the composed prompt to make
   extension credible without overwhelming the frame.
9. **Finish with ownership and a next step.** The user suggested “Make your own”
   or “Build your own,” CLIO, a link and a QR. Several domain transformations can
   lead into that ending. The text-change effect is central, not an afterthought.
10. **Exercise creative judgment.** The user explicitly asked for researched
    motion-advertising thinking, not literal obedience to each rough suggestion.
    Apple/Google/Claude/Codex-style product advertisements and a supplied Quests
    film were craft references. The aim is their clarity and product-driven
    motion, not copied imagery, layouts, copy or audio.
11. **Make actions read correctly.** Adding a plugin must use plus. Do not turn
    that plus into X while the cursor is still over it. Show the first removal
    explicitly, then remove its instructions and capabilities together.
12. **Accelerate the changes themselves.** Shorten successive word intervals
    along a smooth curve and derive blur from that cadence and movement. Avoid
    either early full blur or removing blur entirely. The user's 3-to-0.5-second
    example described the ramp; the current editable choice is 1.2 to 0.2 seconds.
13. **Keep the call to action clear.** The link needs no arrow. Enlarge both the
    URL and QR without adding more closing copy.

## What was rejected

- Screenshot slideshows, presentation slides and long static two-column layouts.
- A technical UI walkthrough disguised as an ad, including unnecessary app
  navigation, a full inspector header, core/dependency explanations or tiny text.
- OPAL/plant-science case material in this general composability advertisement.
- Only three domain examples; only building one domain; or only rewriting an
  identity without demonstrating additive capabilities.
- Mixing typing/backspacing with a wheel in the same opening.
- Oversized disconnected title rows, misaligned brand/plus, missing owl,
  robot substitutes, `clio/standard`, and grey inspector labels.
- Arbitrary color changes without clear plugin ownership, or depicting standalone
  skill/MCP additions.
- Instantaneous row replacement, cards covering text, leaked/flickering glyphs,
  disappearing/teleporting cursors, unreadably brief bundles and unexplained
  plugin arrivals. Technical checks did not excuse these problems.

## Current implementation: v11

The opening keeps the vertical domain wheel and aligned CLIO/plus lockup. Twelve
successive changes smoothly shorten from 72 to 12 frames at 60 fps. Continuous
motion crosses the word centers; directional blur derives from the effective
change period and actual motion, then clears when the wheel settles.

The prompt now holds one fixed position, scale and rectangle on the left.
Manufacturing, Simulation and Reports form a persistent capability tree on the
right. Matching plugin colors mark actual changed prompt fragments. Skills, MCP
servers, tools and hooks visibly grow beneath their owner and leave when that
plugin is removed. Reports persists across the later domain changes. There are
no dotted capability-count summaries or repeated prompt zoom/refocus cycles.

Simulation and Reports use plus clicks, then confirmation checks. X appears only
after the cursor leaves. Explicit X clicks first remove Simulation, then
Manufacturing, leaving Reports. A plus click adds Genomics in the vacant slot
before the remaining domain transformations. The fixed prompt does not refocus.
The film ends with Build your own, CLIO, a 42 px URL without an arrow and a 288 px
QR with a five-second settled hold. V11 is 41.23 seconds, 1080p, 60 fps with
original procedural sound. Copy and timing remain in story/composable-ad.json.

This is a **working baseline awaiting creative approval**. The user's latest
direction adds a gradual cadence-driven blur ramp, correct add/remove controls
and a clearer closing CTA to the fixed prompt and owned capability tree. Do not
interpret successful rendering, passing tests or this handoff as approval of
the art direction or proof that no further visual defects exist.

## Implementation and evidence boundaries

The UI vocabulary was checked against a pinned open-source gact-tui revision;
[references/ui-sources.json](references/ui-sources.json) records files and hashes.
The prompt and domain plugins are editorial illustrations, not a complete
backend-resolved prompt, installed catalogue, successful MCP connection or agent
run. No LLM inference or session replay backend is required for this ad.

The preceding V9 passed 107 motion tests and 120 Python tests in the original repository.
Review measured actual browser geometry and inspected sampled encoded frames,
including an 801-frame paint-boundary audit. These are technical and frame-review
results, not human-equivalent uninterrupted playback/listening or creative
approval. [The v9 receipt](docs/reviews/review-ad-v9.md) contains the exact checks
and limitations. The source was subsequently consolidated here; the portability
receipt records validation after that move.

The historical [v10 review](docs/reviews/review-ad-v10.md) records the fixed prompt
and capability tree; its control and wheel treatment was subsequently corrected.
The current [v11 review](docs/reviews/review-ad-v11.md) records those corrections.

## Continuing the work

Read this handoff, [ART-DIRECTION.md](ART-DIRECTION.md),
[the focused skill](skills/clio-composable-ad/SKILL.md) and the latest review.
Use the source map and commands in [README.md](README.md). Preserve both additive
composition and domain breadth when changing the treatment. Evaluate whether the
idea reads at normal viewing size, not only whether individual frames are clean.
Prefer one strong visible cause-and-effect chain over more labels or gestures.

The complete current project lives in `ad/`. Other demo campaigns remain outside
it. Keep user-machine render/cache writes on D:, preserve original exports and
final videos, and clean only owned rebuildable intermediates. Source and lessons
belong in Git; generated videos do not. Direct pushes to `main` in clio-exports
were explicitly authorized. Use conventional commits without agent attribution.
