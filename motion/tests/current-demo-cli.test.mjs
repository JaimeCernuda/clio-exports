import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

test("new-session CLI creates a source-bound manifest, plans it and refuses overwrites and traversal", () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const temp = path.join(root, ".native-ui/current-cli-test");
  mkdirSync(temp, { recursive: true });
  const id = `cli-test-${process.pid}`;
  const file = path.join(root, "native/public/demos", `${id}.json`);
  const run = (script, args) =>
    spawnSync(
      process.execPath,
      ["--import", "tsx", `scripts/${script}.ts`, ...args],
      {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, TEMP: temp, TMP: temp, TMPDIR: temp },
      },
    );
  try {
    const create = run("create-current-demo", [
      "tahoe.native.json",
      id,
      "30",
      "1",
    ]);
    assert.equal(create.status, 0, create.stderr);
    const spec = JSON.parse(readFileSync(file, "utf8"));
    assert.equal(spec.frames, 1800);
    assert.equal(spec.turns, 1);
    assert.equal(spec.pocket.length, 2);
    const plan = run("current-demo", ["plan", `demos/${id}.json`]);
    assert.equal(plan.status, 0, plan.stderr);
    const data = JSON.parse(plan.stdout);
    assert.equal(data.sessionId, spec.sessionId);
    assert.equal(data.source.sha256, spec.sourceSha256);
    assert.ok(data.events.length > 0);
    const duplicate = run("create-current-demo", [
      "tahoe.native.json",
      id,
      "30",
      "1",
    ]);
    assert.notEqual(duplicate.status, 0);
    assert.match(duplicate.stderr, /EEXIST/);
    const unsafe = run("current-demo", ["plan", "../outside.json"]);
    assert.notEqual(unsafe.status, 0);
    assert.match(unsafe.stderr, /local JSON/);
  } finally {
    rmSync(file, { force: true });
  }
});
