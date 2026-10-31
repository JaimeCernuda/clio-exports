"""Select a tiny, source-linked delegation beat for the first editable-UI motion proof."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def select_reading(index: dict[str, Any]) -> dict[str, Any]:
    """Select real identities, excerpts and tool calls without manufacturing agent outcomes."""
    sessions = index["sessions"]
    root = next(session for session in sessions if session["id"] == index["rootSessionId"])
    prompt = next(message for message in root["messages"] if message["role"] == "user")
    prompt_part = prompt["excerpts"][0]
    children = sorted(
        (session for session in sessions if session.get("parent_session_id") == root["id"]),
        key=lambda session: session["created_at"],
    )
    agents: list[dict[str, Any]] = []
    for child in children:
        final = child["messages"][-1]
        agents.append(
            {
                "id": child["id"],
                "name": child["title"],
                "agent": child.get("agent.id", ""),
                "createdAt": child["created_at"],
                "lastRecordedAt": child.get("last_interaction_at"),
                "terminalMessageId": final["id"],
                "stopReason": final.get("stop_reason"),
                "tools": child["tools"],
                "excerpt": final["excerpts"][-1],
            }
        )
    selected = next(agent for agent in agents if agent["name"] == "MCP/NDP/extensions")
    final_root = next(
        message for message in reversed(root["messages"]) if message["role"] == "assistant"
    )
    return {
        "schema": "clio.motion-selection.v1",
        "source": index["source"],
        "rootSessionId": root["id"],
        "sessionTitle": root["title"],
        "prompt": {
            "messageId": prompt["id"],
            "partId": prompt_part["partId"],
            "fullText": prompt_part["text"],
            "displayText": prompt_part["text"].split(". For every")[0] + ".",
        },
        "agents": agents,
        "selectedAgentId": selected["id"],
        "result": {"messageId": final_root["id"], **final_root["excerpts"][-1]},
        "timing": "Editorial reconstruction; timings do not represent elapsed execution time.",
    }


def main() -> None:
    """Write the reproducible scene selection into the motion project."""
    repository = Path(__file__).resolve().parents[1]
    index = json.loads(
        (repository / "motion/evidence/reading-guide.json").read_text(encoding="utf-8")
    )
    selection = select_reading(index)
    destination = repository / "motion/data/parallel-reading.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(
        json.dumps(selection, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(
        f"Selected {len(selection['agents'])} real child sessions: {destination.stat().st_size:,} bytes"
    )


if __name__ == "__main__":
    main()
