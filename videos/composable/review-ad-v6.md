# Plugin handoffs: re-review

Revised full cut for user review. Creative approval remains pending.

- Local movie: `motion/out/composable/clio-composable-ad-v6.mp4` (not committed).
- SHA-256: `6104418feb39fe310ed9b79de4796b0640bd9ed331e1f5c709552de67d12c294`.
- 1920 × 1080, 60 fps, 2100 frames, 35 seconds, 9,511,532 bytes.
- Original procedural sound. No reference-film media is included.

## Findings and corrections

The v5 checks missed complete plugin cards crossing the prompt, contribution
text appearing outside a moving card, and an overlapping menu-to-inspector
handoff. Checking individual word boxes was insufficient.

The selected Manufacturing row now travels below the appearing prompt before
rising beside it. Each inspected plugin fades its contents, closes, travels
around the prompt on a rounded path and docks before the prompt recenters.
Inspection and transfer timing are independent of the text-edit duration.

Hidden contribution text is unmounted. An inner paint boundary clips visible
contents while the outer wrapper carries movement and shadow. The nested text
translation is removed. A quiet sound marks each completed docking.

The vertical wheel, aligned owl/CLIO/phrase/plus, uniform prompt typography,
additive Simulation and Reports bundles, domain changes retaining Reports, and
five-second closing CTA remain. These are illustrative domain plugins and
editorial instructions, not an installed catalogue or a recorded agent run.

## Verification

All 120 Python tests and 103 motion tests pass without skips. Ruff, pyright,
TypeScript and formatting pass. New regressions cover menu extraction clearance,
continuous handoff, close-before-transfer and whole-card clearance from the
rotated/scaled prompt and retained plugins.

Browser measurements after font loading confirm all nine prompts fit, use
28 px / weight 450, and the opening owl and plus share a vertical center. Every
edit frame of all eight prompt transitions passes word-collision checks.

The encoded paint audit checks every frame of the 62-frame extraction and five
143-frame inspections: 777 frames, covering all four render workers. No unexpected
dark paint is detected outside the expected components. This audit downsamples to
640 × 360, allows three pixels around bounds for codec ringing, and flags more
than twelve pixels below luminance 205. It cannot detect every defect inside a
component, approve wording, or judge motion quality.

Visual frame inspection covered the full sequence, dense 12 fps inspection and
docking strips, the corrected menu extraction, and 8 fps strips of the faster
domain changes. No stray contribution text or card-over-prompt crossing was found
in those inspected sequences. Evidence stays locally in `motion/review`.

The full movie decodes with the expected resolution, rate, frame count and audio.
The QR decodes to `https://clio.iowarp.ai/`. The closing five seconds are settled;
maximum mean luminance frame difference is 0.10007 on a 0–255 scale. Audio peak is
−17.7 dBFS, with no detected clipping.

This is encoded-frame, geometry and technical review, not human-equivalent
uninterrupted playback or listening approval. Pacing, sound and the overall
advertising treatment still require judgment in the moving cut.
