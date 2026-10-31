# Engineering studies

This revised 5:56 film combines Daisy Quach's twelve-case cantilever sweep with a
separate topology-studio session. It shows actual cluster work, linked 3D designs,
case/file selection, saved iteration history and native scalar/chart inspection.

Use [`ENGINEERING.md`](../../motion/native/ENGINEERING.md) for the full recipe,
source limits, corrected Slurm timing and render-worker lessons.

| Concern | Source |
| --- | --- |
| Bounded ZIP import | `tools/import_engineering_bundle.py` |
| Native data and source-linked editorial copy | `tools/prepare_engineering_video.py`, `motion/story/engineering-film-copy.json` |
| Story, source evidence | `motion/story/engineering-demo-plan.json`, `engineering-source-ledger.json`, `engineering-source-audit.json` |
| UI, frame clock, controls | `motion/native/engineering-film.tsx`, `engineering-film-plan.ts`, `engineering-controls.tsx` |
| Measurement, rendering and exact assembly | `motion/scripts/measure-engineering.ts`, `render-engineering.mjs`, `engineering-assembly.mjs` |
| Captions, chapters and review player | `tools/prepare_engineering_delivery.py`, `tools/burn_review_captions.py` |
| Native and encoded checks | `motion/tests/engineering-browser.test.mjs`, `tools/review_engineering_video.py` |

The source ZIP remains local: `CLIO demo - conversations and dashboards-20261030T010137Z-1-001.zip`,
SHA-256 `9bd51e8465918b87f610f2c9d159980a6c10aefdd80a6d726f4dfe86481a96ab`.
It is not in this repository. The importer extracts only the needed exports;
one original HTML exceeds GitHub's ordinary file limit. Give another machine the
same ZIP or original exports before regenerating this film. Movies are not pushed.

From the repository root, set `CLIO_UI_SOURCE` to the clean pinned f333d67d checkout
and set TEMP/TMP/TMPDIR on the project drive as in the emulator guide:

```powershell
uv run python tools/import_engineering_bundle.py '<local-source-zip>'
uv run python tools/prepare_engineering_sketch.py motion/.native-ui/engineering-inputs
uv run python tools/prepare_engineering_video.py motion/.native-ui/engineering-inputs
uv run python tools/prepare_engineering_delivery.py --out motion/out/engineering-v2
npm --prefix motion run engineering:check
npm --prefix motion run engineering:build
npm --prefix motion run engineering:preview
```

Keep port 3365 running. Open
`http://127.0.0.1:3365/engineering.html?mode=film&cut=full`, then measure, rebuild
and render as documented. `EngineeringWalkthrough` uses its independent
`motion/src/engineering-index.tsx` entry. Delivery retains a clean 1920×1080 master,
visible-caption copy, chapter metadata, presenter cues and a review receipt locally.

Copy is explicitly condensed for the film, with original text and identities
retained in the prepared edit ledger. Source exports are unchanged. Failed
attempts are omitted from this selection, never relabeled successful.

The 332 ms call starts a **case-1 background watcher**; the array watcher starts
in 944 ms. Neither is an optimization runtime. Actual cases took 10–19 minutes,
with about 23 minutes between submission and the final completion check. A brief
“Later” transition replaces the rejected invented scheduler grid. Do not interpolate
per-case start times from sparse queue snapshots.
