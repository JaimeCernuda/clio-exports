import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

async function seekFrame(page, frame) {
  return page.evaluate(
    ({ frame }) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          removeEventListener("message", receive);
          reject(new Error("Native frame timed out"));
        }, 100000);
        const receive = (event) => {
          if (event.data?.kind === "clio-film-error") {
            clearTimeout(timer);
            removeEventListener("message", receive);
            reject(new Error(event.data.message));
          }
          if (
            event.data?.kind === "clio-film-ready" &&
            event.data.frame === frame &&
            event.data.nonce === frame + 1
          ) {
            clearTimeout(timer);
            removeEventListener("message", receive);
            resolve(event.data.evidence);
          }
        };
        addEventListener("message", receive);
        postMessage({ kind: "clio-film-frame", frame, nonce: frame + 1 }, "*");
      }),
    { frame },
  );
}

test(
  "native case rebinding keeps its mesh; genuine WebGL loss still offers recovery",
  { timeout: 300000 },
  async () => {
    const root = path.resolve(".");
    const temporary = path.join(root, ".native-ui/engineering-browser-test");
    await mkdir(temporary, { recursive: true });
    process.env.TEMP = temporary;
    process.env.TMP = temporary;
    process.env.TMPDIR = temporary;
    const browser = await chromium.launch({
      headless: true,
      executablePath:
        process.env.DEMO_CHROME_PATH ??
        path.join(
          root,
          "node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe",
        ),
      args: ["--use-gl=angle"],
    });
    try {
      const page = await browser.newPage({
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1.5,
      });
      await page.goto(
        "http://127.0.0.1:3365/engineering.html?mode=film&cut=full&render=1",
      );
      await page.waitForSelector(".engineering-full", { timeout: 120000 });
      await seekFrame(page, 33 * 60);
      const watcher = page.locator("#tool-call_bb2c24f185ff");
      assert.match(
        await watcher.innerText(),
        /Start the array watcher in the background/,
      );
      assert.match(
        await watcher.locator('[data-slot="tool-duration"]').innerText(),
        /944 ms/,
      );
      assert.equal(await watcher.locator(".animate-spin").count(), 0);
      await seekFrame(page, 39 * 60);
      assert.equal(await page.locator(".engineering-cluster").count(), 0);
      assert.equal(
        await page.locator(".engineering-time-bridge").innerText(),
        "Later",
      );
      await seekFrame(page, 42 * 60);
      assert.equal(await page.locator(".engineering-time-bridge").count(), 0);
      assert.equal(await page.locator(".replay-log li:empty").count(), 0);
      assert.doesNotMatch(
        await page.locator(".replay-log").innerText(),
        /\bE[1-5][ab]?\b|KeyError|Request failed/,
      );
      // Compare a direct seek with arrival through the drawer expansion. Canvas
      // intrinsic widths must not change the two-column proportions between workers.
      for (const seconds of [180, 178.5, 179.983333, 180, 180.2, 190]) {
        await seekFrame(page, Math.round(seconds * 60));
        const widths = await page.evaluate(() =>
          ["inspView", "cmpMor"].map(
            (id) =>
              document
                .querySelector(
                  `[data-slot="a2ui-mesh-viewport"][data-a2ui-component-id="${id}"]`,
                )
                .getBoundingClientRect().width,
          ),
        );
        assert.ok(
          widths.every((width) => width > 100),
          `Missing actual mesh hosts: ${widths}`,
        );
        assert.ok(
          Math.abs(widths[0] - widths[1]) < 1,
          `Unequal view widths at ${seconds}: ${widths}`,
        );
      }
      await seekFrame(page, 200 * 60);
      assert.equal(
        await page
          .getByRole("heading", {
            name: "Build a topology studio",
            exact: true,
          })
          .count(),
        1,
      );
      for (const seconds of [260, 258.5, 259.983333, 260, 260.2, 262]) {
        await seekFrame(page, Math.round(seconds * 60));
        const widths = await page.evaluate(() =>
          ["hq", "hb"].map(
            (id) =>
              document
                .querySelector(
                  `[data-slot="a2ui-mesh-viewport"][data-a2ui-component-id="${id}"]`,
                )
                .getBoundingClientRect().width,
          ),
        );
        assert.ok(
          widths.every((width) => width > 100),
          `Missing studio mesh hosts: ${widths}`,
        );
        assert.ok(
          Math.abs(widths[0] - widths[1]) < 1,
          `Unequal studio widths at ${seconds}: ${widths}`,
        );
      }
      await seekFrame(page, 265 * 60);
      const boundaryPanel = await page
        .locator('[data-a2ui-component-id="bc"]')
        .innerText();
      assert.match(boundaryPanel, /Applied loads and supports/);
      assert.doesNotMatch(boundaryPanel, /\bE3\b|SPC-v1/);
      for (const seconds of [
        140,
        140 + 1 / 60,
        144,
        148,
        150,
        150 + 1 / 60,
        160,
        160 + 1 / 60,
      ]) {
        const frame = Math.round(seconds * 60);
        const receipt = await page.evaluate(
          ({ frame }) =>
            new Promise((resolve, reject) => {
              const timer = setTimeout(() => {
                removeEventListener("message", receive);
                reject(new Error("Native frame timed out"));
              }, 100000);
              const receive = (event) => {
                if (event.data?.kind === "clio-film-error") {
                  clearTimeout(timer);
                  removeEventListener("message", receive);
                  reject(new Error(event.data.message));
                }
                if (
                  event.data?.kind === "clio-film-ready" &&
                  event.data.frame === frame &&
                  event.data.nonce === frame + 1
                ) {
                  clearTimeout(timer);
                  removeEventListener("message", receive);
                  resolve(event.data.evidence);
                }
              };
              addEventListener("message", receive);
              postMessage(
                { kind: "clio-film-frame", frame, nonce: frame + 1 },
                "*",
              );
            }),
          { frame },
        );
        assert.equal(receipt.meshes.length, 13);
        assert.equal(
          receipt.meshes.find((m) => m.id === "inspView").frame,
          seconds >= 144 && seconds < 148 ? 9 : 4,
        );
      }
      // Test the native gate's disposal guard on an actual mounted canvas.
      await page.evaluate(() => {
        const canvas = document.querySelector(
          '[data-slot="a2ui-mesh-viewport"][data-a2ui-component-id="inspView"] canvas',
        );
        if (!(canvas instanceof HTMLCanvasElement))
          throw new Error("Missing selected native mesh");
        canvas.dataset.engineeringDisposal = "true";
        canvas.dispatchEvent(
          new Event("webglcontextlost", { cancelable: true }),
        );
        delete canvas.dataset.engineeringDisposal;
      });
      await page.waitForTimeout(100);
      assert.equal(
        await page
          .getByRole("button", { name: "Reload view", exact: true })
          .count(),
        0,
      );
      // Lose a real WebGL context. This must remain visible and recoverable.
      await page.evaluate(() => {
        const canvas = document.querySelector(
          '[data-slot="a2ui-mesh-viewport"][data-a2ui-component-id="inspView"] canvas',
        );
        const extension = canvas
          ?.getContext("webgl2")
          ?.getExtension("WEBGL_lose_context");
        if (!extension)
          throw new Error("Native test requires the real WebGL loss extension");
        extension.loseContext();
      });
      const reload = page.getByRole("button", {
        name: "Reload view",
        exact: true,
      });
      await reload.waitFor({ state: "visible", timeout: 10000 });
      assert.match(
        await reload.locator("..").innerText(),
        /lost its graphics context/,
      );
      await reload.click();
      await page.waitForFunction(
        () =>
          document.querySelector(
            '[data-slot="a2ui-mesh-viewport"][data-a2ui-component-id="inspView"] canvas',
          ) !== null,
      );
      const low = await seekFrame(page, 312 * 60);
      const high = await seekFrame(page, 318 * 60);
      assert.equal(low.inspection.kind, "mesh");
      assert.equal(high.inspection.kind, "mesh");
      assert.ok(Number(low.inspection.text) > 0);
      assert.ok(Number(high.inspection.text) > Number(low.inspection.text));
      const first = await seekFrame(page, 327 * 60);
      const last = await seekFrame(page, 332 * 60);
      assert.equal(first.sourceFrame, 3719);
      assert.equal(last.sourceFrame, 3719);
      assert.match(first.inspection.text, /iteration0objective1827384/);
      assert.match(last.inspection.text, /iteration10objective388161.28/);
      await seekFrame(page, 334 * 60);
      assert.equal(await page.locator("[data-engineering-probe]").count(), 0);
      assert.equal(
        await page.locator("#vg-tooltip-element").isVisible(),
        false,
      );
      await seekFrame(page, 350 * 60);
      await page.getByRole("tab", { name: "4 Results", exact: true }).waitFor();
      assert.equal(
        await page
          .getByRole("tab", { name: "4 Results", exact: true })
          .getAttribute("aria-selected"),
        "true",
      );
      const canvas = await page.locator(".engineering-canvas").boundingBox();
      const chart = await page
        .locator('.engineering-canvas [data-slot="a2ui-chart"]')
        .boundingBox();
      assert.ok(
        canvas &&
          chart &&
          canvas.width >= 1200 &&
          chart.y + chart.height <= canvas.y + canvas.height,
      );
    } finally {
      await browser.close();
    }
  },
);
