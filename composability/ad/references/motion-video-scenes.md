---
name: "motion-video-scenes"
description: "Author deterministic Remotion scenes (2D, GSAP and React Three Fiber 3D) from a reusable scene library with copy passed in as props. Use when writing or editing scenes for a code-driven motion video."
---

# Motion video scenes

Assumes the project from `motion-video-stack`. The goal is consistent output: pick scenes from a fixed library and fill props, rather than inventing new animation code per video.

## Rule zero: every pixel is a function of the frame

Remotion renders frames out of order across several browser tabs. Anything driven by wall-clock time or hidden state produces jitter or frames that differ between tabs.

- Derive all motion from `useCurrentFrame()` via `interpolate`, `spring`, or a seeked GSAP timeline.
- Use `random('seed')` from remotion, never `Math.random()`.
- No CSS transitions or keyframe animations, no `setTimeout`, no `requestAnimationFrame`.
- In 3D: no `useFrame`, no `clock`, and no drei helpers that animate on their own clock (Float, Sparkles with speed, OrbitControls autoRotate). Static drei geometry such as `RoundedBox` is fine.

## Shared primitives (src/ui.tsx)

```tsx
export const ease = (f: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(f, [a, b], [from, to], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});

export const useFade = (dur: number, fin = 12, fout = 12) => {
  const f = useCurrentFrame();
  return interpolate(f, [0, fin, dur - fout, dur], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
};

export const usePop = (delay: number, damping = 16) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  return spring({frame: f - delay, fps, config: {damping, stiffness: 140, mass: 0.7}});
};
```

Use `usePop` for things that appear (cards, chips, nodes: opacity plus a small translate or scale), `ease` for things that travel or draw. Calling hooks inside `.map()` is acceptable only over a fixed-length array; otherwise extract a child component.

## GSAP inside Remotion

Build the timeline once, paused, tweening plain objects (not DOM nodes), then seek it to the frame and read the values during render:

```tsx
const {tl, letters} = useMemo(() => {
  const letters = word.split('').map(() => ({y: 140, o: 0, blur: 18}));
  const tl = gsap.timeline({paused: true});
  tl.to(letters, {y: 0, o: 1, blur: 0, duration: 1, ease: 'expo.out', stagger: 0.09}, 0.15);
  return {tl, letters};
}, [word]);
tl.seek(frame / fps, false);
// render letters[i].y, letters[i].o ...
```

Reach for GSAP only when you need its eases or staggers; `interpolate` and `spring` cover most motion.

## 3D with @remotion/three

```tsx
<ThreeCanvas width={width} height={height} camera={{fov: 40, position: [0, 5, 9]}}>
  <MyScene />
</ThreeCanvas>
```

- Build geometry in `useMemo` (fibonacci-sphere nodes, neighbour edges as `lineSegments`, starfield `points`).
- Move the camera in the component body: `const camera = useThree(s => s.camera); camera.position.set(...from frame); camera.lookAt(...)`.
- Drive rotation, activation waves and color lerps from the frame (e.g. each cube gets `start = base + distance * k + random(seed) * jitter`, then `on = interpolate(frame, [start, start + 10], [0, 1])`).
- Keep `emissiveIntensity` around 0.5 to 0.6; higher washes cubes out to flat pastel.
- 3D is the most expensive thing in the render. Prefer one shared background canvas for the whole video and a dedicated canvas only for the hero 3D scene. For explaining web pages, 2.5D (CSS perspective, parallax screenshots) often looks as good at a fraction of the cost.
- Put a radial-gradient vignette `AbsoluteFill` over the canvas so overlay text stays readable.

## 2D techniques

- **Draw a path:** `pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p}`.
- **Reveal an area fill:** a `clipPath` rect whose width is `W * p`.
- **Packets along a connector:** evaluate the cubic bezier analytically, loop `t = (local % period) / period`, opacity `sin(t * PI)`.
- **Typewriter:** `text.slice(0, floor(interpolate(f, [a, b], [0, text.length])))` with a caret that is solid while typing and blinks (`floor(f / 8) % 2`) otherwise.
- **Counters:** `Math.round(interpolate(...))` and make sure they land exactly on the final value before the scene fades.
- **Status spinner to check:** an arc rotated by `f * 14` while running, then a filled circle plus a check path drawn with the dash trick.

## Timeline and crossfades (src/Video.tsx)

Keep the timeline as one table so timing edits happen in one place:

```tsx
const S = {
  hook:   {from: 0,   dur: 112},
  title:  {from: 100, dur: 108},
  step1:  {from: 196, dur: 172},
  ...
};
export const TOTAL = last.from + last.dur;
```

Consecutive scenes overlap 10 to 14 frames; each scene fades itself in and out with `useFade(dur)`. **When two consecutive scenes put text in the same place (section label and heading top-left), delay the incoming text past the overlap** (label delay about 14, heading about 18 frames). Otherwise the two headings cross-dissolve into an unreadable double image.

## Scene library

Each scene takes `dur` plus its copy and data as props.

| Scene | Purpose | Props |
|---|---|---|
| QuestionType | Hook: a question or problem typed on screen, optional attachment chip | label, question, chip |
| TitleReveal | Logo mark + wordmark, GSAP letter stagger, tagline | word, tagline, mark |
| AgentTree | Root node branching to 3 to 5 workers, packets on links, tool-call chips, spinners resolving to checks | root, children[{name, color, chips[]}] |
| ClusterDispatch | 3D grid of nodes lighting up in a wave, terminal card with a job counter | heading, lines[], total |
| ChartReveal | Line/area chart drawing in, event marker, highlighted region, finding + evidence chips | series, marker, finding, chips[] |
| EndCard | Mark, name, one line, URL | name, line, url |

Add a new scene to the library only when an existing one cannot be parameterized to fit, and write it with the same props-in, frame-driven pattern.

## Layout and type defaults (1920x1080)

- Safe margin 120 px left and right, 90 px top.
- Section label: mono 22 px, letter-spacing 4, number in accent color + short animated rule.
- Scene heading: display 64 px, weight 500, letter-spacing -1.5.
- Hero wordmark: display 300 px, weight 700.
- Chips: mono 22 px, pill, border and fill from the accent color at low alpha.
- Colors come from `theme.ts` tokens (background, raised background, ink, dim ink, line, 2 or 3 accents). When a client design kit is provided, map its tokens into `theme.ts` and change nothing else.

## Copy

The agent writes placeholder copy only to make the timing work, and keeps it plain and specific. All strings live in `copy.json`; a human rewrites them. Do not use em dashes or middle-dot separators in on-screen text, and flag any line that reads like a slogan for human review. Illustrative numbers in a concept video must be internally consistent (an annotated day must fall inside the chart's date range).
