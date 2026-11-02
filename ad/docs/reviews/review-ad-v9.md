# Workflow additions: action before effect

Superseded by [v10](review-ad-v10.md). Further feedback requested less early blur,
colored actual text edits, persistent capability branches and fixed prompt
framing instead of repeated inspection/refocus. Creative approval was not given.

- Local movie: `motion/out/composable/clio-composable-ad-v9.mp4` (not committed).
- SHA-256: `37c275577f0a5dd2a2ec14185130fe25cf86a0e272992b0a08161f33e0fc5bae`.
- 1920 × 1080, 60 fps, 2336 frames, 38.93 seconds, 8,339,421 bytes.
- Original procedural sound; measured peak −17.0 dBFS, no detected clipping.

## Finding and correction

V8 repaired the first picker selection but showed Simulation and Reports arriving
from the edge without a visible add action. The later additions therefore lacked
the causal step established by Manufacturing.

Each workflow plugin now has a 48-frame offer beat after the previous inspection
has finished. The prompt first makes room. A closed plugin row appears with an
add control; the pointer approaches, hovers and presses it. The existing prompt
stays unchanged until eight frames after the press. That same row then opens its
owned contributions while the prompt extends. Its plus rotates into removal as a
single glyph, without an overlapping plus/X crossfade. The pointer departs before
the new prompt lines finish arriving. The click sound uses the same timing cue.

Browser measurements compare frames 933/934 for Simulation and 1199/1200 for
Reports. Both card rectangles stay at x 1300, y 300, width 470, height 76. Both
label rectangles also match exactly across the handoff, with zero displacement
or size change. The earlier Manufacturing menu-row continuity fix remains.

The film grows by 1.6 seconds to accommodate these actions. Reading holds remain
1.8 seconds for Manufacturing and 1.1 seconds for Simulation and Reports after
their final contribution row becomes fully visible. Reports remains through the
later domain transformations. The opening wheel and five-second closing hold
remain in place.

## Checks and review

All 107 motion tests and 120 Python tests pass, with zero skips. TypeScript,
Prettier, Ruff and pyright pass. The new behavior check requires a fully visible
offer and pointer press before any instructions change, unchanged geometry at
handoff, and bounded pointer movement while visible.

The review script checks all nine prompt layouts, uniform typography, opening
alignment, all eight compact plugin headers, initial menu extraction and both
new add handoffs against actual browser measurements. It checks offered cards
against the occupied prompt as well as the existing inspection/transfer paths.
No word collisions or component occlusions were reported.

The encoded paint audit covers 60 extraction frames, 96 offer frames and 645
inspection frames: 801 frames total, including all render workers. It reports no
unexpected dark paint outside the expected component bounds. This is a
downsampled boundary check with codec-edge tolerance, not an exhaustive check of
interior rendering quality.

Encoded-frame visual review covers a one-frame-per-second whole-film sheet,
10 fps strips of both complete offer/click/open/reveal sequences, and a half-size
selection still. These show the pointer approaching the control, an intact prior
prompt at the click, the card expanding in place, and the subsequent instruction
addition. Evidence stays locally in `motion/review`.

The movie fully decodes with the expected dimensions, frame count and audio.
Its QR decodes to `https://clio.iowarp.ai/`. Maximum mean luminance frame difference
during the settled final five seconds is 0.0986073 on a 0–255 scale.

Review uses encoded frames and measured geometry, not human-equivalent
uninterrupted playback or listening approval. Creative approval remains pending.
The domains, plugin bundles and shortened prompt are editorial illustrations,
not an installed catalogue or recorded backend run.
