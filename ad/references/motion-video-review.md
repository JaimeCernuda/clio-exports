---
name: "motion-video-review"
description: "Preview, check and deliver a Remotion motion video: fast stills, contact sheets, transition checks, post-render frame sampling. Use before and after every full render of a code-driven video."
---

# Motion video review

A full render is slow (minutes), stills are cheap (about 2 to 3 s each at half scale, even with 3D). Iterate on stills, render once, then verify the actual MP4.

## 1. Stills script (stills.mjs)

Bundles once and reuses one browser for every frame:

```js
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition, openBrowser} from '@remotion/renderer';
import path from 'node:path';

const frames = process.argv.slice(2).map(Number);
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browserExecutable = process.env.HEADLESS_SHELL; // see motion-video-stack
const chromiumOptions = {gl: 'swangle'};
const puppeteerInstance = await openBrowser('chrome', {browserExecutable, chromiumOptions});
const composition = await selectComposition({serveUrl, id: process.env.COMP ?? 'Video', puppeteerInstance, chromiumOptions});
for (const frame of frames) {
  await renderStill({composition, serveUrl, frame, output: `stills/f${frame}.png`, puppeteerInstance, chromiumOptions, scale: 0.5});
}
await puppeteerInstance.close({silent: true});
```

Run `node stills.mjs <frames...>` with one frame near the settled middle of each scene, then tile them into one image and look at it (PIL `Image.paste` into a 2-column grid, or `ffmpeg -i f%d.png -vf tile=2x3`). One contact sheet per iteration is much faster to judge than individual frames.

## 2. What to check on the stills

- Text is fully readable at half scale; nothing clipped at the frame edges or under the vignette.
- 3D is not overexposed (lit cubes should keep shading, not go flat pastel) and does not collide with overlay cards.
- Counters, progress bars and spinners have reached their final state by the settled frame.
- Illustrative data agrees with its labels (date range vs annotated day, totals vs counters).
- Copy: no em dashes, no middle dots, nothing left from a previous video.

Fix, re-render only the affected stills, repeat.

## 3. Render

Full render per `motion-video-stack`, in the background, polling the log. Give the user the time estimate before starting when it is more than a couple of minutes.

## 4. Verify the MP4, especially transitions

Stills from the middle of scenes never show crossfade bugs. After the render, sample the real file at every scene boundary (scene `from` + about 6 frames) and a few mid-scene frames:

```bash
ffprobe -v error -show_entries format=duration -of csv=p=0 out/video.mp4
ffmpeg -v error -y -i out/video.mp4 \
  -vf "select='eq(n\,105)+eq(n\,200)+eq(n\,362)+eq(n\,500)',scale=640:-1,tile=2x2" \
  -frames:v 1 stills/transitions.png
```

Look for two headings cross-dissolving in the same spot (fix: delay the incoming scene's text past the overlap), elements popping in before the previous scene has faded, and 3D canvases flashing black on entry. If anything is fixed, re-render and re-sample those boundaries.

## 5. Audio (when a voiceover exists)

Mux with `<Audio src={staticFile('vo.mp3')} />` in the composition, or afterwards with `ffmpeg -i video.mp4 -i vo.mp3 -c:v copy -c:a aac -shortest out.mp4`. If the TTS returns word-level timestamps, derive scene `from` values and caption timing from them instead of guessed durations, then re-check transitions.

## 6. Deliver

Send the MP4 with a one-line caption (length, resolution, audio or silent). Then list every on-screen string grouped by scene so the person can rewrite the copy in `copy.json` without reading code. Say plainly which numbers or claims are placeholders.
