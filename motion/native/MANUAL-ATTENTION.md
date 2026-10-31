# Launch CLIO + SPOTTER with recorded attention

Use this setup to select text yourself in the **complete native CLIO frontend**.
It reads local transcripts, captures and tokenizer files without model inference.
The backend computes attention for your selection from the saved tensors. This
is separate from the scripted film on port 3359, whose finite attention sidecar
only supports the selections prepared for the film.

Defaults: backend **18825**, native frontend **4394**. Each process runs in its
own foreground terminal. The launcher changes no source checkout and never stops
an existing port owner. Captures and tokenizers stay local, outside Git.

## 1. Prepare source checkouts once

Use isolated, clean checkouts rather than changing an active development branch:

| Component | Required source | Setup |
| --- | --- | --- |
| clio-agent backend | Contains `2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60`, published on `claude/epic-hopper-6s2vhn` | Python 3.12, `uv sync --frozen --extra dev` |
| gact-tui frontend | Exactly `f333d67d490174d2f2b82d7c0671e08ee0943ceb` | In `web/`: `pnpm install --frozen-lockfile --ignore-scripts` |
| clio-exports launcher | This repository | `uv sync --frozen`; Node.js on PATH |
| CLIO branding | Directory containing `clio/brand.json` | Normally the backend checkout's `branding/` |

For example, from this repository on D:, if dedicated checkouts do not exist:

```powershell
git clone --branch claude/epic-hopper-6s2vhn https://github.com/iowarp/clio-agent.git motion/.native-ui/manual-agent
git clone https://github.com/iowarp/gact-tui.git motion/.native-ui/manual-ui
git -C motion/.native-ui/manual-ui switch --detach f333d67d490174d2f2b82d7c0671e08ee0943ceb
```

Run dependency setup in each checkout. Set TEMP, TMP and TMPDIR to D: first;
see the [emulator setup](EMULATOR.md). Existing installed checkouts can be passed
directly. The launcher does not install dependencies, download models or fetch
Git history. Older local backend `c0d25575d54382d018dbb1383f980d71197e80ce`
contains the equivalent qualified mapping fix and is also accepted. The fix
preserves source offsets across chat-template boundary trimming; the general
replay server first appeared in `e5af788de`.

## 2. Identify the local bundle and assets

Unzip the recorded attention bundle on D:. Expected layout:

```text
attention-replay-7795459-chainB/
  sessions/*.export.json
  flowcept/decode_attention.json
  journal/                         # used when present
  captures/<workflow>/*.safetensors
  tokenizer/tokenizer.json
  tokenizer/tokenizer_config.json
  tokenizer/chat_template.jinja    # or chat_template in tokenizer_config.json
  metadata.json
```

Use the tokenizer and chat template for the exact captured model revision. For
Chain B: `ibm-granite/granite-4.2-8b` at
`a7042144125ce5ae64f89610e8289647fc000b9a`. A similarly named tokenizer is not a
substitute: token IDs and source offsets must match the capture.

If tensors or tokenizer already live elsewhere on the machine, add
`--captures-dir 'D:/actual/captures'` and/or
`--tokenizer-dir 'D:/actual/tokenizer'` to the arguments below. The captures root
contains the workflow subdirectories named by the Flowcept records. The launcher
creates directory junctions on Windows, or symlinks elsewhere, inside its ignored
runtime directory. It does not copy large captures or modify the original bundle.
Existing runtime paths pointing elsewhere are rejected.

## 3. Check, then start both processes

From the clio-exports root, set this argument array in **each terminal**. Replace
these examples with existing local paths:

```powershell
$replayArgs = @(
  '--bundle', 'D:/data/attention-replay-7795459-chainB',
  '--agent-source', 'D:/Libraries/Documents/projects/clio-exports/motion/.native-ui/manual-agent',
  '--ui-source', 'D:/Libraries/Documents/projects/clio-exports/motion/.native-ui/manual-ui'
)
```

First check inputs and every capture's byte size, SHA-256 and tensor layout.
This creates no runtime state:

```powershell
uv run python tools/launch_attention_replay.py check @replayArgs --verify-captures
```

Terminal 1:

```powershell
uv run python tools/launch_attention_replay.py backend @replayArgs
```

Terminal 2:

```powershell
uv run python tools/launch_attention_replay.py ui @replayArgs
```

Use `plan @replayArgs --shell powershell` or `--shell bash` to inspect underlying
commands. With external asset roots, start through the launcher first so it
prepares directory links before executing those commands.

Runtime state defaults to
`motion/.native-ui/attention-replay-review/<bundle-name>/`: backend home,
temporary files, offline Hugging Face cache and Vite cache. No OS-drive fallback
is used. Optional `--state-root` must contain a literal `attention-replay-review`
directory, stay outside the immutable inputs and remain on the project drive.
Stop each process with Ctrl+C in its own terminal.

## 4. Open main and SPOTTER

Open `http://127.0.0.1:4394/` and connect to
`http://127.0.0.1:18825` through the native connection form. The backend prints
the **new session aliases**, including SPOTTER as its own session. Use those
exact aliases in `/workspaces/ws_default/sessions/<printed-session-id>`;
do not infer IDs from list order or reuse old browser links. The shared local
storage daemon can list older sessions even with a new home. Do not delete
another runtime's state to clean that list.

Chain B source identities:

| Transcript | Source ID | Attention available |
| --- | --- | --- |
| OPAL main run | `sess_2480c090acbb` | Six main-model capture documents |
| SPOTTER review | `sess_675ca5a8918cec66588f34c07a669c6b` | No reviewer-model captures in this bundle |

Open the printed main and reviewer aliases in two browser tabs for manual
comparison. This server supplies SPOTTER's recorded transcript; it does not
recreate its live delegation relationship or start a new security review. The
paired, synchronized presentation is the separate [film replay](OPAL.md).

In the main conversation, select captured answer text and click the native
**Understand attention** action. Scroll to the highlighted source and inspect
the intensity rail. Exit attention before choosing a second response. Check a
few tokens, a phrase, a full answer and a clean contrast. Heat must attach to
the requested source span; a banner alone is insufficient. Only answer portions
covered by the actual capture can be explained.

## 5. Optional second example

A **full EarthScope replay bundle** can run alongside Chain B with a second
backend/frontend pair. Reuse the source checkouts, pass its actual bundle, and
add `--backend-port 18826 --ui-port 4395` to a separate argument array. Use a
distinct state root or the default derived from that bundle's distinct name.
Start `backend` and `ui` with those same arguments in two additional terminals;
connect the frontend on 4395 to the backend on 18826. Each pair has its own
runtime cache and printed session aliases.

The compact EarthScope test fixture found during the original setup is not a
full exported session. Some older EarthScope captures cover only the first 32
decode steps. Do not describe an uncovered answer as supported. A full second
bundle is an input requirement, not something the launcher fabricates.

## Troubleshooting and review boundaries

- **Missing capture, byte-size or hash mismatch:** locate the original matching
  tensor file; do not disable validation or invent attention.
- **Attention exists but no source heat:** verify the backend mapping fix,
  matching tokenizer/template and this process's printed session alias. Journal
  model calls and transcript must belong to the same bundle.
- **Port occupied:** reuse the known running demo or choose another pair of
  ports. The launcher never kills an unknown server.
- **Wrong UI source or dirty checkout:** use a dedicated pinned checkout;
  native adapter insertion points intentionally fail on upstream drift.
- **SPOTTER attention unavailable:** expected for Chain B; only its main model's
  captures were exported.

The manual frontend previously returned real source heat and a repainted rail
after the mapping fix. The entire arbitrary-selection matrix has not been
qualified. The exported SPOTTER film still needs revision for reviewer stalls
and cursor defects; a successful launch does not claim those issues are fixed.
Keep machine-specific PIDs, aliases and local paths out of Git.
