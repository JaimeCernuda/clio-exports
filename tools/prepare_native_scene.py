"""Preserve the authoritative native conversation projection and its saved dependencies."""

from __future__ import annotations

import argparse
import json
import re
from contextlib import closing
from pathlib import Path
from typing import Any

import ijson
from export_stream import ExportStream
from index_exports import sha256_file

SESSION_ID_PATH = re.compile(r"^transcript(?:\.children\.item)*\.session\.id$")


def read_value(source: Path, prefix: str) -> Any:
    """Read one selected archive object without retaining the raw tool-output ledger."""
    with closing(
        source.open("rb") if source.suffix.lower() == ".json" else ExportStream(source)
    ) as stream:
        for value in ijson.items(stream, prefix, use_float=True):
            return value
    raise ValueError(f"Archive has no {prefix}")


def select_session_record(source: Path, identity: str | None) -> dict[str, Any]:
    """Select a root or nested session record without materializing its raw transcript."""
    if identity is None:
        return read_value(source, "transcript.session")
    selected_prefix: str | None = None
    with closing(
        source.open("rb") if source.suffix.lower() == ".json" else ExportStream(source)
    ) as stream:
        for prefix, event, value in ijson.parse(stream, use_float=True):
            if event == "string" and value == identity and SESSION_ID_PATH.fullmatch(prefix):
                selected_prefix = prefix.removesuffix(".id")
                break
            if event == "end_map" and prefix == "transcript":
                break
    if selected_prefix is not None:
        with closing(
            source.open("rb") if source.suffix.lower() == ".json" else ExportStream(source)
        ) as stream:
            for record in ijson.items(stream, selected_prefix, use_float=True):
                if record.get("id") == identity:
                    return record
    raise ValueError(f"No exported session record for {identity}")


def prepare_native_scene(source: Path, session_id: str | None = None) -> dict[str, Any]:
    """Keep native blocks, presentation, artifacts and A2UI dependencies in their saved order."""
    if read_value(source, "transcript.export_schema") != "clio.session-export.v2":
        raise ValueError("Expected a native CLIO session-export.v2 archive")
    session = select_session_record(source, session_id)
    identity = session["id"]
    view = read_value(source, "transcript_views." + identity)
    snapshot = read_value(source, "snapshot")
    messages = view.get("messages", [])
    if "messages" not in view or any(message.get("session_id") != identity for message in messages):
        raise ValueError("Native message session identities are missing or inconsistent")
    ids = [message["id"] for message in messages]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate native message identities")
    tools = {tool["id"] for tool in view["tools"]}
    surfaces = {
        surface["id"]
        for surface in snapshot.get("sessions", {}).get(identity, view.get("surfaces", []))
    }
    artifacts = {artifact["id"] for artifact in view["artifacts"]}
    if len(tools) != len(view["tools"]) or len(artifacts) != len(view["artifacts"]):
        raise ValueError("Duplicate native tool or artifact identities")
    for message in messages:
        for block in message["blocks"]:
            target = {
                "tool": ("tool_id", tools),
                "a2ui": ("surface_id", surfaces),
                "artifact": ("artifact_id", artifacts),
            }.get(block["type"])
            if target and block.get(target[0]) not in target[1]:
                raise ValueError(f"Unresolved native block: {block['id']}")
    return {
        "schema": "clio.native-scene.v1",
        "source": {"archive": source.name, "sha256": sha256_file(source)},
        "session": session,
        "view": view,
        "snapshot": snapshot,
        "coverage": {
            "messages": len(messages),
            "tools": len(tools),
            "surfaces": len(surfaces),
            "artifacts": len(artifacts),
            "snapshotFailures": snapshot.get("failures", []),
        },
    }


def register_scene(catalog: Path, scene_path: Path, scene: dict[str, Any]) -> None:
    """Add or replace a local prepared scene in a reusable preview catalog."""
    relative = scene_path.resolve().relative_to(catalog.parent.resolve())
    if relative.suffix.lower() != ".json" or scene_path.resolve() == catalog.resolve():
        raise ValueError("Catalog scenes must be JSON files distinct from the catalog")
    value: dict[str, Any] = (
        json.loads(catalog.read_text(encoding="utf-8"))
        if catalog.exists()
        else {"schema": "clio.scene-catalog.v1", "scenes": []}
    )
    if value.get("schema") != "clio.scene-catalog.v1" or not isinstance(value.get("scenes"), list):
        raise ValueError("Expected a clio.scene-catalog.v1 catalog")
    entry = {
        "file": relative.as_posix(),
        "title": scene["session"]["title"],
        "sessionId": scene["session"]["id"],
    }
    value["scenes"] = [item for item in value["scenes"] if item["file"] != entry["file"]] + [entry]
    catalog.parent.mkdir(parents=True, exist_ok=True)
    catalog.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    """Create a native-renderer input; do not replace structured blocks with text excerpts."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument(
        "--session", help="Root or nested exported session ID; defaults to the root"
    )
    parser.add_argument(
        "--catalog", type=Path, help="Register the prepared scene for the preview chooser"
    )
    args = parser.parse_args()
    if args.source.resolve() == args.out.resolve():
        parser.error("Output must not overwrite the original archive")
    if args.out.suffix.lower() != ".json":
        parser.error("Prepared scenes must use a .json filename for the native preview")
    if args.catalog and args.catalog.resolve() in {args.source.resolve(), args.out.resolve()}:
        parser.error("The catalog must be distinct from the source archive and prepared scene")
    scene = prepare_native_scene(args.source, args.session)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        json.dumps(scene, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8"
    )
    if args.catalog:
        register_scene(args.catalog, args.out, scene)
    print(json.dumps(scene["coverage"]))


if __name__ == "__main__":
    main()
