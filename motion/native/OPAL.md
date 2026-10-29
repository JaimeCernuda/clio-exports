# OPAL / SPOTTER replay preparation

**Current status: revision required.** The full film has user-reported incorrect
SPOTTER stalls, disappearing pointers and pointers beneath UI elements. The
existing implementation and earlier review did not establish those issues were
fixed. See [SPOTTER lessons](../../.agents/skills/clio-videos/references/spotter-lessons.md)
and the [review receipt](../evidence/spotter-opal-film-v1-review.json). Preserve
this source handoff without treating its choreography as an accepted template.
For arbitrary new manual selections use [the full native frontend and recorded
backend](MANUAL-ATTENTION.md), rather than the film's finite response sidecar.

The film's subject is SPOTTER-AI. CLIO supplies the watched activity; OPAL and
Flowcept supply scientific and provenance context. Follow Spotter's investigation
and attribution in the editorial cut instead of presenting a CLIO product promo.

The native composer, five-option security menu, conversation, thinking disclosures,
canvas tabs, selection toolbar, token highlights and minimap use the pinned UI.
This is an offline replay, not a new model run. The campaign composition uses
this replay; creative approval remains with the user.

## Full SPOTTER campaign composition

See the [film story and commands](../story/spotter-film.md). `SpotterOpalFilm`
combines the approved transparent-logo intro, native security-menu setup, both
source-ordered conversations, SPOTTER's real alert, two user attention inspections,
the recorded finding and a short logo closing. It renders at 1280×720 and 60 fps.
Its duration is derived from `spotter-film-plan.ts`, not a fixed 25-second budget.

The danger alert from `call_d6535dcc6bfb` triggers the user investigation. The
film holds its completed delivery before selecting the fifth answer, rather than
putting the user's attention inspection before SPOTTER's finding. The answer-line
and `73` inspections share that exact source time. Each returns to the answer and
exits attention; the second returns to the current chat before source time resumes.
The pointer stays visible and continuous across the two selections. Keep later
quarantine/finding events in their actual source order.

Both primary and reviewer thinking passages now stream visibly and use the same
frame-derived disclosure animation. All six consumed notifications briefly reveal
their actual mailbox text, then compact. `spotter-notification.ts` decodes the
recorded envelope for readability; native technical details retain the original.
The seven actual reviewer tools are one Review watched activity, four Attention
sources calls and two Raise Alert Card calls. Film pacing gives completed calls
a one-second hold so their names and results are not just flashes between thoughts.

The native selection registry now also offers Add to chat and More details,
through their production hooks. It remains an offline archive: uncaptured service
operations do not turn into fabricated side conversations. The attention action
still invokes the real native handler against the captured response transport.

The quarantine detail is retained in Finding details, with a bounded preview
before attention opens. The composer is replaced by quarantine as in the product;
it is not duplicated below it. Attention temporarily hides the preview so source
heat has room. The reviewer uses more of its column, with reduced nested padding.
Spinners rotate from the editorial frame even under the reduced-motion provider.

Keep native content mounted during every intermediate disclosure frame. Once its
openness reaches exactly zero, release hidden Markdown/code views as the native
closed disclosure does. Retaining every completed thinking body for the whole
film creates unnecessary hidden rendering work. Manual expansion restores the
same source content; no captured text is deleted.

## Current reference: Chain B 7795459

Use [the actual reference run](https://github.com/JaimeCernuda/clio-exports/tree/main/polaris-2026-10/7795459-chainB).
The earlier demo described below remains a historical fixture. The new pair is
`public/opal-chainB-7795459.native.json`; its attention sidecar is
`public/chainB-7795459-attention.json` (11 exact heat requests, 12 native item/CSV
requests). Five shot recipes cover the clean response, `73`, `73; MATCHES`, the
answer line and the whole response. The whole response was additionally selected
in the browser: its rendered text differs from Markdown source, while its exact
source span stays [1,828). The recorded native body is in
`../evidence/chainB-native-selection-requests.json`. Keep both the submitted text
and the service's canonical source selection; never overwrite either to make them
look identical.

Main: `sess_2480c090acbb`. SPOTTER: `sess_675ca5a8918cec66588f34c07a669c6b`.
Six main answers feed six recorded notifications across two SPOTTER turns. Seven
reviewer tools include real attention inspection and two alerts. A warning is
delivered at source +463084.151 ms; the quarantine is raised at +558514.651 ms,
after the last main answer. Alert cards follow their recorded `raise_alert_card`
delivery; final quarantine metadata is hidden until `raised_at`. The final
snapshot must never reveal these at frame zero.

The native profile pins gact-tui **f333d67d490174d2f2b82d7c0671e08ee0943ceb**,
including answer-item chips. It has its own build/port, leaving NDP's pin intact:

```text
cd motion
npm run native:check -- --profile opal --source .native-ui/source-ui-f333d67d
npm run native:build -- --profile opal --source .native-ui/source-ui-f333d67d
node native/run.mjs preview --profile opal --source .native-ui/source-ui-f333d67d
```

Open `http://127.0.0.1:3359/?mode=spotter&pair=opal-chainB-7795459.native.json&attention=chainB-7795459-attention.json`.
Use the synchronization chooser for each answer, or Full transcript for the final
finding. Selections run through native Understand attention, item chips, token
highlights and the intensity rail. Changing an item repaints those same native
views. Inspection pauses both logs. Lift quarantine is disabled in this read-only
replay. `SpotterChainBReplay` renders the full editable replay; `SpotterChainBSyncProof`
renders the current 20-second range starting at frame 6750. This is a synchronization
proof, not a finished campaign cut. No attention interaction is authored into that
proof yet; the four requested selection cases were reviewed interactively and
saved as stills.

### Replay backend and capture receipts

User-supplied original bundle:
`D:/Libraries/Documents/projects/OPAL/attention-replay-7795459-chainB.zip`.
Extract under `motion/.native-ui/inputs/chainB-7795459/`. Keep original archives
unchanged. `tools/audit_attention_bundle.py` verified all six capture byte sizes,
SHA-256 hashes and tensor headers; see
`../evidence/chainB-7795459-attention-audit.json`. All six are main-agent captures;
this bundle supplies no SPOTTER model capture. Attention on SPOTTER must remain
unavailable. Preserve unmapped coverage and residuals; heat is not proof of
poisoning or causality.

The recorded run uses clio-agent **8d4f2130**, UI **f333d67d**, marketplace
**85a12152**, and Granite 4.2-8B revision **a7042144125ce5ae64f89610e8289647fc000b9a**.
Connector **95ab2ac** plus the stage-up build fix is supplied by the user; the
bundle audit preserves its recorded connector metadata separately. Do not claim
this local replay reran GPU inference. Provider thinking was exported. Main
reasoning settings are `requested_level=""`, `effective_level="default"`,
`source="provider_default"`; no explicit high/low mode was selected. Round 1's
recorded reasoning phase lasts about 102 seconds. Replay speed and disclosure holds are editorial and shared by both panes.
After pacing feedback, completed thinking holds for 1.2 seconds, its native body
collapses over 0.5 seconds, and completed answers hold for 0.6 seconds. Every main
thinking passage, including round 2, opens as it streams. These settings apply to
the full replay and the proof. The unabridged replay includes all recorded thinking;
its duration is distinct from the eventual edited campaign cut.

Use the general recorded backend at clio-agent **e5af788de** in an isolated
checkout, with [the saved mapping patch](patches/clio-agent-e5af788d-boundary-trim.patch):

```text
git apply <absolute-path-to-boundary-trim.patch>
uv sync --frozen --extra dev
uv run --frozen --no-sync python -B scripts/run_tests.py tests/test_gact/test_attention/test_boundary_trim.py tests/test_gact/test_attention/test_content_identity.py tests/test_gact/test_attention/test_service_real_run.py
```

Run `python -m tests.test_gact.test_attention.serve_recorded_bundle <bundle>` via
`uv run --frozen --no-sync`, with a fresh repository-owned `CLIO_AGENT_HOME` and
`--ui-origin http://127.0.0.1:3359`. This server was actually run locally; its
production attention service read these six captures. The boundary patch fixes
only uniquely matching boundary whitespace omitted by the Granite template.
Full-source revision and code-point offsets remain intact; duplicates stay
ambiguous. Without the patch the clean answer returned real source totals but
zero transcript blocks. The three focused backend files passed 25 tests.

The server can duplicate aliases when restarted with the same home. Use a fresh
home, or pass exact `--session-alias source=replay` pairs to the capture tool.
Never infer aliases by position. The capture tool rejects ambiguous discovery.
Example from repo root (substitute the new startup aliases):

```text
uv run python tools/capture_replay_attention.py motion/native/public/opal-chainB-7795459.native.json --endpoint http://127.0.0.1:18825 --raw-dir motion/.native-ui/attention-replay-review/responses/chainB-7795459 --out motion/native/public/chainB-7795459-attention.json --session-alias <main-source>=<main-replay> --session-alias <spotter-source>=<spotter-replay>
```

`--selections <json> --merge` captures additional native selections into an existing
output sidecar, retaining distinct rendered bodies and rejecting conflicting
responses. `--selections` accepts exact native selection bodies instead of the
six-round OPAL recipe. Add `debugAttention=1` in browser review to log those bodies;
keep this off in the film. Raw complete service replies and their hashes remain
under the specified raw directory. The portable sidecar omits only the optional
per-token rank detail; it preserves every native block/run, profile and unmapped
receipt. When combining captures, deduplicate by exact request identity including
rendered text, source revision and profile, not just span coordinates.

### Native adapter boundaries

- The workbench state port accepts both pinned function signatures and fails the
  build if its insertion point changes. Type checking untransformed source alone
  did not catch an injected unbound variable; browser testing did.
- Native Markdown is eager/static during replay. Paragraphs retain a literal
  boundary newline in DOM text, preventing adjacent paragraphs from concatenating
  and invalidating whole-part selection mapping.
- Literal OPAL prompts retain every source character. Native heat/selection
  projection also tries the literal projection, requiring equality of the entire
  part before accepting it. This keeps numbered rules in the prompt mappable;
  substring guesses remain forbidden.
- `recorded-quarantine.tsx` preserves native f333d67d card markup with import aliases
  adapted. Final snapshot metadata is projected by the shared source clock.

The temporary backend on 18825 was stopped after the earlier capture. Automatic approval
review blocked deletion of its temporary home without a specific reason; that
runtime folder is retained and must not be mistaken for source evidence. Ctrl-C exited 1 without
a graceful shutdown receipt; the listener and recorded descendants were verified
absent. Browser preview uses only local fixtures and needs no backend process.
The UI preview on 3359 is separate from the manual frontend on 4394 and its
recorded-bundle backend on 18825, restarted at the user's request. Runtime ports
and startup aliases are local state; check them before reuse. The backend mapping
fix is published on `iowarp/clio-agent`, branch `claude/epic-hopper-6s2vhn`, commit
`2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60`. That commit changes transcript mapping
and adds regression tests; `serve_recorded_bundle.py` itself was already published
in `e5af788de`. The saved mapping patch is for the older replay checkout only;
do not apply it again to a checkout containing the published fix.
See `../evidence/chainB-sync-proof-verification.json` for 900-frame,
60fps, 1280x720 encode/full-decode evidence; that check does not approve the film.

## Earlier fixture (demo-7795352)

## Import and preview

From the repo root:

```text
uv run python tools/prepare_spotter_replay.py <native-export.html.gz> --out motion/native/public/opal-spotter.native.json
```

HTML, outer-gzipped HTML and complete native JSON are supported. The importer
selects the captured Spotter child by title; use `--reviewer <id>` if ambiguous.
Missing parent/wake/consumption links fail. Unresolved delta streams are reported
in `coverage.issues`; the renderer refuses these imports instead of popping
complete paragraphs into view. Original exports remain unchanged.

Build and serve with [the pinned adapter](README.md), then open
`http://127.0.0.1:3357/?mode=spotter`. Play setup shows the entire native menu,
selects SPOTTER, opens its right tab, then starts the main conversation. Controls
also work by hand. Pause, resume or seek to a source-linked wake in the review
bar; `render=1` hides the bar. `OpalSpotterReplay` in Remotion uses the existing
paint-acknowledgement bridge at 1280 x 720, 60 fps. `pairFile` selects another
imported pair. Review short ranges before rendering the whole film.

## One clock, two conversations

- Main `turn.completed` identifies the answer causing each Spotter notification.
- `session.mail.accepted` gives receipt time; `session.input.committed` gives
  consumption time. This export retains input commits inside ARC provenance
  envelopes. Read those as data; never execute archived operations.
- Receipt and consumption stay separate. Injections and subsequent review blocks
  cannot appear before the triggering answer or their recorded native position.
- Six notifications run across **two** reviewer turns in this export. Preserve
  concurrent/queued activity; do not manufacture six alternating review replies.
- Exact native prefixes come from token deltas. Public text uses the semantic
  `next_thought` channel, excluding the expert mirror. Equal adjacent real tokens
  must survive. Provider thinking uses its separate channel.
- Tool output is hidden until recorded completion. Short shared holds make the
  running state readable. Every hold/speed edit affects **both** conversations.
- Each completed main answer has a 0.6-second shared reading hold before its
  reviewer notification can arrive.
- Every primary thinking passage streams expanded, stays complete for **1.2 seconds**,
  collapses over **0.5 seconds**, then the next source block follows. The native body
  stays mounted inside a frame-controlled grid clip throughout collapse; both logs
  stay frozen. Manual reader choices override these defaults.

Optional pair JSON `timing: {charactersPerSecond: 100, idleSpeed: 10,
thinkingHoldFrames: 72, collapseFrames: 30, answerHoldFrames: 36}` controls
visible typing, idle acceleration and the disclosure holds at 60 fps. One frame mapping drives both panes,
including seeks. Native Markdown scroll follows actual content resize. Prompt
reference tables use literal text in the native user-message container, with
scoped monospace styling and intact angle-bracket instructions. Source text,
content revisions and attention offsets stay intact. Markdown is loaded eagerly
in the adapter to prevent the native lazy-loader's raw-text fallback flash.

## Source and reasoning

[demo-7795352](https://github.com/JaimeCernuda/clio-exports/tree/main/polaris-2026-10/demo-7795352),
`html/LIVE-chainB-sess_d09685337ff9.html.gz`, source revision `1e316a9`.
Compressed SHA-256:
`684038fb1104d78a315e2844faf0d10d03472534b080f50506f9efbf8897b20d`.

Main `sess_d09685337ff9`: 12 messages, six answers. Spotter
`sess_c4471eebb0bb3f414ad02ace90698225`: two messages, eight tools. The captured
child relationship has no SubagentRun assignment; the read-only native tab
presenter derives its identity from the actual child session.

Granite 4.2-8B ran through vLLM. Exported reasoning is `requested_level=""`,
`effective_level="default"`, `source="provider_default"`, `lm_kwargs={}`. No
explicit high/low effort was requested. Round 1 contains 4,723 characters of
provider thinking with a recorded duration of 45.056047 seconds. Replay timing
is editorial. The prompt labels OPAL tables as precomputed reference data, not
live database retrieval. Retain that distinction in the film.

## Attention capture contract

The export has attention declarations and five Spotter summaries, all with
`blocks: []`. Native selection POST responses were not captured. Summaries cannot
drive transcript token heat or the intensity rail. After the production visual
revert, capture the exact native request/response and a still for each shot:

| Selection             | Main message / part                           | Code-point span |
| --------------------- | --------------------------------------------- | --------------- |
| `73`                  | `msg_asst_34694258527d` / `part_89a5b370406d` | [9, 11)         |
| `73; MATCHES`         | same                                          | [9, 20)         |
| `ANSWER: 73; MATCHES` | same                                          | [1, 20)         |
| Clean `ANSWER: 100`   | `msg_asst_14ec3526c582` / `part_31ca6cb2994e` | [1, 12)         |

Use native selection -> Understand attention. These purposeful selections explain
a product capability; decorative text highlighting remains discouraged.

Load a local sidecar with `?mode=spotter&attention=opal-attention.json`:

```json
{
  "schema": "clio.replay-attention.v1",
  "sourceSha256": "<exact pair source SHA-256>",
  "knownAnswers": ["<answer IDs>"],
  "records": [
    {
      "sessionId": "<main ID>",
      "messageId": "<answer ID>",
      "partId": "<part ID>",
      "contentRevision": "<actual request revision>",
      "field": "text",
      "start": 9,
      "end": 11,
      "text": "73",
      "response": "<complete native response OBJECT with real blocks/runs>"
    }
  ]
}
```

This is a contract template, not capture data. Preserve `profile` as an object on
each record if present in the actual request; omit it otherwise. Matching requires
exact export hash, identities, revision, span, text and profile. Preserve response
provenance and unmapped coverage. Missing selections return explicit unavailability.
Real matching responses pass through native hooks to token heat and the intensity
minimap; no ASCII/table replacement is added. Use production reduction/color
semantics: intensity does not establish causality. Never substitute another
run's attention for OPAL.

## Checks

Python tests cover gzip import, token mirrors, Unicode, receipt/consumption and
invalid links. Node tests exercise this six-round source, every shared-clock
frame, seeks, all thinking disclosures, intermediate collapse geometry, tool lifecycle
and exact attention matching.
Run full repo checks, native check/build and browser review. Passing tests does
not approve the final story, pointer choreography or playback quality.

### Pacing revision after the first synchronization proof

The first proof had a five-second completed-thinking hold and closed its native
Collapsible in one frame. Revision 2 shortens the holds and animates native height
with `RecordedThinkingContent`; no wall-clock CSS transition is used. The native
body is 368 px open, 184 px at the first collapse midpoint, and 0 px closed at the
reviewed 1280x720 viewport. Text is retained, not crossfaded to a second screenshot.
A source-bound window is generated for every main thinking block. Round 2 was
previously left at its native collapsed default; it now opens while its captured
text grows. Tests cover every passage, seek order, monotonic collapse values and
shared clock freezes. Keep this behavior in the full film, not just the proof.


## Attention interaction preview

`SpotterAttentionProof` renders a 10-second native interaction: drag-select
`ANSWER: 73; MATCHES`, click **Understand attention**, then scroll upward to the
CURATION OVERRIDE. Both transcript projections stay at the recorded fifth-answer
wake for the entire shot. The right pane remains visible. There is no camera
zoom, replacement screenshot or new inference.

```text
cd motion
npm run render -- --composition SpotterAttentionProof --scale 1 --concurrency 1 --output out/spotter-attention-interaction-v2.mp4
```

Interactive review:
`http://127.0.0.1:3359/?mode=spotter&pair=opal-chainB-7795459.native.json&attention=chainB-7795459-attention.json&attentionShot=chainB-answer-line`.
Play inspection runs the same frame-driven track. URL `frame=` seeks within its
600 frames. The manifest is `attention-inspections.json`; its source revision,
message/part IDs and exact answer/source spans are checked against the imported
pair and captured native response. Source time is bound to the reviewer wake ID
instead of an editorial frame number, so changing replay pace cannot drift it.

The pointer endpoints come from measured native answer ranges and the actual
selection-toolbar button. Dragging updates a real DOM selection through native
source projection. The toolbar's own button handler requests the captured heat;
the native banner, item chips, token highlights and intensity rail do the rest.
The scroll moves the native conversation viewport to the source span. Keep source
clock, pointer, text-selection length and scroll amount separately editable.

The render bridge waits for the toolbar or returned native heat to paint before
acknowledging each frame. Exact-selection changes must be idempotent: repeatedly
replacing an identical range can keep cancelling the toolbar's scheduled update.
Suspend chat auto-follow as soon as attention leaves idle, including loading;
otherwise banner arrival can push the selected answer out of view. The pointer
stays continuous through the click and scroll. Native spinners use editorial frame
angles in this shot so capture-worker timing cannot cause flicker.

Keep the frozen source clock, disclosure maps and native conversation subtree
memoized. Inspection-frame changes should move the pointer and scroll without
rebuilding paused Markdown. Review static text in the encoded movie as well as
the moving region; a clean settled screenshot does not establish frame stability.

The encoded interaction was checked across the whole clip and at every frame of
the click transition. See `../evidence/chainB-attention-interaction-verification.json`
and `../evidence/chainB-attention-interaction-review.json`. These validate the
interaction and encoding; campaign creative approval remains with the user.
