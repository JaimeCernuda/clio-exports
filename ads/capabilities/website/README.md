# CLIO capability website motion

Sixteen silent, logo-free placements: a short feature loop and a longer process
showcase for each of the eight capabilities. These are separate renders of editable
product scenes, not crops of encoded advertisements. The host page supplies the
heading and CLIO branding. Existing composability website loops remain separate.

## Find and use the files

Open <http://127.0.0.1:3381/website/> after starting `node scripts/serve.mjs` from
the campaign directory. The gallery can show the actual GIF or the MP4 and offers
direct downloads. The complete local handoff is
`output/clio-capabilities-website.zip`. Unzip and serve it with any static server;
open `gallery.html` to review or copy an individual placement folder.

Every `<capability>/<short|long>/` folder contains:

- `Scene.tsx`: its editable rendering entrypoint, using the shared scene library.
- `README.md`: the action, source interval, dimensions and reproduction command.
- `embed.html`: standalone autoplay example with reduced-motion poster and
  offscreen pause handling.
- `output/loop.gif`, `loop.mp4`, `loop.webm`, `poster.png`, `manifest.json`:
  the local deployment media and their checksums.

Prefer **WebM with MP4 fallback** on websites: both retain smooth text and usually
use much less bandwidth. GIF is provided for image-only slots. Videos are 1280 px
wide at 30 fps; GIFs are 960 px wide at 25 fps. Each placement has a fixed natural
aspect ratio; use `width:100%;height:auto`, not a forced 16:9 box. No audio track,
advertising headline, logo, QR or closing card is embedded.

## Placement suggestions

| Capability | Short placement                               | Longer placement                                   |
| ---------- | --------------------------------------------- | -------------------------------------------------- |
| method     | Review and revision in a method feature card  | Procedure-to-execution section                     |
| hypothesis | An unexpected result changes the claim        | Science-log graph explanation                      |
| team       | A joined result triggers a new specialist     | Composed workflow and subagent section             |
| interface  | Controls visibly change chart and table       | Interactive scientific result section              |
| provenance | Result → measurement → geometry → source      | Traceable-results section                          |
| tools      | Program reads sources and returns a result    | Scientific tools and source access section         |
| selection  | Brush observations and reference them         | Ask your data section, including computation       |
| streams    | Query a changing context while work continues | Background tasks, streams and linked model section |

Do not play all sixteen at once on a production page. Choose the variant that fits
the surrounding explanation. The full-size gallery is for review; these authored
loops do not provide a live interactive product. Scientific assumptions and actual
execution receipts remain in [the campaign source ledger](../SOURCES.md).

## Reproduce

Use the campaign's existing installation and Chromium on D:. No new dependency
installation or CLIO backend is needed. From `ads/capabilities/`:

```powershell
npm run website:prepare
npm run typecheck
npm test
node website/render.mjs all --stills
node website/check-framing.mjs
node website/render.mjs all --reuse
node website/review.mjs all
node website/finalize.mjs
uv run python website/package_site.py
node scripts/serve.mjs
```

With the gallery running, `node website/check-downloads.mjs` verifies every media
download and the ZIP byte for byte, including useful, distinct download filenames.

Select one placement with `node website/render.mjs selection-short`. Select both
variants with `node website/render.mjs selection`. `--reuse` refuses changed render
inputs. `src/plan.ts` owns source intervals, rate, crop and loop holds; each source
clock is forward-only. A brief fade masks reset rather than reversing execution.
The shared `WebsitePresentation` context removes ad captions without changing
advertisement defaults. Update generated entrypoints after changing the plan.
Inspect new encodes before updating `review-notes.json`: record exact file identities,
coverage, findings and remaining limits for each cut. Finalization refuses stale
notes; it cannot turn a technical render pass into visual review.

Media and temporary review images stay local, outside Git. Source, embed examples,
manifests, checks and [review coverage](REVIEW.md) are pushed to `main`. The handoff
ZIP carries deployment media; full rendering source remains in this repository.
