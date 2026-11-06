import test from "node:test";
import assert from "node:assert/strict";
import {
  reviewPath,
  reviewTypes,
  reviewDownloadName,
} from "../scripts/review-paths.mjs";
import fs from "node:fs/promises";

test("website gallery exposes deployment files and embeds, not production sources", () => {
  for (const p of [
    "/website/",
    "/website/manifest.json",
    "/website/output/clio-capabilities-website.zip",
    "/website/selection/long/output/loop.gif",
    "/website/tools/short/embed.html",
  ])
    assert.ok(reviewPath(p));
  for (const p of [
    "/website/src/plan.ts",
    "/website/tools/short/Scene.tsx",
    "/website/review.mjs",
    "/website/tools/short/output/../Scene.tsx",
  ])
    assert.equal(reviewPath(p), null);
  assert.equal(reviewPath("/"), "/gallery.html");
  assert.equal(reviewTypes[".gif"], "image/gif");
  assert.equal(reviewTypes[".webm"], "video/webm");
  assert.equal(reviewTypes[".zip"], "application/zip");
  assert.equal(
    reviewDownloadName("/website/method/short/output/loop.gif"),
    "method-short.gif",
  );
  assert.equal(
    reviewDownloadName("/website/method/long/output/poster.png"),
    "method-long-poster.png",
  );
  assert.equal(reviewDownloadName("/output/01-method.mp4"), "01-method.mp4");
});

test("standalone placements include reduced-motion and offscreen playback handling", async () => {
  const html = await fs.readFile(
    new URL("../website/selection/long/embed.html", import.meta.url),
    "utf8",
  );
  for (const token of [
    "prefers-reduced-motion",
    "IntersectionObserver",
    "video/webm",
    "video/mp4",
    "poster.png",
    "playsinline",
  ])
    assert.ok(html.includes(token), token);
});
