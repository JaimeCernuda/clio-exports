# Composability

The CLIO composability campaign lives here, separated by use.

- [ad/](ad/README.md): the complete motion advertisement, source, skills, handoff
  and local video renders. Its existing movie files are preserved in `ad/out/`.
- [website/](website/README.md): three independent loops. Each asset folder has
  its scene, timing, embed example and finished files in `output/`.

The website pieces omit the advertisement's brand reveal, URL and QR. They reuse
its editable prompt and plugin vocabulary. No CLIO backend is required.

Small website deliverables are included in Git so they can be used directly.
Full advertisement renders, browser bundles, dependencies and review intermediates
remain local. Carry this whole folder when sharing the website source: its UI
components are imported from `ad/src/`.
