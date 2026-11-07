"""Text samples from the Chain B demo, read from the committed replay pair."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

DEFAULT_PAIR = Path("motion/native/public/opal-chainB-7795459.native.json")
DEFAULT_SIDECAR = Path("motion/native/public/chainB-7795459-attention.json")
#: The round 5 user turn of session ``sess_2480c090acbb``.
ROUND5_PART = "part_a52382bb72cc"

#: Words raised while reviewing the demo, separated by spaces as in prose.
REVIEW_WORDS = (
    "source sources sourced datasource multisource provenance SPOTTER CURATION OVERRIDE "
    "ANSWER MATCHES DIVERGES accession accession_panel design_lookup Fv/Fm_Lss analogue "
    "neighbour observational"
)

#: Plant-science prose for comparing word splits outside the demo's markers.
SCIENCE_TEXT = (
    "The accession shows chlorophyll fluorescence and photosynthesis efficiency under cobalt "
    "toxicity. Each genotype was phenotyped; the observational panel was excluded. Provenance "
    "records list the quarantine, the reviewer finding, and the curation override. "
    "Spectroscopy, hyperspectral reflectance, stomatal conductance, transpiration, biomass, "
    "germination, senescence and dose-response curves were measured. SPOTTER raised an alert. "
    "ANSWER: MATCHES or DIVERGES. CURATION OVERRIDE. datasource multisource sourced resource"
)

#: The answer the model gave in round 5.
ROUND5_ANSWER = "ANSWER: 73; MATCHES"


@dataclass(frozen=True)
class Sample:
    """A labelled piece of text to tokenize."""

    key: str
    label: str
    text: str


def part_text(pair: Path, part_id: str = ROUND5_PART) -> str:
    """The text of one message part in a native replay pair."""
    stack: list[Any] = [json.loads(pair.read_text(encoding="utf-8"))]
    while stack:
        node = stack.pop()
        if isinstance(node, dict):
            mapping: dict[str, Any] = node  # pyright: ignore[reportUnknownVariableType]
            text = mapping.get("text")
            if mapping.get("id") == part_id and isinstance(text, str):
                return text
            stack.extend(mapping.values())
        elif isinstance(node, list):
            stack.extend(node)  # pyright: ignore[reportUnknownArgumentType]
    raise KeyError(f"Part {part_id} is not in {pair}")


def all_part_texts(pair: Path) -> dict[str, str]:
    """Every message part's text in a native replay pair, by part id."""
    found: dict[str, str] = {}
    stack: list[Any] = [json.loads(pair.read_text(encoding="utf-8"))]
    while stack:
        node = stack.pop()
        if isinstance(node, dict):
            mapping: dict[str, Any] = node  # pyright: ignore[reportUnknownVariableType]
            part_id, text = mapping.get("id"), mapping.get("text")
            if isinstance(part_id, str) and part_id.startswith("part_") and isinstance(text, str):
                found[part_id] = text
            stack.extend(mapping.values())
        elif isinstance(node, list):
            stack.extend(node)  # pyright: ignore[reportUnknownArgumentType]
    return found


def _between(text: str, start: str, end: str) -> str:
    lo = text.index(start)
    return text[lo : text.index(end, lo)]


def demo_samples(round5: str) -> list[Sample]:
    """The round 5 prompt in three readable parts, plus the review word list.

    The tool-output sample keeps the two lookup tables and leaves out the planted
    instruction paragraph between them.
    """
    task = round5[: round5.index("\nTOOL OUTPUTS")]
    table = _between(round5, ">>> embedding_lookup", "\n\n    CURATION")
    design = _between(round5, ">>> design_lookup", "\n\n>>> db_lookup")
    answer = round5[round5.index("OUTPUT FORMAT") :] + "\n" + ROUND5_ANSWER
    return [
        Sample("task", "Round 5 question and rules", task),
        Sample("lookup", "Tool output tables", table + "\n\n" + design),
        Sample("answer", "Output format and the model's answer", answer),
        Sample("words", "Words that came up in the review", REVIEW_WORDS),
    ]


def demo_text(samples: list[Sample]) -> str:
    """The prompt samples joined, without the review word list."""
    return "".join(sample.text for sample in samples if sample.key != "words")
