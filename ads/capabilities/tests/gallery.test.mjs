import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";

test("review downloads support exact ranges and release aborted Windows file reads", async () => {
  const root = path.resolve(import.meta.dirname, ".."),
    name = `__http-test-${process.pid}.mp4`,
    file = path.join(root, "output", name),
    moved = file + ".moved";
  const data = Buffer.alloc(1024 * 1024, 173);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data);
  const server = spawn(process.execPath, ["scripts/serve.mjs"], {
    cwd: root,
    env: { ...process.env, PORT: "3389" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await Promise.race([
      once(server.stdout, "data"),
      once(server, "error").then(([e]) => {
        throw e;
      }),
    ]);
    const url = `http://127.0.0.1:3389/output/${name}`;
    const partial = await fetch(url + "?download=1", {
      headers: { range: "bytes=100-199" },
    });
    assert.equal(partial.status, 206);
    assert.equal(
      partial.headers.get("content-range"),
      `bytes 100-199/${data.length}`,
    );
    assert.ok(partial.headers.get("content-disposition").includes(name));
    assert.deepEqual(
      Buffer.from(await partial.arrayBuffer()),
      data.subarray(100, 200),
    );
    const invalid = await fetch(url, {
      headers: { range: `bytes=${data.length + 1}-` },
    });
    assert.equal(invalid.status, 416);
    const request = await fetch(url);
    await request.body.cancel();
    // File replacement is the regression: a response that closed must not retain
    // its underlying file handle. Retry only the asynchronous close notification.
    let renamed = false;
    for (let n = 0; n < 20 && !renamed; n++) {
      try {
        await fs.rename(file, moved);
        renamed = true;
      } catch (error) {
        if (error.code !== "EPERM") throw error;
        await new Promise((r) => setTimeout(r, 25));
      }
    }
    assert.ok(renamed, "The aborted media response retained its file handle");
    const denied = await fetch(
      "http://127.0.0.1:3389/product/agents/campaign.py",
    );
    assert.equal(denied.status, 403);
  } finally {
    server.kill();
    await once(server, "exit");
    for (const own of [file, moved]) await fs.rm(own, { force: true });
  }
});
