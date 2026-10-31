# Wordle science study

The revised 8:30 walkthrough follows the 60-game branched study into its evolving
flow, delegated agents, tool-driven boards and Science Log **graph**. It explicitly
switches to the separate 30-game run for its attached interactive views.

The complete build and caption workflow is in
[`WORDLE.md`](../../motion/native/WORDLE.md). Both original exports are versioned
in `studies/`. Generated replay data, browser builds and movies are local.

| Concern | Source |
| --- | --- |
| Import and source events | `tools/prepare_study_replay.py` |
| Clock and UI projection | `motion/native/study-replay-model.ts`, `study-film-plan.ts`, `study-pacing.ts` |
| Native flow, graph, views and worker navigation | `motion/native/study-replay-app.tsx`, `study-controls.tsx`, `study-dom.ts` |
| Revised story | `motion/story/wordle-walkthrough-plan-v2.json` |
| Presenter copy | `motion/story/wordle-narration-v2.json` |
| Measured geometry and pointer | `motion/scripts/measure-study-layout.ts`, `measure-study-cursor.ts` |
| Speech-alignment import | `tools/study_captions.py` |
| Independent Remotion entry | `motion/src/wordle-index.tsx` |

From the repository root, after the shared setup:

```powershell
uv run python tools/prepare_study_replay.py studies/Wordle-study-session.html --out motion/.native-ui/wordle-data/run60.json
uv run python tools/prepare_study_replay.py studies/Wordle-study-views-session.html --out motion/.native-ui/wordle-data/run30.json
node motion/native/run.mjs build --profile wordle --source '<clean-f333d67d-ui-checkout>'
node motion/native/run.mjs preview --profile wordle --source '<clean-f333d67d-ui-checkout>'
```

Open `http://127.0.0.1:3361/?mode=study`. Keep the preview running, measure pointer
and layout as documented, then rebuild before rendering:

```powershell
npm --prefix motion run wordle:proof
npm --prefix motion run wordle:render
```

The importer retains raw captured checkpoints. Presentation pacing streams public
prose steadily and compresses idle time on a common source clock shared by every
worker and scientific status change. The saved final workflow is not its state at
every earlier frame. Keep the two studies' seeds, strategies and results separate.

Captions are for a live presenter. `study_captions.py prepare` creates editorial
SRT/VTT, cue windows and ElevenLabs job inputs; `align` imports real returned
timestamps. No voice service is called during preparation. The Codex player needs
the visibly burned-caption derivative from `tools/burn_review_captions.py`.
