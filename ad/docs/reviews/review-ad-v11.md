# Clear controls, gradual wheel cadence and a larger closing CTA

- Local movie: `ad/out/composable/clio-composable-ad-v11.mp4` (not committed).
- SHA-256: `50bd8e221906b9eed34f40e840889327ed813d9c80f8ffa6176ef88e81d04256`.
- 1920 × 1080, 60 fps, 2,474 frames, 41.233 seconds, 4,863,175 bytes.
- Original procedural audio; visual and sound wheel cues share one timing clock.

## Changes responding to the user

The previous rotating plus became X while the cursor was still above it, so an
addition looked like removal. Simulation, Reports and Genomics now use plus,
then a confirmation check. The remove control appears after the cursor leaves.
Two explicit X clicks remove Simulation and then Manufacturing. Their owned
instructions and capability leaves withdraw; Reports stays present. Genomics is
then added into the empty domain slot through a visible plus click.

The opening uses one vertical wheel. Twelve successive changes shorten along a
quintic timing curve, from 72 to 12 frames (1.2 to 0.2 seconds). Continuous Hermite
motion crosses word centers. Directional blur derives from effective cadence
and actual movement, rather than an unrelated elapsed-time ramp. Early fields
remain readable; late movement blurs and the final word is sharp. The exact ramp
is editable in the story data, not a general requirement for future films.

The closing link has no arrow. Its font increases from 29 to 42 px. The QR grows
from 224 to 288 px around the existing center and remains still for five seconds.
The fixed prompt, colored actual edits and plugin-owned capability tree remain.

## Validation and review limits

All 30 standalone tests and 108 motion compatibility tests pass with zero skips.
Both TypeScript checks and standalone formatting pass. The source-package and
video-catalog Python checks pass (3 focused tests); the full Python suite was not
rerun for these ad-only changes. Suites overlap; their counts are not additive.
The focused ad skill passes its validator.

Browser measurements cover all 11 prompt profiles, plugin headers, 30 capability
leaves, 44 fixed-prompt frames, the initial menu extraction and all three later
add handoffs. Five measured action frames verify the symbol and cursor hotspot:

| Frame | Plugin | Control |
| --- | --- | --- |
| 1,018 | Simulation | Plus |
| 1,176 | Reports | Plus |
| 1,340 | Simulation | X |
| 1,422 | Manufacturing | X |
| 1,546 | Genomics | Plus |

No word collisions, name clipping or component overlaps were reported. The paint
audit checks all 1,356 encoded composition frames for glyphs outside expected
regions; no leaks were detected. It does not prove every interior pixel correct.

Visual inspection covers a whole-film 1 fps contact sheet, the opening at 4 fps,
the plus/check/X passage at 10 fps and explicit removals at 4 fps, plus full-size
click and closing frames. These show later blur, distinct controls and Reports
remaining present through removal. Local evidence remains in `ad/review/`.

The full file decodes with audio at the expected frame count/rate/resolution.
The larger encoded QR decodes to `https://clio.iowarp.ai/`. The settled closing
has maximum mean luminance difference 0.112531 on a 0–255 scale. The machine
receipt is [verification-v11.json](../verification-v11.json).

This is measured and encoded-frame review, not human-equivalent uninterrupted
playback/listening or creative approval. User creative approval remains pending.
