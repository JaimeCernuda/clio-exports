# CLIO promotional authoring

## Product brief

For the OPAL/SPOTTER film, SPOTTER-AI is the subject. Lead with its full logo and
its track/detect/trace investigation. OPAL, CLIO and Flowcept are supporting parts
of that story. Place transparent logos directly on the film background, without
colored cards. This campaign direction takes precedence over the general CLIO
brief below.

CLIO is the subject. Examples make its capabilities concrete; the film is not a
lesson about a particular scientific result. Recreate recognizable CLIO UI as
editable React/DOM/SVG components so panels can reflow, separate, scale, transform
and move independently for the film. Source the visual vocabulary from
`iowarp/gact-tui`; use exported sessions for genuine actions, claims and results.

Do not substitute screenshot slideshows, enlarged bitmap UI crops, or invented
agent runs. Real UI footage may support a composition. The older concept film
proves rendering capability only; its look, copy and invented scenes are not an
approved creative direction.

## Evidence and scale

- Preserve original HTML exports and existing checksum files unchanged.
- New exports may represent multi-day sessions. Decode and index incrementally;
  select small source-linked beats before rendering. Do not bundle whole archives
  into the animation. Include only the saved dependencies needed by selected
  native views; do not drop their maps, tables or images to make a smaller file.
- Keep source identities and editorial timing distinct. A short composed sequence
  must not imply the actual work completed in that duration.
- Tie claims and depicted agents, tools and outputs to actual exported records.

## Authoring

- Every animated value is a function of the render frame. Avoid wall-clock effects,
  uncontrolled CSS animation and random values in film components.
- Copy, theme, session evidence, shot timing and camera layout are separate inputs.
- Preserve CLIO's recognizable visual language while allowing deliberate cinematic
  changes to layout, spacing, scale and composition.
- Judge a short moving proof before expanding a full film. Encoding checks and
  still-frame inspection do not establish that the promotion succeeds.
- Do not commit or push unless requested. Use conventional commit messages if asked.

## Reusable toolkit and skills

For motion work, read the relevant repo-local skill before making changes:

- `.agents/skills/clio-videos/SKILL.md`: story, shot purpose and lessons from rejected cuts.
- `.agents/skills/clio-motion-stack/SKILL.md`: setup, data pipeline, shared kit and packaging.
- `.agents/skills/clio-motion-scenes/SKILL.md`: editable UI scenes and choreography.
- `.agents/skills/clio-motion-review/SKILL.md`: evidence, visual review and output verification.

These skills are stored in the repository for any agent to read; no global skill
installation is required. The original three documents under `motion/references/`
are historical references. Use the maintained local skills for current commands.
The earlier `motion/src/ui` kit was rejected for product fidelity. It is retained
for its animation examples, not as an authoritative CLIO reconstruction. Start
conversation work from `motion/native/workspace.tsx`, which imports the pinned
production gact-tui shell, composer, conversation rows, Markdown, A2UI and artifact
viewers. Small recorded navigation/context-bar presenters retain the native
layout and agent `+` without requiring uncaptured live state. Setup and the precise
adaptations are in `motion/native/README.md`.
Preserve `transcript_views` and `snapshot` with `tools/prepare_native_scene.py`;
plain text excerpts cannot stand in for the ordered rich conversation.

The older component API is documented in `motion/UI-KIT.md`. Keep shared components independent of a transcript, film
copy, backend services and Remotion's runtime. Frame/time and geometry enter as
props. Preserve compatibility exports when moving an existing component.

## Python

Use uv, pyproject.toml, Python 3.11+, typed public functions, pytest, Ruff and pyright.
All tests must pass; skipped tests are not an acceptable successful result.
