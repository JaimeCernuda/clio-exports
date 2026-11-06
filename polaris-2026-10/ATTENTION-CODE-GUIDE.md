# CLIO attention: code guide

This covers how CLIO computes and shows prompt attention for an answer, the tokenizer
checks on the Polaris Chain B demo, and how to replay that run offline on your own
machine.

All code links point at fixed commits, so they keep working when branches move. The
**Branch** column says where each file lives today.

| Repository | Branch | Commit in the links |
| --- | --- | --- |
| [iowarp/clio-agent](https://github.com/iowarp/clio-agent) | `claude/epic-hopper-6s2vhn` (being merged into `develop`) | `2ff404fb` |
| [iowarp/clio-schemas](https://github.com/iowarp/clio-schemas) | `main` | `b0bb27ae` |
| [iowarp/gact-tui](https://github.com/iowarp/gact-tui) | `develop` | `6d68e024` |
| [JaimeCernuda/clio-exports](https://github.com/JaimeCernuda/clio-exports) | `main` (replay launcher), `ccr-f3f98215-lvwhes` (tokenizer study, this guide) | |

## 1. How CLIO computes the attention

The pipeline starts at capture and ends at the heat shown on the conversation. Your
`attn_analytics.py` formula is step 3.

### 1.1 Capture (on the GPU node)

| File | What it does |
| --- | --- |
| [`vllm-attn-connector`](https://github.com/spotter-ai-genesis/vllm-attn-connector) | vLLM connector that records, for every decode step, the top-k prompt positions and their `val_all_max` / `val_all_avg`, plus the prompt token IDs, into a SafeTensors file with a Flowcept descriptor. |
| [`gact/attention/declare.py`](https://github.com/iowarp/clio-agent/blob/2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60/src/clio_agent/gact/attention/declare.py) | Attaches labelled token ranges to each vLLM request, so the capture knows where the system prompt, tool definitions and each message sit. |
| [`gact/attention/ranges.py`](https://github.com/iowarp/clio-agent/blob/2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60/src/clio_agent/gact/attention/ranges.py) | Computes those ranges: one per section of the rendered prompt. |
| [`scripts/qualification/polaris/collect_attention_replay.py`](https://github.com/iowarp/clio-agent/blob/2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60/scripts/qualification/polaris/collect_attention_replay.py) | After a run, collects the session export, the Flowcept documents, the captures and the tokenizer into one bundle (the zip in section 3). |

### 1.2 Reading a capture and lining it up with the prompt

| File | What it does |
| --- | --- |
| [`gact/attention/contract.py`](https://github.com/iowarp/clio-agent/blob/2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60/src/clio_agent/gact/attention/contract.py) | The capture's format: the Flowcept task plus the SafeTensors tensors (`prompt_token_ids`, `topk_pos`, `val_all_max`, `val_all_avg`, `topk_residual`, …). Parsing is strict. |
| [`gact/attention/files.py`](https://github.com/iowarp/clio-agent/blob/2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60/src/clio_agent/gact/attention/files.py), [`safetensors_file.py`](https://github.com/iowarp/clio-agent/blob/2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60/src/clio_agent/gact/attention/safetensors_file.py), [`byte_source.py`](https://github.com/iowarp/clio-agent/blob/2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60/src/clio_agent/gact/attention/byte_source.py) | Find the file a descriptor names, check its size and SHA-256, and read tensors or row ranges from it. |
| [`gact/attention/store.py`](https://github.com/iowarp/clio-agent/blob/2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60/src/clio_agent/gact/attention/store.py) | Query layer: the descriptor from Flowcept, the arrays from the SafeTensors file. |
| [`gact/attention/lm_calls.py`](https://github.com/iowarp/clio-agent/blob/2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60/src/clio_agent/gact/attention/lm_calls.py) | Finds the model calls (`lm.call` records) behind a transcript turn. |
| [`gact/attention/tokenizer_source.py`](https://github.com/iowarp/clio-agent/blob/2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60/src/clio_agent/gact/attention/tokenizer_source.py) | Loads the served model's tokenizer and chat template (files only, never weights). |
| [`gact/attention/chat_render.py`](https://github.com/iowarp/clio-agent/blob/2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60/src/clio_agent/gact/attention/chat_render.py) | Renders the recorded messages exactly as vLLM did and tokenizes them, keeping each token's character offsets. |
| [`gact/attention/capture.py`](https://github.com/iowarp/clio-agent/blob/2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60/src/clio_agent/gact/attention/capture.py) | Loads one capture and checks that the re-rendered prompt's token IDs equal the captured `prompt_token_ids` exactly. If they differ (wrong tokenizer or template), no heat is shown (`range_alignment_mismatch`). |

### 1.3 From a selected answer to scores

| File | What it does |
| --- | --- |
| [`gact/attention/rendered.py`](https://github.com/iowarp/clio-agent/blob/2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60/src/clio_agent/gact/attention/rendered.py) | Maps text selected on screen (rendered Markdown) back to the message's source text. |
| [`gact/attention/selection.py`](https://github.com/iowarp/clio-agent/blob/2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60/src/clio_agent/gact/attention/selection.py) | Selected answer text → the model call that produced it → its generated tokens → the decode steps (`output_steps`). |
| [`clio_schemas/attention.py`, `reduce_attention`](https://github.com/iowarp/clio-schemas/blob/b0bb27ae05da40bd294f64267e9aede834706880/src/clio_schemas/attention.py#L96) | **Your formula.** For each prompt token: `score[j] = Σ_i 0.5^i · val_all_max[step_i][j]` over the item's decode steps, `i` counted from its first step, unnormalised. Shared by CLIO and SPOTTER. |
| [`gact/attention/profiles.py`](https://github.com/iowarp/clio-agent/blob/2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60/src/clio_agent/gact/attention/profiles.py) | The `attn-analytics` profile (`metric=max`, exponential weighting, decay 0.5, line/block value = max) and the adapter that feeds connector rows into `reduce_attention`. |
| [`gact/attention/aggregate.py`](https://github.com/iowarp/clio-agent/blob/2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60/src/clio_agent/gact/attention/aggregate.py) | Turns the sparse per-step rows into per-token and per-section mass (the "Your messages / Tool definitions / Spread thin" bar). |
| [`gact/attention/items.py`](https://github.com/iowarp/clio-agent/blob/2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60/src/clio_agent/gact/attention/items.py) | Splits the selection into answer items at `;` (`split_spans`) and scores each item on its own decode steps (`reduce_items`). `prompt_lines` is your `render_heatmap.py` view: split the rendered prompt on `\n`, each line's value is its hottest token, scaled to 0–9. `items_csv` writes the CSV download. |
| [`gact/attention/service.py`](https://github.com/iowarp/clio-agent/blob/2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60/src/clio_agent/gact/attention/service.py) | Puts one answer together for a selection. |
| [`gact/attention/routes.py`](https://github.com/iowarp/clio-agent/blob/2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60/src/clio_agent/gact/attention/routes.py) | HTTP API: `POST …/messages/{mid}/attention`, `…/attention/items`, `…/attention/items/export`. |

### 1.4 From scores back to the conversation text

| File | What it does |
| --- | --- |
| [`gact/attention/textmap.py`](https://github.com/iowarp/clio-agent/blob/2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60/src/clio_agent/gact/attention/textmap.py) | Finds each transcript message inside the model-facing prompt text, keeping a character map. |
| [`gact/attention/transcript_map.py`](https://github.com/iowarp/clio-agent/blob/2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60/src/clio_agent/gact/attention/transcript_map.py) | Prompt positions → characters of a transcript message. Includes the fix for whitespace the chat template trims at message boundaries (`2ff404fb`). |
| [`gact/attention/content_references.py`](https://github.com/iowarp/clio-agent/blob/2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60/src/clio_agent/gact/attention/content_references.py) | Stable identities (message, part, content revision) for every piece of transcript content, so heat is never attached to edited or different text. |
| [`gact/attention/reasons.py`](https://github.com/iowarp/clio-agent/blob/2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60/src/clio_agent/gact/attention/reasons.py) | Every reason the view can be unavailable, typed; nothing falls back silently. |

The remaining files ([`lookup.py`](https://github.com/iowarp/clio-agent/blob/2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60/src/clio_agent/gact/attention/lookup.py), [`finding_evidence.py`](https://github.com/iowarp/clio-agent/blob/2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60/src/clio_agent/gact/attention/finding_evidence.py), [`surface_selection.py`](https://github.com/iowarp/clio-agent/blob/2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60/src/clio_agent/gact/attention/surface_selection.py)) serve SPOTTER's own lookups and findings and selections inside A2UI views.

### 1.5 Showing it (web UI)

| File (gact-tui, `develop`) | What it does |
| --- | --- |
| [`hooks/use-attention-mode.ts`](https://github.com/iowarp/gact-tui/blob/6d68e0242500b7eafae03e4277246f78a29d444c/web/src/hooks/use-attention-mode.ts) | "Understand attention" on a selected answer: calls the API and holds the result. |
| [`components/clio/attention-mode-banner.tsx`](https://github.com/iowarp/gact-tui/blob/6d68e0242500b7eafae03e4277246f78a29d444c/web/src/components/clio/attention-mode-banner.tsx) | The banner: the selection, the source breakdown, the profile editor. |
| [`components/clio/attention-item-chips.tsx`](https://github.com/iowarp/gact-tui/blob/6d68e0242500b7eafae03e4277246f78a29d444c/web/src/components/clio/attention-item-chips.tsx) | Answer items split at `;`. Choosing one repaints the conversation with that item's heat. Download CSV. |
| [`hooks/use-attention-highlights.ts`](https://github.com/iowarp/gact-tui/blob/6d68e0242500b7eafae03e4277246f78a29d444c/web/src/hooks/use-attention-highlights.ts), [`lib/attention-highlight-dom.ts`](https://github.com/iowarp/gact-tui/blob/6d68e0242500b7eafae03e4277246f78a29d444c/web/src/lib/attention-highlight-dom.ts), [`lib/attention-highlight-sources.ts`](https://github.com/iowarp/gact-tui/blob/6d68e0242500b7eafae03e4277246f78a29d444c/web/src/lib/attention-highlight-sources.ts), [`lib/attention-text.ts`](https://github.com/iowarp/gact-tui/blob/6d68e0242500b7eafae03e4277246f78a29d444c/web/src/lib/attention-text.ts) | Paint the heat onto the rendered conversation: resolve each block's source text, map source offsets to the rendered text, highlight the ranges. |

**In progress: line mode.** Painting the heat per source line, like `render_heatmap.py`,
directly on the conversation (Lines / Tokens toggle, Max / Mean line value) is on gact-tui
branch [`ccr-f3f98215-lvwhes`](https://github.com/iowarp/gact-tui/tree/ccr-f3f98215-lvwhes),
in [`lib/attention-line-heat.ts`](https://github.com/iowarp/gact-tui/blob/ccr-f3f98215-lvwhes/web/src/lib/attention-line-heat.ts).
It is not merged yet.

## 2. Tokenizer checks on the demo

On clio-exports branch `ccr-f3f98215-lvwhes`:

- Code: [`tools/tokenizer_study/`](https://github.com/JaimeCernuda/clio-exports/tree/ccr-f3f98215-lvwhes/tools/tokenizer_study)
- Results and write-up: [`polaris-2026-10/tokenizer-study/README.md`](https://github.com/JaimeCernuda/clio-exports/blob/ccr-f3f98215-lvwhes/polaris-2026-10/tokenizer-study/README.md)
- HTML page with every Granite 4.2 token of the round 5 prompt: [`granite-4.2-tokens.html`](https://github.com/JaimeCernuda/clio-exports/blob/ccr-f3f98215-lvwhes/polaris-2026-10/tokenizer-study/granite-4.2-tokens.html). Download it and open it in a browser.

To run it, from the clio-exports root:

```sh
git checkout ccr-f3f98215-lvwhes
uv sync
uv run python tools/run_tokenizer_study.py all
```

It only downloads `tokenizer.json` files, each pinned to a commit.

In short: all 16,697 heat highlights in the demo sit exactly on Granite 4.2 token
boundaries. Split words are real Granite tokens. Granite 4.2 uses the GPT-2
pre-tokenizer rule with the GPT-4-style vocabulary of its 4.1 base, so line-end
punctuation becomes its own token. 13 other open-weight tokenizers are compared in the
README.

## 3. Replaying Chain B offline

The replay runs CLIO with no model. It loads the recorded session and captures, and
answers attention requests through the same code as section 1, so you can select any
answer text in the browser and see its heat.

### What you need

| Item | Where |
| --- | --- |
| The bundle: captures, Flowcept documents, tokenizer, session export | [Google Drive](https://drive.google.com/file/d/1CZf2nYKE8p3upLmfEeUmmGLO0jsoukyO/view?usp=drivesdk) (`attention-replay-7795459-chainB.zip`, about 611 MB). Unzip it. |
| The session as an HTML export, to read the run | [`polaris-2026-10/7795459-chainB/html/`](https://github.com/JaimeCernuda/clio-exports/tree/main/polaris-2026-10/7795459-chainB/html) on clio-exports `main` |
| The replay server | [`tests/test_gact/test_attention/serve_recorded_bundle.py`](https://github.com/iowarp/clio-agent/blob/2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60/tests/test_gact/test_attention/serve_recorded_bundle.py), clio-agent branch **`claude/epic-hopper-6s2vhn`** (not on `main` or `develop` yet). It started as a test fixture for NDP, then OPAL, and serves any collected bundle. |
| The launcher, which checks the bundle and starts the server and the UI | [`tools/launch_attention_replay.py`](https://github.com/JaimeCernuda/clio-exports/blob/main/tools/launch_attention_replay.py) on clio-exports `main`, with the full steps in [`motion/native/MANUAL-ATTENTION.md`](https://github.com/JaimeCernuda/clio-exports/blob/main/motion/native/MANUAL-ATTENTION.md) |
| The UI it serves | gact-tui at commit `f333d67d` (the launcher requires exactly this commit) |

The bundle layout, as the server reads it:

```text
sessions/<sid>.export.json        the session export (child conversations included)
journal/<sid>.semantic.jsonl      optional
flowcept/decode_attention.json    the decode_attention task documents
captures/<workflow_id>/<request id>_g<group>.safetensors
tokenizer/                        tokenizer.json, tokenizer_config.json, chat_template.jinja
```

### Steps

```sh
# 1. Checkouts (once)
git clone https://github.com/JaimeCernuda/clio-exports.git
cd clio-exports
uv sync --frozen
git clone --branch claude/epic-hopper-6s2vhn https://github.com/iowarp/clio-agent.git motion/.native-ui/manual-agent
(cd motion/.native-ui/manual-agent && uv sync --frozen --extra dev)
git clone https://github.com/iowarp/gact-tui.git motion/.native-ui/manual-ui
git -C motion/.native-ui/manual-ui switch --detach f333d67d490174d2f2b82d7c0671e08ee0943ceb
(cd motion/.native-ui/manual-ui/web && pnpm install --frozen-lockfile --ignore-scripts)

# 2. Check the bundle: every capture's size, SHA-256 and tensor layout
ARGS="--bundle /path/to/attention-replay-7795459-chainB \
  --agent-source motion/.native-ui/manual-agent \
  --ui-source motion/.native-ui/manual-ui"
uv run python tools/launch_attention_replay.py check $ARGS --verify-captures

# 3. Start the server (terminal 1) and the UI (terminal 2)
uv run python tools/launch_attention_replay.py backend $ARGS
uv run python tools/launch_attention_replay.py ui $ARGS
```

Open the UI (by default http://127.0.0.1:4394; the server listens on 18825). Select answer text in the main session
(`sess_2480c090acbb`) and choose **Understand attention**.

Notes:

- The bundle has six main-model captures and none for SPOTTER, so attention is
  available on the main session's answers only.
- `plan $ARGS --shell bash` prints the exact commands without running them.
- Runtime state goes under `motion/.native-ui/attention-replay-review/` and nothing
  else on the machine is changed.

Setting this up isn't complicated. If you want a walkthrough, I can write a
step-by-step guide for your machine.
