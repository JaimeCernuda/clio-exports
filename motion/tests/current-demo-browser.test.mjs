import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const base = process.env.CLIO_DEMO_TEST_URL ?? "http://127.0.0.1:3372";
if (new URL(base).hostname !== "127.0.0.1")
  throw new Error("Demo browser tests require an isolated loopback server");

/** Seek the same absolute-frame protocol used by Remotion, including stale-frame protection. */
async function seek(page, frame, nonce) {
  return page.evaluate(
    ({ frame, nonce }) =>
      new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          removeEventListener("message", receive);
          reject(new Error(`Frame ${frame} timed out`));
        }, 70000);
        function receive(event) {
          if (event.data?.kind === "clio-film-error") {
            clearTimeout(timeout);
            removeEventListener("message", receive);
            reject(new Error(event.data.message));
          }
          if (
            event.data?.kind === "clio-film-ready" &&
            event.data.frame === frame &&
            event.data.nonce === nonce
          ) {
            clearTimeout(timeout);
            removeEventListener("message", receive);
            resolve(event.data);
          }
        }
        addEventListener("message", receive);
        postMessage({ kind: "clio-film-frame", frame, nonce }, "*");
      }),
    { frame, nonce },
  );
}

test(
  "current native UI replays real tools, paints captured results, operates tabs and seeks backwards",
  { timeout: 240000 },
  async () => {
    const dir = path.resolve(".native-ui/current-browser-review");
    await mkdir(dir, { recursive: true });
    process.env.TEMP = dir;
    process.env.TMP = dir;
    process.env.TMPDIR = dir;
    const browser = await chromium.launch({
      headless: true,
      executablePath:
        process.env.DEMO_CHROME_PATH ??
        path.resolve(
          "node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe",
        ),
      args: ["--use-gl=angle"],
    });
    try {
      const page = await browser.newPage({
        viewport: { width: 1920, height: 1080 },
      });
      const errors = [];
      const remote = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("request", (request) => {
        if (
          /^https?:/.test(request.url()) &&
          !request.url().startsWith(base + "/")
        )
          remote.push(request.url());
      });
      await page.goto(base + "/?render=1");
      await page.waitForSelector("[data-frame]", { timeout: 60000 });
      await seek(page, 100, 1);
      assert.equal(await page.getByRole("log").count(), 1);
      assert.equal(await page.locator("[data-workbench-pocket]").count(), 0);
      assert.ok(
        (
          await page
            .locator('[data-slot="clio-composer"] [role="combobox"]')
            .innerText()
        ).length > 0,
      );
      await page.screenshot({ path: path.join(dir, "typing.png") });
      await seek(page, 190, 101);
      const elapsed = await page
        .locator('[data-slot="tool-duration"]')
        .innerText();
      assert.doesNotMatch(elapsed, /\d\s*[hdw]/);
      await seek(page, 190, 102);
      assert.equal(
        await page.locator('[data-slot="tool-duration"]').innerText(),
        elapsed,
      );
      await seek(page, 1000, 2);
      assert.ok((await page.getByRole("log").innerText()).includes("boundary"));
      await seek(page, 2399, 3);
      assert.equal(
        await page
          .getByRole("tab", { name: "Method", exact: true })
          .getAttribute("aria-selected"),
        "true",
      );
      assert.equal(
        await page.locator('[data-slot="workbench-strip"]').count(),
        1,
      );
      assert.equal(
        await page
          .locator('[aria-label="Interactive agent surface unavailable"]')
          .count(),
        0,
      );
      assert.ok(
        await page
          .locator("[data-current-pocket-body] img")
          .evaluate((image) => image.complete && image.naturalWidth > 0),
      );
      const log = await page.getByRole("log").evaluate((el) => ({
        remaining: el.scrollHeight - el.clientHeight - el.scrollTop,
        text: el.innerText,
      }));
      assert.ok(
        log.remaining < 2,
        `Final result slipped below the viewport: ${log.remaining}px`,
      );
      assert.match(log.text, /497\.7/);
      await page.screenshot({ path: path.join(dir, "method.png") });
      // Asset readiness alone used to acknowledge a collapsed workspace, producing
      // a one-frame 150px shell in the encoded delivery. Delay ready until it recovers.
      await page.evaluate(() => {
        const collapsed = document.createElement("style");
        collapsed.id = "test-transient-collapse";
        collapsed.textContent =
          ".current-demo-stage { flex: none !important; height: 150px !important; }";
        document.head.append(collapsed);
        setTimeout(() => collapsed.remove(), 300);
      });
      await seek(page, 1690, 105);
      assert.equal(
        await page
          .locator(".current-demo-stage")
          .evaluate((el) => Math.round(el.getBoundingClientRect().height)),
        1080,
      );
      const strip = page.locator('[data-slot="workbench-strip"]');
      await strip
        .getByRole("button", { name: "Terminal", exact: true })
        .click();
      await page
        .getByRole("status")
        .filter({ hasText: "A terminal was not captured" })
        .waitFor();
      assert.equal(
        await page.getByRole("tab", { name: "Method", exact: true }).count(),
        1,
      );
      await page
        .getByRole("button", { name: "Dismiss canvas notice", exact: true })
        .click();
      await strip.getByRole("button", { name: "Browser", exact: true }).click();
      await page
        .getByRole("status")
        .filter({ hasText: "A browser session was not captured" })
        .waitFor();
      await page
        .getByRole("button", { name: "Dismiss canvas notice", exact: true })
        .click();
      await page.getByRole("tab", { name: "Map", exact: true }).click();
      await page.waitForFunction(() =>
        document
          .querySelector(
            '[data-current-surface="tahoe-boundary-map"] [data-slot="a2ui-map-surface"]',
          )
          ?.__clioMap?.loaded(),
      );
      const source = await page
        .locator('[data-current-surface] [data-slot="a2ui-map-surface"]')
        .evaluate((el) =>
          Boolean(el.__clioMap.getSource("cached-usgs-context")),
        );
      assert.ok(source, "Map must retain its georeferenced background");
      await page.screenshot({ path: path.join(dir, "map.png") });
      await page
        .getByRole("button", { name: "Maximize canvas", exact: true })
        .click();
      assert.equal(
        await page
          .getByRole("button", {
            name: "Restore canvas beside conversation",
            exact: true,
          })
          .count(),
        1,
      );
      await page
        .getByRole("button", {
          name: "Restore canvas beside conversation",
          exact: true,
        })
        .click();
      await page.getByRole("tab", { name: "Method", exact: true }).click();
      // A source seek clears interaction state and must not leak the final result into an earlier frame.
      await seek(page, 100, 4);
      assert.equal(await page.locator("[data-workbench-pocket]").count(), 0);
      assert.doesNotMatch(await page.getByRole("log").innerText(), /497\.7/);
      await seek(page, 2399, 5);
      assert.equal(
        await page
          .getByRole("tab", { name: "Method", exact: true })
          .getAttribute("aria-selected"),
        "true",
      );
      await page.getByRole("tab", { name: "Map", exact: true }).click();
      await page.getByTitle("Close Map", { exact: true }).click();
      assert.equal(
        await page.getByRole("tab", { name: "Map", exact: true }).count(),
        0,
      );
      assert.equal(
        await page
          .getByRole("tab", { name: "Method", exact: true })
          .getAttribute("aria-selected"),
        "true",
      );
      await page
        .getByRole("button", { name: "Open tahoe_area_map.png", exact: true })
        .click();
      await page.waitForFunction(() => {
        const image = document.querySelector(
          '[data-slot="image-viewport"] img',
        );
        return image?.complete && image.naturalWidth > 0;
      });
      assert.equal(
        await page.locator('[data-slot="workbench-strip"]').count(),
        1,
      );
      await page.screenshot({ path: path.join(dir, "native-artifact.png") });
      await seek(page, 100, 103);
      assert.equal(
        await page.locator('[data-slot="image-viewport"]').count(),
        0,
        "A backwards seek clears later opened artifacts",
      );
      await seek(page, 2399, 104);
      await page.getByRole("tab", { name: "Map", exact: true }).click();
      await page.getByRole("tab", { name: "Map", exact: true }).press("Delete");
      assert.equal(
        await page.getByRole("tab", { name: "Map", exact: true }).count(),
        0,
      );
      assert.equal(
        await page
          .getByRole("tab", { name: "Method", exact: true })
          .getAttribute("aria-selected"),
        "true",
      );
      assert.deepEqual(errors, []);
      assert.deepEqual(
        remote,
        [],
        "Offline replay must not call a live backend or fetch external assets",
      );
      const pin = JSON.parse(
        await readFile("native/source-current.json", "utf8"),
      );
      assert.equal(
        (await (await page.request.get(base + "/clio-ui-source.json")).json())
          .revision,
        pin.revision,
      );
      await page.goto(base + "/?render=1&demo=demos/tahoe-current-full.json");
      await page.waitForSelector("[data-frame]");
      await seek(page, 7199, 6);
      // Current CLIO suspends offscreen transcript rows. Open the actual earlier
      // result in its pocket tab instead of mistaking virtualization for missing data.
      await page
        .getByRole("tab", { name: "tahoe shoreline resolution", exact: true })
        .click();
      await page.waitForSelector(
        '[data-current-pocket-body] [data-slot="a2ui-chart-view"]',
      );
      await page.waitForFunction(
        () =>
          Boolean(
            document.querySelector(
              "[data-current-pocket-body] svg.marks, [data-current-pocket-body] canvas",
            ),
          ) &&
          document.querySelectorAll("[data-current-pocket-body] tbody tr")
            .length === 10,
      );
      assert.equal(
        await page
          .locator('[aria-label="Interactive agent surface unavailable"]')
          .count(),
        0,
      );
      assert.ok(
        (await page
          .locator(
            '[data-slot="a2ui-chart-view"] svg.marks, [data-slot="a2ui-chart-view"] canvas',
          )
          .count()) > 0,
        "The full session must paint its chart",
      );
      assert.equal(
        await page.locator("[data-current-pocket-body] tbody tr").count(),
        10,
        "The saved table must load all ten comparison rows",
      );
      await page.screenshot({ path: path.join(dir, "full-session.png") });
      await page.goto(base + "/");
      await page.getByRole("button", { name: "Play", exact: true }).click();
      await page.waitForFunction(
        () =>
          Number(
            document.querySelector("[data-frame]")?.getAttribute("data-frame"),
          ) > 70,
      );
      await page.getByRole("button", { name: "Pause", exact: true }).click();
      assert.equal(await page.getByRole("log").count(), 1);
      assert.equal(await page.locator(".current-demo-error").count(), 0);
      assert.deepEqual(errors, []);
      assert.deepEqual(remote, []);
      const bad = await browser.newPage({
        viewport: { width: 1280, height: 720 },
      });
      const corrupt = JSON.parse(
        await readFile("native/public/tahoe.native.json", "utf8"),
      );
      for (const tool of corrupt.view.tools) tool.name = 1234;
      await bad.route("**/tahoe.native.json", (route) =>
        route.fulfill({ json: corrupt }),
      );
      await bad.goto(base + "/?render=1");
      await bad.waitForSelector("[data-frame]");
      await assert.rejects(() => seek(bad, 500, 991), /name|Invalid|expected/i);
      await bad.locator(".current-demo-error").waitFor();
      assert.equal(await bad.locator('[data-slot="clio-composer"]').count(), 0);
      await bad.close();
    } finally {
      await browser.close();
    }
  },
);
