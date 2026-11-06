import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ToolsScene } from "../films/06-tools/scene";
import { ToolRow } from "../src/kit";

test("available capabilities do not pretend to be executing tools", () => {
  const html = renderToStaticMarkup(
    React.createElement(ToolRow, { t: 7, text: "Read HDF5", ready: true }),
  );
  assert.ok(html.includes("lucide-wrench"));
  assert.ok(!html.includes("lucide-loader-circle"));
  const running = renderToStaticMarkup(
    React.createElement(ToolRow, { t: 12, text: "Read HDF5" }),
  );
  assert.ok(running.includes("lucide-loader-circle"));
});

test("the resolved scientific result has no unused copy/download/dropdown controls", () => {
  const html = renderToStaticMarkup(React.createElement(ToolsScene, { t: 23 }));
  assert.ok(html.includes("Gene-count quality summary"));
  assert.ok(html.includes("2,753"));
  for (const icon of [
    "lucide-copy",
    "lucide-download",
    "lucide-chevron-down",
    "lucide-maximize",
    "lucide-plus",
  ])
    assert.ok(!html.includes(icon), `Unexpected idle control: ${icon}`);
});
