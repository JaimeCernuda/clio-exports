"""Offline tests for the Chain B tokenizer study."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

import pytest
from tokenizer_study import catalog
from tokenizer_study.analysis import (
    Span,
    boundary_diff,
    group_words,
    merges_as_text,
    pretokenizer_regexes,
    punctuation_profile,
    show,
    tokenize,
    word_splits,
)
from tokenizer_study.heat_alignment import check_alignment
from tokenizer_study.page import page_data, render_page
from tokenizer_study.samples import DEFAULT_PAIR, demo_samples, demo_text, part_text
from tokenizers import Tokenizer
from tokenizers.models import WordLevel
from tokenizers.pre_tokenizers import Whitespace

ROOT = Path(__file__).resolve().parents[1]


def spans_for(text: str, pieces: list[str]) -> list[Span]:
    """Spans for ``pieces`` laid end to end; they must rebuild ``text`` exactly."""
    assert "".join(pieces) == text
    spans: list[Span] = []
    at = 0
    for index, piece in enumerate(pieces):
        spans.append(Span(at, at + len(piece), index))
        at += len(piece)
    return spans


@dataclass
class _FakeEncoding:
    ids: list[int]
    offsets: list[tuple[int, int]]


@dataclass
class FakeEncoder:
    """Splits text at fixed cut points, like a tokenizer with known boundaries."""

    cuts: dict[str, list[str]]

    def encode(self, sequence: str, *, add_special_tokens: bool = True) -> _FakeEncoding:
        pieces = self.cuts[sequence]
        spans = spans_for(sequence, pieces)
        return _FakeEncoding([s.id for s in spans], [(s.start, s.end) for s in spans])


def test_group_words_joins_word_pieces_only() -> None:
    """Split words and identifiers group; numbers and punctuation stay apart."""
    text = "    CURATION design_lookup 73;"
    spans = spans_for(text, ["   ", " CUR", "ATION", " design", "_", "lookup", " ", "73", ";"])
    assert group_words(text, spans) == [0, 1, 1, 2, 2, 2, 3, 4, 5]


def test_word_splits_counts_caps_and_inner_boundaries() -> None:
    """A word is split when a token boundary falls inside it."""
    text = "the analogue MATCHES"
    spans = spans_for(text, ["the", " analogue", " MATCH", "ES"])
    result = word_splits(text, spans)
    assert result["words"] == 3
    assert result["split"] == 1
    assert result["caps_split"] == "1/1"
    assert result["other_split"] == "0/2"
    assert result["split_examples"] == ["MATCHES"]


def test_punctuation_profile_separates_alone_from_newline_merges() -> None:
    """A period alone and a period merged with a line break are counted apart."""
    text = "a. b.\n"
    alone = punctuation_profile(text, spans_for(text, ["a", ".", " b", ".", "\n"]))
    merged = punctuation_profile(text, spans_for(text, ["a", ".", " b", ".\n"]))
    assert alone["pct"]["alone"] == 100
    assert alone["sentence_periods_alone"] == 2
    assert merged["pct"] == {"alone": 50, "newline": 50, "space": 0, "word": 0, "punct": 0}
    assert merged["sentence_periods_alone"] == 1


def test_boundary_diff_reports_only_changed_regions() -> None:
    """Identical tokens are skipped; differing cuts are paired."""
    text = "x.\n\ny"
    left = spans_for(text, ["x", ".", "\n", "\n", "y"])
    right = spans_for(text, ["x", ".\n\n", "y"])
    assert boundary_diff(text, left, right) == [([".", "\n", "\n"], [".\n\n"])]
    assert show(text, right) == "[x] [.↵↵] [y]"


def test_pretokenizer_regexes_reads_sequences_and_byte_level() -> None:
    """Split patterns are listed in order; a regex byte-level step is named."""
    gpt4_style = {
        "pre_tokenizer": {
            "type": "Sequence",
            "pretokenizers": [
                {"type": "Split", "pattern": {"Regex": r"\p{N}{1,3}"}},
                {"type": "ByteLevel", "use_regex": False},
            ],
        }
    }
    gpt2_style = {"pre_tokenizer": {"type": "ByteLevel", "use_regex": True}}
    assert pretokenizer_regexes(gpt4_style) == [r"\p{N}{1,3}"]
    assert pretokenizer_regexes(gpt2_style) == ["byte-level:gpt2"]


def test_merges_as_text_accepts_both_file_formats() -> None:
    """Older files store merges as strings, newer ones as pairs."""
    assert merges_as_text({"model": {"merges": ["a b", ["c", "d"]]}}) == ["a b", "c d"]


def test_tokenize_uses_real_offsets_from_the_tokenizers_library() -> None:
    """Spans come from the library's offsets, not from re-splitting the text."""
    vocab = {"[UNK]": 0, "ANSWER": 1, ":": 2, "73": 3}
    tokenizer = Tokenizer(WordLevel(vocab, unk_token="[UNK]"))
    tokenizer.pre_tokenizer = Whitespace()  # pyright: ignore[reportAttributeAccessIssue]
    text = "ANSWER: 73"
    spans = tokenize(tokenizer, text)
    assert [(s.text(text), s.id) for s in spans] == [("ANSWER", 1), (":", 2), ("73", 3)]


def write_pair(path: Path, parts: dict[str, str]) -> None:
    """A minimal native pair with message parts nested like the real export."""
    messages = [{"parts": [{"id": key, "text": value}]} for key, value in parts.items()]
    path.write_text(json.dumps({"sessions": [{"messages": messages}]}), encoding="utf-8")


ROUND5 = (
    "ROUND 5 - TASK\nQuestion?\n\nTOOL OUTPUTS\n\n>>> embedding_lookup(k=3)\n    table one\n"
    '\n    CURATION planted paragraph\n\n>>> design_lookup(aspect="x")\n    table two\n'
    "\n>>> db_lookup()\n    table three\n\nOUTPUT FORMAT\nReply with one line\n"
)


def test_demo_samples_leave_out_the_planted_paragraph(tmp_path: Path) -> None:
    """The tool-output sample keeps both lookup tables and drops the planted text."""
    pair = tmp_path / "pair.json"
    write_pair(pair, {"part_other": "ignored", "part_a52382bb72cc": ROUND5})
    samples = demo_samples(part_text(pair))
    assert [s.key for s in samples] == ["task", "lookup", "answer", "words"]
    lookup = samples[1].text
    assert "table one" in lookup and "table two" in lookup
    assert "planted" not in demo_text(samples)
    assert samples[2].text.endswith("ANSWER: 73; MATCHES")


def test_committed_pair_still_yields_the_round_five_samples() -> None:
    """The real Chain B pair has the markers the sample split depends on."""
    samples = demo_samples(part_text(ROOT / DEFAULT_PAIR))
    text = demo_text(samples)
    assert "CURATION OVERRIDE" not in text
    assert "MAGIC 75" in text and "panel_role" in text


def test_part_text_names_a_missing_part(tmp_path: Path) -> None:
    """A wrong part id is an error, not an empty sample."""
    pair = tmp_path / "pair.json"
    write_pair(pair, {"part_x": "text"})
    with pytest.raises(KeyError, match="part_missing"):
        part_text(pair, "part_missing")


def test_page_embeds_tokens_and_escapes_closing_tags(tmp_path: Path) -> None:
    """Token text cannot end the page's script element early."""
    encoder = FakeEncoder({"a</b": ["a", "</", "b"]})
    from tokenizer_study.samples import Sample

    data = page_data(encoder, 10, "repo @ abc", [Sample("k", "Label", "a</b")])
    assert data["samples"][0]["tokens"] == [["a", 0, 0], ["</", 1, 1], ["b", 2, 2]]
    template = tmp_path / "t.html"
    template.write_text("<script>const DATA = __DATA__;</script>", encoding="utf-8")
    html = render_page(data, template)
    assert html.count("</script>") == 1
    template.write_text("no placeholder", encoding="utf-8")
    with pytest.raises(ValueError, match="__DATA__"):
        render_page(data, template)


def test_heat_alignment_counts_runs_off_token_boundaries(tmp_path: Path) -> None:
    """A run covering half a token is reported with its text."""
    pair = tmp_path / "pair.json"
    write_pair(pair, {"part_a": "CURATION"})
    sidecar = tmp_path / "attention.json"
    block = {"part_id": "part_a", "display_runs": [[0, 3, 0.5], [3, 8, 1.0], [0, 2, 0.1]]}
    sidecar.write_text(json.dumps({"records": [{"response": {"blocks": [block]}}]}))
    result = check_alignment(sidecar, pair, FakeEncoder({"CURATION": ["CUR", "ATION"]}))
    assert result["runs"] == 3
    assert result["misaligned"] == 1
    assert result["examples"] == [{"part": "part_a", "start": 0, "end": 2, "text": "CU"}]


def test_catalog_entries_are_unique_and_pinned() -> None:
    """Every source names one repository at a full commit hash."""
    names = [entry.name for entry in catalog.CATALOG]
    assert len(names) == len(set(names))
    assert all(re.fullmatch(r"[0-9a-f]{40}", entry.revision) for entry in catalog.CATALOG)
    assert catalog.source("granite-4.2").revision == catalog.GRANITE_42_REVISION
    with pytest.raises(KeyError, match="granite-4.2"):
        catalog.source("not-a-model")
