"""The study's comparisons, each returning a JSON-ready result."""

from __future__ import annotations

from collections import Counter
from pathlib import Path
from typing import Any

from tokenizer_study import catalog
from tokenizer_study.analysis import (
    Encoder,
    boundary_diff,
    merges_as_text,
    pretokenizer_regexes,
    punctuation_profile,
    show,
    tokenize,
    word_splits,
)

#: Short snippets that show the differences at a glance.
PROBES = (
    "analogue by",
    "does that analogue's own",
    "cannot be analogues.\n2.",
    "this lookup. Report",
    "this override.\n\n>>>",
    'aspect="accession_panel")\n',
    "Fv/Fm_Lss",
    "round 1?\n\nRULES",
    "(0.972) 1000 2026",
)


def _probes(tokenizer: Encoder) -> dict[str, str]:
    return {probe: show(probe, tokenize(tokenizer, probe)) for probe in PROBES}


def compare_tokenizers(
    texts: dict[str, str], names: list[str], cache: Path = catalog.DEFAULT_CACHE
) -> dict[str, Any]:
    """Word splits and punctuation handling of each tokenizer on the same texts."""
    rows: list[dict[str, Any]] = []
    for name in names:
        tokenizer = catalog.load(name, cache)
        row: dict[str, Any] = {"tokenizer": name, "vocab": tokenizer.get_vocab_size()}
        for key, text in texts.items():
            spans = tokenize(tokenizer, text)
            row[key] = {
                "tokens": len(spans),
                "words": word_splits(text, spans),
                "punctuation": punctuation_profile(text, spans),
            }
        row["probes"] = _probes(tokenizer)
        rows.append(row)
    return {
        "schema": "clio.tokenizer-study.compare.v1",
        "texts": {key: len(text) for key, text in texts.items()},
        "sources": {name: catalog.provenance(cache).get(name) for name in names},
        "tokenizers": rows,
    }


def compare_pretokenizers(
    text: str, left: str, right: str, cache: Path = catalog.DEFAULT_CACHE
) -> dict[str, Any]:
    """Whether two tokenizers share a vocabulary and merges, and where they cut differently."""
    left_json, right_json = catalog.load_json(left, cache), catalog.load_json(right, cache)
    left_vocab: dict[str, int] = left_json["model"]["vocab"]
    right_vocab: dict[str, int] = right_json["model"]["vocab"]
    shared = sum(1 for token, index in left_vocab.items() if right_vocab.get(token) == index)
    left_added = {item["id"]: item["content"] for item in left_json["added_tokens"]}
    right_added = {item["id"]: item["content"] for item in right_json["added_tokens"]}
    left_spans = tokenize(catalog.load(left, cache), text)
    right_spans = tokenize(catalog.load(right, cache), text)
    regions = Counter[tuple[str, str]]()
    for a, b in boundary_diff(text, left_spans, right_spans):
        regions[(" | ".join(a), " | ".join(b))] += 1
    return {
        "schema": "clio.tokenizer-study.pretokenizer.v1",
        "left": left,
        "right": right,
        "sources": {name: catalog.provenance(cache).get(name) for name in (left, right)},
        "vocab_sizes": [len(left_vocab), len(right_vocab)],
        "same_token_and_id": shared,
        "merges_identical": merges_as_text(left_json) == merges_as_text(right_json),
        "pretokenizer": {
            left: pretokenizer_regexes(left_json),
            right: pretokenizer_regexes(right_json),
        },
        "reassigned_special_tokens": {
            str(index): [right_added.get(index), left_added.get(index)]
            for index in sorted(set(left_added) | set(right_added))
            if left_added.get(index) != right_added.get(index)
        },
        "tokens": [len(left_spans), len(right_spans)],
        "differences": [
            {"count": count, left: a, right: b} for (a, b), count in regions.most_common()
        ],
    }
