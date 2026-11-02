# V14: IOWarp and Gnosis Research Center closing credit

Local movie: `composability/ad/out/composable/clio-composable-ad-v14.mp4` (not committed).
1920 × 1080, 60 fps, 2,160 frames, 36 seconds, 4,678,112 bytes.
Exact hash and machine checks: [verification-v14.json](../verification-v14.json).

The user requested “An IOWarp system” and “by the Gnosis Research Center” with
the supplied GRC logo. The close now places these as a compact two-line credit
below the CTA, next to the original transparent 960 × 960 PNG. No colored backing
card, asset recoloring or new title card was introduced. The credit follows the
closing entrance and remains through its five-second settled hold. Runtime,
four-second hook, plugin sequence, URL and QR stay at the V13 timings. Website
loops remain unbranded and were not regenerated for this ad-only change.

The source artwork is bundled as `public/grc-logo.png`; its URL, retrieval date,
dimensions and checksum are recorded in [grc-logo.json](../../references/grc-logo.json).
The handoff, art direction and focused skill include the new request.

## Verification

- All 32 ad tests pass with no skips, including the asset-integrity/transparency
  and credit-copy check. Typecheck and formatting pass.
- Fresh DOM measurements validate the credit's 80 px square logo, 30/26 px text,
  logo/text spacing, position below URL/QR and safe bottom margin.
- Full decode, 1080p60, expected 2,160 frames and original audio checks pass.
  The QR decodes to https://clio.iowarp.ai/ and the final hold remains stationary
  (maximum mean inter-frame luminance difference 0.136849).
- The encoded audit covers all 1,418 composition frames with no paint leaks,
  word collisions or component/brand overlaps. Existing cursor/click checks pass.
- Visual inspection covers the freshly rendered closing card and encoded end frame.
  V13's movie and receipt are preserved.

These are technical and sampled visual checks, not uninterrupted human playback
or user creative approval. No production website was changed.
