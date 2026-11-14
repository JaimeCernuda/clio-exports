import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

const out = path.resolve(".native-ui/spotter-v3-compact-review");
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
  104, 113.5, 121, 134.5, 142, 145, 151, 154, 159.5, 164, 165.5, 168.8, 172,
  175.5, 177.5, 181, 183.5, 185.5, 189, 190.5, 193, 197.5, 202, 204.5, 210.5,
  213,
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
  [176, "evidence-flagged"],
  [180, "attention-prompt-3"],
  [183, "tab-lineage"],
  [184.5, "graph-reconstruction:step-2:tool-1"],
  [188, "scroll-answer"],
  [190, "close-attention"],
  [191.2, "73-start"],
  [192, "73-end"],
  [197, "understand-attention"],
  [201, "tab-lineage"],
  [203, "graph-reconstruction:step-3:tool-1"],
  [205, "attention-rest"],
];
const profiles = [],
  reports = [];
async function assertSourceVisible(page, selector) {
  const offset = await page.evaluate((selector) => {
    const log = document.querySelector(".sv3-main-log");
    return (
      log.querySelector(selector).getBoundingClientRect().top -
      log.getBoundingClientRect().top
    );
  }, selector);
  assert.ok(
    offset >= -1 && offset <= 120,
    `Click did not reveal source ${selector}: ${offset}`,
  );
}
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
          compact: {
            chat: document
              .querySelector(".sv3-chat")
              .getBoundingClientRect()
              .toJSON(),
            welcome: document
              .querySelector('[aria-label="CLIO conversation welcome"]')
              .getBoundingClientRect()
              .toJSON(),
            composer: document
              .querySelector('[data-slot="clio-composer"]')
              .getBoundingClientRect()
              .toJSON(),
            content: document
              .querySelector(".sv3-main-content")
              .getBoundingClientRect()
              .toJSON(),
            gutter: parseFloat(
              getComputedStyle(document.querySelector(".sv3-main-content"))
                .paddingLeft,
            ),
            menuOptions: [
              ...document.querySelectorAll(
                '[data-slot="dropdown-menu-radio-item"]',
              ),
            ].map((el) => el.textContent),
            target: document.querySelector(".sv3-main-log").dataset.scrollTo,
            targetBox: (() => {
              const log = document.querySelector(".sv3-main-log");
              return log
                .querySelector(log.dataset.scrollTo)
                ?.getBoundingClientRect()
                .toJSON();
            })(),
            log: document
              .querySelector(".sv3-main-log")
              .getBoundingClientRect()
              .toJSON(),
          },
          appearance: {
            background: getComputedStyle(document.documentElement)
              .getPropertyValue("--background")
              .trim(),
            font: getComputedStyle(document.querySelector(".sv3")).fontFamily,
            promptRanges: [
              ...document.querySelectorAll("[data-prompt-heat-ranges]"),
            ].reduce((n, el) => n + Number(el.dataset.promptHeatRanges), 0),
            registeredPromptRanges: [...CSS.highlights]
              .filter(([name]) => name.startsWith("clio-sv3-prompt-"))
              .reduce((n, [, ranges]) => n + ranges.size, 0),
            toolHeat: [
              ...document.querySelectorAll('[data-heat-kind="tool"]'),
            ].filter((el) => el.style.textDecorationLine === "underline")
              .length,
          },
          documentWidth: document.documentElement.scrollWidth,
          viewport: innerWidth,
          frameTransition: getComputedStyle(
            document.querySelector(".sv3-disclosure") ??
              document.querySelector(".sv3-main-content"),
          ).transitionDuration,
          spinnerFrames: [
            ...document.querySelectorAll('[data-slot="ring-spinner"]'),
          ].map((node) => Number(node.dataset.spinFrame)),
          logGap: (() => {
            const log = document.querySelector(".sv3-main-log");
            return (
              Math.max(0, log.scrollHeight - log.clientHeight) - log.scrollTop
            );
          })(),
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
            opacity: Number(
              getComputedStyle(document.querySelector(".sv3-pointer")).opacity,
            ),
          },
        };
      });
      assert.equal(report.theme, "light");
      assert.ok(
        report.compact.composer.width <= 896.1,
        "Composer must retain the native focused width",
      );
      if (second === 8.5) {
        assert.equal(
          report.compact.menuOptions.length,
          5,
          "Use every native confirmation option",
        );
        assert.match(report.compact.menuOptions.join(" "), /Workspace edits/);
        assert.match(report.compact.menuOptions.join(" "), /AI review/);
        assert.ok(
          Math.abs(
            report.compact.welcome.y +
              report.compact.welcome.height / 2 -
              report.compact.chat.y -
              report.compact.chat.height / 2,
          ) < 1,
        );
      }
      if (second >= 20.5) {
        assert.ok(
          Math.abs(
            report.compact.composer.x -
              report.compact.content.x -
              report.compact.gutter,
          ) < 1,
          `Composer/chat alignment at ${second}, ${viewport.width}: ${JSON.stringify({ composer: report.compact.composer, content: report.compact.content, gutter: report.compact.gutter })}`,
        );
        assert.ok(report.compact.composer.bottom > viewport.height - 48);
      }
      if ([177.5, 181, 185.5, 204.5].includes(second)) {
        assert.ok(
          report.compact.targetBox,
          "Captured source target is mounted",
        );
        assert.ok(
          report.compact.targetBox.y >= report.compact.log.y - 1 &&
            report.compact.targetBox.y < report.compact.log.bottom - 100,
          `Source not revealed at ${second}, ${viewport.width}: ${JSON.stringify({ target: report.compact.target, box: report.compact.targetBox, log: report.compact.log })}`,
        );
      }
      assert.match(report.appearance.font, /IBM Plex Sans/);
      assert.equal(report.appearance.background, "#f3efe6");
      if (second === 177.5 || second === 204.5) {
        assert.ok(
          report.appearance.promptRanges > 0,
          "Retained prompt must paint its original text heat",
        );
        assert.equal(
          report.appearance.registeredPromptRanges,
          report.appearance.promptRanges,
        );
        assert.ok(
          report.appearance.toolHeat > 0,
          "Reconstructed results must retain their distinct tool heat",
        );
      }
      assert.ok(report.documentWidth <= report.viewport);
      assert.ok(Math.abs(report.cursor.x - report.cursorDeclared.x) < 0.05);
      assert.ok(Math.abs(report.cursor.y - report.cursorDeclared.y) < 0.05);
      assert.equal(report.cursorDeclared.transition, "0s");
      assert.equal(
        report.cursorDeclared.opacity,
        second < 7 || second >= 211 ? 0 : second === 210.5 ? 0.5 : 1,
      );
      if (second >= 7 && second < 211) {
        assert.ok(
          report.cursor.x >= 0 && report.cursor.right <= viewport.width,
        );
        assert.ok(
          report.cursor.y >= 0 && report.cursor.bottom <= viewport.height,
        );
      }
      assert.equal(report.frameTransition, "0s");
      assert.ok(report.spinnerFrames.every((frame) => frame === report.frame));
      if (second < 174 || (second >= 190 && second < 197))
        assert.ok(
          Math.abs(report.logGap) < 1,
          `Unsettled follow scroll at ${second}: ${report.logGap}`,
        );
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
      if (second === 204.5) {
        assert.ok((await page.locator("[data-heat]").count()) > 0);
        assert.ok(
          await page
            .locator(".sv3-attention")
            .innerText()
            .then((t) => t.includes("Tool results 3.4%")),
        );
      }
      if (second === 172 || second === 193) {
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
      if (second === 175.5 || second === 197.5)
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
      await seek(page, 84.9);
      await page.evaluate(() => {
        requestAnimationFrame(() => {
          document.querySelector(".sv3-main-content").style.paddingBottom =
            "161px";
        });
      });
      await seek(page, 85);
      const gapAfterPaint = await page.evaluate(() => {
        const log = document.querySelector(".sv3-main-log");
        return Math.max(0, log.scrollHeight - log.clientHeight) - log.scrollTop;
      });
      assert.ok(
        Math.abs(gapAfterPaint) < 1,
        "A paint-time content expansion must settle before capture",
      );
      await page.evaluate(() =>
        document
          .querySelector(".sv3-main-content")
          .style.removeProperty("padding-bottom"),
      );
    }
    await seek(page, 164);
    await page.locator('[data-target="inspect-alert"]').click();
    assert.equal(
      await page.locator('[data-pocket="evidence"]').count(),
      1,
      "Inspect evidence must open its named pocket directly",
    );
    await seek(page, 175.5);
    await page.locator('[data-target="evidence-flagged"]').click();
    await assertSourceVisible(
      page,
      '[data-tool="reconstruction:step-3:tool-1"]',
    );
    assert.equal(
      await page.locator(".sv3-main-log").getAttribute("data-scroll-to"),
      '[data-tool="reconstruction:step-3:tool-1"]',
    );
    await seek(page, 181);
    await page.locator('[data-target="attention-prompt-3"]').click();
    await assertSourceVisible(page, '[data-prompt-round="5"]');
    assert.equal(
      await page.locator(".sv3-main-log").getAttribute("data-scroll-to"),
      '[data-prompt-round="5"]',
    );
    await seek(page, 183.5);
    await page
      .locator('[data-target="graph-reconstruction:step-2:tool-1"]')
      .click();
    await assertSourceVisible(
      page,
      '[data-tool="reconstruction:step-2:tool-1"]',
    );
    assert.equal(
      await page.locator('[aria-label="Evidence step"]').inputValue(),
      "2",
    );
    assert.equal(
      await page.locator(".sv3-main-log").getAttribute("data-scroll-to"),
      '[data-tool="reconstruction:step-2:tool-1"]',
    );
    const points = [];
    for (const [seconds, target] of actions) {
      const at =
        target === "security-spotter"
          ? 10.7
          : target === "understand-attention"
            ? seconds - 0.2
            : target === "close-attention"
              ? seconds - 0.1
              : target.startsWith("graph-")
                ? seconds - 0.1
                : seconds;
      await seek(page, at);
      const point = await page.evaluate((target) => {
        if (target === "attention-rest" || target === "scroll-answer") {
          const log = document
            .querySelector(
              target === "attention-rest"
                ? ".sv3-pocket-body"
                : ".sv3-main-log",
            )
            .getBoundingClientRect();
          const source = document
            .querySelector('[data-target="evidence-flagged"]')
            ?.getBoundingClientRect();
          return {
            x: log.left + 8,
            y:
              target === "attention-rest" && source
                ? Math.max(
                    log.top + 20,
                    Math.min(log.bottom - 20, source.top + source.height / 2),
                  )
                : log.top + 40,
          };
        }
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
