# Composability

The CLIO composability campaign lives here, separated by use.

- [ad/](ad/README.md): the complete motion advertisement, source, skills, handoff
  and latest local movie in `ad/out/`. Superseded local ad versions were pruned
  at the user's request; source and review history remain in Git.
- [website/](website/README.md): three independent loops. Each asset folder has
  its scene, timing, embed example and finished files in `output/`.

The website pieces omit the advertisement's brand reveal, URL and QR. They reuse
its editable prompt and plugin vocabulary. No CLIO backend is required.

Small website deliverables are included in Git so they can be used directly.
Full advertisement renders, browser bundles, dependencies and review intermediates
remain local. Carry this whole folder when sharing the website source: its UI
components are imported from `ad/src/`.

For the next ad subject, use the repository's
[general motion-ad skill](../.agents/skills/clio-motion-ads/SKILL.md) and
[lessons learned](../.agents/skills/clio-motion-ads/references/lessons.md).
The current film's detailed brief and user-feedback summary are in
[ad/HANDOFF.md](ad/HANDOFF.md); its exact treatment is one example rather than a
required layout for future advertisements.
