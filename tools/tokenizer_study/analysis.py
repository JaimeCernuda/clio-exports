"""Measurements over token offsets; independent of any particular tokenizer library."""

from __future__ import annotations

import difflib
import re
from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any, Protocol

WORD_PIECE = re.compile(r"^ ?[A-Za-z0-9_]+$")
WORD = re.compile(r"[A-Za-z]+")


class _Encoding(Protocol):
    @property
    def ids(self) -> list[int]: ...

    @property
    def offsets(self) -> list[tuple[int, int]]: ...


class Encoder(Protocol):
    """Anything that encodes text into ids with character offsets (a ``tokenizers.Tokenizer``)."""

    def encode(self, sequence: str, *, add_special_tokens: bool = ...) -> _Encoding: ...


@dataclass(frozen=True)
class Span:
    """One token: its character range in the source text and its id."""

    start: int
    end: int
    id: int

    def text(self, source: str) -> str:
        """The characters this token covers."""
        return source[self.start : self.end]


def tokenize(encoder: Encoder, text: str) -> list[Span]:
    """Encode ``text`` without special tokens, dropping zero-width tokens."""
    encoding = encoder.encode(text, add_special_tokens=False)
    return [
        Span(start, end, token_id)
        for (start, end), token_id in zip(encoding.offsets, encoding.ids, strict=True)
        if end > start
    ]


def group_words(text: str, spans: Sequence[Span]) -> list[int]:
    """A group number per token; neighbouring word pieces with no space between share one.

    A word piece is made only of letters, digits and underscores, optionally after one
    leading space. ``CUR`` + ``ATION`` and ``design`` + ``_`` + ``lookup`` group;
    ``73`` and ``;`` stay apart.
    """
    groups: list[int] = []
    previous = ""
    current = -1
    for span in spans:
        piece = span.text(text)
        joins = bool(
            previous
            and WORD_PIECE.match(previous)
            and WORD_PIECE.match(piece)
            and not piece[0].isspace()
        )
        if not joins:
            current += 1
        groups.append(current)
        previous = piece
    return groups


def word_splits(text: str, spans: Sequence[Span]) -> dict[str, Any]:
    """How many alphabetic words are cut by a token boundary, split by ALL-CAPS or not."""
    starts = [span.start for span in spans]
    split: list[str] = []
    caps = Counter[str]()
    for match in WORD.finditer(text):
        lo, hi, word = match.start(), match.end(), match.group()
        covering = sum(1 for span in spans if span.end > lo and span.start < hi)
        is_split = covering > 1 or any(lo < start < hi for start in starts)
        kind = "caps" if word.isupper() and len(word) > 1 else "other"
        caps[kind + "_words"] += 1
        if is_split:
            caps[kind + "_split"] += 1
            split.append(word)
    total = caps["caps_words"] + caps["other_words"]
    return {
        "words": total,
        "split": len(split),
        "split_pct": round(100 * len(split) / total) if total else 0,
        "caps_split": f"{caps['caps_split']}/{caps['caps_words']}",
        "other_split": f"{caps['other_split']}/{caps['other_words']}",
        "split_examples": sorted(set(split)),
    }


def is_punctuation(char: str) -> bool:
    """Neither a letter, a digit nor whitespace."""
    return not char.isalnum() and not char.isspace()


def punctuation_profile(text: str, spans: Sequence[Span]) -> dict[str, Any]:
    """Which kind of token each punctuation character ends up in.

    ``alone``: a token that is exactly that character. ``newline``: merged with a line
    break. ``space``: merged with a leading space. ``word``: merged with letters or
    digits. ``punct``: merged with other punctuation. Also counts sentence-ending
    periods (followed by a space, a line break or the end) that are a token alone.
    """
    owner: dict[int, Span] = {}
    for span in spans:
        for index in range(span.start, span.end):
            owner[index] = span
    marks = [index for index, char in enumerate(text) if is_punctuation(char)]
    kinds = Counter[str]()
    for index in marks:
        piece = owner[index].text(text)
        if piece == text[index]:
            kinds["alone"] += 1
        elif any(char.isalnum() for char in piece):
            kinds["word"] += 1
        elif "\n" in piece:
            kinds["newline"] += 1
        elif " " in piece:
            kinds["space"] += 1
        else:
            kinds["punct"] += 1
    periods = [
        index
        for index in marks
        if text[index] == "." and (index + 1 == len(text) or text[index + 1] in " \n")
    ]
    alone = sum(1 for index in periods if owner[index].text(text) == ".")
    total = len(marks)
    return {
        "punctuation_chars": total,
        "pct": {
            kind: round(100 * kinds[kind] / total) if total else 0
            for kind in ("alone", "newline", "space", "word", "punct")
        },
        "sentence_periods": len(periods),
        "sentence_periods_alone": alone,
    }


def show(text: str, spans: Sequence[Span]) -> str:
    """Tokens in brackets with line breaks drawn as ``↵``, for reports."""
    return " ".join("[" + span.text(text).replace("\n", "↵") + "]" for span in spans)


def boundary_diff(
    text: str, left: Sequence[Span], right: Sequence[Span]
) -> list[tuple[list[str], list[str]]]:
    """Regions where two tokenizations of the same text cut it differently."""
    left_pieces = [span.text(text) for span in left]
    right_pieces = [span.text(text) for span in right]
    matcher = difflib.SequenceMatcher(a=left_pieces, b=right_pieces, autojunk=False)
    return [
        (left_pieces[i1:i2], right_pieces[j1:j2])
        for op, i1, i2, j1, j2 in matcher.get_opcodes()
        if op != "equal"
    ]


def pretokenizer_regexes(config: dict[str, Any]) -> list[str]:
    """Every split regex in a ``tokenizer.json`` pre-tokenizer, or ``byte-level:gpt2``."""
    found: list[str] = []
    stack: list[Any] = [config.get("pre_tokenizer")]
    while stack:
        node = stack.pop()
        if not isinstance(node, dict):
            continue
        step: dict[str, Any] = node  # pyright: ignore[reportUnknownVariableType]
        if step.get("type") == "Sequence":
            stack.extend(reversed(step.get("pretokenizers") or []))
        elif step.get("type") == "Split":
            pattern: dict[str, Any] = step.get("pattern") or {}
            found.append(str(pattern.get("Regex") or pattern.get("String")))
        elif step.get("type") == "ByteLevel" and step.get("use_regex"):
            found.append("byte-level:gpt2")
    return found


def merges_as_text(config: dict[str, Any]) -> list[str]:
    """BPE merges as ``"a b"`` strings, whichever of the two file formats is used."""
    merges: list[Any] = config["model"].get("merges") or []
    return [item if isinstance(item, str) else " ".join(item) for item in merges]
