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

The shared [UI entrypoint](../../../motion/src/ui/index.ts) exports ordinary React
components with SVG icons, scoped tokens and configurable labels. It imports no
session JSON or Remotion runtime. A film supplies its data, frame and geometry.
Keep that boundary when adding components; keep scene-specific copy/choreography
in its composition. See [component API](../../../motion/UI-KIT.md).

## Evidence pipeline

Run these from the repo root:

```text
uv run python tools/index_exports.py
uv run python tools/select_session.py motion/evidence/reading-guide.json --out motion/data/new-beat.json --prompt-sentences 1
```

`--session`, repeated `--child-id`, `--agent`, `--prompt-message` and
`--result-message` choose exact saved identities. Tool records are bounded by
`--tool-limit` (12 by default). Child counts beyond `--max-agents` require an
explicit subset. Inspect the selection, including truncation flags and unfinished
children, before using it. The original reading-guide recipe remains available as
`tools/select_reading.py`; do not treat it as a generic selector.

Keep original HTML and checksums unchanged. Do not execute exported HTML or tool
calls. Offline indexes retain source hashes and message/part/call/session IDs;
only selected JSON belongs in a render bundle. Indexing still holds individual
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

Report the actual branch/publication state, source selection and validation done.
Repository instructions do not authorize unrelated publishing or messaging.
