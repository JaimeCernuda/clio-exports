# SPOTTER-AI / OPAL

SPOTTER-AI is the subject of this film. OPAL, CLIO and Flowcept support its
investigation. The current reference is Polaris Chain B 7795459; its source IDs,
recorded alert times, native attention bodies and UI revision are documented in
[`OPAL.md`](../../motion/native/OPAL.md).

## Investigation revision (v2)

The [implementation plan](REVISION-PLAN.md) and generated
[source ledger](investigation-v2.sources.json) describe the revised film.
The [review history](REVIEW-V2.md) records the defects found, corrections and
inspection limits; `review-v2.json` identifies the actual delivery file.
The right pocket alternates between native SPOTTER activity, supplied scientific
evidence and a growing scenario-provenance graph. Words/Max is the default
attention display; Tokens and Mean remain selectable in the emulator.
Mean is the legacy mean over captured runs, not the newer full-token mean;
see the word-renderer source notes below. The film consistently uses Max.

The graph is **reconstructed from the prompt's precomputed lookup results**.
It does not invent main-agent tool calls or claim to be captured Flowcept
telemetry. Each source node retains its prompt/part ID and exact Unicode span.
Scientific comparisons are calculated from those supplied tables. Recorded
answers, SPOTTER tools, notifications, warning and danger alert keep their
original order. The alert precedes the user's two attention inspections.

With the native preview on 3359, render and review from `motion/`:

```powershell
node node_modules/tsx/dist/cli.mjs scripts/prepare-spotter-investigation.ts
node render.mjs video --composition SpotterOpalFilm --scale 1 --concurrency 1 --props examples/spotter-review.json --output out/spotter-v2/spotter-opal-investigation-v2.mp4
node node_modules/tsx/dist/cli.mjs scripts/audit-spotter-pointer.ts out/spotter-v2/spotter-opal-investigation-v2.mp4.cursor.raw.json
node node_modules/tsx/dist/cli.mjs scripts/review-spotter-encode.ts
node scripts/serve-spotter-review.mjs
```

Review gallery: `http://127.0.0.1:3360/`. It provides direct downloads, frame steps,
shot markers and a link back to the editable replay. Outputs stay under
`motion/out/spotter-v2/`; movies are not committed. The actual encode's inspection
coverage and any remaining limitations belong in `review.json` alongside it.

The cursor audit checks every body frame, including its painted-frame identity
and ownership. The encode-review script extracts full-film overview sheets and
12 fps sequences around the authored interactions. Extraction is not approval:
inspect the sheets and actual playback, then record what was reviewed. A partial
cursor log is diagnostic only. For a replacement render, pass its explicit
`--first` and `--frames` range to the cursor audit.
Use one worker for the entire film. The three-worker base passed its cursor
audit but failed later all-frame paint review: code sometimes vanished and chat
scroll positions alternated. The full serialized render reduced the diagnostic
flash candidates from 156 to 41. Immediate native code tokens alone did not fix
deferred code-container painting; capture CSS now disables its automatic content
visibility and intrinsic placeholder. The delivery combines that serialized base
with seven bounded native paint corrections. The exact multi-worker cause is not
established; a passing cursor audit alone does not qualify its transcript paint.

The following scripts preserve production history. `conform-spotter-evidence.ts`
is the frame-exact repair path used during early v2 review:
it replaces global frames 7940–8837 (early evidence), 8838–9549 (progressive reply)
and 13211–14836 (both attention interactions),
verifies the 16406-frame delivery and merges measured pointer poses. A fresh complete render
from the current source already includes that repair and needs no conformation.
The attention replacement starts before the first selection so native menu,
heat and scroll state develop continuously before the revised second approach.
The early evidence render contributes its first 898 frames. The reply correction
starts after thinking has collapsed and before its first answer character.
The cut returns to the base while the pointer is stationary on the Provenance tab.

The later text pass is indexed by `native/spotter-text-repairs.json` and rendered
with `SpotterTextRepairs` at concurrency 1. `prepare-spotter-text-repairs.ts` uses
the pinned UI checkout's remark parser to locate temporary underline headings;
`conform-spotter-text.ts` applies that source-linked repair reel to its exact
hashed predecessor. A full fresh render already uses the corrected thinking
renderer and retained final reviewer trail, and needs neither repair stage.
The sparse repair recipe discards three leading settling frames per interval,
checks that all flagged text frames remain covered, and preserves the original
frame-matched approval control's keyboard-focus paint. `--base <path>` accepts
the preserved predecessor explicitly; its hash must still match the manifest.

The delivery paint pass uses `native/spotter-paint-repairs.json`, generated by
`scripts/prepare-spotter-paint-repairs.ts` from the hash-matched serialized flash
scan and measured pointer track. It contains seven intervals with stationary
pointer handles and 300 setup seed frames. Render `SpotterPaintRepairs` at scale 1,
concurrency 1, using the same props. Apply it with:

```powershell
node node_modules/tsx/dist/cli.mjs scripts/conform-spotter-text.ts --base out/spotter-v2/spotter-opal-investigation-v2.serial.mp4 --manifest native/spotter-paint-repairs.json --patch out/spotter-v2/paint-repairs.mp4 --output out/spotter-v2/spotter-opal-investigation-v2.reviewed.mp4
```

The seed frames are omitted and three settling frames per interval come from the
base; all flagged frames must remain in the correction. Inspect all fourteen
joins and rerun the complete decoded-frame scan before promoting the replacement.
The manifest only applies to its exact predecessor hash. A fresh full render from
current source already includes this fix and needs no historical repair reels.

`native/spotter-placeholder-repairs.json` records a final Round 6 Markdown fix:
literal answer-format metavariables must stay visible instead of being consumed
as HTML while reasoning streams. It spans the first placeholder through the
thinking collapse. `SpotterPaintRepairs` accepts an explicit `frames` prop and
derives its duration from that array; use this manifest's frames to render the
805-frame seed/correction reel:

```powershell
$placeholder = Get-Content -LiteralPath native/spotter-placeholder-repairs.json -Raw | ConvertFrom-Json
@{ recordCursor = $true; frames = $placeholder.frames } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath .native-ui/tmp/placeholder-props.json -Encoding utf8
node render.mjs video --composition SpotterPaintRepairs --scale 1 --concurrency 1 --props .native-ui/tmp/placeholder-props.json --output out/spotter-v2/placeholder-repairs.mp4
node node_modules/tsx/dist/cli.mjs scripts/conform-spotter-text.ts --base out/spotter-v2/spotter-opal-investigation-v2.reviewed.mp4 --manifest native/spotter-placeholder-repairs.json --patch out/spotter-v2/placeholder-repairs.mp4 --output out/spotter-v2/spotter-opal-investigation-v2.final-review.mp4
```

Never apply a historical manifest to a different movie hash. Fresh full renders
already include this presentation fix too.

The native UI remains pinned to f333d67d. The word renderer is a scoped backport
of upstream commit 939b5ed4, documented in
[`word-attention/UPSTREAM.md`](../../motion/native/word-attention/UPSTREAM.md).
Other native film profiles keep their original source revision.

Tests: `npm test`, `npm run typecheck`, and the native `check` / `build` commands
below. Regenerating the source ledger does not execute model or tool calls.

## Choose the launch mode

| Goal | Launch | Behavior |
| --- | --- | --- |
| Manually select new spans and inspect attention | [Local attention launch guide](../../motion/native/MANUAL-ATTENTION.md) and `tools/launch_attention_replay.py` | Real native CLIO frontend + recorded-bundle backend; attention is computed on request from local tensors/tokenizer |
| Review synchronized main + SPOTTER activity, tweak pacing, make a movie | `opal` emulator profile on 3359 | One authored source clock, animated captured thinking/tools and finite recorded attention responses |
| Start a fresh live agent investigation | Actual CLIO runtime with a configured provider/connector | Requires model execution; local replay assets alone do not launch inference |

The manual recipe accepts a complete local bundle, or paths to existing captures
and tokenizer folders. Its preflight performs no download and changes no inputs.
The backend can expose SPOTTER's recorded conversation alongside the main session;
it does not create new SPOTTER reviews. Chain B has six main-model attention
captures and no reviewer-model captures. Do not reuse another run's heat.

## Film emulator

Use the pinned UI in `motion/native/source-opal.json`. From the repository root:

```powershell
node motion/native/run.mjs check --profile opal --source '<clean-f333d67d-ui-checkout>'
node motion/native/run.mjs build --profile opal --source '<clean-f333d67d-ui-checkout>'
node motion/native/run.mjs preview --profile opal --source '<clean-f333d67d-ui-checkout>'
```

Open:

```text
http://127.0.0.1:3359/?mode=spotter&pair=opal-chainB-7795459.native.json&attention=chainB-7795459-attention.json
```

The committed pair and finite response sidecar support this preview without a
backend. They do not replace the manual backend for arbitrary selections.
Regenerate the pair with `tools/prepare_spotter_replay.py`; use
`tools/capture_replay_attention.py` against the local backend to refresh exact
inspection responses. See OPAL.md for alias arguments and source-span constraints.

From `motion/`, with 3359 running:

```powershell
node render.mjs video --composition SpotterAttentionProof --scale 1.5 --concurrency 1 --output out/spotter-attention-proof.mp4
node render.mjs video --composition SpotterOpalFilm --scale 1.5 --concurrency 1 --output out/spotter-opal.mp4
```

The editable full-film plan is `motion/native/spotter-film-plan.ts` and
`motion/story/spotter-film.md`. The transparent logo assets and intro composition
are retained in `motion/public/` and `motion/src/SpotterIntro.tsx`.

Use one source clock across both logs. Recorded wakes follow their triggering
messages; queued notification, consumption and review work are distinct events.
Freeze both logs during attention inspection. The recorded alert triggers the
user's inspection; the later quarantine did not stop any earlier answer.

The historical v1 film needs revision for incorrectly stopped reviewer activity and
pointer visibility/stacking. Read the
[SPOTTER lessons](../../.agents/skills/clio-videos/references/spotter-lessons.md).
Source ordering tests and a passing short proof are not full-film approval.
The v2 encode's own review receipt describes its separate inspection coverage.
