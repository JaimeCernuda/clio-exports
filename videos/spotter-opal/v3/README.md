# Three-step SPOTTER investigation

See [REVIEW.md](REVIEW.md) for delivery status and the exact inspection coverage.

Notebook revision: **3:31, 1080p/60fps**, with the native warm `light` palette,
IBM Plex typography and the separate green text/red tool ramps from gact-tui
PR 1288 (`075c0581`). See [NOTEBOOK-REVIEW.md](NOTEBOOK-REVIEW.md) for its own
delivery and inspection status. The earlier Cool encode remains in
`motion/out/spotter-v3/`; the Notebook outputs use `motion/out/spotter-v3-notebook/`.
Local watch/download gallery:
**http://127.0.0.1:3373/?clip=full**. The movie stays local; render and review
receipts are committed alongside this guide.

Original rounds **1, 2, 5 become Step 1, 2, 3**. Each step shows a prompt,
three native lookup views, a recorded reasoning excerpt and the recorded answer.
The 217-second, 1920×1080/60fps silent cut alternates Evidence, Lineage and
SPOTTER. Tables arrive with their results; dashed graph groups grow in place.
SPOTTER's danger alert leads into both attention inspections. Delivery retains
the approved eight-second animated introduction from `src/SpotterIntro.tsx`.
It replaces the rehearsal's seven-second title, so body delivery timestamps are
one second later than the emulator's frame clock.

## Evidence contract

The primary agent made **zero tool calls**. Nine `reconstruction:*` rows present
exact precomputed prompt packets, not new executions. Original exports, answers
and SPOTTER's seven real calls remain unchanged. The introductory disclosure and
[source ledger](source-projection.json) retain that distinction. Never ingest
these presentations as real Flowcept telemetry.

Attention relocation uses full SafeTensors input-token positions and uniform
mean mass for the exact selected decode steps. Preserve original ownership,
residual, denominator, omitted context and global display scale. Top-retained
display runs alone cannot determine percentages. `Tool results` describes the
reconstruction's source grouping, not a newly measured tool-role model run.
Words/Max is the default; no suspect span is amplified. The rule comparison is
calculated over saved tables, separately from the recorded wrong answer.

## Run on D:

Use the [current UI setup](../../../motion/native/current/README.md), pinned to
gact-tui rc1/ui-liftoff `47b74250e512358dda6275cd5084e9d4a8d1a376`.
From `motion/`, keep TEMP/TMP/TMPDIR in `motion/.native-ui/tmp`:

```powershell
npm run spotter:reconstruct
npm run demo:check
npm run demo:build
npm run demo:preview
```

To serve the completed movie and its review controls, use another terminal
from `motion/`:

```powershell
$env:CLIO_SPOTTER_REVIEW_ROOT="$PWD/out/spotter-v3-notebook-compact"
$env:CLIO_SPOTTER_REVIEW_GALLERY="$PWD/../videos/spotter-opal/v3/review.html"
$env:CLIO_SPOTTER_REVIEW_PORT="3373"
npm run spotter:review
```

Open **http://127.0.0.1:3372/?demo=demos/spotter-current.json**. Play, Shot and
absolute frame controls use the same component as capture. Tabs, the available
step selector and tool inspection operate on source-bound views. This archive
cannot launch an agent or execute a lookup.

In another terminal, from `motion/`:

```powershell
node scripts/review-spotter-v3.mjs
# Rebuild after measuring pointer profiles or editing source.
npm run demo:build
node scripts/capture-spotter-v3.mjs proof
node scripts/capture-spotter-v3.mjs full
```

Direct capture uses one existing headless Chromium installation, the shared
frame/paint protocol, compositor screenshots and one sequential FFmpeg encoder.
Images stream to the encoder, not thousands of temporary files. Two independent
pages share one browser only after exact cold/sequential pixel-parity checks.
The final conform joins the approved introduction with the native body; its
frame count and both source hashes are recorded. An absent approved intro is
regenerated from its existing Remotion composition.

If Windows blocks promotion because the previous movie is open, release the
player and run `node scripts/finalize-spotter-v3.mjs --notebook-compact`. It requalifies the completed
conform, checks saved pointer poses/parity, and promotes it without another render.
The local gallery closes aborted video streams so replaced files can be released.

The renderer disables wall-clock interpolation on frame-owned elements and
requires measured and declared cursor positions to agree. Follow-scroll is
reconciled after content settles. Discontinuous windows receive discarded
24-frame source lead-in. Spinner variables stay on their own nodes, and unchanged
heat projections are memoized. The final clean render uses the complete native
body, with the approved intro as its only assembly join. The compact revision's
native composition and multi-source attention navigation are documented in
[COMPACT-REVIEW.md](COMPACT-REVIEW.md). The preceding Notebook encode is retained
as rejected history in [NOTEBOOK-REVIEW.md](NOTEBOOK-REVIEW.md).

An earlier correction experiment and its exact frame-splicing tests are retained
for maintenance. It needs the corresponding retained base; it is not the default
delivery workflow:

```powershell
npx tsx scripts/prepare-spotter-pointer-repair.ts
node scripts/capture-spotter-v3.mjs repair
node scripts/spotter-pointer-repair.mjs
```

Full captures use the corrected renderer directly. Finals are promoted only
after dimensions and decoded frame counts pass; a failed conform preserves the
previous final.

Latest local outputs in **`motion/out/spotter-v3-notebook/`**:

- `spotter-three-steps-full.mp4`: complete film.
- `spotter-three-steps-proof.mp4`: discontinuous internal mechanics proof.
- Movie `.json`: source/UI identity, hash, dimensions and verified frame count.

The Notebook variant keeps the native shell pinned to `47b74250` and backports
the reviewed heat presentation in a film-scoped adapter. It does not claim to run
the newer PR's entire frontend or a fresh Barebone model session. The original
attention, masses, scale and source identities remain unchanged. Prompt heat
comes from its exact original display runs; renamed Step aliases stay unpainted.
Green prompt and red reconstructed-result rail marks retain that ownership.
The eight-second intro uses `SpotterIntroNotebook`, the same logo/routes and
geometry on Notebook paper with IBM Plex Sans. The original intro is preserved.

Browser review saves 78 states at 1920×1080 and 1116×970 and measures the pointer
into `motion/native/current/spotter-pointer.json`. Immutable paths reproduce
absolute seeks and sequential capture. The cursor stays at its last action
during idle intervals and travels directly to the next target. The two attention
clicks have short rests in the nearby gutter so the pointer does not cover the
highlighted source. It fades only with the interface at the branded close. Native
spinners share the film clock. Both source clocks freeze during attention inspection.

## Rebuild attention

The committed finite sidecar supports saved selections, including the answer
line and `73`; it cannot answer arbitrary new selections. For a manual backend,
use [MANUAL-ATTENTION.md](../../../motion/native/MANUAL-ATTENTION.md).

With the original bundle's tensors and tokenizer available, from repo root:

```powershell
$env:UV_CACHE_DIR="$PWD/.cache/uv"
uv run python tools/prepare_spotter_attention_relocation.py --bundle motion/.native-ui/inputs/chainB-7795459/attention-replay-7795459-chainB
uv run pytest tests/test_spotter_attention_relocation.py
```

The generator verifies bytes/SHA, exact tokenizer round trips, disjoint Unicode
spans and mass conservation. Ambiguous boundary tokens stay in their original
domain. Reasoning excerpts and display aliases are in the ledger. Additional
original rounds are omitted explicitly; the later review is not moved before
their execution. See [PLAN.md](PLAN.md) and [REVIEW.md](REVIEW.md). Movies and
tensors remain local; portable source and production guidance belong on main.
