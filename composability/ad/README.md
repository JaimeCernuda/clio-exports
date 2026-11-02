# CLIO composable-agent advertisement

This project moved from the repository's old `ad/` folder into `composability/ad/`.
Its existing local renders moved with it. Related website loops live in
[../website/](../website/README.md); the full advertisement remains separate.

Start with [HANDOFF.md](HANDOFF.md): the goal, intended audience, the user's ideas,
settled direction, rejected approaches and current limits. [ART-DIRECTION.md](ART-DIRECTION.md)
describes the implemented story. [CLAUDE.md](CLAUDE.md) is the short agent entrypoint.

This directory is the independently runnable source project for the advertisement.
It contains the editable components, copy, timing, assets, renderer, sound generator,
tests, review scripts and review history. It needs no CLIO backend or transcript server.
The technical presentation demos elsewhere in this repository are separate projects.

Current baseline: **v14, 36 seconds, 1920 × 1080, 60 fps, original procedural audio**.
It is a revision for user review, **not a creatively approved final**. The latest
[review receipt](docs/reviews/review-ad-v14.md) distinguishes checks from approval.
Rendered movies remain local and are excluded from Git.

The GRC closing-credit artwork is the unmodified PNG supplied by the user.
[Its source and checksum](references/grc-logo.json) accompany the bundled asset.

The prompt stays at a fixed size and position. Owner-colored marks identify its
actual edits, while a persistent tree on the right shows skills, hooks, tools
and MCP servers entering or leaving with their plugin. The wheel smoothly shortens
the keyword hook to four seconds, already fast by Materials/Chemistry. Directional
blur follows cadence and motion. Every addition opens a global plus menu and
selects a plugin before its instructions and capabilities enter; removals click X. The closing URL
and QR are larger, with no arrow beside the URL. Beneath them, the supplied
transparent GRC logo accompanies “An IOWarp system / by the Gnosis Research Center.”
The cursor follows a continuous route through the frame edge between gestures.
The traveling owl clears the prompt before it appears, and later domain edits
settle for 0.6–1.3 seconds before the next change.

## Run

Use Node.js 22+, npm, FFmpeg and FFprobe. Dependencies and fonts are pinned in
`package-lock.json`. From this directory on the user's Windows machine:

```powershell
New-Item -ItemType Directory -Force .cache/tmp | Out-Null
$env:TEMP=(Resolve-Path .cache/tmp).Path
$env:TMP=$env:TEMP
$env:TMPDIR=$env:TEMP
$env:npm_config_cache=Join-Path (Get-Location) '.cache/npm'
npm ci
npm test
npm run typecheck
npm run format:check
npm run measure
npm run review:geometry
npm run render
npm run review
```

Keep this checkout and every output/cache on **D:** on the user's machine. Never
fall back to C: for render storage. On another machine, keep temporary/cache paths
on that machine's project volume. `DEMO_CHROME_PATH` optionally names an existing
compatible Chrome executable. Otherwise Remotion obtains its supported browser.

`npm run studio` opens the editable composition on port 3370. `npm run stills --
--frames 564,624,649,650` renders selected frames. `npm run qr` regenerates the
included QR assets if the destination changes. The complete render command writes:

- `out/composable/clio-composable-ad-v14-clean.mp4`
- `out/composable/clio-composable-ad-v14.mp4`

Measurements, extracted review images and reports go in `review/`; bundles and
temporary files are also ignored. Do not run two bundles/renders against the same
`bundle/` directory at once. Successful raw video and sound intermediates are removed.

The commands under `motion/` are compatibility launchers for this project. Edit
the actual ad here. The earlier v9 movie in `motion/out/composable/` remains local;
future renders use this directory's `out/` folder.

## Where to edit

| Material                                       | File                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| Goal, aim, user-message summary and handoff    | [HANDOFF.md](HANDOFF.md)                                                 |
| Story and creative reasoning                   | [ART-DIRECTION.md](ART-DIRECTION.md)                                     |
| Copy, domains, plugin contributions and timing | [story/composable-ad.json](story/composable-ad.json)                     |
| Fixed prompt and film                          | [src/ComposableAd.tsx](src/ComposableAd.tsx)                             |
| Persistent plugin/capability tree              | [src/AdCapabilities.tsx](src/AdCapabilities.tsx)                         |
| Opening wheel and aligned lockup               | [src/AdOpening.tsx](src/AdOpening.tsx)                                   |
| Measured prompt and editable text              | [src/AdPrompt.tsx](src/AdPrompt.tsx)                                     |
| Causal cues, pointer, routes and ownership     | [src/composable-ad-plan.ts](src/composable-ad-plan.ts)                   |
| Shared chooser and audio timing                | [src/plugin-choice-timing.mjs](src/plugin-choice-timing.mjs)             |
| Global plugin chooser                          | [src/AdPluginChooser.tsx](src/AdPluginChooser.tsx)                       |
| Shared visual/audio wheel timing               | [src/wheel-timing.mjs](src/wheel-timing.mjs)                             |
| Word matching and text morph                   | [src/prompt-morph.ts](src/prompt-morph.ts)                               |
| Typography, geometry and colors                | [src/composable-ad.css](src/composable-ad.css)                           |
| Remotion entrypoint                            | [src/index.tsx](src/index.tsx)                                           |
| Renderer, sound, QR and encoded review         | [render.mjs](render.mjs), [scripts/](scripts/)                           |
| Behavior and portability checks                | [tests/](tests/)                                                         |
| Owl and QR assets                              | [public/](public/)                                                       |
| Production UI provenance                       | [references/ui-sources.json](references/ui-sources.json)                 |
| Historical motion skills and craft guidance    | [references/](references/)                                               |
| Focused reusable skill                         | [skills/clio-composable-ad/SKILL.md](skills/clio-composable-ad/SKILL.md) |
| Previous review receipts                       | [docs/reviews/](docs/reviews/)                                           |

Plugins own their instructions, skills, MCP servers, tools and hooks. A workflow
plugin has no replacement role; adding it extends the current domain. A domain
plugin supplies identity and relevant instructions. Reports persists through the
domain transformations. The prompt is uniformly typeset, shortened editorial
copy, and the domain plugins are illustrative; they are not claims about an
installed catalogue, successful live connections or a recorded execution.

## Review and sharing

Run measurements after changing text, geometry or cues. Include the exact initial
selection frame, both sides of each later add handoff and every add/remove click.
The control must represent the intended action beneath the cursor, not just fit
its geometry. Review the actual encode
around entrances, clicks, text morphs, collapses, transfers and the close. The
automated checks cover geometry, ownership, pointer movement, encoded paint leaks,
decode, frame count, QR and the final hold. They do not approve taste or pacing.

Share this directory or its GitHub link with another agent, including its lockfile.
The repository's existing source-package tool also includes `ad/` while excluding
installed dependencies, caches and generated media. No files outside `ad/` are
needed to install, test or render it.
