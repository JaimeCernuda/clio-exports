# SPOTTER / OPAL lessons and open defects

The 2026-10-29 full cut is **revision required**. The user reported SPOTTER
stopping incorrectly at several points, the pointer disappearing, and the pointer
passing underneath UI elements. These are unresolved defects in the delivered
cut. Preserve the reusable implementation; do not describe this film as an
accepted timing, synchronization or pointer template.

## Timing must explain concurrent work

- SPOTTER is the subject of this campaign. Its full supplied transparent logo and
  investigation lead; OPAL, CLIO and Flowcept provide context. Do not put logos on
  colored cards or replace the full SPOTTER mark with plain text.
- Preserve the recorded main answer, notification receipt, notification
  consumption, reviewer thinking, tools, results and alerts as separate events.
  A monotonic shared source clock establishes ordering, not convincing motion.
- A shared editorial hold can freeze active reviewer work even when the primary
  hold was intended only to leave an answer readable. Audit every pause in both
  panes against its source interval and its stated editorial purpose. Do not
  diagnose all still reviewer frames as legitimate waiting, or make up activity
  to fill them.
- While the main agent thinks, show any genuinely concurrent SPOTTER work. Stream
  captured reviewer reasoning, rotate running spinners, disclose the actual
  consumed notification, and show its real tool calls and results. A static
  thinking summary or a rotating spinner alone does not show the investigation.
- Intentional user attention inspections freeze both logs from approach through
  return. Keep these holds distinct from unexplained freezes elsewhere. Retain
  source time, editorial frame, active interval and pause reason in review data.
- In Chain B all six main answers finish before the danger alert/quarantine.
  SPOTTER's recorded alert motivates the user's later attention inspection.
  Never imply that quarantine prevented an answer already present in the source.
- Recorded notification deltas are not six independent reviewer turns: this run
  has six consumed notifications across two SPOTTER turns and seven real tools.

## The pointer must survive the whole interaction

- Track visibility, position and ownership across setup, menu, selection,
  attention banner, scrolling, return and the next selection. A continuous
  coordinate function does not prove that a visible pointer was encoded.
- One pointer owner should cover the complete interaction. Handoffs between
  independently mounted setup and inspection pointers need explicit review;
  avoid both missing frames and duplicate pointers.
- Inspect clipping, transformed ancestors, stacking contexts, portal roots and
  iframe boundaries. A large local `z-index` cannot cross an ancestor's stacking
  context or escape an iframe. The current pointer's `zIndex: 100` is an
  implementation detail, not proof that it stays above native UI overlays.
- Measure targets in the same coordinate space in which the pointer is painted.
  Recheck after reflow, banner arrival, drawer expansion and scrolling. Keep the
  pointer decorative (`pointer-events: none`) so real controls receive input.
- Check the encoded pointer over menus and banners and during drags, not just its
  first and last positions. A single reviewed selection boundary did not qualify
  the complete 4:33 film; disappearance and occlusion remain open.

## Attention and manual replay are separate paths

- The film's response sidecar contains exact recorded requests and replies. It
  cannot answer arbitrary new selections. For a manual demonstration, connect the
  full native frontend to `serve_recorded_bundle.py` and its real tensor reader.
- Test a repeated token such as `73`, a phrase, a whole response and a clean
  contrast through the native selection menu. Preserve source revision, part
  identity and Unicode offsets; do not choose the first textual occurrence when
  the rendered body cannot be mapped exactly.
- Preserve paragraph boundaries and literal OPAL reference tables in the DOM.
  Equal whole-part projections may map coordinates; substring guesses may not.
- A chat template may trim exterior whitespace. The backend fix maps that exact
  boundary trimming without normalizing interior text or resolving ambiguity by
  guesswork. It was pushed to the user's existing clio-agent branch
  `claude/epic-hopper-6s2vhn` as `2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60`.
  The mistakenly created `fix/recorded-attention-replay-mapping` branch was deleted
  locally and remotely. Use the existing user-specified integration branch.
- Chain B has six main-model captures and no SPOTTER-model captures. Keep reviewer
  attention unavailable rather than borrowing another model's heat. Unmapped
  coverage and residuals remain visible; attention is supporting evidence, not
  independently a finding of poisoning or causality.

## Review and publication

Encoding, tests, sampled contact sheets and source ordering did not establish
full-film motion quality. Record what was actually inspected, preserve later
user findings, and keep technical verification separate from creative acceptance.
The review receipt now records the unresolved user-reported defects. A future
revision needs playback of both panes and the pointer across the entire edit,
with full-size adjacent frames around every questionable hold or overlay.

When asked to preserve this work, push scripts, reusable components, selected
source data, manifests, skills and honest review notes to the existing
`clio-exports` branch. Do not render another film or push movie files by default.
