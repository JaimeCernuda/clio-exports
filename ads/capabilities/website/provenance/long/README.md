# Show me where that came from. — long website loop

Inspect a mapped lake-boundary result, its calculation and original dataset without losing the result's identity.

16.17 seconds, 1280 × 554, 30 fps web video. GIF fallback: 960 px wide, 25 fps. Silent. No advertising intro, logo overlay, captions or closing card.

- Editable entry: [Scene.tsx](Scene.tsx).
- Timing, crop and source interval: [shared plan](../../src/plan.ts).
- Ready-to-place example: [embed.html](embed.html).
- Outputs: `output/loop.gif`, `loop.mp4`, `loop.webm`, `poster.png` and checksummed `manifest.json`.
- Run from the campaign root: `node website/render.mjs provenance-long`, then `node website/review.mjs provenance-long`.

Source interval 4.5–24s at 1.3× editorial speed, followed by a hold and a soft reset. The source remains forward-only. Scientific assumptions and native receipts are in the campaign [source ledger](../../../SOURCES.md). The surrounding page supplies the heading; the on-screen controls and results are editable product components.

Use WebM/MP4 for smaller, smoother website playback. Use GIF in image-only slots. Respect reduced-motion preferences using the supplied poster. The source lives in Git; generated media stay local for the website handoff.
