"""Prepare the engineering film from native exports without inventing execution."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
import re
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any

from index_exports import sha256_file
from prepare_engineering_sketch import curate_report
from prepare_native_scene import select_session_record

E4 = "E4_cantilever_parameter_sweep"
E5 = "E5_topology_optimization_studio"


def editorial_scene(scene: dict[str, Any], script: dict[str, Any]) -> dict[str, Any]:
    """Apply explicit film copy while retaining source identities and an edit ledger."""
    result = copy.deepcopy(scene)
    result["session"]["title"] = script["title"]
    blocks = {b["id"]: b for m in result["view"]["messages"] for b in m["blocks"]}
    if blocks.keys() != script["blocks"].keys():
        raise ValueError("Editorial script and selected source blocks do not match")
    tools = {t["id"]: t for t in result["view"]["tools"]}
    changes: list[dict[str, Any]] = []
    for identity, edit in script["blocks"].items():
        block = blocks[identity]
        if "text" in edit:
            original = block["text"]
            changes.append(
                {
                    "blockId": identity,
                    "sourceText": original,
                    "sourceTextSha256": hashlib.sha256(original.encode()).hexdigest(),
                    "displayText": edit["text"],
                }
            )
            block["text"] = edit["text"]
        else:
            if block.get("tool_id") != edit["tool"]:
                raise ValueError(f"Editorial tool identity mismatch: {identity}")
            tool = tools[edit["tool"]]
            if tool["state"] == "failed":
                raise ValueError(f"Cannot present a failed call as successful: {tool['id']}")
            changes.append(
                {
                    "blockId": identity,
                    "sourceTitle": tool["title"],
                    "displayTitle": edit["title"],
                    "sourcePresentation": copy.deepcopy(tool.get("presentation")),
                }
            )
            tool["title"] = edit["title"]
            # The native compact row otherwise repeats the entire shell script
            # after its action. Exact commands remain in input/output and the
            # edit receipt; the film does not expand technical details.
            for item in tool.get("presentation", {}).get("blocks", []):
                if item["type"] == "terminal":
                    item.pop("command", None)
    result["editorial"] = {
        "policy": "Faithful film condensation, not a verbatim transcript; source export unchanged",
        "revision": "standalone-v2",
        "changes": changes,
    }
    return result


def scheduler_evidence(view: dict[str, Any]) -> dict[str, Any]:
    """Extract four actual Slurm observations; never infer intermediate task states."""
    identities = [
        "call_cf161d543394",
        "call_945013eb6482",
        "call_466eba64f0b6",
        "call_7cb59c803d27",
    ]
    tools = {t["id"]: t for t in view["tools"]}
    start = datetime.fromisoformat(tools[identities[0]]["started_at"])
    observations: list[dict[str, Any]] = []
    for identity in identities:
        tool = tools[identity]
        stdout = tool["output"]["structuredContent"]["result"]["result"]["structuredContent"][
            "stdout"
        ]
        states: dict[int, str] = {}
        for line in stdout.splitlines():
            match = re.match(
                r"^16435955_(?:\[(\d+)-(\d+)\]|(\d+))\s+(PENDING|RUNNING|COMPLETED)",
                line,
            )
            if match:
                first = int(match[1] or match[3])
                last = int(match[2] or match[3])
                states.update(dict.fromkeys(range(first, last + 1), match[4]))
            match = re.match(r"^c(\d{2})\s+16435955_\d+\s+(COMPLETED|RUNNING)", line)
            if match:
                states[int(match[1])] = match[2]
        if set(states) != set(range(1, 13)):
            raise ValueError(f"Incomplete captured Slurm observation: {identity}")
        observations.append(
            {
                "callId": identity,
                "recordedAt": tool["completed_at"],
                "elapsedSeconds": round(
                    (datetime.fromisoformat(tool["completed_at"]) - start).total_seconds(), 3
                ),
                "states": [states[n] for n in range(1, 13)],
            }
        )
    return {"jobId": "16435955", "submittedAt": start.isoformat(), "observations": observations}


def excerpt(text: str, limit: int = 520) -> str:
    """Keep a contiguous, sentence-bounded excerpt from the source passage."""
    if len(text) <= limit:
        return text
    end = max(text.rfind(". ", 0, limit), text.rfind("\n\n", 0, limit))
    return text[: end + 1] if end > 80 else text[:limit].rsplit(" ", 1)[0] + "…"


def film_scene(
    folder: Path,
    name: str,
    report: dict[str, Any],
    selected: dict[str, int],
    tool_ids: set[str],
) -> dict[str, Any]:
    """Select real blocks and recorded completions, retaining source order and identities."""
    source = folder / "conversations" / f"{name}.html"
    session = select_session_record(source, None)
    original = json.loads((folder / f"{name}.root-view.json").read_text("utf-8"))
    messages: list[dict[str, Any]] = []
    found: set[str] = set()
    for message in original["messages"]:
        blocks: list[dict[str, Any]] = []
        for block in message["blocks"]:
            if block["id"] in selected:
                blocks.append({**block, "text": excerpt(block["text"], selected[block["id"]])})
                found.add(block["id"])
            elif block["type"] == "tool" and block["tool_id"] in tool_ids:
                blocks.append(block)
        if blocks:
            messages.append({**message, "blocks": blocks})
    if found != selected.keys():
        raise ValueError(f"Missing selected source blocks: {selected.keys() - found}")
    tools = [copy.deepcopy(t) for t in original["tools"] if t["id"] in tool_ids]
    # Export recovery left completed tools marked running. Repair only identities
    # for which the existing evidence ledger records a completion receipt.
    ledger = json.loads(Path("motion/story/engineering-source-ledger.json").read_text("utf-8"))
    repairs = {r["callId"]: r for r in ledger["completionRepairs"]}
    for tool in tools:
        if tool["state"] == "running" and tool["id"] in repairs:
            receipt = repairs[tool["id"]]
            tool["state"] = "succeeded" if receipt["ok"] else "failed"
            tool["completed_at"] = receipt["completedAt"]
    snapshot = copy.deepcopy(report["snapshot"])
    snapshot["sessions"] = {session["id"]: []}
    # The chat's selected blocks contain no inline meshes. Their saved bytes are
    # served by the separate native report, once its publication has been shown.
    snapshot["responses"] = {}
    return {
        "schema": "clio.native-scene.v1",
        "source": {"archive": source.name, "sha256": sha256_file(source)},
        "session": session,
        "view": {**original, "messages": messages, "tools": tools, "artifacts": [], "surfaces": []},
        "snapshot": snapshot,
        "coverage": {"messages": len(messages), "tools": len(tools), "surfaces": 0, "artifacts": 0},
    }


def nearby_tools(folder: Path, name: str, text_ids: list[str]) -> set[str]:
    """Select the first actual tool following each requested public passage."""
    view = json.loads((folder / f"{name}.root-view.json").read_text("utf-8"))
    blocks = [b for m in view["messages"] for b in m["blocks"]]
    selected: set[str] = set()
    for identity in text_ids:
        index = next(i for i, block in enumerate(blocks) if block["id"] == identity)
        for block in blocks[index + 1 :]:
            if block["type"] == "tool":
                selected.add(block["tool_id"])
                break
            if block["type"] == "text":
                break
    return selected


def reflow_report(data: dict[str, Any], kind: str) -> dict[str, Any]:
    """Reflow native controls and viewports while keeping mesh data and selections intact."""
    result = curate_report(data, "e4" if kind == "sweep" else "e5")
    report = result["report"]
    components = {c["id"]: c for c in report["definition"]["components"]}
    if kind == "sweep":
        if "title" in components:
            components["title"]["text"] = "Cantilever parameter study"
        components["matrix"]["children"] = [f"c{n:02}" for n in range(1, 13)]
        for n in range(1, 13):
            components[f"c{n:02}"]["height"] = 160
    else:
        if "bc" in components:
            components["bc"]["title"] = "Applied loads and supports"
        if "geo" in components:
            components["geo"]["text"] = (
                "Half-cantilever geometry: 2 × 1 × 0.5. "
                "The structured mesh preserves the fixed, loaded and symmetry boundary sets."
            )
        components["tMesh"]["children"] = ["filmMeshTitle", "hexViews"]
        components["filmMeshTitle"] = {
            "id": "filmMeshTitle",
            "component": "Text",
            "variant": "h3",
            "text": "HEX8 · 13,824 elements · 15,925 nodes",
        }
        for identity in ("hq", "hb"):
            components[identity]["camera"] = {"path": "/film/camera"}
            components[identity]["height"] = 330
        components["v9s"]["height"] = 400
        components["v9s"]["weight"] = 3
        components["v9s"]["camera"] = {"path": "/film/camera"}
        components["v9s"]["title"] = "Tosca · von Mises stress (unitless test)"
        components["v9s"]["height"] = 310
        components["v1"]["height"] = 310
        # The deck uses E=1 with unitless quantities; the saved MPa label is wrong.
        components["v9s"].pop("units", None)
        components["filmResultTitle"] = {
            "id": "filmResultTitle",
            "component": "Text",
            "text": {"path": "/film/resultTitle"},
            "variant": "h3",
        }
        components["tRes"]["children"] = ["filmResultTitle", "iso", "resViews"]
        components["resViews"]["children"] = {"path": "/film/resultChildren"}
        # Keep the native Row's children static; an adapter chooses the saved
        # result variant before mounting, rather than fabricating a UI selector.
        components["resViews"]["children"] = ["v1", "histChart"]
    report["definition"]["components"] = list(components.values())
    for message in report["surface"]["messages"]:
        if "updateComponents" in message:
            message["updateComponents"]["components"] = list(components.values())
    return result


def prepare(folder: Path, out: Path, ui_source: Path | None = None) -> None:
    """Create selected chat and native reports for the complete engineering film."""
    out.mkdir(parents=True, exist_ok=True)
    project = Path(__file__).resolve().parents[1]
    source = ui_source or Path(
        os.environ.get("CLIO_UI_SOURCE", str(project / "motion/.native-ui/source-ui-f333d67d"))
    )
    logos = source / "web/public/provider-logos"
    if not logos.is_dir():
        raise FileNotFoundError(f"Prepare the pinned UI checkout first: {logos}")
    destination = out / "provider-logos"
    destination.mkdir(exist_ok=True)
    assets: list[dict[str, str]] = []
    for logo in sorted(logos.iterdir()):
        if logo.is_file():
            shutil.copyfile(logo, destination / logo.name)
            assets.append({"Name": logo.name, "Sha256": sha256_file(logo)})
    (out / "engineering-provider-assets.json").write_text(json.dumps(assets, indent=2), "utf-8")
    e4 = json.loads((folder / f"{E4}_dashboard_2.data.json").read_text("utf-8"))
    e5 = json.loads((folder / f"{E5}_dashboard.data.json").read_text("utf-8"))
    script = json.loads((project / "motion/story/engineering-film-copy.json").read_text("utf-8"))
    texts4 = {key: 100_000 for key, value in script["e4"]["blocks"].items() if "text" in value}
    texts5 = {key: 100_000 for key, value in script["e5"]["blocks"].items() if "text" in value}
    tools4 = {value["tool"] for value in script["e4"]["blocks"].values() if "tool" in value}
    tools5 = {value["tool"] for value in script["e5"]["blocks"].values() if "tool" in value}
    values = {
        "film-scene-e4": editorial_scene(film_scene(folder, E4, e4, texts4, tools4), script["e4"]),
        "film-scene-e5": editorial_scene(film_scene(folder, E5, e5, texts5, tools5), script["e5"]),
        "film-sweep": reflow_report(e4, "sweep"),
        "film-studio": reflow_report(e5, "studio"),
        "slurm": scheduler_evidence(
            json.loads((folder / f"{E4}.root-view.json").read_text("utf-8"))
        ),
    }
    fields = copy.deepcopy(values["film-studio"])
    for c in fields["report"]["definition"]["components"]:
        if c["id"] == "resViews":
            c["children"] = ["v9s", "histChart"]
        if c["id"] == "histChart":
            c["dataQuery"] = {"filter": [{"column": "trial", "op": "eq", "value": "T009"}]}
    for message in fields["report"]["surface"]["messages"]:
        if "updateComponents" in message:
            message["updateComponents"]["components"] = fields["report"]["definition"]["components"]
    values["film-fields"] = fields
    comparison = copy.deepcopy(values["film-sweep"])
    smooth = json.loads((folder / "E4b_smoothed_designs_dashboard.data.json").read_text("utf-8"))
    smooth_view = next(
        c for c in smooth["report"]["definition"]["components"] if c["id"] == "cmpMor"
    )
    components = {c["id"]: c for c in comparison["report"]["definition"]["components"]}
    components["root"]["children"] = ["filmCompareTitle", "filmPair"]
    components["filmCompareTitle"] = {
        "id": "filmCompareTitle",
        "component": "Text",
        "variant": "h3",
        "text": "c05 · volume fraction 0.15 · filter radius 0.15",
    }
    components["inspView"]["height"] = 420
    # Both sides need an explicit flex basis. An auto-sized canvas otherwise
    # inherits its previous width and shifts when a fresh render worker opens.
    components["inspView"]["weight"] = 1
    components["inspView"]["title"] = "Morphorm · density ≥ 0.50"
    components["cmpMor"] = {
        **smooth_view,
        "camera": {"path": "/film/camera"},
        "height": 420,
        "weight": 1,
    }
    components["filmPair"] = {
        "id": "filmPair",
        "component": "Row",
        "children": ["inspView", "cmpMor"],
    }
    comparison["report"]["definition"]["components"] = list(components.values())
    for m in comparison["report"]["surface"]["messages"]:
        if "updateComponents" in m:
            m["updateComponents"]["components"] = list(components.values())
    comparison["snapshot"]["responses"].update(smooth["snapshot"]["responses"])
    values["film-comparison"] = comparison
    for name, value in values.items():
        (out / f"engineering-{name}.json").write_text(
            json.dumps(value, ensure_ascii=False), "utf-8"
        )
    print(json.dumps({"prepared": str(out), "files": list(values)}))


def main() -> None:
    """Prepare bounded film assets on the project drive."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder", type=Path)
    parser.add_argument("--out", type=Path, default=Path("motion/.native-ui/engineering-data"))
    parser.add_argument("--ui-source", type=Path)
    args = parser.parse_args()
    prepare(args.folder, args.out, args.ui_source)


if __name__ == "__main__":
    main()
