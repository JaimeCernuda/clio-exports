# Notebook light revision

Requested: restyle the existing three-step SPOTTER investigation in CLIO Notebook
light, including the newly reviewed attention colors and fonts. Preserve the
story, evidence, paired clock and continuous cursor choreography.

## Source and appearance

- Canonical source SHA256: `cfdd456f2640519c6a0f715e817927c7fb70e77974d6d9605be12cc903131cd5`.
- Native shell pin: gact-tui `47b74250e512358dda6275cd5084e9d4a8d1a376`.
- Scoped heat presentation: PR 1288, `075c0581f1f9ef15d6206b0339e7c105889a546f`.
- Theme `light` is Notebook; `classic-light` is Cool. Background `#f3efe6`.
- Use native IBM Plex UI/code typography and native Literata voice tokens.
- Native discrete heat ramp: green prompt text, red reconstructed lookup results,
  underline, global display scale and zero-intensity transparency.
- Retained prompt runs are mapped with Unicode offsets and native DOM projection.
  Heat overlapping renamed Round/Step aliases is omitted, never guessed.
- Word/Max remains the default. No new inference, heat measurements or tool calls.

The regenerated sidecar adds original text-block display runs. A semantic
comparison against the preceding committed sidecar confirmed all pre-existing
fields are identical. The generator still conserves source mass for all 11 saved
selections. Original exports and tensors were not modified.

## Production status

The full render and delivery review are in progress. Do not transfer approval
from the prior Cool encode to this revision.

Before full capture: 140 Python tests, 164 motion tests, root/native type checks,
Ruff, Pyright and formatting pass without skipped tests. The browser pass checks
78 states at 1920x1080 and 1116x970 and remeasures both pointer profiles. It also
checks the Notebook palette/font, actual registered prompt highlight ranges and
the distinct underlined tool heat.

The 31-second moving mechanics proof is
`07f327e6d700f8f413566cb78c12d0cc24fa80ede71ee7add2a9b3a801534473`.
Its 24 independent-page pixel comparisons pass; all 1,860 decoded frames were
scanned with zero flash candidates. Browser playback and encoded transition
strips cover attention arrival, source scrolling and the second selection. This
discontinuous proof is an internal check, not the full narrative delivery.
