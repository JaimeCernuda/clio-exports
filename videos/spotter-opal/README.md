# SPOTTER-AI / OPAL

SPOTTER-AI is the subject of this film. OPAL, CLIO and Flowcept support its
investigation. The current reference is Polaris Chain B 7795459; its source IDs,
recorded alert times, native attention bodies and UI revision are documented in
[`OPAL.md`](../../motion/native/OPAL.md).

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

The full film still needs revision for incorrectly stopped reviewer activity and
pointer visibility/stacking. Read the
[SPOTTER lessons](../../.agents/skills/clio-videos/references/spotter-lessons.md).
Source ordering tests and a passing short proof are not full-film approval.
