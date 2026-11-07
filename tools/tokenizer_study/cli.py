"""Command line for the tokenizer study."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from tokenizer_study import catalog
from tokenizer_study.heat_alignment import check_alignment
from tokenizer_study.page import page_data, render_page
from tokenizer_study.reports import compare_pretokenizers, compare_tokenizers
from tokenizer_study.samples import (
    DEFAULT_PAIR,
    DEFAULT_SIDECAR,
    SCIENCE_TEXT,
    demo_samples,
    demo_text,
    part_text,
)

DEFAULT_OUT = Path("polaris-2026-10/tokenizer-study")


def _write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {path}")


def _names(requested: list[str] | None) -> list[str]:
    names = requested or [entry.name for entry in catalog.CATALOG]
    for name in names:
        catalog.source(name)
    return names


def build_parser() -> argparse.ArgumentParser:
    """Arguments shared by every subcommand, then one subparser per step."""
    parser = argparse.ArgumentParser(prog="run_tokenizer_study.py", description=__doc__)
    parser.add_argument("--cache", type=Path, default=catalog.DEFAULT_CACHE)
    parser.add_argument("--pair", type=Path, default=DEFAULT_PAIR)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    steps = parser.add_subparsers(dest="step", required=True)

    fetch = steps.add_parser("fetch", help="download tokenizer.json files into the cache")
    fetch.add_argument("names", nargs="*", help="catalog names; all when omitted")
    steps.add_parser("list", help="show the catalog")

    page = steps.add_parser("page", help="write the token-boundary HTML page")
    page.add_argument("--tokenizer", default="granite-4.2")

    compare = steps.add_parser("compare", help="word splits and punctuation per tokenizer")
    compare.add_argument("names", nargs="*", help="catalog names; all when omitted")

    pre = steps.add_parser("pretokenizer", help="diff two tokenizers that share a vocabulary")
    pre.add_argument("--left", default="granite-4.2")
    pre.add_argument("--right", default="granite-4.1")

    align = steps.add_parser("alignment", help="check recorded heat runs against real tokens")
    align.add_argument("--sidecar", type=Path, default=DEFAULT_SIDECAR)
    align.add_argument("--tokenizer", default="granite-4.2")

    steps.add_parser("all", help="run every step with the defaults")
    return parser


def run(args: argparse.Namespace) -> None:
    """Execute one parsed command."""
    cache: Path = args.cache
    out: Path = args.out
    step: str = args.step
    if step == "list":
        for entry in catalog.CATALOG:
            print(f"{entry.name:12} {entry.repo} @ {entry.revision}")
        return
    if step == "fetch":
        for name in _names(args.names):
            print(f"{name:12} {catalog.fetch(catalog.source(name), cache)}")
        return

    samples = demo_samples(part_text(args.pair))
    if step in ("page", "all"):
        name: str = getattr(args, "tokenizer", "granite-4.2")
        entry = catalog.source(name)
        tokenizer = catalog.load(name, cache)
        label = f"{entry.repo} @ {entry.revision[:8]}"
        data = page_data(tokenizer, tokenizer.get_vocab_size(), label, samples)
        path = out / f"{name}-tokens.html"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(render_page(data), encoding="utf-8")
        print(f"wrote {path}")
    if step in ("compare", "all"):
        texts = {"demo": demo_text(samples), "science": SCIENCE_TEXT}
        names = _names(getattr(args, "names", None))
        _write_json(out / "results/compare.json", compare_tokenizers(texts, names, cache))
    if step in ("pretokenizer", "all"):
        left: str = getattr(args, "left", "granite-4.2")
        right: str = getattr(args, "right", "granite-4.1")
        result = compare_pretokenizers(demo_text(samples), left, right, cache)
        _write_json(out / f"results/pretokenizer-{left}-vs-{right}.json", result)
    if step in ("alignment", "all"):
        name = getattr(args, "tokenizer", "granite-4.2")
        sidecar: Path = getattr(args, "sidecar", DEFAULT_SIDECAR)
        result = check_alignment(sidecar, args.pair, catalog.load(name, cache))
        result["tokenizer"] = catalog.provenance(cache).get(name)
        _write_json(out / "results/heat-alignment.json", result)


def main(argv: list[str] | None = None) -> None:
    """Parse ``argv`` and run the requested step."""
    run(build_parser().parse_args(argv))
