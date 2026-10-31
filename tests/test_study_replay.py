"""Check native multi-session timing and the two recorded Wordle imports."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest
from prepare_spotter_replay import timestamp_ms
from prepare_study_replay import nested_sessions, prepare_study_replay, timed_session

ROOT = Path(__file__).resolve().parents[1]


def test_nested_sessions_keeps_grandchildren_and_replacements() -> None:
    """No session disappears merely because it was cancelled or delegated again."""
    record = {
        "session": {"id": "root"},
        "children": [
            {
                "session": {"id": "branch"},
                "children": [{"session": {"id": "cancelled"}}, {"session": {"id": "replacement"}}],
            }
        ],
    }
    assert [r["session"]["id"] for r in nested_sessions(record)] == [
        "root",
        "branch",
        "cancelled",
        "replacement",
    ]


def test_native_order_and_token_checkpoints_do_not_use_persistence_time() -> None:
    """Initial instructions precede work; streamed prose uses exact captured deltas."""
    base = "2026-10-27T00:00:00+00:00"
    record: dict[str, Any] = {
        "session": {"id": "s"},
        "semantic_events": [
            {"event_type": "turn.started", "turn_id": "t", "occurred_at": base, "payload": {}},
            {
                "event_type": "lm.token.delta",
                "turn_id": "t",
                "occurred_at": "2026-10-27T00:00:01+00:00",
                "detail_level": "semantic",
                "payload": {"field": "next_thought", "delta": "A "},
            },
            {
                "event_type": "lm.token.delta",
                "turn_id": "t",
                "occurred_at": "2026-10-27T00:00:02+00:00",
                "detail_level": "semantic",
                "payload": {"field": "next_thought", "delta": "word."},
            },
            {
                "event_type": "turn.completed",
                "turn_id": "t",
                "occurred_at": "2026-10-27T00:00:10+00:00",
                "payload": {"message_id": "m"},
            },
        ],
    }
    view: dict[str, Any] = {
        "messages": [
            {
                "id": "m",
                "role": "assistant",
                "created_at": "2026-10-27T00:00:10+00:00",
                "blocks": [
                    {"id": "i", "type": "injection", "text": "Assignment"},
                    {"id": "b", "type": "text", "text": "A word."},
                    {"id": "tool", "type": "tool", "tool_id": "c"},
                ],
            }
        ],
        "tools": [
            {
                "id": "c",
                "started_at": "2026-10-27T00:00:03+00:00",
                "completed_at": "2026-10-27T00:00:09+00:00",
            }
        ],
    }
    projected = timed_session(record, view, timestamp_ms(base))
    assert projected["blocks"][0]["start"] == 0
    assert projected["blocks"][1]["checkpoints"] == [[1000, 2], [2000, 7]]
    assert projected["blocks"][2]["start"] == 3000
    assert projected["blocks"][2]["end"] == 9000
    assert view["messages"][0]["blocks"][1]["text"] == "A word."


@pytest.mark.parametrize(
    ("name", "sessions", "entries", "updates"),
    [("Wordle-study-session.html", 20, 76, 281), ("Wordle-study-views-session.html", 7, 50, 118)],
)
def test_recorded_study_import(name: str, sessions: int, entries: int, updates: int) -> None:
    """Exercise the importer against genuine archives and every cited gameplay call."""
    replay = prepare_study_replay(ROOT / "studies" / name)
    assert replay["coverage"]["sessions"] == sessions
    assert replay["coverage"]["scienceEvents"] == entries
    assert len(replay["boards"]) == updates
    assert len({event["id"] for event in replay["science"]}) == entries
    by_id = {s["session"]["id"]: s for s in replay["sessions"]}
    for update in replay["boards"]:
        session = by_id[update["sessionId"]]
        tool = next(t for t in session["view"]["tools"] if t["id"] == update["callId"])
        assert update["at"] == timestamp_ms(tool["completed_at"]) - timestamp_ms(replay["origin"])
    assert all(event["record"]["type"] != "status" for event in replay["science"][:1])
    assert replay["flows"][0]["view"]["added"] == 0
