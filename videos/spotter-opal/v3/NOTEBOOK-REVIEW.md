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

Status: **ready for user review**. This revision has its own encoded review;
approval has not been transferred from the prior Cool movie.

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

## Delivery

- Local file: `motion/out/spotter-v3-notebook/spotter-three-steps-full.mp4`.
- SHA256: `ac7f8dffe06fb80ca3a2de279a6492bc04128a6867426e5c2dc102c8553fb0bd`.
- Renderer: clean commit `add1f25d2a97efdfbd7adf7dc2df2f2c6fc47f6d`.
- 211 seconds, 1920x1080, 60 fps, 12,660 decoded frames, silent H.264/BT.709.
- 24 cold/sequential page comparisons pass. All 12,180 measured body cursor poses
  match the expected frame/position; none are missing, stale or offscreen during
  the interface. Maximum travel is 29.96 pixels per frame, below the existing gate.
- Full decode passes. The scan covers all 12,660 frames with zero flash candidates.
- Earlier Cool delivery `7a775fd7` remains unchanged in `motion/out/spotter-v3/`.

Full-duration 1x browser playback reached 211 seconds. Intermittent observations
covered 25.54, 57.17, 88.75, 147.18, 171.43, 191.85 and 211 seconds. Full-size
encoded frames were inspected at 9.5, 12, 122, 155, 176.5 and 199.5 seconds;
transition strips covered the intro join, thinking collapse, attention scroll,
attention close and branded fade. A closer 154.5-155.3 second reviewer strip
confirmed that the apparent blank space is an animated disclosure close that
settles into the next real tool call. No new corrective render was needed after
these checks.

This is sampled visual coverage alongside full-duration playback, not continuous
human viewing of every frame. The story and recorded execution are unchanged.
No fresh Barebone/GPU inference was performed for the movie. The finite attention
sidecar still supports only its recorded selections; arbitrary manual selection
requires the recorded-bundle backend documented separately.

## Architecture clarification

The plan templates already belong to the bundled core plugin inside clio-agent.
The remaining coupling is the direct scheduling of plan reinjection/person-edit
messages in `src/clio_agent/gact/agents/clio_react.py:420-422`. That runtime cleanup
is distinct from the heat-style and film changes. The earlier Barebone regression
remains a recorded limitation; these results do not claim it has been fixed.

The reviewed feature PRs were merged after their configured CI checks passed:
clio-agent #2329 at `e57098fb` (including the SDK payload type annotation fix),
gact-tui #1288 at `14dae6d7`, and marketplace #138 at `0e89a8fd` (no CI configured).
The backend's 17 focused tests and SDK mypy check also passed locally. The UI CI
needed one retry for a file-tool browser-fixture timeout; it passed without another code change. Full details
and PR heads are in `notebook-review-receipt.json`. These merges do not resolve
the separately documented runtime plan-injection limitation.
