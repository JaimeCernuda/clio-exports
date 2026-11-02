import assert from "node:assert/strict";
import test from "node:test";
import "../../composability/ad/tests/prompt-morph.test";
import {
  COMPOSABLE_FRAMES,
  byId,
  fragmentText,
  transformationAt,
  transformations,
} from "../src/composable-plan";
import { pointerAt } from "../src/composable-pointer";
test("Slurm changes capabilities while the identity stays untouched", () => {
  assert.equal(
    fragmentText(byId.clio, "standard.identity"),
    fragmentText(byId["clio-slurm"], "standard.identity"),
  );
  assert.equal(fragmentText(byId.clio, "slurm.capabilities"), "");
  assert.ok(
    fragmentText(byId["clio-slurm"], "slurm.capabilities").includes(
      "hpc-batch-jobs",
    ),
  );
  assert.ok(byId.factorio.plugins.includes("slurm"));
  assert.deepEqual(byId["factorio-ndp"].delta.add, ["ndp"]);
  assert.ok(byId["factorio-ndp"].mcpServers.includes("ndp"));
});

test("one continuous 30-second plan leaves more than five settled seconds for the QR", () => {
  assert.equal(COMPOSABLE_FRAMES, 1800);
  for (const [index, change] of transformations.entries()) {
    if (index) assert.equal(change.from, transformations[index - 1].to);
    assert.equal(transformationAt(change.at).progress, 0);
    assert.equal(transformationAt(change.at + change.duration).progress, 1);
    assert.ok(change.at + change.duration < 1452);
  }
  assert.ok(COMPOSABLE_FRAMES - (1452 + 42) >= 300);
  for (let frame = 1; frame < 1200; frame++) {
    const a = pointerAt(frame - 1),
      b = pointerAt(frame);
    assert.ok(
      Math.hypot(a.x - b.x, a.y - b.y) < 70,
      `Pointer jump at ${frame}`,
    );
  }
});
