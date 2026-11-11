# Native first-level word heat

Adapted from iowarp/gact-tui commit
`939b5ed4ad247d62681701aecc696495b9cc390c` (2026-11-06),
`feat(attention): paint heat per first-level word as well as per line`.

The three source modules retain the upstream algorithm and source-to-DOM mapping.
Imports target this film's pinned native UI; the default view is changed to
`word / max` for the requested demonstration. No attention values are synthesized.
This scoped backport avoids silently changing every other film's pinned UI.
The CSS ramp is the same ten-level upstream warm ramp (zero unpainted).
The optional token view retains the original four-bucket renderer.

The film uses **Words / Max** throughout. That word aggregation is also the
Max behavior in the newer e8918ab1 UI. The optional Mean control here retains
939b5ed4's mean over captured runs; it is **not** the newer full-token mean.
The finite response sidecar has no `token_starts` metadata. Use the separate
manual-replay frontend/backend described in `MANUAL-ATTENTION.md` for that newer
mode; do not infer missing token counts or relabel captured means as full means.

The source modules are MIT licensed; see the accompanying LICENSE. Their
compile-time AttentionRun tuple is structurally equivalent to the native type.

Run the word aggregation/source contract tests with:
`npm --prefix motion exec -- tsx --test tests/spotter-investigation.test.ts`.
