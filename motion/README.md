# Reusable CLIO UI motion toolkit

The [SPOTTER / OPAL sources](native/OPAL.md) and
[manual attention setup](native/MANUAL-ATTENTION.md) are also retained here.
That full cut remains revision required for reviewer stalls and pointer
visibility/stacking. Read the [SPOTTER lessons](../.agents/skills/clio-videos/references/spotter-lessons.md)
before reusing it; the toolkit is not an approved finished demo.

Start with [clio-videos](../.agents/skills/clio-videos/SKILL.md) for story and shot
selection. The final NDP full cut was rejected for unnecessary full-screen data
selection, an uninteresting lake zoom and arbitrary text highlights. Its renderer
is reusable; its focus manifest is not an approved creative template. The video
work is stopped, with sources retained for future work.

The technical campaign uses [source-ordered conversation replay](native/REPLAY.md)
and the [connected-story workflow](story/README.md): production UI components,
native canvas expansion, real data controls, linked selections and PNG export.
The pointer is a separate editable layer bound to native DOM targets. Use that
workflow to reproduce the existing technical edit. `ClioNativePromo` and `ClioProof` remain earlier
rendering and animation references.

Use the [native conversation preview](native/README.md) to ingest and inspect new
exports. It imports the production shell, composer, conversation rows, rich views
and artifact viewers. The earlier kit/proof below was rejected for UI fidelity.

## Earlier component proof

This is a 15-second component proof for the [product brief](BRIEF.md). It reconstructs
CLIO's source visual language as live React text, SVG icons and DOM panels. Each
agent card and tool row is independent. The interface reflows for the shot rather
than moving a screenshot around a canvas.

The proof shows one real request branching into ten recorded child conversations,
opens one child's real file-read activity, and brings the parent's recorded guide
back beside that context. This is a first motion treatment, not an approved promo.
There is no audio track.

The reusable [UI entrypoint](src/ui/index.ts) is independent of that proof's
transcript and copy. Read [UI-KIT.md](UI-KIT.md) for public props and a minimal
scene. [ComponentGallery.tsx](src/ComponentGallery.tsx) provides another composition
and two layouts for development/review.

Repo-local skills for other agents:

- [clio-videos](../.agents/skills/clio-videos/SKILL.md): story, purposeful shot selection and campaign lessons.
- [clio-motion-stack](../.agents/skills/clio-motion-stack/SKILL.md): setup, evidence and packaging.
- [clio-motion-scenes](../.agents/skills/clio-motion-scenes/SKILL.md): UI scene authoring and choreography.
- [clio-motion-review](../.agents/skills/clio-motion-review/SKILL.md): source, visual and encoding review.

## Preview and render

From this directory, using Node.js and npm:

```powershell
npm ci
npm run studio
npm run typecheck
npm run stills -- 130 270 470 665
npm run render -- 1
npm run render
npm run stills -- --composition ClioComponents --frames 240 --props examples/gallery-activity.json
npm run render -- --composition ClioComponents --scale 1 --output out/components.mp4
```

Studio opens on port 3347. `ClioProof` is 900 frames at 60 fps with a 1920 × 1080
logical canvas. A scale-1 draft renders at 1080p; the default scale-2 render is
3840 × 2160. Text and vectors render at that output scale. FFmpeg must be on PATH.
The renderer downloads Remotion's Chrome Headless Shell when first needed; set
`DEMO_CHROME_PATH` to use an existing supported Chrome executable instead.

Renders go to `out/clio-editable-ui-proof.mp4`. The last step writes H.264,
limited-range BT.709, yuv420p, no audio, and fast-start metadata. The intermediate
file is retained separately. PNG review frames go to `review/`.

## What to edit

| Input | Purpose |
| --- | --- |
| `src/copy.json` | Editorial and interface labels |
| `src/theme.css` | CLIO color tokens, fonts and surfaces |
| `src/shot.json` | Major frame cues and agent-grid geometry |
| `src/Root.tsx` | Composition dimensions and editable camera defaults |
| `src/Film.tsx` | Choreography and individual panel transforms |
| `src/components/NativeUI.tsx` | Composer, workspace chrome, agent cards, tool rows and text |
| `src/ui/index.ts` | Reusable API; the compatibility entrypoint above re-exports it |
| `src/ComponentGallery.tsx` | Two working layouts using the shared components |
| `data/parallel-reading.json` | Small source-linked selection used by the film |
| `evidence/catalog.json` | Current export inventory |

The composition's `cameraScale`, `cameraX` and `cameraY` input props can be edited
in Studio's Inspector, which saves those defaults into `Root.tsx`. The layout can
also change independently of that camera: widths,
positions, content, clipping and typography remain ordinary component properties.
Every animation value comes from the frame; scrubbing and rendering the same
frame produces the same state. The brand mark is the original SVG, not generated
artwork. No screenshot or video capture forms the UI surface.

The first proof retains some per-element offsets in `Film.tsx`; `shot.json` controls
the major beats, not a general timeline editor. Further shots should promote
their own reusable timing/layout controls as needed.

## Regenerate source selections

From the repository root:

```powershell
uv sync
uv run python tools/index_exports.py
uv run python tools/select_reading.py
uv run pytest -q
uv run ruff check
uv run ruff format --check
uv run pyright
```

The indexer reads the native compressed payload without executing archive HTML,
keeps bounded text previews and headings, retains source hashes and identities,
and stops parsing after the transcript. Refreshing one export retains other
catalog entries. The renderer imports only the selected JSON, not the HTML viewers
or their embedded media. Source session/message/part/tool-call IDs also appear as
data attributes on relevant scene elements.

Indexes are offline authoring artifacts. The current four archives are covered;
a 72-hour archive has not been tested. Individual JSON string values and the
number of indexed messages still affect indexing memory. Very large future runs
may need sharded indexes and a time-range selector. This proof does not assert
complete coverage or scientific correctness of the underlying recorded run.

## Review boundaries

The source run took longer than the film. The footer discloses reconstructed UI
and edited timing; statuses describe recorded activity, not a live agent run.
The guide outline and child response headings are taken from saved message parts.
The prompt is shortened at a sentence boundary, with the full prompt retained in
the selection. No count of successfully reviewed documents is asserted.

Passing source tests, type checking and video decoding establishes engineering
properties. Recognizability, rhythm, taste and promotional effectiveness still
need judgment on playback. See `references/SOURCE-REUSE.md` for exact source files,
license and the three recovered motion-skill references.

## General selection, verification and handoff

From the repo root:

```text
uv run python tools/select_session.py motion/evidence/wordle-study.json --out motion/data/new-beat.json --prompt-sentences 1
uv run python tools/verify_video.py motion/out/clio-editable-ui-proof.mp4 --width 3840 --height 2160 --fps 60 --frames 900 --audio absent --out motion/review/verification.json
uv run python tools/package_motion.py --out motion/out/clio-motion-toolkit.zip
```

The general selector supports exact root/child/message IDs and bounded tool
records. A child without an assistant reply retains null response/stop fields;
do not label it successful. `select_reading.py` remains the original film recipe.
The general render CLI accepts `--composition`, `--props`, `--scale`, `--frames`,
`--output` and `--concurrency`; use `npm run render -- --help` for current syntax.

The ZIP includes `.agents/skills`, shared components, examples, scripts, tests,
lockfiles, selected evidence and a per-file hash manifest. It renders without
large HTML archives; overlay it on this repository to regenerate indexes.
Raw archives, render binaries, dependencies and caches are excluded. Run Python
checks above plus `npm test`, `npm run typecheck` and `npm run format:check`
before handing off a shared-component change.

The full pytest suite includes checksums of the original HTML archives and runs
in a full checkout. A portable source package can run `uv run pytest tests/test_toolkit.py -q`
with its included indexes, plus the Node tests, without those archives.

The native campaign renderer now includes source-bound Alta snowfall and Konza particle/wind/CO₂ cuts. See [native replay authoring](native/REPLAY.md) for campaign selection, measured scrolling, genuine focus gestures and the omitted packaging turns. The two landscape compositions are `NdpClioAlta` and `NdpClioKonza`.
