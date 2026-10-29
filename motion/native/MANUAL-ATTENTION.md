# Manual recorded attention in the real CLIO frontend

This is separate from the Remotion stage on 3359. It serves the complete pinned
CLIO application on 4394 and connects to the recorded-bundle backend on 18825.
Selections are computed from the saved captures by the backend attention service;
they are not limited to the film's prerecorded response sidecar. No new model
inference is performed. Only answer portions actually covered by the bundle can
be explained. Chain B has six main-model captures and no SPOTTER-model captures.

## Backend

Use an isolated clio-agent checkout containing
`2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60` from
`claude/epic-hopper-6s2vhn`. The general server was published in `e5af788de`;
the later fix preserves source offsets across chat-template boundary trimming.
Install that checkout's dependencies with `uv sync --frozen --extra dev`.

In PowerShell, from the clio-agent checkout (substitute your actual unzipped
bundle path):

```powershell
$env:CLIO_AGENT_HOME = Join-Path $PWD 'attention-replay-review/manual-demo/home'
uv run --frozen --no-sync python -B -m tests.test_gact.test_attention.serve_recorded_bundle '<unzipped-attention-replay-bundle>' --port 18825 --ui-origin http://127.0.0.1:4394
```

Keep that process running. The server prints the new session IDs, including
SPOTTER's transcript as its own session. Use these exact aliases, not IDs inferred
from list order or older browser links. Startup can restore older sessions from
the shared local storage daemon even when a new home is used; verify which listed
session has this process's in-memory transcript and attention model-call mapping.
Do not delete another runtime's state to make the list cleaner.

## Frontend

Use a clean gact-tui checkout at
`f333d67d490174d2f2b82d7c0671e08ee0943ceb` and install its dependencies with
`pnpm install --frozen-lockfile --ignore-scripts`. The CLIO branding directory is
the directory containing `clio/brand.json`, normally clio-agent's `branding/`.
From the gact-tui checkout's `web/` directory, in another PowerShell terminal:

```powershell
$env:CLIO_UI_SOURCE = '<absolute-gact-tui-checkout>'
$env:CLIO_MANUAL_BRANDING = '<absolute-clio-agent-checkout>/branding'
./node_modules/.bin/vite.cmd --config '<absolute-clio-exports-checkout>/motion/native/manual.vite.config.mjs'
```

On other platforms use `./node_modules/.bin/vite` with the same configuration.
Open `http://127.0.0.1:4394/` and connect to `http://127.0.0.1:18825` through the
native connection form. Open the exact main-session alias printed above. Its
route is `/workspaces/ws_default/sessions/<printed-session-id>`.

The small Vite port leaves upstream tracked files unchanged. It preserves literal
OPAL reference text and paragraph boundaries, applies the existing exact
whole-part projection fallback, and loads the supplied CLIO brand. Native routes,
controls and requests remain connected to the actual backend. It installs no
film clock, finite response transport, synthetic reviewer or editorial pointer.
Insertion points fail if the pinned upstream components change.

## Manual checks and limits

Select answer text, use the native **Understand attention** action, then scroll
to the highlighted source and inspect the intensity rail. Exit attention before
trying another response. Exercise a repeated token, a phrase, the whole answer
and a clean contrast; confirm the requested source span and its visible heat,
not only the banner's totals. An ambiguous span is an error to fix, not permission
to silently choose the first occurrence.

The local browser check returned real source heat and a repainted rail after the
mapping port. The entire arbitrary-selection matrix has not been qualified in
this manual frontend. The separately exported film still needs revision for
reviewer stalls and cursor defects. These are different acceptance questions.

The available full bundle is Chain B. The EarthScope files found locally were
the compact recorded test fixture, not a second full replay bundle, so this setup
does not claim a complete EarthScope session. Keep the user's requested backend
and frontend processes running for manual demonstration; record their local
process IDs, origins and session aliases outside version control.
