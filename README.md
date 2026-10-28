# CLIO conversation exports

Recorded CLIO conversations, exported as self-contained HTML, that the CLIO site
(clio.iowarp.ai/conversations/) serves. The site pins each file by commit, size and
sha256 in `site/src/lib/published-conversations.ts` of iowarp/clio-agent and copies it
into the build, so a changed file never reaches the site unnoticed.

| Folder | Conversation |
| --- | --- |
| `delegation/Reading-guide-session.html` | A reading guide to a design folder, surveyed by ten delegated explore agents |
| `delegation/Skill-review-session.html` | A review of every plugin's skills, split across six review agents |
| `studies/Wordle-study-session.html` | A branched study of Wordle strategies: three hypotheses as parallel branches, 60 games across 12 child agents |

`sha256sum -c SHA256SUMS` in a folder checks its files.

## Promotional authoring

Start with [clio-videos](.agents/skills/clio-videos/SKILL.md) and the
[native CLIO conversation preview](motion/native/README.md), which accepts new
exports. The source-ordered replay and [connected-story pipeline](motion/story/README.md)
are reusable. The latest NDP film was rejected for creative choices; it remains
a technical example, not an approved promotional style. Rendered videos stay local.
It imports pinned production components and renders the Lake Tahoe conversation's
saved rich blocks and views. The earlier editable proof below remains available
for animation techniques, but was rejected for UI fidelity.

To apply the same UI to another export, run
`uv run python tools/prepare_native_scene.py <export.html> --out motion/native/public/my-session.native.json --catalog motion/native/public/scenes.json`.
The [native README](motion/native/README.md) covers child-session selection,
rebuilding the preview and source-message turn controls.

The [`motion/`](motion/BRIEF.md) project recreates recognizable CLIO UI as editable,
frame-driven React/DOM/SVG components. Exported sessions supply genuine actions,
identities and results; the composition controls layout, motion and editorial
timing. CLIO is the subject, with examples supporting its capabilities.

Run `uv run python tools/index_exports.py` to index the current archives, then
`uv run python tools/select_reading.py` to regenerate the first source-linked beat.
In `motion/`, run `npm ci`, then follow the native film setup before running
`npm run promo:render` for the earlier 108-second 1080p cut. The legacy `npm run render`
default still selects the earlier 15-second proof.
FFmpeg must be available on PATH. Original HTML files remain untouched.

See [`motion/README.md`](motion/README.md) for component controls, source regeneration,
validation and the current proof's limits. Native archives use binary-preserving
Git attributes so Windows line-ending conversion cannot invalidate their hashes.

The reusable [component API](motion/UI-KIT.md), alternate-layout gallery, selection,
rendering, verification and source-packaging scripts live in this repository.
Other agents can start with [AGENTS.md](AGENTS.md) and the repo-local skills:

- [CLIO videos and lessons learned](.agents/skills/clio-videos/SKILL.md)
- [Motion infrastructure](.agents/skills/clio-motion-stack/SKILL.md)
- [Scene authoring](.agents/skills/clio-motion-scenes/SKILL.md)
- [Source, visual and encoding review](.agents/skills/clio-motion-review/SKILL.md)

No global skill installation is needed. The three recovered motion documents
under `motion/references/` are retained alongside these maintained skills.
