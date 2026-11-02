# Follow-up review: pointer continuity, brand clearance and settled time

Local movie: `ad/out/composable/clio-composable-ad-v12.mp4` (not committed).
1920 × 1080, 60 fps, 2,474 frames, 41.233 seconds, 4,802,447 bytes.
The exact hash and machine checks are in [verification-v12.json](../verification-v12.json).

## Findings and fixes

1. The v11 cursor faded away after gestures and reappeared for the next action.
   Its continuity test ignored invisible intervals. V12 uses one opaque cursor
   path through all gestures, with entrances and departures through the right
   frame edge. Idle portions stay outside the picture. The measured maximum
   displacement is 22.694 pixels per frame; the route never resets position.
2. The owl crossed the document while it faded in. The closer review also found
   four closing frames with 1.6–7.3% prompt opacity beneath the traveling owl.
   The prompt now enters at frame 778 over 36 frames, after the owl clears it.
   Closing owl travel starts ten frames later and still finishes at the same
   closing settle. The expanded audit checks both routes at opacity above 1%.
3. Climate had only six fully settled prompt frames before Robotics began.
   Shorter final morphs leave 36, 42, 48 and 78 settled frames respectively for
   Climate, Robotics, Materials and Medical research (0.6–1.3 seconds). This
   gives the changed identity/fragments a beat to register. It is not enough
   time to read the entire prompt. Overall duration is unchanged.

The wheel cadence, late directional blur, colored prompt edits, owned capability
tree, explicit removal clicks and larger arrow-free URL/QR close are preserved.

## Validation and visual evidence

- 31 standalone tests and 109 motion compatibility tests pass, zero skips.
  Suites overlap; counts are not additive. Both TypeScript checks and standalone
  formatting pass. Three focused Python catalogue/source-package tests pass;
  the full Python suite was not rerun for this ad-only revision.
- Fresh measurements cover 48 prompt frames, 11 profiles, 30 capability leaves,
  the initial menu extraction, three add handoffs and five add/remove controls.
  No word collisions, component overlaps or logo/prompt overlaps were reported.
- The encoded paint audit covers all 1,356 composition frames and detects no
  paint outside expected regions. Full decode, audio presence, dimensions, rate
  and frame count pass. The encoded QR resolves to `https://clio.iowarp.ai/`.
- The maximum mean luminance difference over the settled ending is 0.114141
  on a 0–255 scale. The five-second hold remains still.

The v11 re-review inspected the opening at 6 fps, final transformations at 6 fps
and closing at 10 fps. The revised encode was inspected around prompt entrance
at 12 fps, cursor/addition at 10 fps, Climate at 8 fps and closing at 10 fps.
These show the owl clearing before the document appears, the cursor leaving
through the edge, an identifiable settled Climate state and a clear close.
Local contact strips and measurements stay in `ad/review/`.

This review uses source inspection, measurements and sampled encoded sequences.
It is not human-equivalent uninterrupted playback/listening or user creative
approval. The paint boundary audit also does not detect every interior defect.
