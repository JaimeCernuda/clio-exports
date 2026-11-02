# CLIO: a composable agent

Thirty-second, silent, 1920 × 1080 / 60 fps social cut. A native-style agent
composition panel opens beside its editable prompt. Slurm contributes an actual
prompt fragment and the `hpc-batch-jobs` skill. Switching to Factorio changes the
agent identity. Adding NDP contributes the declared MCP server. Faster switches
to EarthScope, OPAL and CLIO Data lead to **Build your own. / CLIO**, the website
and a stationary QR code for more than five seconds.

This is a configuration film, not a recorded agent run. It makes no execution,
cluster-performance or generated-result claim. Prompt bodies are selected source
fragments, not a complete prompt. Operating guidelines, Rendering and Domain are
kept compact in the shot; missing fragments are not invented. The exact identities
and displayed fragment bodies come from CLIO's real composer. Switching agents
and adding plugins remain different actions. Factorio already carries Slurm.

## Editable source map

- [Prompt inputs and source receipts](../../motion/data/composable-prompts.json):
  seven configurations, exact role text, original fragment bodies, prompt digests,
  source revisions, per-file SHA-256, selected plugins and the declared MCP names.
- [Source preparation](../../tools/prepare_composable_prompts.py): imports agent
  class identities and actual prompt records, then calls CLIO's `compose` function.
  It does not replace the full resolver, connect servers, execute tools or infer.
- [Film](../../motion/src/ComposableFilm.tsx),
  [native-derived panel styling](../../motion/src/composable.css),
  [word measurement/rendering](../../motion/src/PromptMorph.tsx),
  [matching and motion](../../motion/src/prompt-morph.ts),
  [timeline](../../motion/src/composable-plan.ts),
  [continuous pointer](../../motion/src/composable-pointer.ts).
- [Dedicated Remotion entrypoint](../../motion/src/composable-index.tsx):
  `ClioComposable`, 1800 frames. No transcript backend or separate native server.
- [QR generator](../../motion/scripts/prepare-composable-qr.mjs),
  [reusable SVG](../../motion/public/composable/clio-qr.svg).

The panel presenter adapts the production `ComposedPromptView`, agent controls,
source badges, native fonts and CLIO light palette. Their exact source revision
and file receipts are in the input JSON. Panels are deliberately reflowed for the
film; this is not a claim that the installed app animates prompt edits this way.
The original exports, other films and their source pins are unchanged.

## Regenerate

Install the repository's Python and `motion/` Node lockfiles as usual. Keep this
checkout, TEMP/TMP/TMPDIR, package caches and renders on the project drive (D: on
the current machine). The checked-in input JSON is enough to render. Refresh it
only when intentionally changing the source revision:

```powershell
uv run python -B tools/prepare_composable_prompts.py `
  --backend-source D:/path/to/clio-agent `
  --marketplace-source D:/path/to/clio-agent-marketplace `
  --ui-source D:/path/to/gact-tui `
  --out motion/data/composable-prompts.json
```

From `motion/`:

```powershell
node scripts/prepare-composable-qr.mjs
node render.mjs video --composition ClioComposable --scale 1 --concurrency 4 --output out/composable/clio-composable-v1.mp4
```

The renderer isolates temporary files on D:, checks free space, waits for fonts,
measures the actual DOM word wrapping, acknowledges readiness, encodes BT.709
video and removes its successful native intermediate. Every pose follows the
render frame; the film contains no wall-clock CSS transitions or timer-driven typing.

## Review and extension

Generate the actual browser geometry (the verbose measurement log stays local):

```powershell
node render.mjs stills --composition ClioComposable --scale 1 --frames 1750 --props examples/composable-measure.json > review/composable-measure.log
npx tsx scripts/review-composable.ts out/composable/clio-composable-v1.mp4
```

The review checks every edit frame against measured word boxes, detects visible
word collisions and clipping, checks pointer continuity, decodes the QR from the
encoded movie, fully decodes all 1800 frames and measures the settled end for
flicker. Inspect encoded moving passages as well: numerical checks do not approve
the creative direction. Rendered movies, measurements and review PNGs stay local.

The text engine scopes matching by source fragment; unrelated repetitions cannot
jump between sections. Within a changed paragraph, ordered phrases are stable
anchors. Isolated common words are replaced instead of flying across the paragraph.
Inserted cards open space before their words become visible, and the text stays
clipped to the growing card. Removals reverse the layout change. New plugin chips
wait until retained chips vacate their slots. Fonts and both word layouts are
measured before capture, including wrapping at the final output size.

Use the timeline and input JSON to change agents or contributions. Do not hand-edit
source prompt sentences to make them sound better, invent tools, imply an NDP
server is already connected, or display Slurm as a new addition to unmodified
Factorio. A future scientific-result beat needs its own genuine recorded evidence.

Current status: first complete social cut for user review; not creatively approved.
