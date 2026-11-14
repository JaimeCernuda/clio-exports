# Compact Notebook revision

The preceding Notebook cut was rejected. It retained a custom title and
full-width docked composer instead of the native compact welcome, and its
inspection never demonstrated the user rule or previous lookup.

## Result to review

Restore the production welcome, measured 896px conversation column, compact
composer, native five-option confirmation menu, Notebook fonts and paper palette.
Keep the composer centered before the first submission, then move that same
element into its docked position over half a second. Do not add a marketing
heading inside the empty conversation.

During the first attention inspection, click the red Evidence finding to open
the suspect result; click the green conversation rail marker to reveal the user
rule; open Lineage and click the earlier panel-membership lookup. Return to the
answer, select `73`, then follow its red Lineage node back into the suspect
result. These controls also navigate the actual emulator viewport when clicked
manually. A changed dataset attribute alone is not a successful navigation test.

## Timing

The editable film clock is 216 seconds. The approved eight-second intro replaces
the internal seven-second intro, so the delivered movie is 217 seconds. Add one
second to the following source-clock times for delivery timestamps:

| Source time | Action |
| --- | --- |
| 8-11 | Open the native policy menu; choose SPOTTER review |
| 18-18.5 | Submit the first prompt; dock the compact composer |
| 174 | Understand attention for the whole answer |
| 176 | Click the flagged Evidence footer; reveal the poisoned lookup |
| 180 | Click the green rail marker; reveal the user's task and rule |
| 183-184.5 | Open Lineage; click Step 2's panel-membership lookup |
| 188-190 | Scroll back to the answer; close attention |
| 191.2-197 | Select `73`; open its attention view |
| 201-203 | Open Lineage; click Step 3's flagged lookup |
| 210-216 | Branded close |

The source clock stays frozen throughout these inspections. Expanding an old
source is a user action, not new agent work. Original rounds 1, 2, 5 remain
displayed as Steps 1, 2, 3. The nine main lookup rows reconstruct the exact prompt
packets; SPOTTER's seven tool calls are real recorded calls. Attention values,
denominator, residual and word/max default are unchanged. No new inference.

## Reproduction and review

Latest target: `motion/out/spotter-v3-notebook-compact/` on D:. Movies remain local.
Use the existing native build and source pin documented in [README.md](README.md).
Run the browser review before rebuilding and capturing: it remeasures the pointer
against the actual native controls at both 1920x1080 and 1116x970.

```powershell
node scripts/review-spotter-v3.mjs
npm test
npm run demo:build
node scripts/capture-spotter-v3.mjs proof
node scripts/review-spotter-v3-encode.mjs proof
node scripts/capture-spotter-v3.mjs full
node scripts/review-spotter-v3-encode.mjs full
```

Set TEMP/TMP/TMPDIR to `motion/.native-ui/tmp` before invoking tools. Capture uses
one installed browser and two pages only after 32 exact cold/sequential pixel
comparisons. The proof covers the menu/docking and both source-navigation paths.
It is an internal mechanics check, not the narrative deliverable.

Preflight: 84 browser states across two viewport sizes pass, including actual
Evidence/rail/Lineage clicks and source viewport offsets. All 165 motion tests
and 140 Python tests pass without skips; root/native types, Ruff, Pyright and
formatting pass. The 38-second proof has 32 exact page-parity matches and no
flash-scan candidates across 2,280 decoded frames. Its SHA256 is
`d1b01557b7903fe8d33b50afd59629fd70dd3f5044ef23802078757d98cadd6a`.

Proof inspection: 1x browser playback with observations at 0.34, 20.48, 26.78,
32.36 and 36.54 seconds; encoded transition strips around docking, earlier-source
navigation and the second graph click. This is sampled visual coverage, not a
claim of continuous human viewing. The final full render/review is in progress;
delivery hashes and actual inspection coverage will be recorded after validation.
