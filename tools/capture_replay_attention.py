"""Record exact native inspection responses from an isolated bundle replay service."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import urllib.request
from pathlib import Path
from typing import Any, cast
from urllib.parse import urlsplit


def selection(text: str, part_id: str, start: int, end: int) -> dict[str, Any]:
    """Bind a code-point span to the immutable native text revision."""
    if not 0 <= start < end <= len(text):
        raise ValueError("Invalid selection span")
    return {
        "text": text[start:end],
        "part_id": part_id,
        "field": "text",
        "content_revision": hashlib.sha256(text.encode()).hexdigest(),
        "start": start,
        "end": end,
    }


def inspection_plan(pair: dict[str, Any]) -> list[dict[str, Any]]:
    """Select the genuine poisoned answer, whole response and clean contrast."""
    primary = next(s for s in pair["sessions"] if s["role"] == "primary")
    answers = [m for m in primary["view"]["messages"] if m["role"] == "assistant"]
    if len(answers) != 6:
        raise ValueError("This OPAL shot recipe requires the six-round reference")
    result: list[dict[str, Any]] = []
    for index, needles in [
        (0, [("clean-response", None)]),
        (
            4,
            [
                ("few-words", "73"),
                ("phrase", "73; MATCHES"),
                ("answer-line", "ANSWER: 73; MATCHES"),
                ("whole-response", None),
            ],
        ),
    ]:
        message = answers[index]
        part = next(b for b in message["blocks"] if b["type"] == "text")
        text = part["text"]
        for label, needle in needles:
            chosen = needle or text.strip()
            start = text.index(chosen)
            result.append(
                {
                    "label": label,
                    "sessionId": primary["session"]["id"],
                    "messageId": message["id"],
                    "request": selection(text, part["id"], start, start + len(chosen)),
                }
            )
    return result


def replay_aliases(
    sessions: list[dict[str, Any]], identities: set[str], selected: dict[str, str] | None = None
) -> dict[str, str]:
    """Resolve the replay server's explicitly labeled aliases, never guessing by order."""
    if selected is not None:
        listed = {s["id"]: s for s in sessions}
        if set(selected) != identities or any(
            target not in listed or f"(replay {source}" not in listed[target].get("title", "")
            for source, target in selected.items()
        ):
            raise ValueError("Explicit aliases do not match recorded source sessions")
        return selected
    aliases: dict[str, str] = {}
    for session in sessions:
        match = re.search(r"\(replay (\S+?)(?:\s|\))", session.get("title", ""))
        if match and match[1] in identities:
            if match[1] in aliases:
                raise ValueError("Ambiguous replay session alias")
            aliases[match[1]] = session["id"]
    if set(aliases) != identities:
        raise ValueError("Replay server does not expose all source sessions")
    return aliases


def source_selection(pair: dict[str, Any], sid: str, mid: str, body: dict[str, Any]) -> str:
    """Validate a native request's immutable source coordinates before recording it."""
    session = next(s for s in pair["sessions"] if s["session"]["id"] == sid)
    message = next(m for m in session["view"]["messages"] if m["id"] == mid)
    part = next(b for b in message["blocks"] if b["id"] == body["part_id"])
    text = part["text"]
    if (
        body["content_revision"] != hashlib.sha256(text.encode()).hexdigest()
        or body.get("field", "text") != "text"
        or not 0 <= body["start"] < body["end"] <= len(text)
    ):
        raise ValueError("Captured selection does not match the source part")
    return text[body["start"] : body["end"]]


def capture_attention(
    pair: dict[str, Any],
    endpoint: str,
    raw_dir: Path,
    selected_aliases: dict[str, str] | None = None,
    shots: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Record service-produced heat and item spans; preserve complete raw replies separately."""
    address = urlsplit(endpoint)
    if address.scheme != "http" or address.hostname not in {"127.0.0.1", "localhost", "::1"}:
        raise ValueError("Use a local recorded replay service")
    raw_dir.mkdir(parents=True, exist_ok=True)

    def exchange(path: str, body: dict[str, Any] | None = None) -> Any:
        data = json.dumps(body).encode() if body is not None else None
        request = urllib.request.Request(
            endpoint.rstrip("/") + path,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST" if data is not None else "GET",
        )
        with urllib.request.urlopen(request, timeout=120) as response:
            return json.load(response)

    payload = exchange("/v1/sessions")
    sessions = cast(
        list[dict[str, Any]], payload["sessions"] if isinstance(payload, dict) else payload
    )
    aliases = replay_aliases(
        sessions, {s["session"]["id"] for s in pair["sessions"]}, selected_aliases
    )
    records: list[dict[str, Any]] = []
    requests: list[dict[str, Any]] = []
    seen: set[str] = set()

    def save(label: str, sid: str, mid: str, route: str, body: dict[str, Any]) -> dict[str, Any]:
        result = exchange(f"/v1/sessions/{aliases[sid]}/messages/{mid}/{route}", body)
        raw = json.dumps(
            {
                "sourceSessionId": sid,
                "replaySessionId": aliases[sid],
                "messageId": mid,
                "route": route,
                "request": body,
                "response": result,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ).encode()
        filename = f"{label}-{route.replace('/', '-')}.json"
        (raw_dir / filename).write_bytes(raw)
        projected = {k: v for k, v in result.items() if k != "tokens"}
        if route == "attention":
            canonical_text = source_selection(pair, sid, mid, body)
            if not result.get("available") or not result.get("blocks"):
                raise ValueError(
                    f"No source-linked heat for {label}: {result.get('reason')}; {result.get('unmapped_content')}"
                )
            key = json.dumps([sid, mid, body], sort_keys=True)
            if key not in seen:
                records.append(
                    {
                        "sessionId": sid,
                        "messageId": mid,
                        "partId": body["part_id"],
                        "contentRevision": body["content_revision"],
                        "field": body["field"],
                        "start": body["start"],
                        "end": body["end"],
                        "text": body["text"],
                        "sourceSelectionText": canonical_text,
                        **({"profile": body["profile"]} if "profile" in body else {}),
                        "response": projected,
                        "rawResponse": {
                            "file": filename,
                            "sha256": hashlib.sha256(raw).hexdigest(),
                        },
                    }
                )
                seen.add(key)
        else:
            requests.append(
                {
                    "sessionId": sid,
                    "messageId": mid,
                    "route": route,
                    "request": body,
                    "response": projected,
                    "rawResponseSha256": hashlib.sha256(raw).hexdigest(),
                }
            )
        return result

    for shot in shots if shots is not None else inspection_plan(pair):
        sid, mid, body = shot["sessionId"], shot["messageId"], shot["request"]
        heat = save(shot["label"], sid, mid, "attention", body)
        items = save(shot["label"], sid, mid, "attention/items", {"items": [body], "split": ";"})
        if items.get("available"):
            for item in items["items"]:
                request = {k: item[k] for k in ("text", "part_id", "field", "start", "end")}
                request["content_revision"] = body["content_revision"]
                save(f"{shot['label']}-item-{item['index']}", sid, mid, "attention", request)
            save(
                shot["label"],
                sid,
                mid,
                "attention/items/export",
                {"items": [body], "split": ";", "profile": heat["profile"]},
            )
    return {
        "schema": "clio.replay-attention.v1",
        "sourceSha256": pair["source"]["sha256"],
        "knownAnswers": pair["attention"]["knownAnswers"],
        "records": records,
        "requests": requests,
        "sessionAliases": aliases,
        "projection": "Per-token rank detail remains in the raw replies; all native transcript heat runs, unmapped coverage, profiles and capture identities are retained.",
    }


def merge_captures(previous: dict[str, Any], addition: dict[str, Any]) -> dict[str, Any]:
    """Combine exact requests from one export; reject conflicting captured responses."""
    if (
        previous["sourceSha256"] != addition["sourceSha256"]
        or previous["schema"] != addition["schema"]
    ):
        raise ValueError("Cannot merge attention from another source export")
    result = {**previous, **addition}
    for field, keys in (
        (
            "records",
            (
                "sessionId",
                "messageId",
                "partId",
                "contentRevision",
                "field",
                "start",
                "end",
                "text",
                "profile",
            ),
        ),
        ("requests", ("sessionId", "messageId", "route", "request")),
    ):
        merged: dict[str, dict[str, Any]] = {}
        for record in previous[field] + addition[field]:
            key = json.dumps([record.get(k) for k in keys], sort_keys=True)
            if key in merged and merged[key]["response"] != record["response"]:
                raise ValueError("The same attention request has conflicting captured responses")
            merged.setdefault(key, record)
        result[field] = list(merged.values())
    return result


def main() -> None:
    """Capture source-bound OPAL selection recipes as a portable UI sidecar."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pair", type=Path)
    parser.add_argument("--endpoint", default="http://127.0.0.1:18825")
    parser.add_argument("--raw-dir", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument(
        "--merge",
        action="store_true",
        help="Merge into the existing output; reject conflicting receipts",
    )
    parser.add_argument(
        "--selections",
        type=Path,
        help="Exact source-bound native selection requests recorded in browser review",
    )
    parser.add_argument(
        "--session-alias",
        action="append",
        default=[],
        help="Exact source=replay ID from the server's startup output",
    )
    args = parser.parse_args()
    pair = json.loads(args.pair.read_text(encoding="utf-8"))
    aliases = (
        dict(item.split("=", 1) for item in args.session_alias) if args.session_alias else None
    )
    shots = json.loads(args.selections.read_text(encoding="utf-8")) if args.selections else None
    bundle = capture_attention(pair, args.endpoint, args.raw_dir, aliases, shots)
    if args.merge:
        bundle = merge_captures(json.loads(args.out.read_text(encoding="utf-8")), bundle)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        json.dumps(bundle, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8"
    )
    print(
        f"Captured {len(bundle['records'])} heat selections and {len(bundle['requests'])} item queries"
    )


if __name__ == "__main__":
    main()
