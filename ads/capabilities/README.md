# Eight CLIO capability ads

Short, independent motion ads for researchers and developers who could use CLIO
and build on it. One capability, one concrete scientific setting, one visible
transformation per film. These are authored product advertisements, not recordings
of a complete interactive session.

## Review and outputs

From this directory: `node scripts/serve.mjs`, then open
<http://127.0.0.1:3381/>. The gallery supports seeking, shot markers, frame stepping,
half-speed and direct downloads. Final movies are in `output/01-method.mp4` through
`output/08-streams.mp4`; draft movies have `-draft` in the filename. All are 60 fps;
finals are 1920 × 1080. `output/manifest.json` identifies the exact file by SHA-256.
Movies, posters and transient review sheets stay local and are not pushed.
After delivery preparation, `output/` contains only the eight latest movies,
posters, checksummed manifests and a read-me. Superseded previews move to
`review/drafts/`. The gallery's version notes identify the exact reviewed hash and
its scientific/editorial limits.

| Film | Story and source entrypoint | Duration |
| --- | --- | --- |
| 1 | [Bring your method](films/01-method/README.md): engineering flow and revision | 32 s |
| 2 | [What if we’re wrong?](films/02-hypothesis/README.md): evidence changes a hypothesis | 34 s |
| 3 | [Workflows as complex as your science](films/03-team/README.md): nested flows, concurrency and conditional follow-up | 40 s |
| 4 | [The answer is an interface](films/04-interface/README.md): an interactive snowfall comparison | 30 s |
| 5 | [Show me where that came from](films/05-provenance/README.md): trace a boundary-area result | 30 s |
| 6 | [Your tools. Your sources. Your science](films/06-tools/README.md): a program reads scientific data | 32 s |
| 7 | [Ask your data](films/07-selection/README.md): selection becomes a reference, analysis and answer | 34 s |
| 8 | [Tap into your experiment](films/08-streams/README.md): background work supplies live context | 40 s |

Read [ART-DIRECTION.md](ART-DIRECTION.md), [SOURCES.md](SOURCES.md),
[REPRODUCE.md](REPRODUCE.md), and [REVIEW.md](REVIEW.md) before revising the campaign.
The existing composability ad remains separate and unchanged.

The accompanying [website collection](website/README.md) has a short loop and a
longer showcase per capability: sixteen GIFs, matching lightweight videos, posters,
editable entrypoints and integration examples. Review at
<http://127.0.0.1:3381/website/>. These omit the advertisements' branding and bookends.

## Build

Use Node 22+ with native TypeScript stripping (or a newer compatible Node), npm,
FFmpeg/FFprobe, uv, and a Chromium executable. Keep the checkout on D: on this
machine. `.npmrc` directs npm's cache here. The renderer sets TEMP/TMP/TMPDIR to
`.cache/tmp` before loading Remotion and refuses C: output.

```powershell
$env:TEMP = "$PWD/.cache/tmp"
$env:TMP = $env:TEMP
$env:UV_CACHE_DIR = "$PWD/.cache/uv"
npm ci
uv sync
npm run typecheck
npm test
uv run pytest -q
uv run ruff check scripts tests product
uv run ruff format --check scripts tests product
uv run pyright
npm run format:check
node render.mjs all --draft
node scripts/review.mjs --draft
node render.mjs all
node scripts/review.mjs
node scripts/check-map-labels.mjs
node scripts/serve.mjs
```

Set `DEMO_CHROME_PATH` to an existing Chrome/Chromium executable if the renderer
cannot reuse the browser installed for the composability ad. A fresh download, if
needed, must also use D: cache/temp. One browser and four frame workers are reused;
films render sequentially. `swangle` is intentional: earlier native SVG glyph
flicker depended on the graphics backend.

Render one film: `node render.mjs selection --draft`. Inspect authored frames:
`node render.mjs tools --stills --frames 1200,1260,1380`. `--reuse` only accepts a
compiled bundle whose input hash matches current scenes, fonts/assets and data.
Add `--interactions` to a still review to capture every press from the film's
actual cursor route, alongside the shot markers. DOM bounds are written in
`review/*-geometry.json`; a pointer on a blank region is not a valid control hit.

## Editing contract

`src/registry.ts` owns composition IDs, copy, durations and shot markers.
`films/*/scene.tsx` owns each visual argument. `src/kit.tsx` supplies editable
product pieces, branding and the close; `src/motion.ts` supplies pure timing and
cursor functions. `scripts/sound.mjs` builds original procedural audio from the
same registry clock. There is no LLM dependency at render time.

Reuse the machinery, not a mandatory app shell. The user explicitly rejected
unused toolbars and the assumption that every ad must fit inside CLIO's window.
Keep only controls that cause a useful visible change. For maps, retain geographic
context and equal projection scale when the surrounding composition reflows.

Review reports distinguish source execution, technical verification, sampled
visual inspection and browser playback. Passing one does not prove the others.
After recording the actual delivery findings in `review-history.json`, run
`node scripts/prepare-delivery.mjs`. It refuses missing or mismatched review hashes.
Do not copy a prior editorial judgment onto a new render. `scripts/finalize-audio.mjs`
can rebuild the procedural soundtrack while verifying unchanged video packets;
ordinary renders already use the same 2 dB headroom setting.
