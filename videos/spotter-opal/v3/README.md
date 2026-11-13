# Three-step SPOTTER investigation

See [REVIEW.md](REVIEW.md) for delivery status and the exact inspection coverage.

Original rounds **1, 2, 5 become Step 1, 2, 3**. Each step shows a prompt,
three native lookup views, a recorded reasoning excerpt and the recorded answer.
The 211-second, 1920×1080/60fps silent cut alternates Evidence, Lineage and
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

Local outputs in **`motion/out/spotter-v3/`**:

- `spotter-three-steps-full.mp4`: complete film.
- `spotter-three-steps-proof.mp4`: discontinuous internal mechanics proof.
- Movie `.json`: source/UI identity, hash, dimensions and verified frame count.

Browser review saves 70 states at 1920×1080 and 1116×970 and measures the pointer
into `motion/native/current/spotter-pointer.json`. Immutable paths reproduce
absolute seeks and sequential capture. The cursor exits through the frame edge
during long idle intervals. Native spinners share the film clock. Both source
clocks freeze during attention inspection.

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
