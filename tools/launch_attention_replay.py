"""Check and launch recorded CLIO attention using existing local captures and tokenizer."""

from __future__ import annotations

import argparse
import json
import os
import shlex
import socket
import subprocess
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any, cast

from audit_attention_bundle import audit_bundle

UI_REVISION = "f333d67d490174d2f2b82d7c0671e08ee0943ceb"
# The same boundary-trimming fix was published on epic-hopper as 2ff404f.
# c0d2557 is the equivalent isolated checkout used for the original local demo.
BACKEND_FIXES = (
    "2ff404fbe376d0fc39dc34e79ff569c9dfeb3c60",
    "c0d25575d54382d018dbb1383f980d71197e80ce",
)
SERVER_MODULE = "tests.test_gact.test_attention.serve_recorded_bundle"


@dataclass(frozen=True)
class Command:
    """One foreground process, with only its explicit environment overrides recorded."""

    cwd: Path
    argv: tuple[str, ...]
    environment: dict[str, str]

    def describe(self) -> dict[str, Any]:
        """Return a serializable launch recipe without disclosing inherited secrets."""
        return {"cwd": str(self.cwd), "argv": list(self.argv), "environment": self.environment}


@dataclass(frozen=True)
class LaunchPlan:
    """Validated local sources and commands; constructing a plan writes nothing."""

    bundle: Path
    runtime: Path
    captures: Path
    tokenizer: Path
    staged_bundle: Path
    summary: dict[str, Any]
    backend: Command
    ui: Command
    backend_port: int
    ui_port: int

    def describe(self) -> dict[str, Any]:
        """Describe both launch commands and the immutable inputs they consume."""
        return {
            "schema": "clio.recorded-attention-launch.v1",
            "bundle": str(self.bundle),
            "runtime": str(self.runtime),
            "captures": str(self.captures),
            "tokenizer": str(self.tokenizer),
            "servedBundle": str(self.staged_bundle),
            "summary": self.summary,
            "backend": self.backend.describe(),
            "ui": self.ui.describe(),
            "backendUrl": f"http://127.0.0.1:{self.backend_port}",
            "uiUrl": f"http://127.0.0.1:{self.ui_port}",
        }


def git_output(root: Path, *args: str) -> subprocess.CompletedProcess[str]:
    """Read checkout metadata without fetching, switching branches or changing files."""
    return subprocess.run(
        ["git", "-C", str(root), *args], capture_output=True, text=True, check=False
    )


def checkout_revision(root: Path, *, frontend: bool) -> str:
    """Require the pinned UI or a backend containing a qualified mapping fix."""
    head = git_output(root, "rev-parse", "HEAD")
    if head.returncode:
        raise ValueError(f"Not a Git checkout: {root}")
    revision = head.stdout.strip()
    changes = git_output(root, "status", "--porcelain", "--untracked-files=no")
    if changes.returncode or changes.stdout.strip():
        raise ValueError(f"Use a clean isolated checkout: {root}")
    if frontend:
        if revision != UI_REVISION:
            raise ValueError(f"UI must be pinned to {UI_REVISION}; found {revision}")
    elif not any(
        git_output(root, "merge-base", "--is-ancestor", fix, "HEAD").returncode == 0
        for fix in BACKEND_FIXES
    ):
        raise ValueError(
            "Backend needs the transcript-offset fix 2ff404f from "
            "claude/epic-hopper-6s2vhn; fetch its history or use a qualified checkout"
        )
    return revision


def inspect_inputs(bundle: Path, captures: Path, tokenizer: Path) -> dict[str, Any]:
    """Check source identities, local tokenizer files and descriptor paths/sizes."""
    for path in (bundle / "sessions", bundle / "flowcept", captures, tokenizer):
        if not path.is_dir():
            raise ValueError(f"Missing directory: {path}; point at the unzipped bundle root")
    config_path = tokenizer / "tokenizer_config.json"
    if not (tokenizer / "tokenizer.json").is_file() or not config_path.is_file():
        raise ValueError("Tokenizer needs tokenizer.json and tokenizer_config.json locally")
    config = json.loads(config_path.read_text("utf-8"))
    if not (tokenizer / "chat_template.jinja").is_file() and not config.get("chat_template"):
        raise ValueError("The matching captured chat template is missing from the tokenizer")
    sessions: list[dict[str, str]] = []
    for filename in sorted((bundle / "sessions").glob("*.export.json")):
        export = cast(dict[str, Any], json.loads(filename.read_text("utf-8")))
        entries = [export, *cast(list[dict[str, Any]], export.get("children") or [])]
        for row in entries:
            session = cast(dict[str, Any], row["session"])
            sessions.append({"id": session["id"], "title": session.get("title", "")})
    if not sessions:
        raise ValueError("No sessions/*.export.json records found")
    raw: Any = json.loads((bundle / "flowcept/decode_attention.json").read_text("utf-8"))
    if not isinstance(raw, list) or not raw:
        raise ValueError("No recorded decode_attention documents found")
    records = cast(list[dict[str, Any]], raw)
    for record in records:
        descriptor = record["attention_stats"]
        filename = descriptor["uri"].rsplit("/", 1)[-1]
        path = (captures / record["workflow_id"] / filename).resolve()
        if not path.is_relative_to(captures):
            raise ValueError("Capture descriptor escapes the capture root")
        if not path.is_file() or path.stat().st_size != descriptor["bytes"]:
            raise ValueError(f"Missing capture or byte-size mismatch: {path}")
    metadata = bundle / "metadata.json"
    return {
        "sessions": sessions,
        "captureDocuments": len(records),
        "model": json.loads(metadata.read_text("utf-8")).get("model")
        if metadata.is_file()
        else None,
        "integrity": "paths and byte sizes checked; backend verifies SHA-256 when reading captures",
    }


def build_plan(
    repository: Path,
    bundle: Path,
    agent: Path,
    ui: Path,
    *,
    runtime: Path | None = None,
    captures: Path | None = None,
    tokenizer: Path | None = None,
    branding: Path | None = None,
    backend_port: int = 18825,
    ui_port: int = 4394,
) -> LaunchPlan:
    """Resolve a real backend/UI pair and local assets without installing or modifying inputs."""
    repository, bundle, agent, ui = (p.resolve() for p in (repository, bundle, agent, ui))
    runtime = (
        runtime or repository / "motion/.native-ui/attention-replay-review" / bundle.name
    ).resolve()
    if runtime.anchor.casefold() != repository.anchor.casefold():
        raise ValueError("Keep replay state on the project drive; no OS-drive fallback")
    if "attention-replay-review" not in runtime.parts:
        raise ValueError("State path must contain an attention-replay-review directory")
    if any(not 1 <= port <= 65535 for port in (backend_port, ui_port)) or backend_port == ui_port:
        raise ValueError("Choose two distinct ports between 1 and 65535")
    captures = (captures or bundle / "captures").resolve()
    tokenizer = (tokenizer or bundle / "tokenizer").resolve()
    if any(runtime.is_relative_to(source) for source in (bundle, captures, tokenizer)):
        raise ValueError("Runtime state must stay outside immutable input directories")
    branding = (branding or agent / "branding").resolve()
    summary = inspect_inputs(bundle, captures, tokenizer)
    summary["backendRevision"] = checkout_revision(agent, frontend=False)
    summary["uiRevision"] = checkout_revision(ui, frontend=True)
    server = agent / "tests/test_gact/test_attention/serve_recorded_bundle.py"
    vite = ui / "web/node_modules/vite/bin/vite.js"
    config = repository / "motion/native/manual.vite.config.mjs"
    for path in (server, vite, config, branding / "clio/brand.json"):
        if not path.is_file():
            raise ValueError(f"Missing prerequisite: {path}; follow MANUAL-ATTENTION.md")
    staged = (
        runtime / "bundle"
        if captures != bundle / "captures" or tokenizer != bundle / "tokenizer"
        else bundle
    )
    temporary = str(runtime / "tmp")
    common = {"TEMP": temporary, "TMP": temporary, "TMPDIR": temporary}
    backend = Command(
        agent,
        (
            "uv",
            "run",
            "--frozen",
            "--no-sync",
            "python",
            "-B",
            "-m",
            SERVER_MODULE,
            str(staged),
            "--port",
            str(backend_port),
            "--ui-origin",
            f"http://127.0.0.1:{ui_port}",
        ),
        {
            **common,
            "CLIO_AGENT_HOME": str(runtime / "home"),
            "HF_HOME": str(runtime / "huggingface"),
            "HF_HUB_OFFLINE": "1",
            "TRANSFORMERS_OFFLINE": "1",
        },
    )
    frontend = Command(
        ui / "web",
        ("node", str(vite), "--config", str(config), "--port", str(ui_port), "--host", "127.0.0.1"),
        {
            **common,
            "CLIO_UI_SOURCE": str(ui),
            "CLIO_MANUAL_BRANDING": str(branding),
            "CLIO_MANUAL_CACHE": str(runtime / "vite"),
        },
    )
    return LaunchPlan(
        bundle,
        runtime,
        captures,
        tokenizer,
        staged,
        summary,
        backend,
        frontend,
        backend_port,
        ui_port,
    )


def link_directory(link: Path, target: Path) -> None:
    """Reuse source directories without copying captures or replacing an existing path."""
    if link.exists() or link.is_symlink():
        if link.resolve() != target.resolve():
            raise ValueError(f"Runtime path belongs to another source: {link}")
        return
    if os.name == "nt":
        subprocess.run(
            ["cmd", "/c", "mklink", "/J", str(link), str(target)], check=True, capture_output=True
        )
    else:
        link.symlink_to(target, target_is_directory=True)


def prepare_runtime(plan: LaunchPlan, *, backend: bool) -> None:
    """Create only isolated runtime state and optional directory links to local input assets."""
    (plan.runtime / "tmp").mkdir(parents=True, exist_ok=True)
    if not backend or plan.staged_bundle == plan.bundle:
        return
    plan.staged_bundle.mkdir(exist_ok=True)
    for name in ("sessions", "flowcept", "journal"):
        if (plan.bundle / name).is_dir():
            link_directory(plan.staged_bundle / name, plan.bundle / name)
    link_directory(plan.staged_bundle / "captures", plan.captures)
    link_directory(plan.staged_bundle / "tokenizer", plan.tokenizer)
    metadata = plan.bundle / "metadata.json"
    destination = plan.staged_bundle / "metadata.json"
    if metadata.is_file():
        content = metadata.read_bytes()
        if destination.exists() and destination.read_bytes() != content:
            raise ValueError("Runtime metadata belongs to another bundle")
        if not destination.exists():
            with destination.open("xb") as stream:
                stream.write(content)


def run_command(plan: LaunchPlan, *, backend: bool) -> int:
    """Run the upstream replay server or native UI in the current terminal, never killing a port owner."""
    port = plan.backend_port if backend else plan.ui_port
    with socket.socket() as probe:
        try:
            probe.bind(("127.0.0.1", port))
        except OSError as error:
            raise ValueError(
                f"Port {port} is occupied; reuse its server or choose another port"
            ) from error
    prepare_runtime(plan, backend=backend)
    command = plan.backend if backend else plan.ui
    environment = {**os.environ, **command.environment}
    environment.pop("VIRTUAL_ENV", None)
    try:
        return subprocess.run(
            command.argv, cwd=command.cwd, env=environment, check=False
        ).returncode
    except KeyboardInterrupt:
        return 130


def shell_recipe(command: Command, shell: str) -> str:
    """Format an inspectable foreground command for PowerShell or a POSIX shell."""
    if shell == "powershell":

        def quote(value: str) -> str:
            return "'" + value.replace("'", "''") + "'"

        return "\n".join(
            [
                f"Set-Location -LiteralPath {quote(str(command.cwd))}",
                f"New-Item -ItemType Directory -Force -Path {quote(command.environment['TEMP'])} | Out-Null",
            ]
            + [f"$env:{key} = {quote(value)}" for key, value in command.environment.items()]
            + ["& " + " ".join(quote(value) for value in command.argv)]
        )
    return "\n".join(
        [
            "cd " + shlex.quote(str(command.cwd)),
            "mkdir -p " + shlex.quote(command.environment["TEMP"]),
        ]
        + [f"export {key}={shlex.quote(value)}" for key, value in command.environment.items()]
        + [shlex.join(command.argv)]
    )


def main(argv: Sequence[str] | None = None) -> int:
    """Check inputs, print launch recipes or run either foreground process."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("check", "plan", "backend", "ui"))
    parser.add_argument("--bundle", required=True, type=Path)
    parser.add_argument("--agent-source", required=True, type=Path)
    parser.add_argument("--ui-source", required=True, type=Path)
    parser.add_argument("--state-root", type=Path)
    parser.add_argument("--captures-dir", type=Path)
    parser.add_argument("--tokenizer-dir", type=Path)
    parser.add_argument("--branding", type=Path)
    parser.add_argument("--backend-port", type=int, default=18825)
    parser.add_argument("--ui-port", type=int, default=4394)
    parser.add_argument("--verify-captures", action="store_true")
    parser.add_argument(
        "--shell",
        choices=("powershell", "bash"),
        default="powershell" if os.name == "nt" else "bash",
    )
    args = parser.parse_args(argv)
    try:
        plan = build_plan(
            Path(__file__).resolve().parents[1],
            args.bundle,
            args.agent_source,
            args.ui_source,
            runtime=args.state_root,
            captures=args.captures_dir,
            tokenizer=args.tokenizer_dir,
            branding=args.branding,
            backend_port=args.backend_port,
            ui_port=args.ui_port,
        )
        if args.verify_captures:
            result = audit_bundle(plan.bundle, captures_dir=plan.captures)
            plan.summary["sha256AndTensorLayoutsVerified"] = result["verified"]
        if args.action == "check":
            print(json.dumps(plan.describe(), indent=2))
        elif args.action == "plan":
            print("# Backend terminal\n" + shell_recipe(plan.backend, args.shell))
            print("\n# UI terminal\n" + shell_recipe(plan.ui, args.shell))
            if plan.staged_bundle != plan.bundle:
                print(
                    "\n# External assets require the backend launcher to stage directory links first."
                )
        else:
            return run_command(plan, backend=args.action == "backend")
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
        parser.exit(2, f"Replay launch failed: {error}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
