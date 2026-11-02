import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { once } from "node:events";
import { createPreviewServer } from "../scripts/serve";
test("the gallery serves actual files and supports seeking without escaping its root", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "website-preview-"));
  const server = createPreviewServer(root);
  try {
    await writeFile(path.join(root, "preview.html"), "<p>Preview</p>");
    await writeFile(path.join(root, "loop.mp4"), "0123456789");
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const url = `http://127.0.0.1:${address.port}`;
    assert.equal(await (await fetch(url)).text(), "<p>Preview</p>");
    const part = await fetch(url + "/loop.mp4", {
      headers: { Range: "bytes=3-6" },
    });
    assert.equal(part.status, 206);
    assert.equal(await part.text(), "3456");
    assert.equal(part.headers.get("content-range"), "bytes 3-6/10");
    assert.equal(
      (await fetch(url + "/loop.mp4", { headers: { Range: "bytes=20-" } }))
        .status,
      416,
    );
    assert.equal((await fetch(url + "/missing")).status, 404);
    assert.equal((await fetch(url + "/..%5csecret")).status, 403);
    assert.equal((await fetch(url + "/%bad")).status, 400);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    assert.ok(
      path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep),
    );
    await rm(root, { recursive: true, force: true });
  }
});
