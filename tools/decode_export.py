"""Inspect compressed native CLIO export data without loading the archive into RAM."""

from __future__ import annotations

import argparse
import json
import os
import tempfile
from pathlib import Path

import ijson
from export_stream import payload_chunks


def decode_export(source: Path, destination: Path, chunk_size: int = 65536) -> None:
    """Decode a native HTML export payload to a scratch JSON file with bounded buffers."""
    if source.resolve() == destination.resolve():
        raise ValueError("The decoded destination must differ from the source archive")
    destination.parent.mkdir(parents=True, exist_ok=True)
    handle, temporary = tempfile.mkstemp(dir=destination.parent, suffix=".partial")
    try:
        with os.fdopen(handle, "wb") as output:
            for chunk in payload_chunks(source, chunk_size):
                output.write(chunk)
        Path(temporary).replace(destination)
    finally:
        Path(temporary).unlink(missing_ok=True)


def main() -> None:
    """Decode an export and print a bounded structural preview for schema inspection."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    decode_export(args.source, args.destination)
    with args.destination.open("rb") as stream:
        for index, (prefix, event, value) in enumerate(ijson.parse(stream)):
            print(json.dumps({"prefix": prefix, "event": event, "value": str(value)[:200]}))
            if index >= 100:
                break


if __name__ == "__main__":
    main()
