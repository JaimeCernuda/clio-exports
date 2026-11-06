# Ask your data. — short website loop

Select hurricane observations and carry those same records into a question's reference.

7.83 seconds, 1280 × 490, 30 fps web video. GIF fallback: 960 px wide, 25 fps. Silent. No advertising intro, logo overlay, captions or closing card.

- Editable entry: [Scene.tsx](Scene.tsx).
- Timing, crop and source interval: [shared plan](../../src/plan.ts).
- Ready-to-place example: [embed.html](embed.html).
- Outputs: `output/loop.gif`, `loop.mp4`, `loop.webm`, `poster.png` and checksummed `manifest.json`.
- Run from the campaign root: `node website/render.mjs selection-short`, then `node website/review.mjs selection-short`.

Source interval 5–14s at 1.35× editorial speed, followed by a hold and a soft reset. The source remains forward-only. Scientific assumptions and native receipts are in the campaign [source ledger](../../../SOURCES.md). The surrounding page supplies the heading; the on-screen controls and results are editable product components.

Use WebM/MP4 for smaller, smoother website playback. Use GIF in image-only slots. Respect reduced-motion preferences using the supplied poster. The source lives in Git; generated media stay local for the website handoff.
