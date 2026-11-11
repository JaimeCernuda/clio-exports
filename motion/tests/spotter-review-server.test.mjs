import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("the local review gallery supports seeking, direct downloads and read-only boundaries", async () => {
  const motion = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const base = path.join(motion, ".native-ui/tmp");
  await mkdir(base, { recursive: true });
  const root = await mkdtemp(path.join(base, "spotter-review-test-"));
  await writeFile(path.join(root, "example.mp4"), Buffer.from("0123456789"));
  const child = spawn(
    process.execPath,
    [path.join(motion, "scripts/serve-spotter-review.mjs")],
    {
      cwd: motion,
      env: {
        ...process.env,
        CLIO_SPOTTER_REVIEW_ROOT: root,
        CLIO_SPOTTER_REVIEW_PORT: "0",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  try {
    const ready = await new Promise((resolve, reject) => {
      let stdout = "";
      const timer = setTimeout(
        () => reject(new Error("Review server did not start")),
        10000,
      );
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
        const found = stdout.match(/http:\/\/127\.0\.0\.1:\d+\//u);
        if (found) {
          clearTimeout(timer);
          resolve(found[0]);
        }
      });
    });
    const gallery = await fetch(ready);
    assert.equal(gallery.status, 200);
    assert.ok((await gallery.text()).includes("−1 frame"));
    const full = await fetch(new URL("example.mp4", ready));
    assert.equal(full.headers.get("content-type"), "video/mp4");
    assert.equal(await full.text(), "0123456789");
    const range = await fetch(new URL("example.mp4", ready), {
      headers: { Range: "bytes=3-6" },
    });
    assert.equal(range.status, 206);
    assert.equal(range.headers.get("content-range"), "bytes 3-6/10");
    assert.equal(await range.text(), "3456");
    assert.equal(
      (
        await fetch(new URL("example.mp4", ready), {
          headers: { Range: "bytes=20-" },
        })
      ).status,
      416,
    );
    assert.equal(
      (
        await fetch(new URL("example.mp4", ready), { method: "HEAD" })
      ).headers.get("content-length"),
      "10",
    );
    assert.equal(
      (
        await fetch(new URL("example.mp4", ready), {
          method: "POST",
          body: "do not write",
        })
      ).status,
      405,
    );
    assert.equal((await fetch(new URL("absent.mp4", ready))).status, 404);
    assert.equal(
      (await fetch(new URL("..%2f..%2fpackage.json", ready))).status,
      403,
    );
  } finally {
    const exited = once(child, "exit");
    child.kill();
    await exited;
    if (!path.resolve(root).startsWith(path.resolve(base) + path.sep))
      throw new Error("Refusing cleanup outside the owned test directory");
    await rm(root, { recursive: true, force: true });
  }
});
