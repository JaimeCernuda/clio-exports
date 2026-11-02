# Website loop delivery review

The requested campaign layout is `composability/ad/` and `composability/website/`.
The ad project and its existing local renders moved together. Compatibility
launchers, source packaging, skill links and the video catalogue use the new path.
The old root `ad/README.md` is a pointer, not a second source copy.

## Finished assets

| Asset | Duration | Video / poster size | GIF size | MP4 | WebM | GIF |
| --- | --- | --- | --- | --- | --- | --- |
| Many agents | 14.4 s | 1440 × 280 | 1152 × 224 | 0.66 MB | 0.71 MB | 3.12 MB |
| One composable agent | 10.6 s | 1440 × 280 | 1152 × 224 | 0.79 MB | 0.74 MB | 4.94 MB |
| Plugin composition | 16.3 s | 1680 × 760 | 1260 × 570 | 1.36 MB | 1.70 MB | 4.33 MB |

Video is 60 fps and silent. Keyword GIFs are 30 fps; composition GIF is 20 fps.
Use the video embeds for the smaller, smoother website delivery; GIFs remain
available for image-only placements. Ordered GIF dithering reduced size without
changing timing or dimensions. Every asset folder includes source, plan, embed
example, finished files, poster and checksums. Compact website outputs are tracked;
full ad movies remain local.

The GIF inspection caught a faint pattern in the nominally white background:
small near-white differences from the video encode were being dithered. The GIF
encoder now snaps channel values of 250–255 to white before quantization. The
background is clean and the reduced GIF sizes above include that correction.

## Motion and semantics

- Many agents cycles through twelve domains at an even cadence and wraps forward.
- One composable agent reuses the ad's gradual acceleration. Neighboring words
  fade during the composable hold so it resolves to one clean phrase. The final
  roll returns to the initial domain without a cut.
- Plugin composition has a visible first Manufacturing plus click, followed by
  Simulation and Reports. Their owned prompt fragments and capability leaves
  appear together. Two X clicks remove Simulation and Manufacturing; Genomics
  is then added while Reports stays. Later domains and ad bookends are omitted.
  A final hold and short soft reset close the loop. It is rendered from editable
  components, not cropped from the movie.
- No owl, wordmark, QR or URL overlay appears in the website assets.

## Validation

Seven website tests, 31 ad tests, 109 motion compatibility tests and all 120 Python
tests pass with zero skips. Counts overlap and are not additive. Website/ad/motion
type checks, website/ad formatting, focused Ruff and Python type checks pass.
Source-package tests verify that code is included and dependencies, caches,
ad renders and generated website media are excluded from the source-only ZIP.

All nine animation files fully decode with expected frame counts, dimensions,
duration and no audio. Their first/last joins have mean luminance differences
below 1 on a 0–255 scale. No unexpectedly dark frames occur. Posters have the
expected dimensions; per-file hashes match the manifests. Exact technical results
are in [verification.json](verification.json).

Visual inspection covered initial/mid/final UI states, the resolved keyword,
sampled GIF frames and the browser gallery. The browser check exercised the
poster/play switch and checked full composition framing. Native player overlays
were removed from the small gallery loops after they obscured the artwork.
The gallery is available at `http://127.0.0.1:3380/` while its local server runs.

These are technical, sampled visual and browser interaction checks, not
human-equivalent uninterrupted playback or user creative approval. No website
deployment or modification of the CLIO production site was performed.
