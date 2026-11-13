import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

const out = path.resolve(".native-ui/spotter-v3-review");
await mkdir(out, { recursive: true });
process.env.TEMP = out;
process.env.TMP = out;
process.env.TMPDIR = out;
const browser = await chromium.launch({
  headless: true,
  executablePath: path.resolve(
    "node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe",
  ),
  args: ["--use-gl=angle"],
});
let nonce = 1;
async function seek(page, seconds) {
  await page.evaluate(
    ({ frame, nonce, width, height }) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          removeEventListener("message", receive);
          reject(new Error(`Frame ${frame} acknowledgement timed out`));
        }, 65000);
        function receive(event) {
          if (event.data?.kind === "clio-film-error") {
            clearTimeout(timer);
            removeEventListener("message", receive);
            reject(new Error(event.data.message));
          }
          if (
            event.data?.kind === "clio-film-ready" &&
            event.data.frame === frame &&
            event.data.nonce === nonce
          ) {
            clearTimeout(timer);
            removeEventListener("message", receive);
            resolve();
          }
        }
        addEventListener("message", receive);
        postMessage(
          {
            kind: "clio-film-frame",
            frame,
            nonce,
            viewport: { width, height },
          },
          "*",
        );
      }),
    { frame: Math.round(seconds * 60), nonce: nonce++, ...page.viewportSize() },
  );
}
const shots = [
  0, 8.5, 12.5, 18, 20.5, 29.5, 36, 44, 47.2, 50.5, 59, 65.7, 76, 85, 90.5, 100,
  104, 113.5, 121, 134.5, 142, 145, 151, 154, 159.5, 164, 168.8, 172, 175.5,
  180.5, 185.8, 189, 193, 200, 207,
];
const actions = [
  [8, "policy"],
  [11, "security-spotter"],
  [12.8, "tab-spotter"],
  [18, "tab-evidence"],
  [50, "tab-lineage"],
  [64.5, "tab-evidence"],
  [74, "tab-spotter"],
  [90, "tab-lineage"],
  [114, "tab-evidence"],
  [144, "tab-spotter"],
  [165.5, "inspect-alert"],
  [168, "answer-start"],
  [168.8, "answer-end"],
  [174, "understand-attention"],
  [180, "tab-lineage"],
  [182, "close-attention"],
  [185, "73-start"],
  [185.8, "73-end"],
  [191, "understand-attention"],
  [198, "tab-lineage"],
];
const profiles = [],
  reports = [];
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 1116, height: 970 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(
      "http://127.0.0.1:3372/?demo=demos/spotter-current.json&render=1",
    );
    await page.waitForSelector("[data-frame]");
    for (const second of shots) {
      await seek(page, second);
      const report = await page.evaluate(() => {
        const selectors = [
          '[data-slot="clio-composer"]',
          '[data-slot="canvas-tab-row"]',
          ".sv3-attention",
          ".sv3-view-heading",
        ];
        return {
          frame: Number(document.querySelector("[data-frame]").dataset.frame),
          theme: document.documentElement.dataset.theme,
          documentWidth: document.documentElement.scrollWidth,
          viewport: innerWidth,
          bounds: selectors.flatMap((selector) =>
            [...document.querySelectorAll(selector)].map((element) => ({
              selector,
              x: element.getBoundingClientRect().x,
              right: element.getBoundingClientRect().right,
              bottom: element.getBoundingClientRect().bottom,
            })),
          ),
          steps: [
            ...document.querySelectorAll('[aria-label="Evidence step"] option'),
          ].map((e) => e.textContent),
          results: document.querySelectorAll(".sv3-evidence-card").length,
          cursor: document
            .querySelector(".sv3-pointer")
            .getBoundingClientRect()
            .toJSON(),
          cursorDeclared: {
            x: Number.parseFloat(
              document.querySelector(".sv3-pointer").style.left,
            ),
            y: Number.parseFloat(
              document.querySelector(".sv3-pointer").style.top,
            ),
            transition: getComputedStyle(document.querySelector(".sv3-pointer"))
              .transitionDuration,
          },
        };
      });
      assert.equal(report.theme, "classic-light");
      assert.ok(report.documentWidth <= report.viewport);
      assert.ok(Math.abs(report.cursor.x - report.cursorDeclared.x) < 0.05);
      assert.ok(Math.abs(report.cursor.y - report.cursorDeclared.y) < 0.05);
      assert.equal(report.cursorDeclared.transition, "0s");
      for (const box of report.bounds)
        assert.ok(
          box.x >= 0 &&
            box.right <= viewport.width + 1 &&
            box.bottom <= viewport.height + 1,
          JSON.stringify(box),
        );
      if (second === 18) assert.equal(report.results, 0);
      if (second === 20.5) {
        assert.equal(report.results, 1);
        assert.equal(report.steps.length, 1);
      }
      if (second === 59) {
        assert.equal(report.results, 0);
        assert.equal(
          await page
            .locator(
              '[data-pocket="lineage"] [data-target^="graph-reconstruction:step-2"]',
            )
            .count(),
          0,
        );
      }
      if (second === 104) {
        assert.equal(
          await page
            .locator(
              '[data-pocket="lineage"] [data-target^="graph-reconstruction:step-3"]',
            )
            .count(),
          1,
        );
      }
      if (second === 193) {
        assert.ok((await page.locator("[data-heat]").count()) > 0);
        assert.ok(
          await page
            .locator(".sv3-attention")
            .innerText()
            .then((t) => t.includes("Tool results 3.4%")),
        );
      }
      if (second === 172 || second === 189) {
        assert.equal(
          await page.locator('[data-slot="selection-actions"]').count(),
          1,
        );
        assert.equal(
          await page
            .getByRole("button", { name: "Understand attention", exact: true })
            .count(),
          1,
        );
      }
      if (second === 175.5 || second === 193)
        assert.equal(
          await page.locator('[data-slot="selection-actions"]').count(),
          0,
        );
      reports.push({ viewport, ...report });
      await page.screenshot({
        path: path.join(
          out,
          `${viewport.width}-${String(second).replace(".", "_")}.png`,
        ),
      });
    }
    if (viewport.width === 1920) {
      for (const second of [44, 47, 47.1, 47.2, 47.3, 47.4, 48.4]) {
        await seek(page, second);
        if (second >= 47.4) {
          const height = await page
            .locator('[data-step="1"] .sv3-reasoning .sv3-disclosure')
            .evaluate((el) => el.getBoundingClientRect().height);
          assert.ok(
            height < 1,
            `Collapsed thinking retains ${height}px of empty space`,
          );
        }
      }
      await seek(page, 104);
      await page.evaluate(() => {
        const style = document.createElement("style");
        style.id = "transient-collapse";
        style.textContent =
          ".current-demo-stage {height:150px!important;flex:none!important}";
        document.head.append(style);
        setTimeout(() => style.remove(), 140);
      });
      const began = performance.now();
      await seek(page, 104.1);
      assert.ok(
        performance.now() - began >= 100,
        "A collapsed native shell must never acknowledge capture",
      );
    }
    const points = [];
    for (const [seconds, target] of actions) {
      const at =
        target === "security-spotter"
          ? 10.7
          : target === "understand-attention"
            ? seconds - 0.2
            : seconds;
      await seek(page, at);
      const point = await page.evaluate((target) => {
        if (/^(?:73|answer)-(?:start|end)$/.test(target)) {
          const el = document.querySelector('[data-target="answer-line"]');
          if (!el?.firstChild) throw new Error("Answer not mounted");
          const range = document.createRange(),
            text = el.textContent,
            start = target.startsWith("73") ? text.indexOf("73") : 0,
            end = target.startsWith("73") ? start + 2 : text.length;
          range.setStart(el.firstChild, start);
          range.setEnd(el.firstChild, end);
          const box = range.getBoundingClientRect();
          return {
            x: target.endsWith("start") ? box.left : box.right,
            y: box.top + box.height * 0.55,
          };
        }
        const el =
          target === "policy"
            ? [
                ...document.querySelectorAll(
                  '[data-slot="clio-composer"] button',
                ),
              ].find((e) =>
                /Confirmation policy/.test(e.getAttribute("aria-label") ?? ""),
              )
            : target === "understand-attention"
              ? [
                  ...document.querySelectorAll(
                    '[data-slot="selection-actions"] button',
                  ),
                ].find((el) => el.textContent.includes("Understand attention"))
              : document.querySelector(`[data-target="${target}"]`);
        if (!el) throw new Error("Missing pointer target " + target);
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }, target);
      assert.ok(
        point.x >= 0 &&
          point.y >= 0 &&
          point.x <= viewport.width &&
          point.y <= viewport.height,
        `Offscreen ${target}: ${JSON.stringify(point)}`,
      );
      points.push({ frame: Math.round(seconds * 60), target, ...point });
    }
    profiles.push({ ...viewport, points });
  }
  assert.deepEqual(errors, []);
  await writeFile(
    "native/current/spotter-pointer.json",
    JSON.stringify({ schema: "clio.spotter-pointer.v1", profiles }, null, 2) +
      "\n",
  );
  await writeFile(
    path.join(out, "layout-report.json"),
    JSON.stringify({ reports, errors }, null, 2),
  );
  console.log(
    JSON.stringify({
      shots: reports.length,
      profiles: profiles.length,
      errors,
    }),
  );
} finally {
  await browser.close();
}
