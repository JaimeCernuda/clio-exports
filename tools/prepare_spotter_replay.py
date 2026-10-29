"""Import source-timed main/reviewer conversations without inventing attention heat."""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any

from index_exports import sha256_file
from prepare_native_scene import read_value


def timestamp_ms(value: str) -> float:
    """Read a timezone-aware source timestamp as epoch milliseconds."""
    stamp = datetime.fromisoformat(value)
    if stamp.tzinfo is None:
        raise ValueError("Replay timestamps must include their timezone")
    return stamp.timestamp() * 1000


def stream_checkpoints(
    text: str, stream: list[tuple[float, str]], after: int = 0
) -> tuple[list[list[float | int]], int]:
    """Locate an exact native block in recorded deltas and retain its prefix timings."""
    combined = "".join(delta for _, delta in stream)
    start = combined.find(text, after)
    if start < 0:
        return [], after
    end = start + len(text)
    consumed = 0
    checkpoints: list[list[float | int]] = []
    for at, delta in stream:
        consumed += len(delta)
        if consumed > start:
            length = min(consumed, end) - start
            if not checkpoints or length > checkpoints[-1][1]:
                checkpoints.append([at, length])
        if consumed >= end:
            break
    return checkpoints, end


def prepare_spotter_replay(source: Path, reviewer_id: str | None = None) -> dict[str, Any]:
    """Preserve native views, recorded deltas, tools, turns and explicit wake dependencies."""
    transcript = read_value(source, "transcript")
    if transcript.get("export_schema") != "clio.session-export.v2":
        raise ValueError("Expected a native CLIO session-export.v2 archive")
    children = transcript.get("children", [])
    candidates = [
        child
        for child in children
        if (
            child["session"]["id"] == reviewer_id
            if reviewer_id
            else "spotter" in child["session"].get("title", "").lower()
        )
    ]
    if len(candidates) != 1:
        raise ValueError("Select exactly one captured Spotter child with --reviewer")
    reviewer = candidates[0]
    if reviewer["session"].get("parent_session_id") != transcript["session"]["id"]:
        raise ValueError("Reviewer does not belong to the selected primary session")
    first_input = next((m for m in transcript["messages"] if m["role"] == "user"), None)
    if not first_input:
        raise ValueError("Primary session has no captured user input")
    origin = timestamp_ms(first_input["created_at"])
    snapshot = read_value(source, "snapshot")
    records = [transcript, reviewer]
    primary_complete = {
        event["payload"]["message_id"]: timestamp_ms(event["occurred_at"]) - origin
        for event in transcript["semantic_events"]
        if event["event_type"] == "turn.completed" and event["payload"].get("message_id")
    }
    mail = {
        event["payload"]["observation_id"]: event
        for event in reviewer["semantic_events"]
        if event["event_type"] == "session.mail.accepted"
    }
    # Some export versions retain input commits only inside ARC provenance.
    # Read those event envelopes as data; never replay archived operations.
    commits: dict[str, float] = {}
    for event in reviewer["semantic_events"]:
        envelopes = [event] + [
            segment.get("content", {})
            for segment in event.get("payload", {}).get("segments_written", [])
        ]
        for envelope in envelopes:
            if envelope.get("event_type") != "session.input.committed":
                continue
            record = envelope["payload"]["record"]
            at = timestamp_ms(record["committed_at"]) - origin
            for identity in record.get("notification_ids", []):
                if identity in commits and commits[identity] != at:
                    raise ValueError(f"Conflicting consumption times: {identity}")
                commits[identity] = at
    wakes: list[dict[str, Any]] = []
    wake_by_block: dict[str, dict[str, Any]] = {}
    reviewer_view = read_value(source, "transcript_views." + reviewer["session"]["id"])
    alerts = {
        tool["output"]["part_id"]: timestamp_ms(tool["completed_at"]) - origin
        for tool in reviewer_view["tools"]
        if tool.get("name") == "raise_alert_card"
        and isinstance(tool.get("output"), dict)
        and tool["output"].get("emitted")
    }
    for message in reviewer_view["messages"]:
        for block in message["blocks"]:
            text = block.get("text", "")
            notification = re.search(r"notification (spotter:[^\]\s]+)", text)
            cause = re.search(r"answer is message ([^:\s]+):", text)
            if not notification or not cause:
                continue
            identity, message_id = notification[1], cause[1]
            if identity not in mail or message_id not in primary_complete:
                raise ValueError(f"Missing captured wake or source completion: {identity}")
            event = mail[identity]
            at = timestamp_ms(event["occurred_at"]) - origin
            if at < primary_complete[message_id]:
                raise ValueError("Spotter wake predates its source answer")
            if identity not in commits or commits[identity] < at:
                raise ValueError(f"Missing or invalid captured input commit: {identity}")
            wake = {
                "id": identity,
                "at": at,
                "consumedAt": commits[identity],
                "sourceMessageId": message_id,
                "sourceCompletedAt": primary_complete[message_id],
                "sourceEventId": event["event_id"],
                "reviewerBlockId": block["id"],
            }
            wakes.append(wake)
            wake_by_block[block["id"]] = wake
    if not wakes:
        raise ValueError("No explicit source-linked Spotter wake notifications were captured")
    sessions: list[dict[str, Any]] = []
    issues: list[str] = []
    attention_answers: list[str] = []
    summaries: list[dict[str, Any]] = []
    for role, record in zip(("primary", "spotter"), records, strict=True):
        session = record["session"]
        view = read_value(source, "transcript_views." + session["id"])
        events = record["semantic_events"]
        completions = {
            event["payload"]["message_id"]: event
            for event in events
            if event["event_type"] == "turn.completed" and event["payload"].get("message_id")
        }
        starts = {
            event["turn_id"]: event for event in events if event["event_type"] == "turn.started"
        }
        tools = {tool["id"]: tool for tool in view["tools"]}
        timed_blocks: list[dict[str, Any]] = []
        turns: list[dict[str, Any]] = []
        for message in view["messages"]:
            completed = completions.get(message["id"])
            turn_id = completed["turn_id"] if completed else message["id"]
            complete_at = (
                timestamp_ms(completed["occurred_at"] if completed else message["created_at"])
                - origin
            )
            started_at = (
                timestamp_ms(starts[turn_id]["occurred_at"]) - origin
                if turn_id in starts
                else complete_at
            )
            if completed:
                turns.append(
                    {
                        "id": turn_id,
                        "messageId": message["id"],
                        "start": started_at,
                        "end": complete_at,
                    }
                )
            streams: dict[str, list[tuple[float, str]]] = {"reasoning": [], "text": []}
            for event in events:
                if event["event_type"] != "lm.token.delta" or event.get("turn_id") != turn_id:
                    continue
                payload = event["payload"]
                field = payload.get("field", "")
                key = "reasoning" if field.startswith("provider_thinking:") else "text"
                delta = payload.get("delta")
                # Public deltas are recorded twice: the semantic transcript event
                # and the expert's detail-level=off mirror. Choose the semantic
                # channel, rather than deduplicating equal tokens (which may be real).
                if key == "text" and (
                    field != "next_thought" or event.get("detail_level") != "semantic"
                ):
                    continue
                if isinstance(delta, str):
                    streams[key].append((timestamp_ms(event["occurred_at"]) - origin, delta))
            cursors = {"reasoning": 0, "text": 0}
            causes: list[str] = []
            previous_end = started_at
            for block in message["blocks"]:
                checkpoints: list[list[float | int]] = []
                precision = "recorded-event"
                at, end = previous_end, previous_end
                wake = wake_by_block.get(block["id"])
                if wake:
                    at = end = wake["consumedAt"]
                    causes = [*causes, wake["sourceMessageId"]]
                elif block["type"] == "tool":
                    tool = tools[block["tool_id"]]
                    at = timestamp_ms(tool["started_at"]) - origin
                    end = timestamp_ms(tool["completed_at"]) - origin
                elif block["type"] == "action_card":
                    if block["id"] not in alerts:
                        raise ValueError(f"Action card has no captured delivery: {block['id']}")
                    at = end = alerts[block["id"]]
                elif block.get("text"):
                    key = "reasoning" if block["type"] == "reasoning" else "text"
                    text = block["text"]
                    if message["role"] == "user":
                        at = end = complete_at
                        checkpoints = [[at, len(text)]]
                    elif block["type"] in {"text", "reasoning"}:
                        checkpoints, cursors[key] = stream_checkpoints(
                            text, streams[key], cursors[key]
                        )
                        if checkpoints:
                            at, end = float(checkpoints[0][0]), float(checkpoints[-1][0])
                            precision = "recorded-token-deltas"
                        else:
                            at = end = complete_at
                            checkpoints = [[at, len(text)]]
                            precision = "persisted-only"
                            issues.append(
                                f"No exact delta stream for {session['id']}/{block['id']}"
                            )
                gate = max([at, *[primary_complete[cause] for cause in causes]])
                timed_blocks.append(
                    {
                        "messageId": message["id"],
                        "blockId": block["id"],
                        "start": max(gate, at),
                        "end": max(gate, end),
                        "checkpoints": checkpoints,
                        "dependsOn": causes.copy(),
                        "precision": precision,
                    }
                )
                previous_end = max(previous_end, end)
            if (
                role == "primary"
                and completed
                and any(
                    event["event_type"] == "lm.call"
                    and event.get("turn_id") == turn_id
                    and event.get("payload", {}).get("attention")
                    for event in events
                )
            ):
                attention_answers.append(message["id"])
        for tool in view["tools"]:
            if tool.get("name") == "attention_sources" and isinstance(tool.get("output"), dict):
                result = tool["output"]
                summaries.append(
                    {
                        "callId": tool["id"],
                        "request": tool.get("input"),
                        "response": result,
                        "tokenHeatCaptured": bool(result.get("blocks")),
                    }
                )
        reasoning = next(
            (
                event["payload"].get("agent_runtime", {}).get("reasoning")
                for event in events
                if event["event_type"] == "llm.request.started"
            ),
            None,
        )
        sessions.append(
            {
                "role": role,
                "session": session,
                "view": view,
                "blocks": timed_blocks,
                "turns": turns,
                "reasoningSetting": reasoning,
                "quarantine": (
                    {
                        "at": timestamp_ms(session["metadata"]["spotter_quarantine"]["raised_at"])
                        - origin,
                        "record": session["metadata"]["spotter_quarantine"],
                    }
                    if session.get("metadata", {}).get("spotter_quarantine")
                    else None
                ),
            }
        )
    return {
        "schema": "clio.paired-replay.v1",
        "source": {"archive": source.name, "sha256": sha256_file(source)},
        "origin": first_input["created_at"],
        "sessions": sessions,
        "snapshot": snapshot,
        "wakes": sorted(wakes, key=lambda item: item["at"]),
        "attention": {
            "schema": "clio.replay-attention.v1",
            "sourceSha256": sha256_file(source),
            "knownAnswers": attention_answers,
            "records": [],
            "summaries": summaries,
        },
        "coverage": {
            "sessions": len(sessions),
            "wakes": len(wakes),
            "issues": issues,
            "attentionHeatRecords": 0,
            "attentionSummaries": len(summaries),
        },
    }


def main() -> None:
    """Create a reusable native pair from a saved HTML, HTML.gz or full JSON export."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--reviewer")
    args = parser.parse_args()
    if args.out.resolve() == args.source.resolve() or args.out.suffix.lower() != ".json":
        parser.error("Output must be a distinct JSON file")
    pair = prepare_spotter_replay(args.source, args.reviewer)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        json.dumps(pair, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8"
    )
    print(json.dumps(pair["coverage"]))


if __name__ == "__main__":
    main()
