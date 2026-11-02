# CLIO: a composable agent

The active film is a 37⅓-second, 1920 × 1080 / 60 fps motion advertisement. Its
opening and closing are PR. The middle is a pseudo demo of editable native-derived
CLIO plugin controls and prompt text, reshaped for the film without app chrome.
See [ART-DIRECTION.md](ART-DIRECTION.md) for the story and craft references.

One vertical wheel changes whole domain words inside **A [domain] agent** while
the surrounding words stay fixed. It accelerates, settles on composable, and
forms one aligned CLIO/phrase/plus lockup. There is no typing/backspacing sequence.
Every part uses measured text widths with uniform gaps. The brand arrives as a
complete piece; the sentence-case change clears the old letter before revealing
the new one.

Manufacturing opens to reveal its prompt, skill, MCP, tool and hook contributions.
Simulation and Reports then extend it. The agent becomes Genomics, Climate,
Robotics, Materials and Medical research, retaining Reports to demonstrate reuse.
Only the three additive bundles open. Their contents reveal in sequence and stay
fully readable for 1.8 seconds for Manufacturing and 1.1 seconds for Simulation
and Reports. Domain changes then proceed without repeating the inspection loop.
Its displayed identity always follows the active domain. The real CLIO owl remains
the brand anchor. There is no generic robot, agent reference or inspector header.

The selected row clears the prompt before rising into inspection. Each disclosure
fades its contents, closes, and follows a rounded route below the prompt before
docking. The prompt returns to center after the row arrives. Timing for those
steps is separate from the prompt edits. `inspection` controls expansion, row
reveal, closure and transfer; each change's `readFrames` starts after the final
row is fully visible. Changing a reading hold automatically shifts closure,
docking and the corresponding sound cue. Keep the next change after refocus ends.
The menu choice highlights under the filmed cursor. Selection starts with the
exact menu-row rectangle and label geometry; neighboring choices retire before
that row grows a border, metadata and removal control. `selection.source` is
checked against the actual DOM at `staging.selectAt`; remeasure it after changing
the picker layout. The domain marker follows the identity morph instead of
switching color on its first frame.

These are illustrative domain plugins and a uniform editorial representation of
their prompt. The film does not claim to show a complete backend-resolved prompt,
an installed catalogue, a recorded execution or a successful live MCP connection.
It depicts configuration before a conversation; changing an already-submitted
prompt has additional runtime semantics not covered by this ad.

## Source map

- [Copy, plugin bundles, stages and cues](../../motion/story/composable-ad.json).
  Every module is a plugin. Its role, instructions, skills, MCP servers, tools
  and hooks travel together; there are no independently added skill/MCP objects.
- [Opening wheel and shared flex lockup](../../motion/src/AdOpening.tsx).
- [Film and native-derived contribution disclosures](../../motion/src/ComposableAd.tsx),
  [styling](../../motion/src/composable-ad.css),
  [composition, ownership and motion](../../motion/src/composable-ad-plan.ts),
  [uniform measured prompt](../../motion/src/AdPrompt.tsx),
  [shared word matching](../../motion/src/prompt-morph.ts).
- [Production UI references and checksums](ui-sources.json). Plugin choice,
  removal controls and multi-family contribution hierarchy follow CLIO. The
  film reflows those elements and represents the composed prompt in one text face;
  it does not mount the full production app or backend.
- [Standalone Remotion entrypoint](../../motion/src/composable-ad-index.tsx):
  `ClioComposableAd`, with no transcript or preview server dependency.
- [Original procedural sound](../../motion/scripts/finish-composable-ad.mjs),
  [QR generator](../../motion/scripts/prepare-composable-qr.mjs),
  [review checks](../../motion/scripts/review-composable-ad.ts),
  [behavioral tests](../../motion/tests/composable-ad.test.ts).

To add a domain, define one plugin and its owned contribution arrays, then select
it in a stage. A workflow plugin has an empty role and extends the current domain.
A domain plugin supplies the role; common instructions remain stable. Reusing a
plugin retains its source IDs and prompt fragments across domain changes.

## Render and inspect

Use the repository lockfiles and keep dependencies, temporary files, caches and
renders on D:. From `motion/`:

```powershell
node scripts/prepare-composable-qr.mjs
npm run composable:render
```

Outputs: `out/composable/clio-composable-ad-v8-clean.mp4` and
`out/composable/clio-composable-ad-v8.mp4`. Original synthetic sound is aligned
to the cues. No reference-film footage, artwork or soundtrack is reused. Successful
raw renderer intermediates and the temporary WAV are removed; movies stay local.

The renderer waits for fonts and measures the actual DOM. Every value follows
the render frame. Do not launch a second bundle into `motion/bundle` during a render.

After changing text or layout, measure again before checking geometry:

```powershell
node render.mjs stills --composition ClioComposableAd --scale 1 --frames 480,559,560,574,584,606,700,870,950,1090,1170,1310,1420,1560,1656,1752,1820,2050 --props examples/composable-measure.json > review/composable-ad-v8-measure.log
npx tsx scripts/review-composable-ad.ts --geometry-only
npm run composable:review
```

Measure every compact plugin header after changing names, fonts or timing; the
reviewer checks that each name and removal control fits the actual component.
Include the exact selection frame so the menu row and extracted row can be
compared, including the label's position and dimensions.

Review covers uniform prompt typography, measured opening alignment and gaps, every
instruction edit frame, whole-card clearance from the prompt and retained rows,
full movie decode, audio, QR decoding and a settled final five seconds. An encoded
paint audit covers all 60 menu-extraction frames and all 645 inspection frames,
including every render worker. It flags dark paint outside the expected component
bounds at 640 × 360 with a small codec-edge allowance; it does not judge animation
quality or detect every possible defect inside those bounds.

Tests cover plugin ownership, domain identity, reusable contributions,
action-before-effect timing, continuous handoffs and close-before-transfer.
Inspect the encoded moving handoffs as well; technical checks do not approve taste
or pacing. Hidden contribution text is unmounted and explicitly clipped; opacity
alone is not sufficient protection against browser paint leakage.

## Prior treatments

The original `ClioComposable` UI cut and later mixed typewriter/horizontal-wheel
advertisement were rejected. [V1](review-v1.md) and [V4](review-ad-v4.md) remain
historical receipts. The original source-bound composer export remains separate
in `motion/data/composable-prompts.json`; regenerate it only when deliberately
changing those source pins. Prior movies remain local for comparison.

Current status: revised full cut for user review; creative approval is pending.
See [the current review receipt](review-ad-v8.md) for checks and review limits.
