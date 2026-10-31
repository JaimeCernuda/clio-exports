"""Build small source-linked session indexes for motion authoring; never execute exports."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from contextlib import closing
from pathlib import Path
from typing import Any

import ijson
from export_stream import ExportStream

SESSION_PREFIX = re.compile(r"^transcript(?:\.children\.item)*$")
SCALAR_FIELDS = {"id", "title", "parent_session_id", "created_at", "last_interaction_at"}


def sha256_file(path: Path) -> str:
    """Hash a preserved archive without loading it into memory."""
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while chunk := stream.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def index_export(source: Path, repository: Path) -> dict[str, Any]:
    """Index transcript metadata and bounded text previews, stopping before embedded media."""
    sessions: list[dict[str, Any]] = []
    contexts: dict[str, dict[str, Any]] = {}
    messages: dict[str, dict[str, Any]] = {}
    tools: dict[str, dict[str, Any]] = {}
    schema = ""
    root_ended = False
    with closing(ExportStream(source)) as stream:
        for prefix, event, value in ijson.parse(stream, use_float=True):
            if event == "end_map" and prefix == "transcript":
                root_ended = True
                break
            if prefix == "transcript.export_schema" and event == "string":
                schema = value
            if event == "start_map" and SESSION_PREFIX.fullmatch(prefix):
                record: dict[str, Any] = {"messages": [], "tools": []}
                contexts[prefix] = record
                sessions.append(record)
            candidates = [base for base in contexts if prefix.startswith(base + ".")]
            if not candidates:
                continue
            base = max(candidates, key=len)
            record = contexts[base]
            relative = prefix[len(base) + 1 :]
            if event in {"string", "number", "boolean", "null"}:
                if relative.startswith("session."):
                    field = relative.removeprefix("session.")
                    if field in SCALAR_FIELDS or field == "agent.id":
                        record[field] = value
                message_prefix = base + ".messages.item"
                message = messages.get(base)
                if message is not None and prefix.startswith(message_prefix + "."):
                    field = prefix[len(message_prefix) + 1 :]
                    if field in {"id", "role", "created_at", "updated_at", "stop_reason"}:
                        message[field] = value
                    elif field in {"parts.item.type", "parts.item.id"}:
                        message["part"][field.rsplit(".", 1)[-1]] = value
                    elif field == "parts.item.text":
                        text = str(value)
                        message["part"].update(
                            {
                                "text": text[:2400],
                                "chars": len(text),
                                "headings": re.findall(r"(?m)^#{1,4}[ \t]+(.+)$", text)[:24],
                            }
                        )
                tool = tools.get(base)
                if tool is not None:
                    tool_prefix = base + ".tool_records.item."
                    if prefix.startswith(tool_prefix):
                        field = prefix[len(tool_prefix) :]
                        if field in {"call_id", "tool", "status"}:
                            tool[field] = value
                        elif field == "input._clio_task_description":
                            tool["description"] = str(value)[:300]
                        elif field == "input.path":
                            tool["path"] = str(value)
            if event == "start_map" and relative == "messages.item":
                messages[base] = {"excerpts": [], "text_chars": 0}
            elif event == "start_map" and relative == "messages.item.parts.item":
                messages[base]["part"] = {}
            elif event == "end_map" and relative == "messages.item.parts.item":
                message = messages[base]
                part = message.pop("part")
                if part.get("type") == "text" and part.get("text"):
                    message["text_chars"] += part["chars"]
                    message["excerpts"].append(
                        {
                            "partId": part.get("id"),
                            "text": part["text"],
                            "truncated": part["chars"] > 2400,
                            "headings": part["headings"],
                        }
                    )
                    if len(message["excerpts"]) > 12:
                        del message["excerpts"][6]
            elif event == "end_map" and relative == "messages.item":
                message = messages.pop(base)
                record["messages"].append(message)
            elif event == "start_map" and relative == "tool_records.item":
                tools[base] = {}
            elif event == "end_map" and relative == "tool_records.item":
                record["tools"].append(tools.pop(base))
            if event == "end_map" and SESSION_PREFIX.fullmatch(prefix):
                contexts.pop(prefix, None)
    if not root_ended or schema != "clio.session-export.v2" or not sessions:
        raise ValueError(f"Unsupported or incomplete session export: {source}")
    ids = [session.get("id") for session in sessions]
    if not all(ids) or len(ids) != len(set(ids)):
        raise ValueError(f"Missing or duplicate session identities: {source}")
    return {
        "schema": "clio.motion-index.v1",
        "source": {
            "path": source.relative_to(repository).as_posix(),
            "sha256": sha256_file(source),
            "bytes": source.stat().st_size,
            "exportSchema": schema,
        },
        "rootSessionId": sessions[0]["id"],
        "sessions": sessions,
    }


def write_catalog(directory: Path) -> list[dict[str, Any]]:
    """Catalog every existing motion index, including when only one archive is refreshed."""
    catalog: list[dict[str, Any]] = []
    for path in sorted(directory.glob("*.json")):
        if path.name == "catalog.json":
            continue
        index = json.loads(path.read_text(encoding="utf-8"))
        if index.get("schema") == "clio.motion-index.v1":
            catalog.append(
                {
                    "index": path.name,
                    "rootSessionId": index["rootSessionId"],
                    "source": index["source"],
                    "sessions": len(index["sessions"]),
                }
            )
    (directory / "catalog.json").write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    return catalog


def main() -> None:
    """Index selected archives, or discover all current study/delegation exports."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sources", nargs="*", type=Path)
    parser.add_argument("--out", type=Path, default=Path("motion/evidence"))
    args = parser.parse_args()
    repository = Path(__file__).resolve().parents[1]
    sources = args.sources or [
        *repository.glob("delegation/*.html"),
        *repository.glob("studies/*.html"),
    ]
    args.out.mkdir(parents=True, exist_ok=True)
    for input_path in sources:
        source = input_path.resolve()
        index = index_export(source, repository)
        name = source.stem.lower().replace("-session", "") + ".json"
        target = args.out / name
        if target.exists():
            existing = json.loads(target.read_text(encoding="utf-8"))
            if existing["source"]["path"] != index["source"]["path"]:
                raise ValueError(f"Index filename collision: {target}")
        target.write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(
            f"{source.name}: {len(index['sessions'])} sessions -> {target} ({target.stat().st_size:,} bytes)"
        )
    write_catalog(args.out)


if __name__ == "__main__":
    main()
