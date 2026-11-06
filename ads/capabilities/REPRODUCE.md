# Reproduce the source and the films

Rendering is offline from the committed evidence. It does not require CLIO, a model
provider, an inference service or source transcripts beyond the bounded derivatives.
Use the README commands to install, check and render.

## Recompute scientific derivatives

`uv run python scripts/science.py` checks the public PBMC file checksum, recomputes
CSC per-cell counts, pendulum periods, wind-driven transport and geodesic area.
It downloads the 5.2 MB HDF5 into `.cache/datasets/` if absent. Dependencies are
declared in `pyproject.toml` and resolved in `uv.lock`.

`node scripts/prepare-basemap.mjs` fetches the immutable Natural Earth source
identified by the committed map's commit and verifies its SHA-256 before regional
clipping. It does not silently repin a new version on every run.

`node scripts/prepare-evidence.mjs` re-extracts the selected archived native views
from the parent repository and NOAA CSV from the sibling clio-agent checkout.
That operation requires those original sources; ordinary rendering does not.
Set `CLIO_SOURCE_ROOT` if that checkout is elsewhere. Preserve original archive hashes.

## Repeat genuine CLIO execution

Use the pinned product checkout and its pinned submodules. The campaign marketplace
under `product/` supplies real beam/pendulum procedures, subagents and read-only
HDF5 tools. It requires no public API changes. Use an isolated CLIO home and workspace;
do not point this proof at a user's working session or production service.

```powershell
# From ads/capabilities, with clio-agent a sibling of clio-exports:
$campaign = $PWD.Path
$productRepo = (Resolve-Path ../../../clio-agent).Path
$env:TEMP = "$campaign/.cache/tmp"
$env:TMP = $env:TEMP
$env:UV_CACHE_DIR = "$campaign/.cache/uv"
$env:UV_PROJECT_ENVIRONMENT = "$campaign/.cache/clio-runtime"
$env:CLIO_AGENT_HOME = "$campaign/.cache/runtime-home"
$env:CLIO_AGENT_CACHE_DIR = "$campaign/.cache/runtime-home/cache"
$env:CLIO_DEFAULT_MARKETPLACE = "$productRepo/external/clio-agent-marketplace"
uv sync --project $productRepo --python 3.13
uv run --project $productRepo --python 3.13 --no-sync clio-agent serve --host 127.0.0.1 --port 8788
```

In another terminal, from the campaign directory:

```powershell
node scripts/record-product.mjs method hypothesis team tools selection streams
uv run pytest -q
```

The collector installs/trusts only the local campaign marketplace in that isolated
backend, selects `codex/gpt-6-luna`, creates a dedicated workspace, and approves its
requested local operations. A valid provider login is required for reactive PTC
and stream runs. Deterministic flows still use real CLIO scheduling and tool
recording. `product/requests/*.kernel` are Python kernel submissions with top-level
await and injected `tools`, `stream`, `task` bindings, not standalone Python modules.
Tests compile them with the same top-level-await contract.

The team procedure composes two preparation flows with `ctx.call`/`ctx.gather`,
then three concurrent specialists, then a conditional timing-review specialist.
`ctx.gather` requires FlowCall objects; passing `ctx.step` coroutines is invalid.
The collector saves each native `/tasks/{handle}/flow` projection alongside its
messages and task times. Step labels in the inspector summarize real source code;
the native task projection exposes its result and child calls, not a fabricated
tool transcript. The one-minute review threshold is an illustrative policy.

The selection program performs a genuine `read_selected_observations` tool call
inside PTC and computes the maximum from exactly twelve retained NOAA records.
The filmed brush/reference gesture remains an authored reconstruction.

The stream collector records live reads while the task runs, a second agent query,
final retained windows, snapshots and task completion. `/tasks/query` is the unified
task endpoint; the older `/tasks` listing does not establish absence of Code work.
Source messages are cursor-ordered API results; use their timestamps and sequence
fields rather than assuming array order is chronological.
Each stream proof gets a fresh workspace, avoiding old rows under a reused name.
`stream-query.json` pins the actual retained agent read. The editorial source clock
uses a monotone interpolation through that read and the final row. The model uses
the burn's own last twenty minute-mean wind speeds, not a separate scientific case.
Integrating speed × 60 seconds gives illustrative travelled distance; it is not a
dispersion forecast or a geographic displacement estimate.

On this Windows machine, importing NumPy inside the isolated PTC worker stalled
in an early attempt. The final program uses standard-library sums/statistics and
real h5py-backed tool reads; that successful receipt is retained. Failed exploratory
attempts are not counted as passing source evidence. NumPy in the separate science
preparation environment works and is covered by the numerical checks.

## Review loop

Build the complete story, compile/check, render a complete 60 fps draft, inspect
the actual encode and write timecoded findings. Fix source truth and story before
motion/readability, then polish audio. Render finals sequentially and review those
actual files again. Do not copy a historical review success into a new manifest.
The technical reviewer checks dimensions, frame count, full decode, audio, QR and
closing stillness. Its image sequences aid inspection; it cannot approve the story.

`--stills` records DOM geometry alongside PNGs for meaningful control hits and
component bounds. Review cursor routes throughout the encode, not only at clicks.
Check at half-size for readability. Movies have procedural audio and on-screen
copy; they do not depend on captions or narration for comprehension.
