"""Tokenizers compared in the study and a cache that records what was downloaded."""

from __future__ import annotations

import json
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from tokenizers import Tokenizer

HUB = "https://huggingface.co"
DEFAULT_CACHE = Path(".cache/tokenizers")
MANIFEST = "manifest.json"

#: The exact Granite revision served in Polaris run 7795459.
GRANITE_42_REVISION = "a7042144125ce5ae64f89610e8289647fc000b9a"


@dataclass(frozen=True)
class TokenizerSource:
    """One model's tokenizer on the Hugging Face Hub."""

    name: str
    repo: str
    revision: str = "main"

    def url(self, filename: str) -> str:
        """The download URL of ``filename`` at this source's revision."""
        return f"{HUB}/{self.repo}/resolve/{self.revision}/{filename}"


#: Ungated repositories; mirrors stand in where the original repository is gated.
CATALOG: tuple[TokenizerSource, ...] = (
    TokenizerSource("granite-4.2", "ibm-granite/granite-4.2-8b", GRANITE_42_REVISION),
    TokenizerSource(
        "granite-4.1", "ibm-granite/granite-4.1-8b", "1504002f650e656a0a3789d99574df12e3e94ed0"
    ),
    TokenizerSource("phi-4", "microsoft/phi-4", "2db69c1c3e91a05d2c64a3185acfbaf36f744e25"),
    TokenizerSource(
        "llama-3.1", "unsloth/Llama-3.1-8B-Instruct", "4699cc75b550f9c6f3173fb80f4703b62d946aa5"
    ),
    TokenizerSource(
        "llama-4",
        "unsloth/Llama-4-Scout-17B-16E-Instruct",
        "afd8e498c87bda51c7ea8ec68ea2f7c066e6340b",
    ),
    TokenizerSource(
        "olmo-3", "allenai/Olmo-3-7B-Instruct", "6e5971d9eba42665f5bd5a0fcf047f299ce1dccc"
    ),
    TokenizerSource("qwen3", "Qwen/Qwen3-8B", "b968826d9c46dd6066d109eabc6255188de91218"),
    TokenizerSource("qwen3.5", "Qwen/Qwen3.5-9B", "c202236235762e1c871ad0ccb60c8ee5ba337b9a"),
    TokenizerSource("gemma-4", "google/gemma-4-12b-it", "43c9d014b231474fa7212dbb48a762566c2b255d"),
    TokenizerSource("gpt-oss", "openai/gpt-oss-20b", "6cee5e81ee83917806bbde320786a8fb61efebee"),
    TokenizerSource(
        "deepseek-v3", "deepseek-ai/DeepSeek-V3", "e815299b0bcbac849fa540c768ef21845365c9eb"
    ),
    TokenizerSource(
        "mistral",
        "mistralai/Ministral-8B-Instruct-2410",
        "2f494a194c5b980dfb9772cb92d26cbb671fce5a",
    ),
    TokenizerSource("lfm2.5", "LiquidAI/LFM2.5-8B-A1B", "dd83f5cb02aa2938b66bba9a9998d38d0517c1f3"),
)


def source(name: str) -> TokenizerSource:
    """The catalog entry called ``name``."""
    for entry in CATALOG:
        if entry.name == name:
            return entry
    known = ", ".join(entry.name for entry in CATALOG)
    raise KeyError(f"Unknown tokenizer {name!r}; choose from {known}")


def _read_manifest(cache: Path) -> dict[str, Any]:
    path = cache / MANIFEST
    if not path.is_file():
        return {}
    data: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    return data


def resolve_commit(entry: TokenizerSource, *, timeout: float = 60) -> str:
    """The full commit hash the Hub resolves ``entry.revision`` to."""
    url = f"{HUB}/api/models/{entry.repo}/revision/{entry.revision}"
    with urllib.request.urlopen(url, timeout=timeout) as response:
        info: dict[str, Any] = json.loads(response.read())
    commit = str(info.get("sha") or "")
    if len(commit) != 40:
        raise ValueError(f"The Hub returned no commit for {entry.repo}@{entry.revision}")
    return commit


def fetch(entry: TokenizerSource, cache: Path = DEFAULT_CACHE, *, timeout: float = 120) -> Path:
    """Download ``tokenizer.json`` once, at a resolved commit, and record that commit."""
    target = cache / entry.name / "tokenizer.json"
    manifest = _read_manifest(cache)
    recorded = manifest.get(entry.name)
    if (
        target.is_file()
        and recorded
        and recorded.get("repo") == entry.repo
        and recorded.get("requested_revision") == entry.revision
    ):
        return target
    target.parent.mkdir(parents=True, exist_ok=True)
    commit = resolve_commit(entry, timeout=timeout)
    pinned = TokenizerSource(entry.name, entry.repo, commit)
    with urllib.request.urlopen(pinned.url("tokenizer.json"), timeout=timeout) as response:
        body: bytes = response.read()
    partial = target.with_suffix(".part")
    partial.write_bytes(body)
    partial.replace(target)
    manifest[entry.name] = {
        "repo": entry.repo,
        "requested_revision": entry.revision,
        "resolved_commit": commit,
        "bytes": len(body),
    }
    (cache / MANIFEST).write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return target


def provenance(cache: Path = DEFAULT_CACHE) -> dict[str, Any]:
    """What each cached tokenizer was downloaded from, for result files."""
    return _read_manifest(cache)


def load(name: str, cache: Path = DEFAULT_CACHE) -> Tokenizer:
    """The cached tokenizer called ``name``, downloading it if needed."""
    return Tokenizer.from_file(str(fetch(source(name), cache)))


def load_json(name: str, cache: Path = DEFAULT_CACHE) -> dict[str, Any]:
    """The raw ``tokenizer.json`` document, for inspecting its configuration."""
    data: dict[str, Any] = json.loads(fetch(source(name), cache).read_text(encoding="utf-8"))
    return data
