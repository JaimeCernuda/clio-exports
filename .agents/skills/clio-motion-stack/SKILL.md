---
name: clio-motion-stack
description: Set up or extend the reusable CLIO UI motion project and source-linked export pipeline in this repository. Use for authoring infrastructure and handoffs, rather than choosing a film's art direction.
---

# CLIO motion infrastructure

Read [AGENTS.md](../../../AGENTS.md) for the product brief. CLIO is the subject;
real sessions supply evidence and the composition controls its presentation.
The earlier concept and current component proof are examples, not approved styles.

## Start from the repository

Use the existing `motion/` project and lockfiles. From the repo root run `uv sync`;
from `motion/` run `npm ci`. Node.js, uv, FFmpeg and FFprobe must be available.
The renderer downloads its supported Chrome when needed; `DEMO_CHROME_PATH` can
point to an existing executable. Nothing here needs CLIO backend services or an LLM.

The earlier `motion/src/ui` approximation was rejected for CLIO fidelity. Start
conversation work with the [production-component adapter](../../../motion/native/README.md).
It imports the pinned gact-tui shell, composer, native conversation rows, Markdown,
A2UI and artifact viewers. `NativeWorkspace` and `NativeProviders` are separate
from the fetch/mount entrypoint. Keep editorial copy and choreography outside
these components. The standalone conversation host is the fidelity preview.
The new [native film stage](../../../motion/native/FILM.md) adds explicit frame
poses, editable component reflow and a paint-acknowledgement bridge for Remotion.
Use [clio-videos](../clio-videos/SKILL.md) for editorial lessons and
[REPLAY.md](../../../motion/native/REPLAY.md) for conversation compositions.
The connected NDP film is a technical example with rejected creative choices,
not an approved template. `ClioNativePromo` is the older
108-second narrative treatment; it is retained separately.

## Evidence pipeline

Run these from the repo root:

```text
uv run python tools/index_exports.py
uv run python tools/select_session.py motion/evidence/reading-guide.json --out motion/data/new-beat.json --prompt-sentences 1
uv run python tools/prepare_native_scene.py <native-export.html> --out motion/native/public/scene.native.json --catalog motion/native/public/scenes.json
```

`--session`, repeated `--child-id`, `--agent`, `--prompt-message` and
`--result-message` choose exact saved identities. Tool records are bounded by
`--tool-limit` (12 by default). Child counts beyond `--max-agents` require an
explicit subset. Inspect the selection, including truncation flags and unfinished
children, before using it. The original reading-guide recipe remains available as
`tools/select_reading.py`; do not treat it as a generic selector.

Keep original HTML and checksums unchanged. Do not execute exported HTML or tool
calls. Offline indexes retain source hashes and message/part/call/session IDs;
only selected JSON and its needed saved dependencies belong in a render bundle.
Rich conversation work must preserve `transcript_views` block order, channels,
tool presentation and the matching `snapshot`; the plain excerpt selector is
insufficient for rich maps/charts/tables/artifacts. The native extractor accepts
HTML or a complete native JSON payload. It selects the root by default;
`--session <id>` selects a nested child's own record/view. `--catalog` registers
the local JSON for the preview's Session chooser. Rebuild the compiled preview
after importing, then open `?scene=scene.native.json`. Turns are derived from
source messages; never assume a session consists of alternating message pairs.
Indexing still holds individual
JSON strings and message metadata; a 72-hour archive has not been qualified.
Add sharding/time-range selection when actual input size warrants it.

## Reuse and handoff

Use [scene authoring](../clio-motion-scenes/SKILL.md) for a new composition and
[review](../clio-motion-review/SKILL.md) for output acceptance. The three original
motion documents remain under `motion/references/` as historical source material;
these repo-local skills and the current brief describe the maintained workflow.

Run Python tests, Ruff and pyright from the repo root; run `npm test`,
`npm run typecheck` and `npm run format:check` in `motion/`. Package with
`uv run python tools/package_motion.py --out <destination.zip>`.
The package includes the skills, scripts, UI, examples and selected evidence,
excluding original archives, dependencies, caches and render binaries.
For the native adapter, also run `native:check` and `native:build` with the pinned
source checkout, then inspect the browser. See its README for portable commands.

Report the actual branch/publication state, source selection and validation done.
Repository instructions do not authorize unrelated publishing or messaging.
