"""Verify measured mass relocation independently from displayed heat and character lengths."""

from __future__ import annotations

import hashlib
import json
import struct
from pathlib import Path
from typing import Any

import pytest
from prepare_spotter_attention_relocation import (
    CaptureReader,
    Region,
    rebase_runs,
    relocate_attention,
    source_offsets,
)
from tokenizers import Tokenizer, decoders, models, pre_tokenizers, trainers


def write_capture(
    path: Path, ids: list[int], positions: list[list[int]], values: list[list[float]]
) -> dict[str, Any]:
    """Write a small real SafeTensors fixture with a verified descriptor."""
    header: dict[str, Any] = {}
    payload = bytearray()
    for name, dtype, shape, flat in [
        ("prompt_token_ids", "I32", [len(ids)], ids),
        (
            "topk_pos",
            "I32",
            [len(positions), len(positions[0])],
            [n for row in positions for n in row],
        ),
        ("val_all_avg", "F32", [len(values), len(values[0])], [n for row in values for n in row]),
    ]:
        start = len(payload)
        code = "i" if dtype == "I32" else "f"
        payload.extend(struct.pack(f"<{len(flat)}{code}", *flat))
        header[name] = {"dtype": dtype, "shape": shape, "data_offsets": [start, len(payload)]}
    encoded = json.dumps(header).encode()
    encoded += b" " * (-len(encoded) % 8)
    data = struct.pack("<Q", len(encoded)) + encoded + payload
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def test_capture_reader_reproduces_selected_step_mean_and_rejects_bad_identity(
    tmp_path: Path,
) -> None:
    path = tmp_path / "capture.safetensors"
    descriptor = write_capture(
        path, [10, 11, 12, 13], [[0, 1, 2], [1, 2, 3]], [[0.1, 0.2, 0.3], [0.2, 0.3, 0.4]]
    )
    reader = CaptureReader(path, descriptor)
    assert reader.input_ids() == [10, 11, 12, 13]
    assert reader.mean_mass([0, 1]) == pytest.approx({0: 0.05, 1: 0.2, 2: 0.3, 3: 0.2})
    with pytest.raises(ValueError, match="unique"):
        reader.mean_mass([0, 0])
    with pytest.raises(ValueError, match="outside"):
        reader.mean_mass([2])
    with pytest.raises(ValueError, match="SHA256"):
        CaptureReader(path, {**descriptor, "sha256": "0" * 64})


def test_duplicate_positions_cannot_count_mass_twice(tmp_path: Path) -> None:
    path = tmp_path / "capture.safetensors"
    descriptor = write_capture(path, [10, 11], [[0, 0]], [[0.1, 0.2]])
    with pytest.raises(ValueError, match="Duplicate"):
        CaptureReader(path, descriptor).mean_mass([0])


def trained_tokenizer(text: str) -> Tokenizer:
    """Use an actual byte-level tokenizer, including Unicode round trips."""
    tokenizer = Tokenizer(models.BPE(unk_token="[UNK]"))
    tokenizer.pre_tokenizer = pre_tokenizers.ByteLevel(add_prefix_space=False)
    tokenizer.decoder = decoders.ByteLevel()
    tokenizer.train_from_iterator(
        [text] * 3, trainers.BpeTrainer(vocab_size=1000, min_frequency=1, special_tokens=["[UNK]"])
    )
    return tokenizer


def test_token_alignment_allows_only_exact_ids_and_exterior_trimming() -> None:
    text = "  café 🔬 result 73\n"
    tokenizer = trained_tokenizer(text.strip())
    encoded = tokenizer.encode(text.strip(), add_special_tokens=False)
    offsets = source_offsets(tokenizer, encoded.ids, text)
    assert offsets[0][0] >= 2
    assert offsets[-1][1] <= len(text.rstrip())
    with pytest.raises(ValueError, match="canonical"):
        source_offsets(tokenizer, encoded.ids, text.replace("result", "changed"))


def test_heat_runs_keep_original_scale_and_do_not_split_boundary_weights() -> None:
    region = Region("tool", 3, "db_lookup", "result", "message", "part", 10, 20, "0123456789")
    assert rebase_runs([[8, 11, 0.9], [12, 15, 0.3], [18, 22, 1.0]], region) == [[2, 5, 0.3]]


def relocation_fixture(bundle: Path) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    """Build a complete small source/capture join whose displayed heat is empty."""
    text = "Question\n>>> db_lookup(x=1)\nresult 73\nOUTPUT FORMAT\n"
    tokenizer = trained_tokenizer(text.strip())
    (bundle / "tokenizer").mkdir(parents=True)
    tokenizer.save(str(bundle / "tokenizer/tokenizer.json"))
    encoding = tokenizer.encode(text.strip(), add_special_tokens=False)
    request_start = text.index(">>>")
    result_start = text.index("result")
    result_end = text.index("\nOUTPUT")
    spike = next(
        index for index, (lo, hi) in enumerate(encoding.offsets) if lo <= text.index("73") < hi
    )
    values = [0.8 if index == spike else 0.0001 for index in range(len(encoding.ids))]
    path = bundle / "captures/workflow/capture.safetensors"
    descriptor = write_capture(path, encoding.ids, [list(range(len(encoding.ids)))], [values])
    source_share = sum(struct.unpack(f"<{len(values)}f", struct.pack(f"<{len(values)}f", *values)))
    descriptor["uri"] = "file:///original/capture.safetensors"
    (bundle / "flowcept").mkdir()
    (bundle / "flowcept/decode_attention.json").write_text(
        json.dumps(
            [
                {
                    "workflow_id": "workflow",
                    "used": {"request_id": "request"},
                    "attention_stats": descriptor,
                }
            ]
        ),
        encoding="utf-8",
    )
    source_hash = "a" * 64
    revision = hashlib.sha256(text.encode()).hexdigest()

    def span(start: int, end: int) -> dict[str, str | int]:
        return {"messageId": "message", "partId": "part", "start": start, "end": end}

    projection: dict[str, Any] = {
        "source": {"sha256": source_hash},
        "steps": [
            {
                "number": 1,
                "tools": [
                    {
                        "id": "reconstruction:tool",
                        "lookup": "db_lookup",
                        "request": text[request_start : result_start - 1],
                        "result": text[result_start:result_end],
                        "requestSource": span(request_start, result_start - 1),
                        "resultSource": span(result_start, result_end),
                    }
                ],
            }
        ],
    }
    pair: dict[str, Any] = {
        "source": {"sha256": source_hash},
        "sessions": [
            {
                "role": "primary",
                "view": {"messages": [{"id": "message", "blocks": [{"id": "part", "text": text}]}]},
            }
        ],
    }
    attention: dict[str, Any] = {
        "sourceSha256": source_hash,
        "records": [
            {
                "sessionId": "session",
                "messageId": "answer",
                "partId": "answer-part",
                "start": 0,
                "end": 2,
                "text": "73",
                "response": {
                    "mass_semantics": "uniform mean over unique selected captured steps",
                    "request_id": "request",
                    "capture_sha256": descriptor["sha256"],
                    "selected_steps": [0],
                    "sections": [{"lo": 0, "hi": len(encoding.ids)}],
                    "blocks": [
                        {
                            "message_id": "message",
                            "kind": "user_text",
                            "part_id": "part",
                            "section": 0,
                            "content_revision": revision,
                            "share": source_share,
                            "runs": [],
                            "display_runs": [],
                        }
                    ],
                    "sources": [{"domain": "user", "share": source_share}],
                    "profile": {"metric": "max"},
                    "residual": 1 - source_share,
                    "unmapped_content": [],
                },
            }
        ],
    }
    return projection, pair, attention


def test_real_capture_join_conserves_mass_without_using_display_runs_or_character_proportions(
    tmp_path: Path,
) -> None:
    projection, pair, attention = relocation_fixture(tmp_path)
    result = relocate_attention(projection, pair, attention, tmp_path)["records"][0]
    assert result["displaySources"]["reconstructed_tool_results"] > 0.79
    assert sum(result["displaySources"].values()) == pytest.approx(
        sum(result["originalSources"].values())
    )
    assert result["residual"] == attention["records"][0]["response"]["residual"]
    assert all(block["displayRuns"] == [] for block in result["displayBlocks"])
    assert all(section["tokenIdsExact"] for section in result["checks"]["sections"])
    assert result["originalTextBlocks"] == [
        {
            "messageId": "message",
            "partId": "part",
            "contentRevision": attention["records"][0]["response"]["blocks"][0]["content_revision"],
            "displayRuns": [],
        }
    ]


def test_mismatched_sources_and_overlapping_projection_are_rejected(tmp_path: Path) -> None:
    projection, pair, attention = relocation_fixture(tmp_path)
    with pytest.raises(ValueError, match="different sources"):
        relocate_attention(
            {**projection, "source": {"sha256": "b" * 64}}, pair, attention, tmp_path
        )
    projection["steps"][0]["tools"].append(dict(projection["steps"][0]["tools"][0]))
    with pytest.raises(ValueError, match="two displayed"):
        relocate_attention(projection, pair, attention, tmp_path)
