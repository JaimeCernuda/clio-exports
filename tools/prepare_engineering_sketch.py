"""Prepare bounded, source-linked native engineering inspection sketches."""

from __future__ import annotations

import argparse
import copy
import json
from pathlib import Path
from typing import Any

from index_exports import sha256_file
from prepare_native_scene import select_session_record


def curate_report(data: dict[str, Any], kind: str) -> dict[str, Any]:
    """Reflow captured components without replacing their meshes, queries or bindings."""
    result = copy.deepcopy(data)
    report = result["report"]
    components = {item["id"]: item for item in report["definition"]["components"]}
    if kind == "e4":
        components["root"]["children"] = ["threshold", "matrix", "caseRow"]
        components["matrix"]["columns"] = 3
        components["matrix"]["children"] = [f"c{number:02}" for number in range(1, 7)]
        for number in range(1, 13):
            components[f"c{number:02}"]["height"] = 160
            components[f"c{number:02}"]["camera"] = {"path": "/film/camera"}
        components["inspView"]["height"] = 310
        components["inspView"]["camera"] = {"path": "/film/camera"}
        components["tableFrame"]["weight"] = 1
        components["inspFrame"]["weight"] = 1
        components["inspFrame"].pop("description", None)
        keep = {"case", "volume_fraction", "filter_radius", "compliance_final", "runtime"}
        components["caseTable"]["columns"] = [
            column for column in components["caseTable"]["columns"] if column["key"] in keep
        ]
    elif kind == "e5":
        components["root"]["children"] = ["tabs"]
        components["tMesh"]["children"] = ["geo", "hexRow", "hexViews"]
        components["fMc"]["children"] = ["m1", "m2", "m3", "m6"]
        components["tSetup"]["children"] = ["bc", "fM"]
        components["tRes"]["children"] = ["iso", "resViews"]
        components["resViews"]["children"] = ["v1", "histChart"]
        components["v1"]["height"] = 400
        components["v1"]["weight"] = 3
        components["v1"]["camera"] = {"path": "/film/camera"}
        components["v1"]["title"] = {"path": "/film/historyTitle"}
        components["histChart"]["height"] = 330
        components["histChart"]["weight"] = 2
        components["histChart"]["dataQuery"] = {
            "filter": [{"column": "trial", "op": "eq", "value": "T001"}]
        }
        components["tSaved"]["children"] = ["savedT"]
        components["savedT"]["columns"] = [
            {"key": key, "label": label}
            for key, label in [
                ("trial", "Trial"),
                ("solver", "Solver"),
                ("job", "Job"),
                ("iterations", "Iterations"),
                ("objective_final", "Final objective"),
                ("final_volume_fraction", "Volume fraction"),
            ]
        ]
        report["definition"]["data_model"]["film"] = {
            "historyTitle": "T001 · Morphorm · iteration 10/10"
        }
        for message in report["surface"]["messages"]:
            if "updateDataModel" in message:
                message["updateDataModel"]["value"]["film"] = report["definition"]["data_model"][
                    "film"
                ]
    else:
        raise ValueError(f"Unknown report kind: {kind}")
    report["definition"]["components"] = list(components.values())
    for message in report["surface"]["messages"]:
        if "updateComponents" in message:
            message["updateComponents"]["components"] = list(components.values())
    return result


def selected_scene(folder: Path, report_data: dict[str, Any]) -> dict[str, Any]:
    """Retain actual public explanations and successful dashboard creation tools in order."""
    original = folder / "conversations/E4_cantilever_parameter_sweep.html"
    session = select_session_record(original, None)
    view: dict[str, Any] = json.loads(
        (folder / "E4_cantilever_parameter_sweep.root-view.json").read_text("utf-8")
    )
    wanted = {
        "part_9bf7633cb257",
        "live_call_23277d5d44c4_call",
        "part_96e693507d0f",
        "live_call_3f18681336ca_call",
        "part_fb6ffff07447",
        "live_call_91db385f0ba0_call",
        "part_cc9122f681de",
        "part_509df9b4aea1",
    }
    messages: list[dict[str, Any]] = []
    for message in view["messages"]:
        blocks = [block for block in message["blocks"] if block["id"] in wanted]
        if blocks:
            messages.append({**message, "blocks": blocks})
    found = {block["id"] for message in messages for block in message["blocks"]}
    if found != wanted:
        raise ValueError(f"Missing native blocks: {wanted - found}")
    calls = {
        block["tool_id"]
        for message in messages
        for block in message["blocks"]
        if block["type"] == "tool"
    }
    selected = {
        **view,
        "messages": messages,
        "tools": [tool for tool in view["tools"] if tool["id"] in calls],
        "artifacts": [],
        "surfaces": [],
    }
    snapshot = copy.deepcopy(report_data["snapshot"])
    snapshot["sessions"][session["id"]] = []
    return {
        "schema": "clio.native-scene.v1",
        "source": {"archive": original.name, "sha256": sha256_file(original)},
        "session": session,
        "view": selected,
        "snapshot": snapshot,
        "coverage": {"messages": len(messages), "tools": len(calls), "surfaces": 0, "artifacts": 0},
    }


def prepare(folder: Path, out: Path) -> dict[str, Any]:
    """Write only selected saved dependencies; preserve original exports byte for byte."""
    e4 = json.loads(
        (folder / "E4_cantilever_parameter_sweep_dashboard_2.data.json").read_text("utf-8")
    )
    e5 = json.loads(
        (folder / "E5_topology_optimization_studio_dashboard.data.json").read_text("utf-8")
    )
    scene = selected_scene(folder, e4)
    out.mkdir(parents=True, exist_ok=True)
    for name, data in [
        ("e4", curate_report(e4, "e4")),
        ("e5", curate_report(e5, "e5")),
        ("scene", scene),
    ]:
        (out / f"engineering-{name}.json").write_text(json.dumps(data, ensure_ascii=False), "utf-8")
    receipt = {
        "schema": "clio.engineering-sketch-source.v1",
        "uiCommit": "f333d67d490174d2f2b82d7c0671e08ee0943ceb",
        "e4": scene["source"],
        "blocks": [
            block["id"] for message in scene["view"]["messages"] for block in message["blocks"]
        ],
        "editing": "Native component reflow; selected columns; native camera binding added. All mesh bytes, queries, source values and existing selection bindings retained.",
        "liveJobs": False,
    }
    (out / "engineering-sources.json").write_text(json.dumps(receipt, indent=2) + "\n", "utf-8")
    return receipt


def main() -> None:
    """Prepare a local sketch from the decoded source inventory."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder", type=Path)
    parser.add_argument("--out", type=Path, default=Path("motion/.native-ui/engineering-data"))
    args = parser.parse_args()
    receipt = prepare(args.folder, args.out)
    print(json.dumps({"prepared": str(args.out), "blocks": len(receipt["blocks"])}))


if __name__ == "__main__":
    main()
