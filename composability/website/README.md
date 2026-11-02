# Composability website loops

Three separate animations for a site that already carries CLIO branding:

| Folder | Suggested surrounding copy | Motion | Length |
| --- | --- | --- | --- |
| [many-agents](many-agents/README.md) | So many agents. | A steady cycle through twelve domains | 14.4 s |
| [one-composable-agent](one-composable-agent/README.md) | Why not one? | The keywords accelerate into “composable” | 10.6 s |
| [plugin-composition](plugin-composition/README.md) | Build the agent you need. | Manufacturing + Simulation + Reports, then Genomics | 16.3 s |

The headings above are placement suggestions, not burned into the assets. There
is no owl, CLIO wordmark, QR, URL or advertising end card in these loops. The word
animations keep “A” and “agent” fixed. The first two wrap by rolling forward; the
composition uses a brief soft reset after its final hold.

Each folder contains its editable `Scene.tsx`, frame plan, `embed.html` and finished
GIF, WebM, MP4 and full-size poster in `output/`. WebM/MP4 are silent and generally
smaller and smoother for the actual website; GIF is included for image-only slots.
The compact website outputs are tracked. Full advertisement movies stay local.

## Rebuild and review

Use Node 22+, npm, FFmpeg and FFprobe. Keep this checkout, dependency installs,
caches and temporary files on D: on the user's machine.

```powershell
New-Item -ItemType Directory -Force .cache/tmp | Out-Null
$env:TEMP=(Resolve-Path .cache/tmp).Path
$env:TMP=$env:TEMP
$env:TMPDIR=$env:TEMP
$env:npm_config_cache=Join-Path (Get-Location) '.cache/npm'
npm ci
npm --prefix ../ad ci
npm test
npm run typecheck
npm run render -- --stills
npm run render
npm run review
npm run serve
```

Open `http://127.0.0.1:3380/` for the review gallery. To render a single asset, use
`npm run render -- many-agents` (or another folder name). Avoid simultaneous
renders against the same bundle directory. `DEMO_CHROME_PATH` may name an existing
compatible browser. The renderer also reuses the ad's local browser when present.

The website source imports the ad's editable prompt/plugin components and timing,
including its component dependencies. Install both projects as shown above.
Carry the whole `composability/` folder when sharing source. Its bundler resolves
one React/Remotion instance for both projects. No backend, inference or browser
recording is required. Domain plugins and instructions remain editorial examples.

## Placement

Use the supplied `embed.html` as the smallest integration example. Set an accessible
label describing the concept, retain `muted loop playsinline`, and use the poster
for reduced motion. For a single static image use `output/poster.png`; for an
image-only animated slot use `output/loop.gif`.

The gallery supports play/pause without a player overlay covering the small loops.
Open a video file for native seeking controls. The final review receipt
is saved here in `REVIEW.md`; reproducible technical checks run with `npm run review`.

`npm run encode:gifs` rebuilds the image fallbacks from the finished MP4s without
launching a browser. `npm run embeds` regenerates the integration examples and gallery.
