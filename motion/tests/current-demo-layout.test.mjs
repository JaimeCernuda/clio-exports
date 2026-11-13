import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const base = process.env.CLIO_DEMO_TEST_URL ?? "http://127.0.0.1:3372";
if (new URL(base).hostname !== "127.0.0.1")
  throw new Error("Layout tests require an isolated loopback preview");

/** Wait for the production frame/paint acknowledgement, including explicit native failures. */
async function seek(page, frame, nonce) {
  await page.evaluate(
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
            resolve();
          }
        }
        addEventListener("message", receive);
        postMessage({ kind: "clio-film-frame", frame, nonce }, "*");
      }),
    { frame, nonce },
  );
}

/** Check actual visible controls, not only the absence of document scrollbars. */
async function assertLayout(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        let last = "",
          stable = 0;
        const check = () => {
          const next = [
            ...document.querySelectorAll(
              '[data-slot="sidebar"],[data-slot="clio-composer"],[data-slot="canvas-tab-row"]',
            ),
          ]
            .map((el) => {
              const r = el.getBoundingClientRect();
              return `${r.x.toFixed(1)},${r.y.toFixed(1)},${r.width.toFixed(1)},${r.height.toFixed(1)}`;
            })
            .join(";");
          stable = next === last ? stable + 1 : 0;
          last = next;
          if (stable >= 6) resolve();
          else requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      }),
  );
  const report = await page.evaluate(() => {
    const rect = (element) => {
      const r = element.getBoundingClientRect();
      return {
        x: r.x,
        y: r.y,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
      };
    };
    const nav = document.querySelector('[aria-label="Workspace navigation"]');
    const composer = document.querySelector('[data-slot="clio-composer"]');
    const heading = document.querySelector("h1");
    const controls = [
      ...document.querySelectorAll(
        '[aria-label="Workspace navigation"] button,[data-slot="clio-composer"] button,[data-slot="workbench-strip"] button,[data-slot="canvas-tab-row"] [role="tab"],[data-slot="canvas-tab-row"] button',
      ),
    ].filter(
      (el) =>
        el.getClientRects().length &&
        getComputedStyle(el).visibility !== "hidden",
    );
    return {
      viewport: { width: innerWidth, height: innerHeight },
      document: {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      },
      nav: rect(nav),
      composer: rect(composer),
      heading: rect(heading),
      controls: controls.map((el) => ({
        name: el.getAttribute("aria-label") ?? el.textContent,
        rect: rect(el),
        hit: document
          .elementFromPoint(
            el.getBoundingClientRect().x + el.getBoundingClientRect().width / 2,
            el.getBoundingClientRect().y +
              el.getBoundingClientRect().height / 2,
          )
          ?.outerHTML.slice(0, 250),
        covered:
          getComputedStyle(el).pointerEvents !== "none" &&
          !el.contains(
            document.elementFromPoint(
              el.getBoundingClientRect().x +
                el.getBoundingClientRect().width / 2,
              el.getBoundingClientRect().y +
                el.getBoundingClientRect().height / 2,
            ),
          ),
      })),
    };
  });
  assert.ok(
    report.document.width <= report.viewport.width + 1,
    JSON.stringify(report),
  );
  assert.ok(
    report.document.height <= report.viewport.height + 1,
    JSON.stringify(report),
  );
  assert.ok(
    report.nav.right <= report.heading.x + 1,
    "Left bar overlaps the session header",
  );
  assert.ok(
    report.composer.x >= report.nav.right - 1,
    "Composer is under the left bar",
  );
  for (const control of report.controls) {
    const r = control.rect;
    assert.ok(
      r.x >= -1 &&
        r.y >= -1 &&
        r.right <= report.viewport.width + 1 &&
        r.bottom <= report.viewport.height + 1,
      `Offscreen control: ${JSON.stringify(control)}`,
    );
    assert.ok(!control.covered, `Covered control: ${JSON.stringify(control)}`);
  }
  return report;
}

test(
  "RC1 light themes, contained navigation, complete composer and result controls fit real review sizes",
  { timeout: 240000 },
  async () => {
    const dir = path.resolve(".native-ui/current-layout-review");
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
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      let nonce = 500;
      for (const size of [
        { width: 1920, height: 1080 },
        { width: 1280, height: 720 },
        { width: 1116, height: 970 },
        { width: 900, height: 700 },
      ]) {
        await page.setViewportSize(size);
        await page.goto(base + "/?render=1");
        await page.waitForSelector("[data-frame]");
        await seek(page, 100, nonce++);
        assert.equal(
          await page.locator("html").getAttribute("data-theme"),
          "classic-light",
        );
        const composer = page.locator('[data-slot="clio-composer"]');
        await composer
          .getByRole("button", { name: "Attach files", exact: true })
          .waitFor();
        await composer.getByRole("button", { name: /reference/i }).waitFor();
        assert.notEqual(
          await composer.getByRole("combobox").getAttribute("aria-disabled"),
          "true",
        );
        await assertLayout(page);
        await page.screenshot({
          path: path.join(dir, `${size.width}-typing.png`),
        });
        await seek(page, 2399, nonce++);
        const strip = page.locator('[data-slot="workbench-strip"]');
        for (const name of [
          "Files",
          "Sources",
          "Artifacts",
          "Activity",
          "Agent",
          "Terminal",
          "Browser",
        ])
          await strip.getByRole("button", { name, exact: true }).waitFor();
        await assertLayout(page);
        await page.screenshot({
          path: path.join(dir, `${size.width}-results.png`),
        });
        await page
          .getByRole("button", { name: "Maximize canvas", exact: true })
          .click();
        const max = await page.locator("[data-current-surface]").boundingBox();
        const nav = await page
          .getByRole("navigation", { name: "Workspace navigation" })
          .boundingBox();
        assert.ok(
          max.x >= nav.x + nav.width - 1,
          "Maximize must leave the left bar visible",
        );
        await page
          .getByRole("button", {
            name: "Restore canvas beside conversation",
            exact: true,
          })
          .click();
        const hide = page.getByRole("button", {
          name: "Toggle Sidebar",
          exact: true,
        });
        await hide.click();
        await assertLayout(page);
        await page.screenshot({
          path: path.join(dir, `${size.width}-sidebar-toggle.png`),
        });
        await seek(page, 100, nonce++);
      }
      await page.setViewportSize({ width: 1116, height: 970 });
      await page.goto(base + "/?render=1&demo=demos/tahoe-current-full.json");
      await page.waitForSelector("[data-frame]");
      await seek(page, 7199, nonce++);
      await assertLayout(page);
      assert.equal(
        await page.locator('.current-result-tabs[data-compact="true"]').count(),
        1,
      );
      const activeName = await page
        .locator(
          '[data-slot="frame-tab"][data-active] [data-slot="frame-tab-name"]',
        )
        .boundingBox();
      assert.ok(
        activeName.width > 120,
        "The active label needs room after inactive tabs compact",
      );
      await page.screenshot({ path: path.join(dir, "1116-four-results.png") });
      const otherScene = JSON.parse(
        await readFile("native/public/tahoe.native.json", "utf8"),
      );
      await page.route("**/other.native.json", (route) =>
        route.fulfill({ json: otherScene }),
      );
      await page.goto(base + "/?render=1&scene=other.native.json");
      await page.waitForSelector("[data-frame]");
      await seek(page, 2399, nonce++);
      await page.getByRole("tab", { name: "Map", exact: true }).click();
      await page.waitForFunction(() =>
        document
          .querySelector(
            '[data-current-pocket-body] [data-slot="a2ui-map-surface"]',
          )
          ?.__clioMap?.loaded(),
      );
      assert.equal(
        await page
          .locator('[data-current-pocket-body] [data-slot="a2ui-map-surface"]')
          .evaluate((el) =>
            Boolean(el.__clioMap.getSource("cached-usgs-context")),
          ),
        false,
        "Another scene must not inherit the Tahoe basemap",
      );
      const longScene = JSON.parse(
        await readFile("native/public/tahoe.native.json", "utf8"),
      );
      longScene.session.title =
        "A deliberately very long captured investigation title with compoundnames_without_spaces_and_more_characters_to_check_containment";
      await page.route("**/tahoe.native.json", (route) =>
        route.fulfill({ json: longScene }),
      );
      await page.goto(base + "/");
      await page
        .getByRole("combobox", { name: "Preview theme" })
        .selectOption("light");
      await page.waitForFunction(
        () => document.documentElement.dataset.theme === "light",
      );
      await assertLayout(page);
      await page.screenshot({ path: path.join(dir, "1116-native-warm.png") });
      await page
        .getByRole("combobox", { name: "Preview theme" })
        .selectOption("classic-light");
      await page.waitForFunction(
        () => document.documentElement.dataset.theme === "classic-light",
      );
      await assertLayout(page);
      await page.screenshot({ path: path.join(dir, "1116-native-cool.png") });
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  },
);
