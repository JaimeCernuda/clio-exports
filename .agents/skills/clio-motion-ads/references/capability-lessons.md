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
  Check the entire plotted series against the retained tool result. A sourced
  headline value does not establish that the agent executed the rest of the sweep.
- **Keep cell counts sparse-aware.** CSC matrix columns are cells; sum through
  indptr boundaries. Check conservation against all counts before animating a result.
- **Review actual encodes.** Stationary H.264 frames can differ as quantization
  settles. Compare structural similarity as well as raw pixels; do not blindly
  mark codec noise as motion or loosen a genuine continuity failure. Retain the
  metric and visual findings. Playback completion is not uninterrupted visual or
  sound review; record the exact inspection coverage honestly.
- **A team is not the workflow argument.** Three parallel worker cards alone
  read as a generic subagent short. Show preparation, shared dependencies, a join
  and an evidence-dependent next step. Keep the same graph through convergence;
  replacing it with three result plots made the 22–23 second transition arbitrary.
- **Answer the selected question visibly.** A reference should lead to a record
  read and computation before an answer. Prefer specific copy such as "Ask with
  selected data" to ambiguous "this" or "the data you mean". Retain real PTC evidence.
  Move small map labels out of transformed SVG text into stable DOM overlays.
- **Use the actual flow contract.** `ctx.gather` accepts `ctx.call(...)` FlowCall
  objects; it rejects `ctx.step(...)` coroutines. Compose preparation as real nested
  flows. Capture `/tasks/{handle}/flow` as well as messages: deterministic steps do
  not necessarily appear as tool-call transcript rows. Failed probes do not qualify.
- **Release aborted video reads.** Destroy the server's file stream when a response
  closes. Seeking away can otherwise keep a Windows file handle open and block
  replacement of an already validated encode. Cache-bust gallery URLs by movie hash.
- **Check the encoded soundtrack's headroom.** A normalization target does not
  guarantee the AAC encode retains the same peak. Measure the delivery file;
  the campaign adds 2 dB of headroom after normalization. Its audio-finalization
  helper regenerates the original procedural sound and verifies that copied video
  packets remain byte-identical. Record signal checks separately from mix approval.
- **Hash new evidence imports.** Adding a composed-workflow result also requires
  adding that data file to the compiled-bundle input hash. A prior cache guard
  cannot protect a dependency it never included.
- **Shared plumbing is not a story.** Switching from burn observations to an
  unrelated pendulum merely proved that two streams used the same mechanism.
  The user rejected it. Keep inputs and consequences within one investigation:
  burn observations, their wind-driven model, and both input/output streams.
  Make simplified model assumptions explicit in the ledger and identifiable in-film.
- **Use audience language for the hook.** The user's approved phrase is "Ask your
  data." The selected-record mechanics belong in the visual proof, not the headline.
- **Start fresh stream proofs.** Reopening the same workspace/name can reuse prior
  stream history. Create an isolated workspace for each native stream proof and
  derive the editorial query anchor from its actual retained read, rather than
  copying a timestamp from a preceding run.

The campaign supplies [source receipts](../../../../ads/capabilities/SOURCES.md),
[reproduction commands](../../../../ads/capabilities/REPRODUCE.md), independent
scientific/integration tests, an input-hash-checked renderer, and per-film storyboards.
Render time must not be confused with the original recorded event clock.
