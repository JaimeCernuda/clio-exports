# Capability-ad production lessons

The user asked for eight separate collaboration-oriented social ads. They accepted
recognizable product material, but explicitly corrected the assumption that it must
fit CLIO's full UI. Use these lessons alongside each film's current brief.

- **A component's controls are optional.** Copy/download/caret icons on a count
  result served no action and were rejected twice. Remove them at source, rebuild,
  and inspect a fresh rendered frame. A stale encode can make a correct source fix
  invisible to the reviewer. Retain selection, export and inspection controls only
  where the film shows their useful consequence.
- **Reflow around geography.** A track on an empty grid, then a shorter plot height,
  was rejected as squashed and geographically unreadable. Use real coastlines,
  a projection with equal local x/y scale, and a fixed map rectangle. Surrounding
  panels can move without scaling latitude independently of longitude.
- **Clear neighbors before expansion.** Source and tool cards, connecting edges,
  and peer subagent cards all occupy space. Retire or dock them before a result or
  inspector grows. A moving card cannot retain a connector to its old position.
- **Prove concurrency and background work separately.** Three task cards require
  overlapping source intervals. A launch handle is not completion. Capture the
  live window changing, query the same stream during the task, then retain its
  final status and bounded rows. Use the unified `/tasks/query` endpoint.
- **Use native scientific provenance.** A science-log observation may reject an
  unsourced number even when the calculation is correct. Carry the actual tool
  call reference into its measurements; record hypothesis fate and experiment status.
- **Keep cell counts sparse-aware.** CSC matrix columns are cells; sum through
  indptr boundaries. Check conservation against all counts before animating a result.
- **Review actual encodes.** Stationary H.264 frames can differ as quantization
  settles. Compare structural similarity as well as raw pixels; do not blindly
  mark codec noise as motion or loosen a genuine continuity failure. Retain the
  metric and visual findings. Playback completion is not uninterrupted visual or
  sound review; record the exact inspection coverage honestly.

The campaign supplies [source receipts](../../../../ads/capabilities/SOURCES.md),
[reproduction commands](../../../../ads/capabilities/REPRODUCE.md), independent
scientific/integration tests, an input-hash-checked renderer, and per-film storyboards.
Render time must not be confused with the original recorded event clock.
