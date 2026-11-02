"""Export source-bound prompt excerpts for the composable-agent social film.

This calls CLIO's real prompt composer on selected installed fragments. It does
not emulate plugin resolution, invoke a model, or execute any tool or MCP server.
Full source fragments and checksums accompany the shorter displayed excerpts.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib
import json
import subprocess
import sys
from pathlib import Path
from typing import Any


def file_receipt(path: Path, root: Path) -> dict[str, str]:
    """Describe immutable source bytes without embedding a machine-specific path."""
    return {
        "path": path.relative_to(root).as_posix(),
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
    }


def git_revision(root: Path) -> str:
    """Return the source checkout revision, failing when it cannot be identified."""
    return subprocess.check_output(["git", "-C", str(root), "rev-parse", "HEAD"], text=True).strip()


def prepare(backend: Path, marketplace: Path, ui: Path | None = None) -> dict[str, Any]:
    """Compose genuine identities and selected fragments from local CLIO sources."""
    backend, marketplace = backend.resolve(), marketplace.resolve()
    for path in (backend / "src/clio_agent/plugins/compose.py", marketplace / "agents/standard.py"):
        if not path.is_file():
            raise FileNotFoundError(path)
    sys.dont_write_bytecode = True
    sys.path[:0] = [str(backend / "src"), str(marketplace)]
    composer = importlib.import_module("clio_agent.plugins.compose")
    loader = importlib.import_module("clio_agent.plugins.loader")
    classes = {
        "standard": ("standard", "StandardAgent"),
        "factorio": ("factorio", "Factorio"),
        "earthscope": ("earthscope", "Earthscope"),
        "appl-core": ("appl_core", "ApplCore"),
        "clio-data": ("clio_data", "ClioData"),
    }
    agents: dict[str, Any] = {}
    receipts = [file_receipt(marketplace / "agents/standard.py", marketplace)]
    for key, (module, name) in classes.items():
        agents[key] = getattr(importlib.import_module(f"agents.{module}"), name)
        receipt = file_receipt(marketplace / f"agents/{module}.py", marketplace)
        if receipt not in receipts:
            receipts.append(receipt)
    fragments: dict[str, tuple[str, Any]] = {}
    for plugin in ("shell", "workspace", "slurm"):
        root = marketplace / "plugins" / plugin
        record = loader.load_plugin(root, marketplace="clio", trusted=False)
        for fragment in record.fragments:
            fragments[fragment.id] = (plugin, fragment)
    common = ["workspace.grounding", "shell.runtime"]
    recipes: list[tuple[str, str, list[str], list[str], list[str]]] = [
        ("clio", "standard", [], [], []),
        ("clio-slurm", "standard", ["slurm"], [], ["slurm.capabilities"]),
        ("factorio", "factorio", [], [], ["slurm.capabilities"]),
        ("factorio-ndp", "factorio", ["ndp"], [], ["slurm.capabilities"]),
        ("earthscope", "earthscope", [], [], []),
        ("opal", "appl-core", [], [], []),
        ("clio-data", "clio-data", [], [], []),
    ]
    snapshots: list[dict[str, Any]] = []
    # These are actual shared tools named by the fragment conditions; all are
    # carried by standard's workspace/shell/delegation plugins. This is an
    # excerpt composition, explicitly not a substitute for full resolution.
    supported_tools = [
        "fs_read_file",
        "prepare_execution_runtime",
        "shell_bash",
        "spawn_skill_task",
    ]
    for snapshot_id, agent_id, additions, removals, extra_fragments in recipes:
        agent = agents[agent_id]
        plugin_ids = [p for p in agent.plugins if p not in removals]
        plugin_ids += [p for p in additions if p not in plugin_ids]
        chosen = [fragments[key] for key in common + extra_fragments]
        prompt = composer.compose(
            identity={"id": agent_id, "name": agent.name, "role": agent.role},
            fragments=chosen,
            tools=supported_tools,
            plugins=plugin_ids,
            environ={},
        )
        mcp: dict[str, Any] = {}
        for plugin in plugin_ids:
            config = marketplace / "plugins" / plugin / "mcp.json"
            if config.is_file():
                mcp.update(json.loads(config.read_text(encoding="utf-8")).get("mcpServers", {}))
        skills = ["hpc-batch-jobs"] if "slurm" in plugin_ids else []
        snapshots.append(
            {
                "id": snapshot_id,
                "agent": {
                    "id": agent_id,
                    "name": agent.name,
                    "role": agent.role,
                    "ref": f"clio/{agent_id}",
                },
                "plugins": plugin_ids,
                "delta": {"add": additions, "remove": removals},
                "skills": skills,
                "mcpServers": sorted(mcp),
                "prompt": prompt.to_dict(),
            }
        )
    used = common + ["slurm.capabilities"]
    for key in used:
        plugin, fragment = fragments[key]
        receipts.append(file_receipt(marketplace / "plugins" / plugin / fragment.path, marketplace))
    for path in (
        "plugins/ndp/plugin.json",
        "plugins/ndp/mcp.json",
        "plugins/slurm/plugin.json",
        "plugins/slurm/skills/hpc-batch-jobs/SKILL.md",
    ):
        receipts.append(file_receipt(marketplace / path, marketplace))
    payload: dict[str, Any] = {
        "schema": "clio.composable-prompts.v1",
        "scope": "Selected real prompt fragments composed by CLIO; not a full resolved prompt or recorded inference.",
        "backend": {
            "repository": "https://github.com/iowarp/clio-agent",
            "revision": git_revision(backend),
            "composer": file_receipt(backend / "src/clio_agent/plugins/compose.py", backend),
        },
        "marketplace": {
            "repository": "https://github.com/iowarp/clio-agent-marketplace",
            "revision": git_revision(marketplace),
            "files": receipts,
        },
        "snapshots": snapshots,
    }
    if ui is not None:
        ui = ui.resolve()
        payload["ui"] = {
            "repository": "https://github.com/iowarp/gact-tui",
            "revision": git_revision(ui),
            "files": [
                file_receipt(ui / path, ui)
                for path in (
                    "web/src/components/clio/composed-prompt-view.tsx",
                    "web/src/components/clio/agent-composition-view.tsx",
                    "web/src/components/clio/session-agent-control.tsx",
                    "web/src/lib/plugin-presentation.ts",
                    "web/src/theme/themes.css",
                )
            ],
        }
    return payload


def main() -> None:
    """Write reproducible prompt inputs from explicitly selected source checkouts."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backend-source", type=Path, required=True)
    parser.add_argument("--marketplace-source", type=Path, required=True)
    parser.add_argument("--ui-source", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    payload = prepare(args.backend_source, args.marketplace_source, args.ui_source)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Saved {len(payload['snapshots'])} source-bound configurations to {args.out}")


if __name__ == "__main__":
    main()
