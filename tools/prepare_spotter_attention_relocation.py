"""Rebind recorded prompt attention to reconstructed tool views without inventing mass."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import struct
from dataclasses import dataclass
from pathlib import Path
from typing import Any, BinaryIO, cast

from tokenizers import Tokenizer

JsonObject = dict[str, Any]


@dataclass(frozen=True)
class Region:
    """One exact canonical span displayed as a reconstructed request or result."""

    tool_id: str
    step: int
    lookup: str
    field: str
    message_id: str
    part_id: str
    start: int
    end: int
    text: str


class CaptureReader:
    """Read bounded rows from a verified little-endian SafeTensors capture."""

    def __init__(self, path: Path, descriptor: JsonObject) -> None:
        self.path = path
        if path.stat().st_size != descriptor["bytes"]:
            raise ValueError("Capture byte size does not match its descriptor")
        with path.open("rb") as stream:
            if hashlib.file_digest(stream, "sha256").hexdigest() != descriptor["sha256"]:
                raise ValueError("Capture SHA256 does not match its descriptor")
            stream.seek(0)
            size = struct.unpack("<Q", stream.read(8))[0]
            if not 0 < size <= min(path.stat().st_size - 8, 1024 * 1024):
                raise ValueError("Invalid SafeTensors header size")
            self.header: JsonObject = json.loads(stream.read(size))
        self.base = 8 + size

    def _read(self, stream: BinaryIO, name: str, dtype: str, row: int | None) -> bytes:
        tensor = self.header[name]
        if tensor["dtype"] != dtype:
            raise ValueError(f"Unexpected tensor dtype for {name}")
        shape: list[int] = tensor["shape"]
        start, end = tensor["data_offsets"]
        if len(shape) not in (1, 2) or any(n <= 0 for n in shape):
            raise ValueError(f"Invalid tensor shape for {name}")
        if (
            end - start != math.prod(shape) * 4
            or not 0 <= start < end <= self.path.stat().st_size - self.base
        ):
            raise ValueError(f"Invalid tensor bounds for {name}")
        if len(shape) == 1:
            if row is not None:
                raise ValueError("A vector has no decode-step row")
            count = shape[0]
        else:
            if row is None or not 0 <= row < shape[0]:
                raise ValueError("Selected decode step is outside the capture")
            count = shape[1]
            start += row * count * 4
        stream.seek(self.base + start)
        data = stream.read(count * 4)
        if len(data) != count * 4:
            raise ValueError("Truncated capture tensor")
        return data

    def input_ids(self) -> list[int]:
        """Return the recorded prompt IDs without loading attention matrices."""
        with self.path.open("rb") as stream:
            data = self._read(stream, "prompt_token_ids", "I32", None)
        return list(cast(tuple[int, ...], struct.unpack(f"<{len(data) // 4}i", data)))

    def mean_mass(self, steps: list[int]) -> dict[int, float]:
        """Reproduce the service's uniform mean over unique captured selected steps."""
        if not steps or len(set(steps)) != len(steps):
            raise ValueError("Selected steps must be nonempty and unique")
        mass: dict[int, float] = {}
        with self.path.open("rb") as stream:
            for step in steps:
                positions = self._read(stream, "topk_pos", "I32", step)
                values = self._read(stream, "val_all_avg", "F32", step)
                if len(positions) != len(values):
                    raise ValueError("Position and value shapes differ")
                indices = cast(
                    tuple[int, ...], struct.unpack(f"<{len(positions) // 4}i", positions)
                )
                weights = cast(tuple[float, ...], struct.unpack(f"<{len(values) // 4}f", values))
                seen: set[int] = set()
                for index, weight in zip(indices, weights, strict=True):
                    if index < 0:
                        continue
                    if index in seen or not math.isfinite(weight) or weight < 0:
                        raise ValueError("Duplicate position or invalid captured mass")
                    seen.add(index)
                    mass[index] = mass.get(index, 0.0) + weight / len(steps)
        return mass


def source_offsets(tokenizer: Tokenizer, ids: list[int], text: str) -> list[tuple[int, int]]:
    """Align only exact token IDs and qualified exterior chat-template trimming."""
    decoded = tokenizer.decode(ids, skip_special_tokens=False)
    if decoded != text.strip():
        raise ValueError("Captured section does not equal the trimmed canonical source")
    encoding = tokenizer.encode(decoded, add_special_tokens=False)
    if encoding.ids != ids:
        raise ValueError("Tokenizer does not reproduce the captured section IDs")
    leading = len(text) - len(text.lstrip())
    return [(leading + lo, leading + hi) for lo, hi in encoding.offsets]


def rebase_runs(runs: list[list[float]], region: Region) -> list[list[float]]:
    """Move wholly owned saved runs without re-ranking, scaling or splitting weights."""
    return [
        [lo - region.start, hi - region.start, value]
        for lo, hi, value in runs
        if region.start <= lo < hi <= region.end
    ]


def regions_from_projection(projection: JsonObject, pair: JsonObject) -> list[Region]:
    """Validate every displayed request/result against its canonical source text."""
    primary = next(session for session in pair["sessions"] if session["role"] == "primary")
    parts = {
        (message["id"], block["id"]): block.get("text", "")
        for message in primary["view"]["messages"]
        for block in message["blocks"]
    }
    regions: list[Region] = []
    for step in projection["steps"]:
        for tool in step["tools"]:
            for field in ("request", "result"):
                span = tool[field + "Source"]
                text = parts[(span["messageId"], span["partId"])]
                if (
                    not 0 <= span["start"] < span["end"] <= len(text)
                    or text[span["start"] : span["end"]] != tool[field]
                ):
                    raise ValueError("Reconstructed view does not match its exact source span")
                regions.append(
                    Region(
                        tool["id"],
                        step["number"],
                        tool["lookup"],
                        field,
                        span["messageId"],
                        span["partId"],
                        span["start"],
                        span["end"],
                        tool[field],
                    )
                )
    for index, region in enumerate(regions):
        for other in regions[index + 1 :]:
            if (region.message_id, region.part_id) == (other.message_id, other.part_id) and max(
                region.start, other.start
            ) < min(region.end, other.end):
                raise ValueError("A source span cannot belong to two displayed tool fields")
    return regions


def relocate_attention(
    projection: JsonObject, pair: JsonObject, attention: JsonObject, bundle: Path
) -> JsonObject:
    """Create display aliases and conserved source shares from the original captured tensors."""
    source_hash = pair["source"]["sha256"]
    if projection["source"]["sha256"] != source_hash or attention["sourceSha256"] != source_hash:
        raise ValueError("Projection, transcript and attention belong to different sources")
    regions = regions_from_projection(projection, pair)
    primary = next(session for session in pair["sessions"] if session["role"] == "primary")
    parts = {
        (message["id"], block["id"]): block.get("text", "")
        for message in primary["view"]["messages"]
        for block in message["blocks"]
    }
    tasks = json.loads((bundle / "flowcept/decode_attention.json").read_text(encoding="utf-8"))
    by_request = {task["used"]["request_id"]: task for task in tasks}
    tokenizer = Tokenizer.from_file(str(bundle / "tokenizer/tokenizer.json"))
    readers: dict[str, CaptureReader] = {}
    mass_cache: dict[tuple[str, tuple[int, ...]], dict[int, float]] = {}
    output: list[JsonObject] = []
    for record in attention["records"]:
        response = record["response"]
        if response["mass_semantics"] != "uniform mean over unique selected captured steps":
            raise ValueError("Unsupported recorded mass semantics")
        request_id: str = response["request_id"]
        task = by_request[request_id]
        descriptor = task["attention_stats"]
        if descriptor["sha256"] != response["capture_sha256"]:
            raise ValueError("Attention response references another capture")
        if request_id not in readers:
            root = (bundle / "captures").resolve()
            path = (root / task["workflow_id"] / descriptor["uri"].rsplit("/", 1)[1]).resolve()
            if not path.is_relative_to(root):
                raise ValueError("Capture path escapes the bundle")
            readers[request_id] = CaptureReader(path, descriptor)
        reader = readers[request_id]
        steps: list[int] = response["selected_steps"]
        cache_key = (request_id, tuple(steps))
        if cache_key not in mass_cache:
            mass_cache[cache_key] = reader.mean_mass(steps)
        mass = mass_cache[cache_key]
        ids = reader.input_ids()
        blocks: list[JsonObject] = []
        verified_sections: list[JsonObject] = []
        for original in response["blocks"]:
            applicable = [
                region
                for region in regions
                if (region.message_id, region.part_id)
                == (original["message_id"], original["part_id"])
            ]
            if not applicable:
                continue
            section = response["sections"][original["section"]]
            lo, hi = section["lo"], section["hi"]
            if not 0 <= lo < hi <= len(ids):
                raise ValueError("Source section lies outside prompt IDs")
            source = parts[(original["message_id"], original["part_id"])]
            if hashlib.sha256(source.encode()).hexdigest() != original["content_revision"]:
                raise ValueError("Source content revision mismatch")
            offsets = source_offsets(tokenizer, ids[lo:hi], source)
            measured = sum(mass.get(index, 0.0) for index in range(lo, hi))
            if not math.isclose(measured, original["share"], abs_tol=1e-8, rel_tol=1e-6):
                raise ValueError("Calculated section mass differs from the recorded response")
            verified_sections.append(
                {
                    "partId": original["part_id"],
                    "recorded": original["share"],
                    "calculated": measured,
                    "tokenIdsExact": True,
                }
            )
            for region in applicable:
                owned = [
                    lo + index
                    for index, (start, end) in enumerate(offsets)
                    if region.start <= start < end <= region.end
                ]
                share = sum(mass.get(index, 0.0) for index in owned)
                blocks.append(
                    {
                        "toolId": region.tool_id,
                        "step": region.step,
                        "lookup": region.lookup,
                        "field": region.field,
                        "source": {
                            "messageId": region.message_id,
                            "partId": region.part_id,
                            "contentRevision": original["content_revision"],
                            "start": region.start,
                            "end": region.end,
                        },
                        "textSha256": hashlib.sha256(region.text.encode()).hexdigest(),
                        "share": share,
                        "runs": rebase_runs(original["runs"], region),
                        "displayRuns": rebase_runs(original["display_runs"], region),
                        "tokenStarts": [
                            start - region.start
                            for start, end in offsets
                            if region.start <= start < end <= region.end
                        ],
                    }
                )
        request_share = sum(block["share"] for block in blocks if block["field"] == "request")
        result_share = sum(block["share"] for block in blocks if block["field"] == "result")
        sources = {item["domain"]: float(item["share"]) for item in response["sources"]}
        original_sources = dict(sources)
        remaining = sources.get("user", 0.0) - request_share - result_share
        if remaining < -1e-8:
            raise ValueError("Relocated mass exceeds the original user-source mass")
        sources["user"] = max(0.0, remaining)
        sources["reconstructed_tool_calls"] = request_share
        sources["reconstructed_tool_results"] = result_share
        if not math.isclose(sum(sources.values()), sum(original_sources.values()), abs_tol=1e-8):
            raise ValueError("Attention mass was not conserved")
        output.append(
            {
                "sessionId": record["sessionId"],
                "messageId": record["messageId"],
                "partId": record["partId"],
                "start": record["start"],
                "end": record["end"],
                "text": record["text"],
                "captureSha256": response["capture_sha256"],
                "requestId": request_id,
                "selectedSteps": steps,
                "profile": response["profile"],
                "residual": response["residual"],
                "unmappedContent": response["unmapped_content"],
                "originalSources": original_sources,
                "displaySources": sources,
                "displayBlocks": blocks,
                "originalTextBlocks": [
                    {
                        "messageId": original["message_id"],
                        "partId": original["part_id"],
                        "contentRevision": original["content_revision"],
                        "displayRuns": original["display_runs"],
                    }
                    for original in response["blocks"]
                    if original["kind"] in ("user_text", "assistant_text")
                    and (original["message_id"], original["part_id"]) in parts
                    and hashlib.sha256(
                        parts[(original["message_id"], original["part_id"])].encode()
                    ).hexdigest()
                    == original["content_revision"]
                ],
                "checks": {
                    "sections": verified_sections,
                    "massConserved": True,
                    "displayScalingChanged": False,
                    "boundaryMassPolicy": "Retain tokens not wholly owned by one tool field in the original user bucket",
                },
            }
        )
    return {
        "schema": "clio.spotter-attention-relocation.v1",
        "sourceSha256": source_hash,
        "origin": "Display aliases for supplied lookup packets; not new tool-role attention measurements",
        "records": output,
    }


def main() -> None:
    """Generate a portable measured sidecar; leave canonical transcripts and tensors unchanged."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bundle", type=Path, required=True)
    parser.add_argument(
        "--projection", type=Path, default=Path("videos/spotter-opal/v3/source-projection.json")
    )
    parser.add_argument(
        "--pair", type=Path, default=Path("motion/native/public/opal-chainB-7795459.native.json")
    )
    parser.add_argument(
        "--attention", type=Path, default=Path("motion/native/public/chainB-7795459-attention.json")
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("motion/native/public/spotter-reconstructed-attention.json"),
    )
    args = parser.parse_args()
    data = relocate_attention(
        json.loads(args.projection.read_text(encoding="utf-8")),
        json.loads(args.pair.read_text(encoding="utf-8")),
        json.loads(args.attention.read_text(encoding="utf-8")),
        args.bundle,
    )
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "records": len(data["records"]),
                "massConserved": all(
                    record["checks"]["massConserved"] for record in data["records"]
                ),
            }
        )
    )


if __name__ == "__main__":
    main()
