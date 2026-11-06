import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ToolsScene } from "../films/06-tools/scene";

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
