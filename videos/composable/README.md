# CLIO: a composable agent

The current cut is a 32.17-second, 1920 × 1080 / 60 fps advertisement with original
sound design. Its opening and closing use kinetic typography. The middle is a
pseudo demo made from native-derived CLIO elements, reshaped for the film rather
than enclosed in a complete app window.

The middle depicts configuring a fresh agent before a conversation. Its immediate
instruction changes do not represent hot-swapping an existing conversation's
already-submitted prompt or making a live MCP connection.

The first UI-led cut and the subsequent three-preset treatment were rejected.
The active treatment is [ART-DIRECTION.md](ART-DIRECTION.md): a wide range of
possible agents resolves into **composable**, then an agent is assembled by
addition. Manufacturing, Simulation, a named skill, a named MCP connection and
Reports extend the same prompt. They do not replace its existing instructions.
The close holds **Build your own / CLIO**, the website and QR for five seconds.

## Editable source map

- [Copy, modules, stages and timing](../../motion/story/composable-ad.json).
  Add modules in one place; each stage composes its base instructions with the
  selected contributions. Domain examples and shortened prompt wording are
  editorial illustrations, not an installed-agent catalogue or recorded run.
- [Standalone entrypoint](../../motion/src/composable-ad-index.tsx):
  `ClioComposableAd`. No replay server or native backend is needed.
- [Choreography and native-derived pieces](../../motion/src/ComposableAd.tsx),
  [presentation](../../motion/src/composable-ad.css),
  [composition and collision-aware docking](../../motion/src/composable-ad-plan.ts),
  [measured editable prompt](../../motion/src/AdPrompt.tsx),
  [shared text/layout engine](../../motion/src/prompt-morph.ts).
- [UI source map](ui-sources.json): reviewed production files and checksums.
  The agent card, Add plugin control, cube/removal rows, section chevrons, Skills
  and MCP servers labels are adaptations of the actual CLIO components. They
  retain their visual vocabulary and additive semantics. The film does not
  import the full production app, simulate backend operations or imply that a
  configured MCP has connected successfully.
- [Original sound finisher](../../motion/scripts/finish-composable-ad.mjs):
  deterministic synthesis aligned with the film cues; no reference-film audio.
- [QR generator](../../motion/scripts/prepare-composable-qr.mjs),
  [white-background QR](../../motion/public/composable/clio-qr-white.svg),
  [encoded review](../../motion/scripts/review-composable-ad.ts),
  [behavioral tests](../../motion/tests/composable-ad.test.ts).

## Render and review

Install using the repository Python and Node lockfiles. Keep dependencies,
TEMP/TMP/TMPDIR, caches and renders on the project drive. From `motion/`:

```powershell
node scripts/prepare-composable-qr.mjs
npm run composable:render
```

This creates `out/composable/clio-composable-ad-clean.mp4` and the sound version
`out/composable/clio-composable-ad.mp4`. The successful raw renderer intermediate
and temporary soundtrack WAV are removed. Movies stay local and are not pushed.
The renderer waits for fonts and actual text geometry. Every pose follows its
render frame; there are no CSS clocks or timer-driven typing effects.

After rendering, collect fresh browser geometry and check the actual movie:

```powershell
node render.mjs stills --composition ClioComposableAd --scale 1 --frames 1850 --props examples/composable-measure.json > review/composable-ad-measure.log
npm run composable:review
```

Do not launch a second bundle into `motion/bundle` while a render is active.
The review checks word collisions, geometry, frame count, audio presence, full
decoding, the QR in the encoded file, and the settled end for flicker. Unit tests
also enforce append-only instructions, retained module identities, an
accelerating domain wheel and clearance during plugin docking. Inspect the
encoded handoffs and additions as moving passages; passing checks does not
approve the creative direction. Detailed local receipts stay in `motion/review`.

## Earlier cut

`ClioComposable` and `npm run composable:legacy` retain the rejected source-bound
UI cut for history. Its [review receipt](review-v1.md) and actual composer export
are separate from the current illustrative advertisement. Refresh that legacy
export with `tools/prepare_composable_prompts.py` only when deliberately updating
the recorded source pin. It is not the template for a new social film.

Current status: revised full advertisement for user review; not creatively approved.
See [the current review receipt](review-ad-v4.md) for the checks and their limits.
