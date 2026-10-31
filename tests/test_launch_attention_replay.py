"""Exercise local replay preflight, read-only staging and real foreground process handling."""

from __future__ import annotations

import json
import shlex
import socket
import subprocess
import sys
from dataclasses import replace
from pathlib import Path
from typing import Any

import launch_attention_replay as launcher
import pytest
from audit_attention_bundle import audit_bundle
from test_attention_capture import bundle_fixture


@pytest.fixture
def inputs(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> dict[str, Path]:
    """Create tiny source files and installed-tool paths; Git checks have separate tests."""
    repo, bundle, agent, ui = (tmp_path / name for name in ("repo", "source", "agent", "ui"))
    bundle.mkdir()
    bundle_fixture(bundle)
    (bundle / "sessions").mkdir()
    (bundle / "sessions/main.export.json").write_text(
        json.dumps({"session": {"id": "main"}, "children": [{"session": {"id": "spotter"}}]}),
        "utf-8",
    )
    (bundle / "tokenizer").mkdir()
    (bundle / "tokenizer/tokenizer.json").write_text("{}", "utf-8")
    (bundle / "tokenizer/tokenizer_config.json").write_text('{"chat_template":"template"}', "utf-8")
    for path in (
        agent / "tests/test_gact/test_attention/serve_recorded_bundle.py",
        agent / "branding/clio/brand.json",
        ui / "web/node_modules/vite/bin/vite.js",
        repo / "motion/native/manual.vite.config.mjs",
    ):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("fixture", "utf-8")

    def revision(root: Path, *, frontend: bool) -> str:
        return "test-head"

    monkeypatch.setattr(launcher, "checkout_revision", revision)
    return {"repository": repo, "bundle": bundle, "agent": agent, "ui": ui}


def make_plan(inputs: dict[str, Path], **kwargs: Any) -> launcher.LaunchPlan:
    """Build a plan against test-local inputs without writing a runtime directory."""
    return launcher.build_plan(**inputs, **kwargs)


def test_check_is_read_only_and_commands_keep_local_assets(inputs: dict[str, Path]) -> None:
    """Preflight finds both transcripts, pins inputs and leaves runtime creation to launch."""
    plan = make_plan(inputs, backend_port=18925, ui_port=4396)
    assert not plan.runtime.exists()
    assert plan.staged_bundle == plan.bundle
    assert plan.summary["captureDocuments"] == 1
    assert [s["id"] for s in plan.summary["sessions"]] == ["main", "spotter"]
    assert "--no-sync" in plan.backend.argv
    assert launcher.SERVER_MODULE in plan.backend.argv
    assert plan.backend.argv[-1] == "http://127.0.0.1:4396"
    assert plan.ui.argv[-3:] == ("4396", "--host", "127.0.0.1")
    assert plan.backend.environment["HF_HUB_OFFLINE"] == "1"
    assert plan.backend.environment["TRANSFORMERS_OFFLINE"] == "1"
    assert "attention-replay-review" in plan.backend.environment["CLIO_AGENT_HOME"]
    assert plan.ui.environment["CLIO_MANUAL_CACHE"] == str(plan.runtime / "vite")
    json.dumps(plan.describe())


def test_external_assets_stage_links_without_copying_or_changing_sources(
    inputs: dict[str, Path], tmp_path: Path
) -> None:
    """Use real junctions/symlinks and verify the same SafeTensors bytes through the runtime view."""
    captures, tokenizer = tmp_path / "external-captures", tmp_path / "external-tokenizer"
    (inputs["bundle"] / "captures").rename(captures)
    (inputs["bundle"] / "tokenizer").rename(tokenizer)
    plan = make_plan(inputs, captures=captures, tokenizer=tokenizer)
    before = (captures / "workflow/tensor.safetensors").read_bytes()
    assert not plan.runtime.exists()
    launcher.prepare_runtime(plan, backend=True)
    assert (plan.staged_bundle / "captures").resolve() == captures.resolve()
    assert (plan.staged_bundle / "tokenizer").resolve() == tokenizer.resolve()
    assert (plan.staged_bundle / "sessions").resolve() == (inputs["bundle"] / "sessions").resolve()
    assert audit_bundle(plan.staged_bundle)["verified"] == 1
    assert audit_bundle(plan.bundle, captures_dir=captures)["verified"] == 1
    assert (captures / "workflow/tensor.safetensors").read_bytes() == before
    assert not (inputs["bundle"] / "captures").exists()
    launcher.prepare_runtime(plan, backend=True)
    with pytest.raises(ValueError, match="another source"):
        launcher.link_directory(plan.staged_bundle / "captures", tokenizer)


def test_missing_tokenizer_template_capture_and_unsafe_paths_fail(
    inputs: dict[str, Path], tmp_path: Path
) -> None:
    """Absent inputs, corrupt descriptors and accidental source writes cannot pass preflight."""
    tokenizer = inputs["bundle"] / "tokenizer/tokenizer_config.json"
    tokenizer.write_text("{}", "utf-8")
    with pytest.raises(ValueError, match="chat template"):
        make_plan(inputs)
    tokenizer.write_text('{"chat_template":"template"}', "utf-8")
    with pytest.raises(ValueError, match="immutable"):
        make_plan(inputs, runtime=inputs["bundle"] / "attention-replay-review/state")
    with pytest.raises(ValueError, match="State path"):
        make_plan(inputs, runtime=tmp_path / "unrelated")
    for ports in ({"backend_port": 0}, {"ui_port": 18825}):
        with pytest.raises(ValueError, match="distinct ports"):
            make_plan(inputs, **ports)
    manifest = inputs["bundle"] / "flowcept/decode_attention.json"
    records = json.loads(manifest.read_text("utf-8"))
    records[0]["workflow_id"] = "../../escape"
    manifest.write_text(json.dumps(records), "utf-8")
    with pytest.raises(ValueError, match="escapes"):
        make_plan(inputs)
    records[0]["workflow_id"] = "missing"
    manifest.write_text(json.dumps(records), "utf-8")
    with pytest.raises(ValueError, match="Missing capture"):
        make_plan(inputs)


def test_checkout_pins_and_mapping_fix_are_required(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Reject dirty/wrong UI and missing backend fix; allow the published qualified lineage."""

    def git(root: Path, *args: str) -> subprocess.CompletedProcess[str]:
        output = launcher.UI_REVISION if args == ("rev-parse", "HEAD") else ""
        return subprocess.CompletedProcess(args, 0, output, "")

    monkeypatch.setattr(launcher, "git_output", git)
    assert launcher.checkout_revision(tmp_path, frontend=True) == launcher.UI_REVISION
    assert launcher.checkout_revision(tmp_path, frontend=False) == launcher.UI_REVISION

    def dirty(root: Path, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.CompletedProcess(args, 0, "dirty", "")

    monkeypatch.setattr(launcher, "git_output", dirty)
    with pytest.raises(ValueError, match="clean isolated"):
        launcher.checkout_revision(tmp_path, frontend=True)

    def no_fix(root: Path, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.CompletedProcess(
            args,
            1 if args[0] == "merge-base" else 0,
            "" if args[0] == "status" else "wrong-head",
            "",
        )

    monkeypatch.setattr(launcher, "git_output", no_fix)
    with pytest.raises(ValueError, match="pinned"):
        launcher.checkout_revision(tmp_path, frontend=True)
    with pytest.raises(ValueError, match="transcript-offset fix"):
        launcher.checkout_revision(tmp_path, frontend=False)


def test_real_foreground_process_gets_isolated_environment_and_exit_code(
    inputs: dict[str, Path], tmp_path: Path
) -> None:
    """Launch a real child process and preserve its exit status, without a background service."""
    plan = make_plan(inputs)
    output = tmp_path / "child.json"
    program = "import json,os,sys;from pathlib import Path;Path(sys.argv[1]).write_text(json.dumps({'temp':os.environ['TEMP'],'cwd':os.getcwd()}));sys.exit(7)"
    command = launcher.Command(
        plan.backend.cwd, (sys.executable, "-c", program, str(output)), plan.backend.environment
    )
    with socket.socket() as port:
        port.bind(("127.0.0.1", 0))
        occupied = port.getsockname()[1]
        with pytest.raises(ValueError, match="occupied"):
            launcher.run_command(replace(plan, backend_port=occupied), backend=True)
    with socket.socket() as port:
        port.bind(("127.0.0.1", 0))
        available = port.getsockname()[1]
    assert (
        launcher.run_command(replace(plan, backend=command, backend_port=available), backend=True)
        == 7
    )
    receipt = json.loads(output.read_text("utf-8"))
    assert receipt["temp"] == str(plan.runtime / "tmp")
    assert Path(receipt["cwd"]) == plan.backend.cwd


def test_shell_recipes_quote_arguments_and_cli_help(inputs: dict[str, Path]) -> None:
    """Printed commands preserve literal paths and support inspectable offline setup."""
    plan = make_plan(inputs)
    command = launcher.Command(plan.backend.cwd, ("node", "a'b $() file.js"), plan.ui.environment)
    assert "'a''b $() file.js'" in launcher.shell_recipe(command, "powershell")
    assert shlex.split(launcher.shell_recipe(command, "bash").splitlines()[-1]) == list(
        command.argv
    )
    script = Path(launcher.__file__)
    result = subprocess.run(
        [sys.executable, str(script), "--help"], capture_output=True, text=True, check=False
    )
    assert result.returncode == 0
    assert "--tokenizer-dir" in result.stdout
    assert "--captures-dir" in result.stdout


def test_foreground_interrupt_returns_without_traceback(
    inputs: dict[str, Path], monkeypatch: pytest.MonkeyPatch
) -> None:
    """A terminal interrupt stops the foreground launcher with the conventional status."""
    plan = make_plan(inputs)
    with socket.socket() as port:
        port.bind(("127.0.0.1", 0))
        available = port.getsockname()[1]

    def interrupted(*args: Any, **kwargs: Any) -> subprocess.CompletedProcess[str]:
        raise KeyboardInterrupt

    monkeypatch.setattr(subprocess, "run", interrupted)
    assert launcher.run_command(replace(plan, backend_port=available), backend=True) == 130
