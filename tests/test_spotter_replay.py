"""Exercise native causal import, compressed sources and exact token channels."""

from __future__ import annotations

import base64
import gzip
import json
from pathlib import Path
from typing import Any

import pytest
from prepare_spotter_replay import prepare_spotter_replay, stream_checkpoints, timestamp_ms


def pair_payload() -> dict[str, Any]:
    """Create a small source fixture with delayed consumption and mirrored tokens."""

    def event(kind: str, second: int, payload: dict[str, Any], **extra: Any) -> dict[str, Any]:
        return {
            "event_type": kind,
            "occurred_at": f"2026-10-28T00:00:{second:02d}+00:00",
            "payload": payload,
            "turn_id": "turn",
            **extra,
        }

    main_events = [
        event("turn.started", 1, {}),
        event(
            "lm.token.delta",
            2,
            {"field": "provider_thinking:model:provider_field", "delta": "think"},
        ),
        event(
            "lm.token.delta", 3, {"field": "provider_thinking:model:provider_field", "delta": "ing"}
        ),
        event(
            "lm.token.delta",
            4,
            {"field": "next_thought.reasoning", "delta": "ignored"},
            detail_level="semantic",
        ),
        event(
            "lm.token.delta", 4, {"field": "next_thought", "delta": "A"}, detail_level="semantic"
        ),
        event("lm.token.delta", 4, {"field": "next_thought", "delta": "A"}, detail_level="off"),
        event(
            "lm.token.delta", 5, {"field": "next_thought", "delta": "A"}, detail_level="semantic"
        ),
        event("lm.token.delta", 5, {"field": "next_thought", "delta": "A"}, detail_level="off"),
        event("turn.completed", 6, {"message_id": "answer"}),
    ]
    commit = event(
        "session.input.committed",
        9,
        {
            "record": {
                "committed_at": "2026-10-28T00:00:09+00:00",
                "notification_ids": ["spotter:wake"],
            }
        },
    )
    child_events = [
        event(
            "session.mail.accepted", 7, {"observation_id": "spotter:wake"}, event_id="mail-event"
        ),
        event("arc.op", 9, {"segments_written": [{"content": commit}]}),
        event("turn.started", 8, {}),
        event(
            "lm.token.delta",
            10,
            {"field": "next_thought", "delta": "Reviewed"},
            detail_level="semantic",
        ),
        event("turn.completed", 11, {"message_id": "review"}),
    ]
    primary = {
        "session": {"id": "main", "title": "OPAL"},
        "messages": [
            {
                "id": "question",
                "role": "user",
                "created_at": "2026-10-28T00:00:00+00:00",
            }
        ],
        "semantic_events": main_events,
    }
    child = {
        "session": {"id": "reviewer", "parent_session_id": "main", "title": "SPOTTER AI"},
        "semantic_events": child_events,
    }

    def message(identity: str, sid: str, role: str, blocks: list[dict[str, Any]]) -> dict[str, Any]:
        return {
            "id": identity,
            "session_id": sid,
            "role": role,
            "created_at": "2026-10-28T00:00:00+00:00",
            "blocks": blocks,
        }

    return {
        "transcript": {**primary, "export_schema": "clio.session-export.v2", "children": [child]},
        "transcript_views": {
            "main": {
                "messages": [
                    message(
                        "question",
                        "main",
                        "user",
                        [{"id": "q", "type": "text", "text": "Question"}],
                    ),
                    message(
                        "answer",
                        "main",
                        "assistant",
                        [
                            {"id": "thinking", "type": "reasoning", "text": "thinking"},
                            {"id": "a", "type": "text", "text": "AA"},
                        ],
                    ),
                ],
                "tools": [],
            },
            "reviewer": {
                "messages": [
                    message(
                        "review",
                        "reviewer",
                        "assistant",
                        [
                            {
                                "id": "wake",
                                "type": "injection",
                                "text": "[notification spotter:wake] Its answer is message answer:",
                            },
                            {"id": "r", "type": "text", "text": "Reviewed"},
                        ],
                    )
                ],
                "tools": [],
            },
        },
        "snapshot": {},
    }


@pytest.mark.parametrize("compressed", [False, True])
def test_pair_preserves_exact_deltas_and_distinguishes_mail_from_consumption(
    tmp_path: Path, compressed: bool
) -> None:
    """Repeated real tokens survive while their expert mirror is excluded."""
    source = tmp_path / ("source.html.gz" if compressed else "source.json")
    raw = json.dumps(pair_payload()).encode()
    html = (
        b'<script>window.CLIO_EXPORT_DATA="' + base64.b64encode(gzip.compress(raw)) + b'";</script>'
    )
    source.write_bytes(gzip.compress(html) if compressed else raw)
    pair = prepare_spotter_replay(source)
    assert pair["coverage"]["issues"] == []
    assert pair["sessions"][0]["blocks"][-1]["checkpoints"] == [[4000, 1], [5000, 2]]
    assert pair["wakes"][0]["at"] == 7000
    assert pair["wakes"][0]["consumedAt"] == 9000
    assert pair["sessions"][1]["blocks"][0]["start"] == 9000
    assert pair["sessions"][1]["blocks"][-1]["dependsOn"] == ["answer"]
    assert pair["attention"]["records"] == []


@pytest.mark.parametrize("failure", ["parent", "wake", "commit", "ambiguous"])
def test_invalid_causal_pair_is_rejected(tmp_path: Path, failure: str) -> None:
    """Wrong parent, early wake, missing consumption and ambiguous children fail."""
    payload = pair_payload()
    child = payload["transcript"]["children"][0]
    if failure == "parent":
        child["session"]["parent_session_id"] = "other"
    elif failure == "wake":
        child["semantic_events"][0]["occurred_at"] = "2026-10-28T00:00:05+00:00"
    elif failure == "commit":
        child["semantic_events"].pop(1)
    else:
        payload["transcript"]["children"].append(child)
    source = tmp_path / "bad.json"
    source.write_text(json.dumps(payload), encoding="utf-8")
    with pytest.raises(ValueError):
        prepare_spotter_replay(source)


def test_exact_unicode_offsets_and_timezone_validation() -> None:
    """Checkpoint lengths count code points and do not synthesize missing text."""
    assert stream_checkpoints("😀AA", [(1, "😀"), (2, "A"), (3, "A")]) == (
        [[1, 1], [2, 2], [3, 3]],
        3,
    )
    assert stream_checkpoints("absent", [(1, "text")]) == ([], 0)
    assert timestamp_ms("2026-10-28T00:00:00Z") == timestamp_ms("2026-10-27T19:00:00-05:00")
    with pytest.raises(ValueError, match="timezone"):
        timestamp_ms("2026-10-28T00:00:00")


def test_alert_delivery_and_final_quarantine_keep_their_recorded_times(tmp_path: Path) -> None:
    """A final snapshot never moves an asynchronous SPOTTER finding to turn start."""
    payload = pair_payload()
    payload["transcript_views"]["main"]["messages"][1]["blocks"].append(
        {"type": "action_card", "id": "warning", "title": "Format"}
    )
    payload["transcript_views"]["reviewer"]["tools"].append(
        {
            "id": "alert-tool",
            "name": "raise_alert_card",
            "completed_at": "2026-10-28T00:00:12Z",
            "output": {"emitted": True, "part_id": "warning"},
        }
    )
    payload["transcript"]["session"]["metadata"] = {
        "spotter_quarantine": {
            "status": "active",
            "raised_at": "2026-10-28T00:00:13Z",
            "title": "Evidence override",
        }
    }
    path = tmp_path / "source.json"
    path.write_text(json.dumps(payload), encoding="utf8")
    pair = prepare_spotter_replay(path)
    assert pair["sessions"][0]["blocks"][-1]["start"] == 12000
    assert pair["sessions"][0]["quarantine"]["at"] == 13000
    payload["transcript_views"]["reviewer"]["tools"] = []
    path.write_text(json.dumps(payload), encoding="utf8")
    with pytest.raises(ValueError, match="no captured delivery"):
        prepare_spotter_replay(path)
