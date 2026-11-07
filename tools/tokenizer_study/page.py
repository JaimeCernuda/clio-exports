"""The self-contained HTML page that shows each token of the demo samples."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from tokenizer_study.analysis import Encoder, group_words, tokenize
from tokenizer_study.samples import Sample

TEMPLATE = Path(__file__).with_name("token_page.html")
PLACEHOLDER = "__DATA__"


def page_data(encoder: Encoder, vocab: int, source: str, samples: list[Sample]) -> dict[str, Any]:
    """Each sample's tokens as ``[text, id, word group]`` triples."""
    rendered: list[dict[str, Any]] = []
    for sample in samples:
        spans = tokenize(encoder, sample.text)
        groups = group_words(sample.text, spans)
        rendered.append(
            {
                "key": sample.key,
                "label": sample.label,
                "chars": len(sample.text),
                "tokens": [
                    [span.text(sample.text), span.id, group]
                    for span, group in zip(spans, groups, strict=True)
                ],
            }
        )
    return {"source": source, "vocab": vocab, "samples": rendered}


def render_page(data: dict[str, Any], template: Path = TEMPLATE) -> str:
    """Embed the data in the page template so the result needs no server."""
    html = template.read_text(encoding="utf-8")
    if html.count(PLACEHOLDER) != 1:
        raise ValueError(f"{template} must contain {PLACEHOLDER} exactly once")
    payload = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    return html.replace(PLACEHOLDER, payload)
