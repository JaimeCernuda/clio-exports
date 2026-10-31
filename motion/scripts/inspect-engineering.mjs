import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const work = path.join(root, ".native-ui/engineering-render/tmp");
await mkdir(work, { recursive: true });
process.env.TEMP = work;
process.env.TMP = work;
process.env.TMPDIR = work;
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
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1.5,
});
page.on("pageerror", (error) => console.log("PAGE ERROR", error.message));
page.on("console", (message) => {
  if (message.type() === "error")
    console.log("BROWSER", message.text().slice(0, 300));
});
const out = path.resolve(
  root,
  process.env.ENGINEERING_REVIEW_DIR ?? "review/engineering",
);
await mkdir(out, { recursive: true });
const timings = process.argv.slice(2).map(Number);
const samples = timings.length
  ? timings
  : [
      4, 25, 55, 86, 95, 104, 120, 140, 174, 186, 200, 240, 262, 285, 302, 322,
      338, 350,
    ];
try {
  await page.goto(
    "http://127.0.0.1:3365/engineering.html?mode=film&cut=full&render=1",
  );
  await page.waitForSelector(".engineering-full,[role=alert]", {
    timeout: 120000,
  });
  if (await page.locator("[role=alert]").count())
    throw new Error(await page.locator("[role=alert]").first().textContent());
  console.log("NATIVE READY");
  const receipts = [];
  for (const seconds of samples) {
    const frame = Math.round(seconds * 60);
    const receipt = await page.evaluate(
      ({ frame }) =>
        new Promise((resolve, reject) => {
          const diagnostic = setTimeout(
            () =>
              console.error(
                "WAITING",
                document
                  .querySelector(".engineering-full")
                  ?.getAttribute("data-pending"),
                document
                  .querySelector(".engineering-full")
                  ?.getAttribute("data-evidence"),
              ),
            15000,
          );
          const timer = setTimeout(() => {
            clearTimeout(diagnostic);
            reject(
              new Error(
                document.querySelector('[role="alert"]')?.textContent ??
                  `Frame ${frame} timed out: ${document.querySelector(".engineering-full")?.getAttribute("data-pending")}`,
              ),
            );
          }, 100000);
          const receive = (event) => {
            if (event.data?.kind === "clio-film-error") {
              clearTimeout(timer);
              clearTimeout(diagnostic);
              removeEventListener("message", receive);
              reject(new Error(event.data.message));
            }
            if (
              event.data?.kind === "clio-film-ready" &&
              event.data.frame === frame &&
              event.data.nonce === frame + 1
            ) {
              clearTimeout(timer);
              clearTimeout(diagnostic);
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
    receipts.push(receipt);
    if (seconds === 327 || seconds === 332) {
      console.log(
        "CHART HIT",
        await page.evaluate(
          ({ pointer }) => {
            const target = document.elementFromPoint(pointer.x, pointer.y);
            const marks = Array.from(
              document.querySelectorAll(
                ".engineering-canvas svg .mark-symbol path",
              ),
            )
              .filter((node) =>
                /^iteration: (0|10);/.test(
                  node.getAttribute("aria-label") ?? "",
                ),
              )
              .map((node) => ({
                label: node.getAttribute("aria-label"),
                rect: node.getBoundingClientRect().toJSON(),
              }));
            return {
              pointer,
              target: target?.outerHTML.slice(0, 220),
              marks,
              tooltip: document.getElementById("vg-tooltip-element")?.innerText,
            };
          },
          { pointer: receipt.pointer },
        ),
      );
    }
    if (seconds >= 344)
      console.log(
        "CLOSING",
        await page.evaluate(() => {
          const host = document.querySelector(".replay-scroll");
          const log = document.querySelector(".replay-log");
          return {
            hostHeight: host?.clientHeight,
            logHeight: log?.offsetHeight,
            hostRect: host?.getBoundingClientRect().toJSON(),
            offset: host?.getAttribute("data-scroll-offset"),
            transform: log?.style.transform,
            tail: log?.innerText.slice(-900),
          };
        }),
      );
    if (seconds === 140 || seconds === 120)
      console.log(
        "SCROLL",
        await page.evaluate(() => {
          const viewport = document.querySelector(".engineering-scroll");
          const selected = viewport?.querySelector(
            '[data-a2ui-component-id="inspView"]',
          );
          return {
            viewport: viewport
              ? {
                  height: viewport.clientHeight,
                  scrollHeight: viewport.scrollHeight,
                  scrollTop: viewport.scrollTop,
                }
              : null,
            selected: selected?.getBoundingClientRect().toJSON(),
            matching: document.querySelectorAll(
              '[data-a2ui-component-id="inspView"]',
            ).length,
          };
        }),
      );
    await page.screenshot({ path: path.join(out, `at-${seconds}.png`) });
    console.log(
      JSON.stringify({
        seconds,
        phase: receipt.phase,
        meshCount: receipt.meshes.length,
        scroll: receipt.rawScroll,
      }),
    );
  }
  await writeFile(
    path.join(out, "inspection.json"),
    JSON.stringify(receipts, null, 2),
  );
} finally {
  await browser.close();
}
