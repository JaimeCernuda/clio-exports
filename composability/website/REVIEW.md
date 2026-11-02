# Website loop delivery review

Updated with the V13 ad feedback: a four-second hook and a global plugin chooser.
The folder structure and earlier source consolidation remain in place.

## Finished assets

| Asset                | Duration | Video / poster size | GIF size   | MP4     | WebM    | GIF     |
| -------------------- | -------- | ------------------- | ---------- | ------- | ------- | ------- |
| Many agents          | 14.4 s   | 1440 × 280          | 1152 × 224 | 0.66 MB | 0.71 MB | 3.12 MB |
| One composable agent | 5.8 s    | 1440 × 280          | 1152 × 224 | 0.46 MB | 0.47 MB | 2.57 MB |
| Plugin composition   | 18.7 s   | 1680 × 880          | 1260 × 660 | 1.76 MB | 2.17 MB | 5.57 MB |

Video is 60 fps and silent. Keyword GIFs are 30 fps; composition GIF is 20 fps.
Use video for smaller, smoother website delivery; GIFs serve image-only slots.
Each folder includes editable source, plan, embed, finished files, poster and hashes.
Small website outputs are tracked; full ad movies remain local.

## Motion and semantics

- Many agents still cycles through twelve domains evenly and wraps forward.
- One composable agent reaches composable in four seconds, already fast by
  Materials/Chemistry. The final phrase holds sharp before rolling forward to restart.
- Every build-loop addition clicks the persistent global plus, opens a chooser,
  selects a plugin and dismisses the menu before inserting it. This includes
  Manufacturing, Simulation, Reports and Genomics. No unselected plugin row
  appears in advance. Installed menu choices are disabled. Two X clicks remove
  Simulation and Manufacturing while Reports stays for the Genomics change.
  The taller canvas retains the global control and expanded capability tree.
- Owned instruction edits and capability branches remain linked. No brand
  bookend, owl, QR, URL or ad closing appears in website assets.
- The GIF encoder retains its near-white normalization before palette quantization,
  avoiding a faint dither pattern in the nominally white background.

## Validation

Seven website tests, 31 ad tests and 109 motion compatibility tests pass with zero
skips. Counts overlap. Both projects pass type checks and formatting. No Python
code or source-package configuration changed in this revision; the earlier
120-test Python baseline is historical rather than a new run.

All nine media variants fully decode with expected counts, dimensions and duration,
no audio, matching manifest hashes, clean white GIF margins, no unexpectedly dark
frames and first/last loop-join differences below 1 on a 0–255 luminance scale.
Posters have the expected dimensions. Exact results: [verification.json](verification.json).

Visual review covers the encoded hook, chooser/insert/unfold samples and browser
gallery framing. The gallery's pause/poster and play controls were exercised.
Open http://127.0.0.1:3380/ while the local server is running.

This records technical, sampled-frame and browser checks, not human-equivalent
uninterrupted playback or user creative approval. No production website was deployed.
