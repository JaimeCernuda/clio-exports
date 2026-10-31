"""Select source-linked messages and child activity from any indexed CLIO session."""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class SelectionSpec:
    """Choose a bounded editorial beat without modifying its underlying evidence."""

    session_id: str | None = None
    selected_agent_id: str | None = None
    child_ids: tuple[str, ...] | None = None
    prompt_message_id: str | None = None
    result_message_id: str | None = None
    prompt_sentences: int | None = None
    tool_limit: int = 12
    max_agents: int = 20

    def __post_init__(self) -> None:
        if self.tool_limit < 1 or self.max_agents < 1:
            raise ValueError("Tool and agent limits must be positive")
        if self.prompt_sentences is not None and self.prompt_sentences < 1:
            raise ValueError("Prompt sentence count must be positive")
        if self.child_ids is not None and len(set(self.child_ids)) != len(self.child_ids):
            raise ValueError("Child identities must be unique")


def text_message(
    messages: list[dict[str, Any]], role: str, identity: str | None, *, latest: bool = False
) -> dict[str, Any]:
    """Find a recorded text message, validating an explicitly supplied identity and role."""
    ordered = list(reversed(messages)) if latest else messages
    for message in ordered:
        if (
            message.get("role") == role
            and message.get("excerpts")
            and (identity is None or message.get("id") == identity)
        ):
            return message
    raise ValueError(f"No recorded {role} text message matches {identity or 'the selection'}")


def select_session(index: dict[str, Any], spec: SelectionSpec) -> dict[str, Any]:
    """Select genuine content with explicit truncation, including unfinished child sessions."""
    if index.get("schema") != "clio.motion-index.v1":
        raise ValueError("Expected a clio.motion-index.v1 index")
    by_id = {session["id"]: session for session in index["sessions"]}
    identity = spec.session_id or index["rootSessionId"]
    if identity not in by_id:
        raise ValueError(f"Unknown session: {identity}")
    root = by_id[identity]
    prompt = text_message(root["messages"], "user", spec.prompt_message_id)
    prompt_part = prompt["excerpts"][0]
    if prompt_part["truncated"]:
        raise ValueError("The indexed prompt is truncated; select a shorter source message first")
    result = text_message(root["messages"], "assistant", spec.result_message_id, latest=True)
    children = [
        session for session in by_id.values() if session.get("parent_session_id") == identity
    ]
    if spec.child_ids is not None:
        available = {child["id"]: child for child in children}
        missing = set(spec.child_ids) - available.keys()
        if missing:
            raise ValueError(f"Not direct child sessions: {sorted(missing)}")
        children = [available[child_id] for child_id in spec.child_ids]
    else:
        children.sort(key=lambda child: (child.get("created_at") or "", child["id"]))
    if len(children) > spec.max_agents:
        raise ValueError("Too many child sessions; select a subset with --child-id")
    agents: list[dict[str, Any]] = []
    for child in children:
        last = child["messages"][-1] if child["messages"] else None
        replies = [
            message
            for message in child["messages"]
            if message.get("role") == "assistant" and message.get("excerpts")
        ]
        reply = replies[-1] if replies else None
        tools = child["tools"]
        agents.append(
            {
                "id": child["id"],
                "name": child.get("title") or child["id"],
                "agent": child.get("agent.id", ""),
                "createdAt": child.get("created_at"),
                "lastRecordedAt": child.get("last_interaction_at"),
                "terminalMessageId": last["id"] if last else None,
                "stopReason": last.get("stop_reason") if last else None,
                "tools": tools[: spec.tool_limit],
                "toolRecordCount": len(tools),
                "toolsTruncated": len(tools) > spec.tool_limit,
                "excerpt": reply["excerpts"][-1] if reply else None,
                "excerptMessageId": reply["id"] if reply else None,
            }
        )
    selected = spec.selected_agent_id or (agents[0]["id"] if agents else None)
    if selected is not None and selected not in {agent["id"] for agent in agents}:
        raise ValueError(f"Selected agent is outside the selected children: {selected}")
    full_prompt = prompt_part["text"]
    display_prompt = full_prompt
    if spec.prompt_sentences is not None:
        boundaries = list(re.finditer(r"[.!?](?=\s|$)", full_prompt))
        if len(boundaries) >= spec.prompt_sentences:
            display_prompt = full_prompt[: boundaries[spec.prompt_sentences - 1].end()]
    return {
        "schema": "clio.motion-selection.v1",
        "source": index["source"],
        "rootSessionId": identity,
        "sessionTitle": root.get("title") or identity,
        "prompt": {
            "messageId": prompt["id"],
            "partId": prompt_part["partId"],
            "fullText": full_prompt,
            "displayText": display_prompt,
        },
        "agents": agents,
        "selectedAgentId": selected,
        "result": {"messageId": result["id"], **result["excerpts"][-1]},
        "timing": "Editorial reconstruction; timings do not represent elapsed execution time.",
    }


def main() -> None:
    """Write a small selection from a chosen index for a new film or component scene."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("index", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--session")
    parser.add_argument("--agent")
    parser.add_argument("--child-id", action="append")
    parser.add_argument("--prompt-message")
    parser.add_argument("--result-message")
    parser.add_argument("--prompt-sentences", type=int)
    parser.add_argument("--tool-limit", type=int, default=12)
    parser.add_argument("--max-agents", type=int, default=20)
    args = parser.parse_args()
    if args.index.resolve() == args.out.resolve():
        parser.error("The output must differ from the input index")
    spec = SelectionSpec(
        args.session,
        args.agent,
        tuple(args.child_id) if args.child_id is not None else None,
        args.prompt_message,
        args.result_message,
        args.prompt_sentences,
        args.tool_limit,
        args.max_agents,
    )
    selection = select_session(json.loads(args.index.read_text(encoding="utf-8")), spec)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        json.dumps(selection, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(
        f"Selected {selection['rootSessionId']}: {len(selection['agents'])} child sessions -> {args.out}"
    )


if __name__ == "__main__":
    main()
