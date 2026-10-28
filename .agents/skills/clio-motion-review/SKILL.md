---
name: clio-motion-review
description: Review a reconstructed CLIO UI film for source fidelity, transition quality and encoded output correctness. Use before handing over a moving cut or diagnosing a bad render.
---

# CLIO film review

Review the requested outcome against the [brief](../../../motion/BRIEF.md).
Keep evidence fidelity, rendering correctness and creative judgment distinct.

## Source and component checks

Confirm the selected request, child identities, tool calls and results occur in
the indexed archive. Read truncation flags and stop reasons; an `end_turn` is not
proof that every requested task succeeded. Do not turn an author's coverage claim
into an independently verified result. The proof's reading-guide run has recorded
limits and is not a completeness benchmark.

Check that panels/text are independent components and the composition imports
selected evidence instead of the native viewer or its embedded binary assets.
Preserve original archive checksums. Labels and shortening should not imply that
the source run completed in the film's elapsed time.

Run the relevant checks:

```text
uv run pytest -q
uv run ruff check
uv run ruff format --check
uv run pyright
```

From `motion/`, run `npm test`, `npm run typecheck`, `npm run format:check`.
No failed or skipped tests count as a passing result.

## Visual and motion checks

Inspect readable framing at output size and actual intended viewing size. Check
CLIO's recognizability, hierarchy, typography, source content, clipping and label
collisions. Sample entrances, exits and mid-morph frames as well as held layouts.
Verify source fonts/brand assets finish loading. Use the component lab's alternate
layout to check a shared-component change without relying only on one film.

Play the encoded file through. Look for accidental holds, distracting motion,
overlapping fades, unreadable detail and inadequate result holds. Captions,
audio and transitions should make CLIO's capability clearer. Sampled stills cannot
establish temporal quality; if playback review is limited, say so. Do not call the
art direction approved because a file decodes or matches resolution metadata.

## Encoding verification and handoff

From the repo root, for the current proof:

```text
uv run python tools/verify_video.py motion/out/clio-editable-ui-proof.mp4 --width 3840 --height 2160 --fps 60 --frames 900 --audio absent --out motion/review/verification.json
```

Adjust expected dimensions, frame count and audio policy for the actual film.
The verifier uses FFprobe and a full FFmpeg decode. It checks technical properties,
not visual merit or the truth of the source run. Do not silently upscale a low-DPI
UI capture and represent that as a fresh vector render.

Deliver the moving cut, editable sources and a short account of what was actually
reviewed, including material limitations. Use `tools/package_motion.py` for a
portable source handoff. State the repository branch/publication state accurately.
Keep the older rejected screenshot cut separate from new treatments.
