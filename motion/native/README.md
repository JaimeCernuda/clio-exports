# Production CLIO fidelity baseline

This replaces the loose visual approximation as the starting point for UI work.
It renders the Lake Tahoe/NDP science conversation through **actual production
React components**, imported from the revision pinned in `source.json`.
Text, disclosures, rich views and panels remain DOM/React elements. No screenshot
is used as a conversation or application background.

The full-session host is a fidelity preview. The [native product cut](FILM.md)
adds a frame-controlled stage and asset-readiness bridge for Remotion under
`ClioNativePromo`. The older `ClioProof` remains the rejected fidelity experiment.

## Run

For synchronized OPAL/SPOTTER transcripts and recorded attention inspections,
see [OPAL.md](OPAL.md). Its shared source clock keeps main answers, notification
receipt and reviewer input consumption in source order. The full cut still has
user-reported reviewer stalls and cursor defects; source ordering alone does not
qualify its playback. For arbitrary manual selections use the real backend and
frontend described in [MANUAL-ATTENTION.md](MANUAL-ATTENTION.md).

For the current transcript-driven campaign, read [REPLAY.md](REPLAY.md). It uses
the native log with frame-controlled tool accumulation, collapsing, streamed
replies, scrolling and a source-bound canvas. The earlier static excerpt treatment
is retained separately.

Use Node 22.22+ (the config imports the source's TypeScript Vite plugins), Git,
and pnpm 9.15.9. Keep the source checkout separate from a working product checkout:

```text
git clone https://github.com/iowarp/gact-tui.git <ui-checkout>
git -C <ui-checkout> checkout 2692126d38a8c92b27fec750351aa3c85880de93
```

In that checkout, run `pnpm install --frozen-lockfile --ignore-scripts`. Then from
this repository's `motion/` directory:

```text
npm run native:dev -- --source <ui-checkout>
npm run native:check -- --source <ui-checkout>
npm run native:build -- --source <ui-checkout>
node native/run.mjs preview --source <ui-checkout>
```

Stop the dev server before starting preview: both bind 127.0.0.1:3357. The source
runner requires a clean pinned HEAD, and resolves plugins, runtime libraries and React
types from that checkout. It does not edit upstream tracked files. Build output
and caches live in ignored directories. `CLIO_UI_SOURCE` also selects a checkout.

Open `/` for the default example. The external Session chooser loads any registered
scene; the Turn chooser is derived from its actual messages. It groups at user
message boundaries, preserving multiple assistant messages, leading context and
assistant-only children. `?scene=reading-guide.native.json` selects a data file;
`&turn=<source-message-id>` selects a turn. Earlier `?exchange=0|1|2` Tahoe links
still work. `&controls=off` hides the external review toolbar. These are review
controls and do not pretend to be CLIO product features.

## Apply the reproduction to a new session

The same components render a new session; its content belongs in data, not new UI
code. Supply a native CLIO HTML export, or its complete JSON payload with
`transcript`, `transcript_views` and `snapshot`. A plain text/Markdown transcript
can supply words, but does not carry the rich widget, tool presentation, file
bytes and provenance needed for this native reproduction. Unsupported or missing
native data fails explicitly.

From the repository root:

```text
uv run python tools/prepare_native_scene.py <new-export.html> --out motion/native/public/my-session.native.json --catalog motion/native/public/scenes.json
```

The root session is selected by default. Add `--session <exported-session-id>`
for any child or nested child with its own saved native view. The CLI preserves
its real session record and never manufactures a missing user prompt. Existing
catalog entries remain available. An unregistered file also opens directly with
`?scene=my-session.native.json`.

For the compiled preview, run `npm run native:build -- --source <ui-checkout>`
from `motion/` after importing, then reload. The dev server reads public data
directly. Scene changes navigate to a new page so query/widget caches from one
capture cannot become another capture's data.

The bundled catalog demonstrates the same UI with Tahoe, the reading-guide
parent, and its `sdk design B` child. Source-message selection is independent of
the film's shot selection, copy, layout and timing. This importer does not
automatically direct or render a finished promo. A newer export schema/widget
may need a compatible gact-tui pin; a 72-hour capture has not been qualified.

## What is native, what is adapted

`workspace.tsx` exports `NativeWorkspace` and `NativeProviders` independently of
the fetch/mount entrypoint. It imports production `ClioAppShell`, composer,
`ArchiveConversation`, `ArtifactView`, rich Markdown, A2UI and their
real providers/styles. The brand profile is copied from clio-agent's
`branding/clio` (orange action accent included). gact-tui is MIT licensed; its
notice is retained in `UPSTREAM-LICENSE`.

The small navigation presenter uses production sidebar primitives. It shows the
recorded workspace ID because a human workspace name is absent. It omits live
workspace discovery, and disables search/settings/run actions. The composer is
read-only. A status strip identifies recorded content. Native appearance is fixed
to light/reduced motion on this isolated review origin. The archive transport
serves captured GET responses and rejects uncaptured or mutating calls; there is
no agent or NDP runtime connection.

The recorded context bar follows the source browser header, using its actual
buttons, action menu, downloads control and `AddIcon`. Its agent `+` remains
visible beside the recorded agent label and opens a read-only explanation.
Production `SessionAgentControl` hides `+` without a pinned agent resolution;
the historical Tahoe export has neither that resolution nor a plugin catalog.
Do not invent those responses to unlock the live menu. This presentation matches
the composability affordance checked on `develop` at
`378fd51a1d8db853ff379c2670c4847eb30a999c`; the renderer stays pinned to `source.json`.
Sidebar labels, chevron and nested session rows hide in icon mode so the logo
and rail icons stay centered; expanded and hover-preview states retain labels.

The map uses captured scientific GeoJSON and a cached, georeferenced USGS reference
background around Tahoe, layered above the source's coarse world basemap. See
`FILM.md` for provenance and the distinction from scientific evidence. Preserve
the native map worker plugin **and root-local Vite cache directory**: placing the
prebundled worker under an external `/@fs/` URL previously left the map blank.

## Tahoe evidence

The input is [the published Tahoe export](https://clio.iowarp.ai/conversations/ndp/tahoe/),
exported 2026-10-20T00:39:31.623589+00:00. Original HTML SHA-256:
`e5f762a73eaa749738780b095a24133cec08d8d125c81bd24ecfc8c3bda0dbf4`.
The original file is not duplicated here. To regenerate from a downloaded archive:

```text
uv run python tools/prepare_native_scene.py <tahoe.html> --out motion/native/public/tahoe.native.json
```

The extractor retains the root session, its `transcript_views` projection and
saved `snapshot`. It excludes the enormous raw tool ledger, not the rich blocks.
The Tahoe fixture preserves:

- All six messages in three exchanges, with original block order, channels,
  identities, native tool presentation and Markdown.
- 110 tool records, four saved A2UI surfaces, ten artifact records, one queryable
  table and twelve saved transport responses. No snapshot collection failures.
- Area boundary map and method figure, shoreline chart/table and detail figure,
  followed by the reproducibility exchange and its recorded test claims.

An artifact record does not guarantee captured file bytes. The map GeoJSON and
two figure previews are available; some ZIP/method records contain metadata only.
The native viewer reports unavailable content rather than inventing a download.
The author's 2,851-check reproduction result is recorded evidence; this adapter
does not independently rerun or qualify that scientific package.

## Validation boundary

`native:check` includes the adapter entrypoints and their production import graph
under strict TypeScript checking. `native:build` compiles actual source with the
brand, Tailwind and map-worker plugins. Python tests cover extraction, reference
validation, source protection and the real Tahoe fixture. Browser review must
also check the map actually paints, all ten table rows, both figure previews,
native artifact canvas, and third exchange Markdown table. These checks establish
an inspectable baseline; they do not approve art direction or motion pacing.
Generic import tests also cover native JSON, nested child selection, catalog
updates, message grouping and reuse across the three actual examples. Recorded
subagents retain their agent label and omit the root agent-composition `+`.

For the OPAL/SPOTTER Chain B reference, use the separate f333d67d `opal` profile
and port 3359. Its bundle capture, source-mapping patch, native attention
semantics and synchronization proof are documented in [OPAL.md](OPAL.md#current-reference-chain-b-7795459).
