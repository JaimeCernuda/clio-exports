"""Check that recorded heat runs land exactly on real token boundaries."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from tokenizer_study.analysis import Encoder, tokenize
from tokenizer_study.samples import all_part_texts


def check_alignment(sidecar: Path, pair: Path, encoder: Encoder) -> dict[str, Any]:
    """Compare every displayed heat run with a fresh tokenization of its message part.

    Each part is tokenized on its own, so a part's first or last token can in
    principle differ from its tokenization inside the full prompt. A run counts as
    aligned when its character range equals exactly one token's range.
    """
    parts = all_part_texts(pair)
    attention: dict[str, Any] = json.loads(sidecar.read_text(encoding="utf-8"))
    boundaries: dict[str, set[tuple[int, int]]] = {}
    runs = misaligned = 0
    missing_parts: set[str] = set()
    examples: list[dict[str, Any]] = []
    for record in attention["records"]:
        for block in record["response"]["blocks"]:
            part_id: str = block["part_id"]
            text = parts.get(part_id)
            if text is None:
                missing_parts.add(part_id)
                continue
            if part_id not in boundaries:
                boundaries[part_id] = {(span.start, span.end) for span in tokenize(encoder, text)}
            for start, end, _value in block["display_runs"]:
                runs += 1
                if (start, end) not in boundaries[part_id]:
                    misaligned += 1
                    if len(examples) < 20:
                        examples.append(
                            {"part": part_id, "start": start, "end": end, "text": text[start:end]}
                        )
    return {
        "schema": "clio.tokenizer-study.heat-alignment.v1",
        "selections": len(attention["records"]),
        "runs": runs,
        "misaligned": misaligned,
        "parts_checked": len(boundaries),
        "parts_missing_text": sorted(missing_parts),
        "examples": examples,
    }
