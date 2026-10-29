"""Audit recorded attention capture identities without changing the source bundle."""

from __future__ import annotations

import argparse
import hashlib
import json
import struct
from pathlib import Path
from typing import Any


def audit_bundle(bundle: Path) -> dict[str, Any]:
    """Verify every descriptor's safe path, byte size, SHA-256 and tensor layout."""
    bundle = bundle.resolve()
    tasks = json.loads((bundle / "flowcept/decode_attention.json").read_text(encoding="utf-8"))
    captures: list[dict[str, Any]] = []
    for task in tasks:
        descriptor = task["attention_stats"]
        filename = descriptor["uri"].rsplit("/", 1)[-1]
        capture = (bundle / "captures" / task["workflow_id"] / filename).resolve()
        if not capture.is_relative_to(bundle / "captures"):
            raise ValueError("Capture escapes the bundle")
        size = capture.stat().st_size
        if size != descriptor["bytes"]:
            raise ValueError(f"Capture size mismatch: {filename}")
        with capture.open("rb") as stream:
            digest = hashlib.file_digest(stream, "sha256").hexdigest()
        if digest != descriptor["sha256"]:
            raise ValueError(f"Capture hash mismatch: {filename}")
        with capture.open("rb") as stream:
            header_size = struct.unpack("<Q", stream.read(8))[0]
            if header_size > size - 8:
                raise ValueError(f"Invalid SafeTensors header: {filename}")
            header = json.loads(stream.read(header_size))
        for name, tensor in header.items():
            if name == "__metadata__":
                continue
            start, end = tensor["data_offsets"]
            if not 0 <= start <= end <= size - 8 - header_size:
                raise ValueError(f"Invalid tensor bounds: {filename}/{name}")
            declared = descriptor["tensors"].get(name)
            if declared and declared["shape"] != tensor["shape"]:
                raise ValueError(f"Tensor shape mismatch: {filename}/{name}")
        captures.append(
            {
                "requestId": task["used"]["request_id"],
                "workflowId": task["workflow_id"],
                "file": str(capture.relative_to(bundle)),
                "bytes": size,
                "sha256": digest,
                "decodeSteps": task["used"]["num_decode_tokens"],
                "dropped": descriptor.get("decode_steps_dropped"),
                "unscored": descriptor.get("decode_steps_unscored"),
            }
        )
    return {
        "schema": "clio.attention-bundle-audit.v1",
        "metadata": json.loads((bundle / "metadata.json").read_text(encoding="utf-8")),
        "captures": captures,
        "verified": len(captures),
    }


def main() -> None:
    """Write a bounded manifest of verified captured evidence."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundle", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    report = audit_bundle(args.bundle)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Verified {report['verified']} capture files")


if __name__ == "__main__":
    main()
