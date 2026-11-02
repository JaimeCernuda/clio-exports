import assert from "node:assert/strict";
import test from "node:test";
import {
  matchWords,
  morphWords,
  morphBoxes,
  ease,
  type WordBox,
  type PromptLayout,
} from "../src/prompt-morph";

const words = (text: string, block = "identity"): WordBox[] =>
  text.split(" ").map((word, i) => ({
    id: `${block}:${i}`,
    block,
    text: word,
    x: i * 40,
    y: 0,
    width: 35,
    height: 24,
    fontSize: 20,
    fontWeight: 400,
    color: "#123",
    mono: false,
  }));
const layout = (items: WordBox[]): PromptLayout => ({
  words: items,
  boxes: [],
  height: 100,
});

test("replacement preserves an ordered phrase without matching unrelated stopwords", () => {
  const before = words("You are CLIO a coding assistant");
  const after = words("You are Factorio a research partner");
  assert.deepEqual(
    [...matchWords(before, after)],
    [
      [0, 0],
      [1, 1],
    ],
  );
});

test("a new fragment cannot borrow a repeated word from a different section", () => {
  const before = layout(words("You are CLIO", "identity"));
  const after = layout([
    ...words("You are CLIO", "identity"),
    ...words("You are ready", "capabilities"),
  ]);
  const result = morphWords(before, after, 0.5);
  assert.equal(result.filter((word) => word.motion === "keep").length, 3);
  assert.ok(
    result
      .filter((word) => word.block === "capabilities")
      .every((word) => word.motion === "insert"),
  );
});

test("measured line wrapping moves retained words continuously to the new line", () => {
  const before = layout(words("unchanged words wrap smoothly"));
  const after = layout(
    before.words.map((word, i) => ({
      ...word,
      x: i >= 2 ? (i - 2) * 40 : word.x,
      y: i >= 2 ? 32 : 0,
    })),
  );
  const middle = morphWords(before, after, 0.5);
  assert.equal(middle[2].x, 40);
  assert.equal(middle[2].y, 16);
  assert.ok(middle.every((word) => word.opacity === 1));
  assert.deepEqual(
    morphWords(before, after, 1).map((word) => [word.x, word.y]),
    after.words.map((word) => [word.x, word.y]),
  );
});

test("replacements never ghost outgoing and incoming words over each other", () => {
  const before = layout(words("old phrase")),
    after = layout(words("new instruction"));
  for (let frame = 0; frame <= 100; frame++) {
    const result = morphWords(before, after, frame / 100);
    const outgoing = result.filter((word) => word.motion === "remove");
    const incoming = result.filter((word) => word.motion === "insert");
    assert.ok(
      !(
        outgoing.some((word) => word.opacity > 0.01) &&
        incoming.some((word) => word.opacity > 0.01)
      ),
    );
  }
});

test("fragment insertion opens its space and removal releases it", () => {
  const box = {
    id: "slurm",
    x: 0,
    y: 20,
    width: 300,
    height: 120,
    background: "transparent",
    border: "none",
    radius: 8,
  };
  const empty = layout([]),
    full = { ...empty, boxes: [box] };
  assert.equal(morphBoxes(empty, full, 0)[0].height, 0);
  assert.equal(morphBoxes(empty, full, 0.5)[0].height, 60);
  assert.equal(morphBoxes(full, empty, 1)[0].height, 0);
});

test("easing settles without overshoot", () => {
  assert.equal(ease(-1), 0);
  assert.equal(ease(2), 1);
  for (let i = 0; i < 100; i++) assert.ok(ease(i / 100) <= ease((i + 1) / 100));
});
