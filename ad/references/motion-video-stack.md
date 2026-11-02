---
name: "motion-video-stack"
description: "Set up, configure and render a code-driven motion video (Remotion + React Three Fiber + GSAP) in a headless Linux sandbox. Use before building or rendering any promo, explainer or demo video."
---

# Motion video stack

This skill covers the environment side of the pipeline: what to install, how the project is laid out, and how to render reliably with no GPU. Scene authoring rules live in `motion-video-scenes`; previewing and QA live in `motion-video-review`.

## Pinned versions

These versions were verified to install and render together:

| Package | Version | Role |
|---|---|---|
| remotion, @remotion/cli, @remotion/renderer, @remotion/bundler, @remotion/three | 4.0.521 | Composition and rendering |
| react, react-dom | 19.2.8 | UI |
| three | 0.180.0 | 3D engine |
| @react-three/fiber | 9.7.0 | React renderer for three |
| @react-three/drei | 10.7.8 | 3D helpers (RoundedBox etc.) |
| gsap | 3.15.0 | Timeline easing (seeked, never free running) |
| @fontsource/space-grotesk, @fontsource/inter, @fontsource/jetbrains-mono | latest | Fonts bundled via npm |

Puppeteer is not needed for rendering; Remotion drives its own headless Chrome. Add it only when you must screenshot or scroll-capture a live site as source material.

```bash
mkdir video && cd video && npm init -y
npm i remotion@4.0.521 @remotion/cli@4.0.521 @remotion/renderer@4.0.521 \
  @remotion/bundler@4.0.521 @remotion/three@4.0.521 three@0.180.0 \
  @react-three/fiber@9.7.0 @react-three/drei@10.7.8 gsap@3.15.0 \
  react@19.2.8 react-dom@19.2.8 \
  @fontsource/space-grotesk @fontsource/inter @fontsource/jetbrains-mono
```

First check the machine: `node -v` (22+), `nproc`, `free -g`, `which ffmpeg`. Core count sets render concurrency and time.

## Project layout

```
src/index.ts        registerRoot(RemotionRoot)
src/Root.tsx        font CSS imports + <Composition id=... 1920x1080 30fps>
src/theme.ts        color tokens, font stacks, FPS
src/copy.json       every on-screen string (humans edit this, not the scenes)
src/ui.tsx          shared primitives (fades, springs, labels, chips)
src/scenes/*.tsx    one component per scene, text arrives via props
src/three/*.tsx     3D components used inside <ThreeCanvas>
src/Video.tsx       timeline: scene table + <Sequence> per scene
stills.mjs          preview renderer (see motion-video-review)
```

Keep copy out of the scene files. Marketing text changes far more often than motion, and a separate copy file lets a person rewrite the words without touching animation code.

## Fonts

Sandbox system fonts are thin (DejaVu, Liberation, Latin Modern). Install fonts from npm and import the weights you use at the top of `Root.tsx`:

```ts
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/jetbrains-mono/400.css';
```

Never fetch Google Fonts at render time; the sandbox network usually blocks it and the render silently falls back to a system font. If the client design kit ships font files, put them in `public/` and load with `@font-face` + `staticFile()`.

## Browser and GL

Remotion tries to download Chrome Headless Shell from Google, which sandboxes often block. Point it at a local headless shell instead:

```bash
ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell   # Playwright install
```

With no GPU, WebGL needs a software backend: pass `--gl=swangle`. With a GPU use `--gl=angle` (or `vulkan`). Without the flag, 3D scenes render black or blank.

## Render

```bash
npx remotion render src/index.ts <CompositionId> out/video.mp4 \
  --browser-executable=<path to headless_shell> \
  --gl=swangle --concurrency=$(nproc) --codec=h264 --crf=18
```

- Concurrency above the core count slows swangle renders down; match `nproc`.
- Reference cost: 1080p30, 25 s, 3D background in most scenes, 2 cores: about 9 minutes. 2D-only scenes are several times faster. Time one still before committing to a full render and tell the user the estimate.
- Run long renders in the background and poll the log for the output line:

```bash
nohup npx remotion render ... > render.log 2>&1 &
for i in $(seq 1 40); do grep -q 'out/video.mp4 ' render.log && break; sleep 15; done
tail -c 200 render.log
```

Do not poll with `pgrep -f "remotion render"` from a shell whose own command line contains that string; it matches itself and the loop never exits.

- The "Detected differing memory amounts" warning from cgroups is harmless.

## FFmpeg

Remotion bundles its own FFmpeg for encoding. System FFmpeg (any recent version) is for post work: frame extraction for QA, contact sheets, loudness normalization, muxing a voiceover, format conversion (e.g. `-c:v libvpx-vp9` for web, `-vf scale=1280:-2` for a lighter share copy).

## Licensing

Remotion requires a paid company license for organizations with more than three people. Mention it once if the user is producing videos for a company.
