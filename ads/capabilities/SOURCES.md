# Product and scientific source ledger

## Product revision

The source preparation pins CLIO `a0a17006a01492be526b96c39d9c842e95aa07a7`
on `claude/keen-dirac-hf724m`, with declared gact-tui
`a67c399e8f5abfe18c8b95e98a099fe2fbb2530f` and marketplace
`91c38d413f07cf256682d3306d58de1c4798cc83`. See `evidence/sources.json`.
The standalone newer UI checkout is not silently substituted for this pin.

Editable graphics adapt the actual product vocabulary: flow steps/task states,
science-log graph relationships, A2UI buttons and linked tables, source references,
tool rows, composer references and stream viewers. The composition deliberately
does not reproduce the complete app. Relevant pinned UI sources include
`web/src/lib/a2ui/a2ui-linked-selection.test.tsx`,
`web/src/lib/a2ui/use-a2ui-reference.ts` and
`web/src/lib/composer-reference-domain.ts` in gact-tui. Native conversation/attention
replay remains a separate system under `motion/native/` in the parent repo.

## Scientific data and receipts

| Film | Retained evidence | What it establishes |
| --- | --- | --- |
| Method | `beam.json`, `execution/method-*.json`, campaign BeamReview flow | Real Euler–Bernoulli comparison and review. The original 4 mm candidate deflects 3.571 mm; 6.5 mm gives 0.832 mm under a 1 mm limit. This is an analytical beam model, not a finite-element solver or Slurm run. |
| Hypothesis | `science.json`, `science-log.json`, `execution/hypothesis-*.json` | Ideal nonlinear pendulum period; sourced native science-log entries and refuted hypothesis. Quadrature is independently cross-checked against velocity-Verlet trajectories. At 60°, 2.153242 s vs 2.006409 s small-angle prediction, +7.3182%. |
| Team | `konza.json`, `science.json`, `workflow.json`, `execution/team-*.json` | Two completed preparation flows, three overlapping specialist tasks and a fourth conditional timing review. Peaks at 16:41 and 16:43 CDT trigger the authored >1 minute policy; 4 of the top 10 minutes overlap and paired correlation is 0.437738. Native flow projections and task timestamps retain dependencies. The bootstrap is illustrative, not an autocorrelation-aware confidence claim. |
| Interface | `alta.json`, `science.json`, saved Alta native export | Target winter 2023–24 vs matched 17 complete winters and all available complete months. Means, quartiles and ranges all follow the selected cohort. Unselected months remain faint context in the chart and leave the table. |
| Provenance | `boundary.geojson`, `tahoe.json`, `science.json` | The archived TRPA polygon discovered through NDP. Independent WGS84 geodesic area 497.727861 km². It is an area enclosed by a mapped boundary, not a measurement of current water extent. |
| Tools | `genomics.json`, `execution/tools-*.json`, count-analysis kernel | Public CSC HDF5, actual programmatic dispatch of three matrix-component reads plus metadata read. 2,753 cell columns, 7,441,273 counts, median 2,538 counts/cell. Histogram is independently derived from all cell totals. |
| Selection | `hurricane.json`, `atlantic-basemap.json`, `execution/selection-*.json` | NOAA Dorian geographic selection contains 12 rows; a real PTC program reads them through the scientific tool and computes 160 kt at Sept 1 16:40 and 18:00 UTC. Natural Earth source is pinned by immutable commit and SHA-256; regional clipping retains real coastlines. |
| Streams | `science.json`, `stream-query.json`, `execution/stream-snapshots.json`, `execution/burn-*-final.json`, `streams-*.json` | A fresh isolated workspace prevents prior stream rows leaking into the proof. Real background Code writes 60 burn observations and 20 wind-driven model rows. A second agent request reads the still-open observation stream. Each retains 18 rows and stops at completion. The model integrates the last twenty minute-mean wind speeds × 60 s: final travelled distance 7.676265 km. This is illustrative kinematics, not a dispersion forecast or geographic displacement. |

Original exported archives and their hashes remain unchanged. Bounded derivatives
are committed here, with original session/archive identities in `sources.json`.
No original scientific data has been manufactured to make the ad work.
The lake's movie outline uses equal projection scale and a 0.4-pixel bounded
polyline simplification to avoid repeatedly painting 20,472 vertices. Measurement
still uses the complete retained polygon; the drawing does not supply the area.

Public sources:

- [PBMC dataset and file metadata](https://zenodo.org/records/14884845).
  HDF5 SHA-256 `e319d13280317dff194b8b69ef5bfc8fddd2a81d36c2df3bbe5432e27570df1e`;
  source MD5 `9bf3c022611fab0f68174ae8bf1cda6b`.
- [10x HDF5 sparse-matrix contract](https://www.10xgenomics.com/support/software/cell-ranger/latest/analysis/outputs/cr-outputs-h5-matrices).
  CSC indptr boundaries identify cell columns; the raw data vector is not a cell array.
- [Small-angle pendulum model](https://openstax.org/books/university-physics-volume-1/pages/15-4-pendulums).
- [Natural Earth terms](https://www.naturalearthdata.com/about/terms-of-use/):
  public-domain geography. Exact immutable source URL/hash is in the map JSON.

## Editorial simplifications

The film clock is authored and separate from recorded execution timestamps. It
preserves launch/work/result dependencies without suggesting wall-clock speed.
Agent text is concise editorial copy; it does not expose or invent private model
reasoning. Tool names and source results are selected from actual receipts.
Flows 1–3 are authored deterministic CLIO SDK procedures, not demonstrations of
an LLM inventing those procedures unaided. PTC and the background watcher were
executed through a genuine reactive `gpt-6-luna` agent and kernel.

The selection and snowfall gestures are frame-driven reconstructions of existing
product semantics using retained data. They are not live browser input recorded
during the source runs. Exported comparison data is generated separately and
retained. The stream dashboard is reconstructed from the actual stream's data;
API receipts establish its live data access, not a separate live-browser test.

Recent rows live in backend memory. Saved snapshots are versioned artifacts.
The film does not claim unlimited retention, restart-surviving tasks, or a separate
persistent context-engine storage tier. Sensor data is explicitly a replay;
the simulation uses those same recorded wind observations. It assumes uniform
speed over each minute and space; mixing, deposition and geographic trajectories
are outside this illustrative model. The former unrelated pendulum stream was
rejected by the user and is not part of the delivered story.
