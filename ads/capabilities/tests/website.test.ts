import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assets, sourceTime, loopOpacity, getAsset } from "../website/src/plan";
import { Caption, WebsitePresentation } from "../src/kit";

test("each capability has distinct website cuts with forward-only source dependencies", () => {
  assert.equal(assets.length, 16);
  for (const asset of assets) {
    assert.ok(asset.seconds >= 6 && asset.seconds <= 21);
    assert.equal(asset.width % 2, 0);
    assert.equal(asset.height % 2, 0);
    let previous = asset.sourceStart;
    for (let f = 0; f < asset.frames; f++) {
      const t = sourceTime(asset, f / asset.fps);
      assert.ok(t >= previous && t <= asset.sourceEnd);
      previous = t;
    }
    assert.equal(
      sourceTime(asset, asset.seconds - 1 / asset.fps),
      asset.sourceEnd,
    );
    assert.equal(loopOpacity(asset, 0), 0);
    assert.ok(loopOpacity(asset, asset.seconds - 1 / asset.fps) < 1e-10);
    assert.ok(asset.sourceStart >= 4 && asset.sourceEnd < 35);
    if (asset.variant === "short")
      assert.ok(asset.seconds < getAsset(`${asset.id}-long`).seconds);
  }
});

test("selection and stream loops retain the action before its recorded consequence", () => {
  const selection = getAsset("selection-long"),
    short = getAsset("selection-short"),
    streams = getAsset("streams-long");
  for (const at of [6, 10.5, 18.4, 20.9, 24.1])
    assert.ok(selection.sourceStart < at && selection.sourceEnd > at);
  assert.ok(
    short.sourceStart < 6 && short.sourceEnd > 13 && short.sourceEnd < 15,
  );
  for (const at of [17, 19.6, 27.4, 29.5, 32.6])
    assert.ok(streams.sourceStart < at && streams.sourceEnd > at);
});

test("website caption suppression does not change advertisement caption defaults", () => {
  const caption = React.createElement(Caption, {
    t: 8,
    at: 4,
    until: 10,
    text: "Advertising copy",
  });
  assert.ok(renderToStaticMarkup(caption).includes("Advertising copy"));
  assert.equal(
    renderToStaticMarkup(
      React.createElement(
        WebsitePresentation.Provider,
        { value: true },
        caption,
      ),
    ),
    "",
  );
  assert.equal(
    renderToStaticMarkup(
      React.createElement(
        WebsitePresentation.Provider,
        { value: false },
        caption,
      ),
    ),
    renderToStaticMarkup(caption),
  );
});
