"""Prepare a source-timed, multi-session study replay from a native CLIO export."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from collections.abc import Iterator
from pathlib import Path
from typing import Any, cast

from index_exports import sha256_file
from prepare_native_scene import read_value
from prepare_spotter_replay import stream_checkpoints, timestamp_ms


def nested_sessions(record: dict[str, Any]) -> Iterator[dict[str, Any]]:
    """Walk every exported descendant, including grandchildren and replacements."""
    yield record
    for child in record.get("children", []):
        yield from nested_sessions(child)


def timed_session(record: dict[str, Any], view: dict[str, Any], origin: float) -> dict[str, Any]:
    """Join native blocks to their captured deltas and tool lifecycle timestamps."""
    events = record["semantic_events"]
    completions = {
        e["payload"]["message_id"]: e
        for e in events
        if e["event_type"] == "turn.completed" and e["payload"].get("message_id")
    }
    starts = {e["turn_id"]: e for e in events if e["event_type"] == "turn.started"}
    streams: dict[str, dict[str, list[tuple[float, str]]]] = {}
    for event in events:
        if event["event_type"] != "lm.token.delta":
            continue
        payload = event["payload"]
        field, delta = payload.get("field", ""), payload.get("delta")
        key = "reasoning" if field.startswith("provider_thinking:") else "text"
        if not isinstance(delta, str) or (
            key == "text" and (field != "next_thought" or event.get("detail_level") != "semantic")
        ):
            continue
        stream = streams.setdefault(event["turn_id"], {"text": [], "reasoning": []})
        stream[key].append((timestamp_ms(event["occurred_at"]) - origin, delta))
    tools = {t["id"]: t for t in view["tools"]}
    blocks: list[dict[str, Any]] = []
    turns: list[dict[str, Any]] = []
    coverage: Counter[str] = Counter()
    for message in view["messages"]:
        completion = completions.get(message["id"])
        turn_id = completion["turn_id"] if completion else message["id"]
        end = (
            timestamp_ms(completion["occurred_at"] if completion else message["created_at"])
            - origin
        )
        start = timestamp_ms(starts[turn_id]["occurred_at"]) - origin if turn_id in starts else end
        if completion:
            turns.append({"id": turn_id, "messageId": message["id"], "start": start, "end": end})
        stream = streams.get(turn_id, {"text": [], "reasoning": []})
        cursors = {"text": 0, "reasoning": 0}
        previous = start
        for block in message["blocks"]:
            at, until, checkpoints, precision = previous, previous, [], "recorded-event"
            if block["type"] == "tool":
                tool = tools[block["tool_id"]]
                at = timestamp_ms(tool["started_at"]) - origin
                until = timestamp_ms(tool.get("completed_at") or tool["started_at"]) - origin
            elif block["type"] == "injection" and block.get("text"):
                # Placement comes from the native ordered block list, not the
                # assistant message's final persistence time. Notifications follow
                # the preceding captured tool result; initial instructions precede work.
                at = until = previous
                checkpoints = [[at, len(block["text"])]]
                precision = "native-block-order"
            elif block.get("text"):
                text = block["text"]
                if message["role"] == "user":
                    at = until = end
                    checkpoints = [[at, len(text)]]
                    precision = "recorded-input"
                else:
                    key = "reasoning" if block["type"] == "reasoning" else "text"
                    checkpoints, cursors[key] = stream_checkpoints(text, stream[key], cursors[key])
                    if checkpoints:
                        at, until = float(checkpoints[0][0]), float(checkpoints[-1][0])
                        precision = "recorded-token-deltas"
                    else:
                        # A persisted-only summary is delivered at completion. Never invent tokens.
                        at = until = end
                        checkpoints = [[at, len(text)]]
                        precision = "persisted-only"
            blocks.append(
                {
                    "messageId": message["id"],
                    "blockId": block["id"],
                    "start": at,
                    "end": until,
                    "checkpoints": checkpoints,
                    "dependsOn": [],
                    "precision": precision,
                }
            )
            coverage[precision] += 1
            previous = max(previous, until)
    return {
        "role": "primary",
        "session": record["session"],
        "view": view,
        "blocks": blocks,
        "turns": turns,
        "coverage": dict(coverage),
    }


def prepare_study_replay(source: Path) -> dict[str, Any]:
    """Preserve all study branches, accepted events, exact boards and native views."""
    transcript = read_value(source, "transcript")
    if transcript.get("export_schema") != "clio.session-export.v2":
        raise ValueError("Expected a clio.session-export.v2 archive")
    records = list(nested_sessions(transcript))
    first = next(m for m in transcript["messages"] if m["role"] == "user")
    origin = timestamp_ms(first["created_at"])
    views = read_value(source, "transcript_views")
    snapshot = read_value(source, "snapshot")
    sessions = [timed_session(r, views[r["session"]["id"]], origin) for r in records]
    science: dict[str, dict[str, Any]] = {}
    tasks: dict[str, dict[str, Any]] = {}
    boards: list[dict[str, Any]] = []
    for record in records:
        for event in record["semantic_events"]:
            kind = event["event_type"]
            if kind not in {"science.entry", "task.observed"}:
                continue
            compact = {
                "id": event["event_id"],
                "at": timestamp_ms(event["occurred_at"]) - origin,
                "sessionId": event["session_id"],
                "record": event["payload"]["record"],
            }
            target = science if kind == "science.entry" else tasks
            target[event["event_id"]] = compact
        native_tools = {t["id"]: t for t in views[record["session"]["id"]]["tools"]}
        for tool in record.get("tool_records", []):
            raw_output = tool.get("output")
            if not isinstance(raw_output, dict):
                continue
            output = cast(dict[str, Any], raw_output)
            if not output.get("uiEvent"):
                continue
            event = output["uiEvent"]
            if event.get("component", {}).get("component") != "BoardWall" and not event.get("rows"):
                continue
            native = native_tools[tool["call_id"]]
            boards.append(
                {
                    "at": timestamp_ms(native["completed_at"]) - origin,
                    "sessionId": record["session"]["id"],
                    "callId": tool["call_id"],
                    "event": event,
                    "result": output.get("structuredContent"),
                }
            )
    saved_logs = [
        v["json"]
        for k, v in snapshot["responses"].items()
        if k.endswith("/science-log")
        and isinstance(v.get("json"), dict)
        and v["json"].get("in_study")
    ]
    if not saved_logs or not science:
        raise ValueError("No captured native study and canonical science entries")
    root_id = transcript["session"]["id"]
    study = next(log for log in saved_logs if log["session_id"] == root_id)
    # Different sessions capture their own branch; retain the union of authentic records.
    branches = {branch["session_id"]: branch for log in saved_logs for branch in log["branches"]}
    study["branches"] = list(branches.values())
    flows = [
        v["json"]
        for k, v in snapshot["responses"].items()
        if k.endswith("/flow") and isinstance(v.get("json"), dict)
    ]
    if not flows:
        raise ValueError("No saved workflow run")
    ordered_science = sorted(science.values(), key=lambda e: (e["at"], e["id"]))
    last = max(
        [b["end"] for s in sessions for b in s["blocks"]] + [e["at"] for e in ordered_science]
    )
    return {
        "schema": "clio.study-replay.v1",
        "source": {"archive": source.name, "sha256": sha256_file(source)},
        "origin": first["created_at"],
        "rootSessionId": root_id,
        "durationMs": last,
        "sessions": sessions,
        "snapshot": snapshot,
        "study": study,
        "flows": flows,
        "science": ordered_science,
        "tasks": sorted(tasks.values(), key=lambda e: e["at"]),
        "boards": sorted(boards, key=lambda e: e["at"]),
        "coverage": {
            "sessions": len(sessions),
            "scienceEvents": len(science),
            "boardUpdates": len(boards),
            "entryTypes": dict(Counter(e["record"]["type"] for e in ordered_science)),
        },
    }


def main() -> None:
    """Prepare one reusable read-only study, leaving its source archive unchanged."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    if args.out.resolve() == args.source.resolve() or args.out.suffix.lower() != ".json":
        parser.error("Choose a distinct JSON output")
    replay = prepare_study_replay(args.source)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        json.dumps(replay, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8"
    )
    print(json.dumps(replay["coverage"]))


if __name__ == "__main__":
    main()
