# First full cut: review receipt

**Rejected creative treatment.** The user rejected this as a technical demo and
slide-like layout. Its passing geometry and encoding checks did not establish a
successful social advertisement. The active treatment is in ART-DIRECTION.md.

- Local output: `motion/out/composable/clio-composable-v1.mp4` (not committed).
- SHA-256: `bd848da819365af8f02e78f0b34812128379bfeab694f9387aab24097d476f02`.
- 1920 × 1080, 60 fps, exactly 1800 frames / 30 seconds, silent, 4,700,229 bytes.
- Closing destination: `https://clio.iowarp.ai/`. The QR decodes from the encoded
  frame, with more than five seconds settled on screen.

## Checks performed

All 120 Python tests and 90 motion tests passed with no skips; Ruff formatting,
Ruff checks, pyright, TypeScript and Prettier passed. The source exporter called
the real CLIO composer, retaining original roles and fragment bodies, checksums
and source revisions. No model, MCP server or Slurm job was run for this film.

The browser measured seven prompt layouts after fonts loaded. All fit the 1136 ×
616 prompt viewport. All six transformations were checked at every edit frame
against those layouts, including card clipping: zero visible word collisions.
The continuous pointer's maximum frame step is 49.92 pixels. The full encoded
movie decodes successfully. Its settled final five seconds have a maximum mean
frame difference of 0.00915 on a 0–255 luminance scale, below the flicker threshold.

Visual inspection covered full-cut contact frames, settled full-size panels and
encoded strips through the Slurm insertion and Factorio identity replacement.
Early problems fixed before delivery: clipped prompt text; overlaid role/title
crossfades; plugin chips arriving before an existing chip vacated its slot;
source text painting outside the growing insertion card; isolated repeated words
crossing unrelated phrases; and the contribution tag covering the last plugin.

These are frame and encoding reviews, not a claim of human-equivalent real-time
playback review. Pacing and creative approval remain for the user to judge in the
moving cut. The film is an editable configuration reconstruction, not proof that
the installed product currently animates prompt edits this way.

Reproduce the measured/encoded checks using the commands in [README.md](README.md).
Local detailed receipts and transition strips are under `motion/review/`.
