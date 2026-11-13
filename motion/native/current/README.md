# Current CLIO UI demo adapter

Use this path for **new transcript demos**. It imports the production React
components from `iowarp/gact-tui` **rc1/ui-liftoff**, pinned at
`47b74250e512358dda6275cd5084e9d4a8d1a376`. That redesign is ahead of `develop`
in the shell, transcript, composer and workbench. The pin is deliberate;
"current" does not float on every build. See [source-current.json](../source-current.json).

The historical NDP, SPOTTER, Wordle and engineering films keep their original
source profiles and source transformations. This adapter has its own entry,
Vite configuration, dependency resolution, cache, build directory and port.
It does not patch tracked files in gact-tui or change CLIO's public API.
The setup assumes an existing `D:/Libraries/Documents/projects/gact-tui`
checkout; clone `https://github.com/iowarp/gact-tui.git` there first on a fresh machine.

## Setup on D:

From `D:/Libraries/Documents/projects/clio-exports`, with Node 22.22+, pnpm
9.15.9, uv, FFmpeg and FFprobe available:

```powershell
$env:TEMP="$PWD/motion/.native-ui/tmp"
$env:TMP=$env:TEMP
$env:TMPDIR=$env:TEMP
$env:UV_CACHE_DIR="$PWD/.cache/uv"
$env:npm_config_cache="$PWD/.cache/npm"
New-Item -ItemType Directory -Force $env:TEMP | Out-Null
git -C D:/Libraries/Documents/projects/gact-tui fetch origin
git -C D:/Libraries/Documents/projects/gact-tui worktree add --detach "$PWD/motion/.native-ui/source-ui-47b74250" 47b74250e512358dda6275cd5084e9d4a8d1a376
Push-Location motion/.native-ui/source-ui-47b74250
pnpm install --frozen-lockfile --ignore-scripts --store-dir ../pnpm-store
pnpm --filter @clio/hdf5-viewer build
Pop-Location
cd motion
# Reuse the existing motion installation; npm ci only on a fresh machine.
npm run demo:check
npm run demo:build
npm run demo:preview
```

Open **http://127.0.0.1:3372/**. The outer Play/Restart/seek controls are review
controls, omitted from captured frames. `demo:dev` is the editable source server;
stop it before `demo:preview`, which uses the same port. Alternative clean
checkouts are accepted with `--source <path>` on the native runner, or
`CLIO_UI_SOURCE`. The exact pin and clean tracked tree are checked at startup.
HDF5 has its own production viewer build; omitting that build fails explicitly.

## A new exported session

From the repository root, import the complete native export:

```powershell
uv run python tools/prepare_native_scene.py D:/exports/run.html --out motion/native/public/my-run.native.json
cd motion
npm run demo:create -- my-run.native.json my-run 120
npm run demo:plan -- demos/my-run.json
```

The initializer refuses to overwrite an existing manifest. Its optional fourth
argument selects the first N source turns; default is all turns. Assistant-only
children remain valid. It preserves source IDs/hash and links saved A2UI views
to their actual generating blocks. Adjust `turns`, `frames`, `holdFrames`,
`edits` and the `pocket` labels in the manifest. Generated timing is a starting
point, **not a claim of adequate reading time**. Keep original exports and
checksums unchanged. Text-only transcripts cannot reconstruct missing widgets,
attention captures, source files or tool results.

Rebuild the preview after adding/changing public JSON. Then open
`http://127.0.0.1:3372/?demo=demos/my-run.json`. A mismatched source hash/session,
unsafe path, nonexistent generating block, or pocket anchor omitted from the
selected replay is rejected. `scene` overrides must still match that identity.

```powershell
npm run demo:stills -- demos/my-run.json 120,900,1800
npm run demo:render -- demos/my-run.json out/current-ui/my-run.mp4
```

The renderer derives duration from the manifest, fixes 1920×1080 / 60fps and
uses one capture worker. It checks the preview's UI revision before rendering.
The MP4 gets an adjacent JSON receipt with UI pin, source hash, session ID,
duration, exact manifest/scene/served-HTML hashes and output SHA256. Visual acceptance is recorded separately; a successful
encode is not visual approval. The movie is silent and stays local/ignored.

## Components and behavior

- `CurrentProviders` installs the production appearance, conversation-display,
  motion, tooltip, repository, routing and A2UI providers. The native light theme,
  type scale and fonts come from the pinned source CSS, not copied old values.
- `CurrentWorkspace` uses `ClioAppShell`, `ClioSessionContextBar`,
  `ClioComposer` and `ArchiveConversation`. They can be independently reflowed
  for a film; the full application frame is a baseline, not mandatory ad layout.
- The projection in `demo-model.ts` reveals genuine source blocks in order.
  User text grows in the composer before entering the transcript. Public text
  and recorded reasoning stream as Unicode code points. Tool results and
  duration remain hidden until their editorial completion. Raw evidence is
  never mutated and no exported call is re-executed.
- Source-linked result views use the production `FrameTab`, `IconButton`,
  `WorkbenchStrip` and `ClioA2UISurface`. Tab selection, closing, maximize and
  restore act on real DOM views. Native `ClioWorkbench` handles recorded artifact
  inspection. An uncaptured file listing is explicitly unavailable.
- The transport is production `ArchiveTransport`: captured reads and locally
  supported saved table queries; no live inference or invented successful writes.
  The composer is disabled for live submission. Archive-unavailable actions fail.
- A scoped presentation-clock adapter supplies captured execution time to the
  native UI clock hook. Active tool durations interpolate their actual recorded
  milliseconds; completed calls retain their original durations. The clock
  never compares an archived start time with today's date. Network/cache and
  paint deadlines keep real clocks. The shared-clock module alias and the map
  context alias are deliberate, version-pinned presentation adapters.
- The current frame bridge waits for fonts, actual surface roots, image decode,
  loaded maps and stable layout. A live tool's busy state is **not** an asset
  loader. Scroll position is corrected after asset resize. Render spinners use
  the same frame clock. Fonts, maps and rich views are not acknowledged merely
  because React mounted their containers.
- Tahoe's cached, georeferenced USGS map context is an explicit presentation
  adapter shared with the historical renderer. Other scenes do not inherit it.

## Coverage and migration boundaries

This is a **single-session recorded replay adapter**. The representative Tahoe
manifest selects the first recorded turn. No scientific calculation or product
run has been rerun by this modernization.

The existing paired-agent source clock, attention-bundle server, SPOTTER
investigation, Science Log graph choreography, engineering mesh interactions,
authored cursor tracks, camera poses and ad bookends are retained on their
historical profiles. They are **not automatically ported or newly qualified** by
the current adapter. Preserve those clocks and evidence when porting a film;
re-measure its layout and cursor against this source. Do not wire task/subagent
final snapshots to a fake live lifecycle. They remain recorded dependency data
here; a live-looking paired/flow sequence requires its actual event clock.

## Verification

```powershell
npm test
npm run typecheck
npm run format:check
npm run demo:check
npm run demo:build
# With demo:preview running:
npm run demo:browser-test
```

The browser test exercises the real production build: draft typing, source
progression, result paint, georeferenced map, tab selection/closing, maximize /
restore, no remote requests or page errors, and backward/forward seeks. Its
screenshots are under `.native-ui/current-browser-review/`. See
[REVIEW.md](REVIEW.md) for the precise moving-proof review and limits.

`tahoe-current-full.json` is a full-session compatibility fixture. Its browser
check opens the earlier shoreline result through the pocket and verifies its
actual chart and ten table rows. Current CLIO suspends offscreen transcript
rows; an unmounted earlier chart is not evidence that its captured data is lost.

When updating the UI again, add/update a versioned adapter and pin, resolve the
actual component/provider contracts, rerun these checks and inspect new encodes.
Do not feed a newer checkout into the old source-string replacements.

For an existing compatibility encode affected by the old wall-clock tool timer,
`node --import tsx scripts/repair-current-tool-clock.ts demos/tahoe-current.json out/current-ui/tahoe-current.mp4`
captures only the source-bound active-tool ranges, checks their conform's full
frame count/decode and preserves the original under `out/current-ui/review/`.
Use it once per base encode. Its receipt records the exact repaired frames and
both input/output hashes. Fresh `demo:render` captures already use the fixed clock.
