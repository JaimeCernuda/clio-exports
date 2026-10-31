# Wordle study walkthrough

This film follows the 60-game study into its parallel workflow and delegated
workers, then switches explicitly to the separate 30-game study for its attached
views. The Science log is shown primarily as a graph. Selecting a graph node
opens the native record inspector and its citations. The task tree is used briefly
to open a delegated worker.

The sources remain unchanged in `studies/`. The reusable importer preserves every
captured session, exact public token checkpoints, tool lifecycle boundaries,
accepted science events, status mutations, task observations, board updates and
the native study/view definitions. It does not execute archived tools or call a
model. Raw checkpoint timing remains available through the forensic projection.
The presentation projection retypes public prose steadily within each recorded
text block. Its common source clock gives those delivery bursts readable time
and compresses idle gaps. Initial instructions and notifications retain their
native order relative to preceding blocks.

## Build and review

From the repository root:

```powershell
npm --prefix motion ci
git clone https://github.com/iowarp/gact-tui.git motion/.native-ui/source-ui-f333d67d
git -C motion/.native-ui/source-ui-f333d67d checkout f333d67d490174d2f2b82d7c0671e08ee0943ceb
pnpm --dir motion/.native-ui/source-ui-f333d67d install --frozen-lockfile --ignore-scripts
uv run python tools/prepare_study_replay.py studies/Wordle-study-session.html --out motion/.native-ui/wordle-data/run60.json
uv run python tools/prepare_study_replay.py studies/Wordle-study-views-session.html --out motion/.native-ui/wordle-data/run30.json
node motion/native/run.mjs check --profile wordle --source motion/.native-ui/source-ui-f333d67d
node motion/native/run.mjs build --profile wordle --source motion/.native-ui/source-ui-f333d67d
node motion/native/run.mjs preview --profile wordle --source motion/.native-ui/source-ui-f333d67d
```

Reuse an existing clean checkout at that revision instead of cloning it again.

The isolated Wordle profile uses port **3361**, output `build-wordle`, and the
`source-opal.json` production UI revision. It preserves the NDP, SPOTTER and manual
attention servers. Select a clean pinned UI checkout as described in `README.md`.

From `motion/`:

```powershell
npx tsx scripts/measure-study-cursor.ts
npx tsx scripts/measure-study-layout.ts
npx tsx scripts/retime-study-captions.ts
npx tsx scripts/audit-study-plan.ts
npm run native:build -- --profile wordle --source .native-ui/source-ui-f333d67d
$env:DEMO_GL = 'angle'
node --max-old-space-size=4096 render.mjs video --composition WordleStudyProof --scale 1.5 --concurrency 2 --output out/wordle-study-proof.mp4
node --max-old-space-size=4096 render.mjs video --composition WordleStudyOpeningReview --scale 1.5 --concurrency 4 --output out/wordle-opening-v2.mp4
node --max-old-space-size=4096 render.mjs video --composition WordleStudyWalkthrough --scale 1.5 --concurrency 2 --output out/wordle-study-walkthrough-v2.mp4
```

`run.mjs --source` resolves against the current working directory; the example
above points back into `motion/`. The compositions use a 1280×720 logical stage
and render at 1920×1080, 60 fps. `?mode=study&cut=proof` is the 96-second moving
slice; `?mode=study` is the revised 8:30 presentation cut. The 48-second opening
review includes the first Science Log expansion. `story/wordle-walkthrough-plan-v2.json`
and `story/wordle-narration-v2.json` retain the revised global anchors. The browser preview can pause,
seek, navigate workers, select graph nodes and change the study-view controls.

The cursor measurement pass renders native targets before their actions, rejects
missing/offscreen controls, and writes `story/wordle-cursor-targets.json` plus a
runtime copy beside the prepared replay data. Rebuild after measurement to include
that runtime copy. Changing layout, source or shot timing requires remeasurement.
The final pointer follows a single frame-derived path, portalled above all UI.
It stays parked until an explicit 0.35–1 second approach and does not return to
a distant corner after every click. The first move has the same timing rule.

The scroll measurement pass samples actual native geometry, including block
boundaries and conversation changes. It bakes the NDP damped viewport path into
`story/wordle-layout.json`. The renderer moves the DOM viewport with a deterministic
transform rather than snapping Chromium's scroll layer to the bottom. Stale
geometry is rejected. Short tool groups hold for six frames and collapse over
eleven; longer groups use fourteen and sixteen. Completed activity does not wait
for the next public sentence before closing.

The layout and source clocks are independent. A paused citation or board inspection
freezes the entire study; navigating workers does not restart their transcripts.
Native elapsed timers use that same recorded clock; the real date must not make
an archived running task appear to have been active for days.
The workflow retains the original three-way fan-out, merge and check. No editor
adds a step in these sources. The cancelled/replacement worker remains recorded.

## View repair

The board-view spec calculates its panel label from `strategy`, `guesses_used`
and `answer`. The pinned UI's table projection initially omitted those columns,
collapsing three panels into one undefined panel. The Wordle adapter adds fields
read by Vega `datum.field`/`datum['field']` expressions to the native source-column
projection. This repairs the actual query; it does not replace the chart, its
data, or its calculated labels. The original export is untouched. Tests cover
the expression dependency and seed-dependent table result.

The captured choice model can also update before a newly mounted chart installs
its subscription. The Wordle-only adapter rereads the binding immediately after
subscribing. Frame readiness verifies observation IDs in the actual SVG marks
against the requested seed, so a changed selector label cannot conceal stale
boards. The chart remains the native saved view and its actual query.

The graph refits when its node set grows as well as when the pane resizes. Inspect
records in the expanded native canvas so the graph and record inspector share
the screen. Click the actual graph node, and return through Entire study.

## Presenter captions and future speech

The presentation cut is silent by default, for live explanation. Narration is
separate in `story/wordle-narration-v2.json`; no speech service is called during build.

```powershell
uv run python tools/study_captions.py prepare --plan motion/story/wordle-narration-v2.json --out motion/out/wordle-caption-kit-v2
uv run python tools/study_captions.py align --plan motion/story/wordle-narration-v2.json --manifest motion/out/wordle-caption-kit-v2/elevenlabs-jobs.json --out motion/out/wordle-caption-kit-v2
```

`prepare` exports a timestamped presenter script, per-cue plain text, request
bodies, SRT and WebVTT. These first sidecars have **editorial timing**, not measured
speech timing. Choose a voice later and submit each text file to ElevenLabs'
[With Timestamps API](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps).
Save the returned JSON to each job's `responseFile`. Alternatively use the
[forced-alignment API](https://elevenlabs.io/docs/api-reference/forced-alignment/create)
with an existing recording and the same text. Its word records are also supported.

`align` reads those saved response files and offsets their actual local timings
onto the film's global cue anchors. It produces `wordle-audio-aligned` sidecars and
a timing JSON. It rejects missing cues, invalid arrays, non-monotonic timestamps
and audio that overruns its film window. Revise the voice clip or retime the film
when that happens; the importer does not silently speed up speech or fabricate
word timestamps. The exported jobs contain no API keys.

For visible review in the Codex player, burn the editorial captions into a
separate derivative. Its embedded MP4 subtitle tracks do not display in that
player. From the repository root:

```powershell
uv run python tools/burn_review_captions.py motion/out/wordle-study-walkthrough-v2.mp4 motion/out/wordle-caption-kit-v2/wordle-planned.srt motion/out/wordle-visible-captions.mp4
```

Use `--duration 8` with a different output path to check a short encode first.
The helper retains the entire 1920×1080 UI and adds a 144-pixel footer, producing
a 1920×1224 review copy with visible captions. It preserves the source timeline
and audio, if present. Keep the clean 16:9 master and SRT/VTT files for later
presentation and audio work. Inspect actual encoded pixels and a three-line cue
before handing over the review.

## Acceptance

Run the repository Python and motion checks, including the study tests. Then
review encoded playback: graph growth, step selection and Open, worker tool
progress, result-driven board changes, citation navigation, animated tool-group
collapse, pointer continuity and seed changes. A still or a successful encode
does not establish those. Keep the originals and generated video out of commits.
