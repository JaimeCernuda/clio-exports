# Repeated review: menu selection continuity

Superseded by [v9](review-ad-v9.md). V8 corrected the initial picker handoff;
further review found later workflow additions had no visible selection action.
The checks below did not establish that causal step. Creative approval was not given.

- Local movie: `motion/out/composable/clio-composable-ad-v8.mp4` (not committed).
- SHA-256: `605abd2a65cda8a02bf93afff4195480fb9970b46c28f5893ea9250f5305fc58`.
- 1920 × 1080, 60 fps, 2240 frames, 37⅓ seconds, 8,082,720 bytes.
- Original procedural audio; no reference-film media is included.

## Findings and corrections

Repeated review of v7 found a discontinuity at the menu selection. Its 58 px row
was replaced in one frame by a 76 px card with different geometry and metadata,
briefly covering the next choice. The Manufacturing hover highlight also never
appeared: `:first-of-type` matched the search div rather than the first choice.

V8 highlights the choice with the filmed pointer, preserves the selected row's
rectangle and label geometry on the selection frame, and retires neighboring
choices before increasing its height. The chevron fades before the removal
control appears; metadata enters after its space opens. The extraction follows
the pointer press. The domain-color marker now retains the outgoing color while
the old identity exits and changes as the new identity appears.

At frame 560, browser measurements of both native source and extracted row are
identical: x 1053, y 666, width 574, height 58. Both labels measure x 1108, y 680,
width 175.03125, height 30. The measured handoff therefore has zero rectangle or
label displacement. Other v7 readability and pacing improvements are retained.

## Verification

All 120 Python tests and 106 motion tests pass, with zero skips. Ruff, pyright,
TypeScript and formatting pass. The new regression checks selection geometry,
hover state, neighboring-choice clearance and bounded card growth. Encoded
review additionally requires the measured native-source/clone match.

All nine prompt layouts, the opening lockup and 17 plugin-header measurements
pass their fit checks. Geometry checks report no word collisions or component
occlusions. The encoded paint audit examines 60 extraction frames and 645
inspection frames, including every worker, with no detected text leaks. This is
a downsampled boundary check with codec-edge tolerance, not exhaustive inspection
of every interior pixel.

Visual inspection of the new encode covers a whole-film one-frame-per-second
contact sheet, a 24 fps close-up of the menu handoff and a 12 fps strip of the
Manufacturing-to-Genomics identity/color transition. The row retains its shape
as the neighbors fade, then grows without covering them. Reports stays present
through the domain changes. Local sheets, logs and measurement JSON remain in
`motion/review`.

The full movie decodes with audio at the expected resolution, rate and frame
count. The QR decodes to `https://clio.iowarp.ai/`. The final five seconds remain
settled: maximum mean luminance frame difference is 0.0995997 on a 0–255 scale.
The measured audio peak is −17.0 dBFS, with no detected clipping.

Review uses encoded frames and measurements, not human-equivalent uninterrupted
playback or listening approval. Creative approval remains pending. Domain
plugins and prompts are illustrative editorial examples, not an installed
catalogue or a recorded backend run.
