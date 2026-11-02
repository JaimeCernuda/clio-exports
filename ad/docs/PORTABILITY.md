# Standalone project validation

This is the historical v9 consolidation receipt. The current creative revision
and its checks are recorded in [the v10 review](reviews/review-ad-v10.md).

The current v9 source was consolidated from clio-exports commit `4927425` into
`ad/`. Components, prompt/timing, source provenance and review history moved here;
the older technical demo remains outside. Compatibility launchers preserve the
existing `motion/` entrypoints and reuse the maintained prompt-morph helper.

The ad has its own package and lockfile, TypeScript settings, fonts and vector
assets, rendering CLI, sound/QR/review scripts, tests, documentation and focused
skill. Its relative code imports are checked to resolve inside `ad/`. It does
not load sibling campaign sources or require a CLIO backend to render.

Validation after consolidation:

- A fresh `npm ci` installed the standalone package on D:.
- All 29 standalone tests pass, including dependency closure, handoff contents,
  CLI behavior, contribution ownership, handoffs, pointer and prompt morphs.
- All 107 tests in the existing motion project pass through the compatibility
  launchers. Its typecheck and formatting pass.
- All 120 Python tests pass, including the updated catalog, portable skill links
  and source packaging. Ruff, formatting and pyright pass.
- The new standalone package typechecks; its full frame measurement, geometry
  checks, 2336-frame render and original sound generation complete successfully.
- Its encoded review passes all 801 offer/extraction/inspection paint frames,
  word/card clearance, header fit, full decode, audio presence, QR and end-hold
  checks. [The saved report](verification-v9-portable.json) identifies this encode.
- The focused skill and repository discovery entry pass the skill validator.

New local movie: `ad/out/composable/clio-composable-ad-v9.mp4`, 8,308,225 bytes.
SHA-256: `a13e93055527e2f1a4e56c282a18f024db9871da3b0521bb1f0b5a1e4c39255a`.
Timing and dimensions remain 38.93 seconds, 1920 × 1080, 60 fps. A full-frame
SSIM comparison with the preceding v9 encode measured 0.999731. The encodes are
not byte-identical. The preceding movie is preserved locally at its historical
`motion/out/composable/` path.

Generated dependencies, caches, bundles, review intermediates and movies are
ignored by Git and excluded from the repository source handoff. The original
review receipts retain their historical output paths/checksums. This organization
and rebuild do not constitute new creative approval or uninterrupted human
playback/listening review.
