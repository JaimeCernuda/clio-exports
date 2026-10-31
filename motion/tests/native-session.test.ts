import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  conversationTurns,
  messagesForTurn,
  sceneAssetPath,
  parseSceneCatalog,
} from "../native/scene-selection";

test("turns preserve multiple assistant messages, leading context and unfinished user prompts", () => {
  const messages = [
    { id: "context", role: "assistant" },
    {
      id: "q1",
      role: "user",
      blocks: [{ type: "text", text: "The real\nquestion" }],
    },
    { id: "a1", role: "assistant" },
    { id: "a2", role: "assistant" },
    { id: "q2", role: "user" },
  ];
  const turns = conversationTurns(messages);
  assert.deepEqual(
    turns.map(({ id, start, end }) => ({ id, start, end })),
    [
      { id: "context", start: 0, end: 1 },
      { id: "q1", start: 1, end: 4 },
      { id: "q2", start: 4, end: 5 },
    ],
  );
  assert.equal(turns[1].label, "2. The real question");
  assert.strictEqual(messagesForTurn(messages, "")[0], messages[0]);
  assert.deepEqual(messagesForTurn(messages, "q1"), messages.slice(1, 4));
  assert.throws(() => messagesForTurn(messages, "unknown"), /No recorded turn/);
  assert.deepEqual(conversationTurns([]), []);
  assert.throws(
    () =>
      conversationTurns([
        { id: "same", role: "user" },
        { id: "same", role: "assistant" },
      ]),
    /unique/,
  );
  assert.throws(() => conversationTurns([{}]), /identity or role/);
});

test("a new scene is a local asset and catalog registration cannot load remote content", () => {
  assert.equal(
    sceneAssetPath("another-session.native.json"),
    "./another-session.native.json",
  );
  assert.equal(sceneAssetPath("Other.JSON"), "./Other.JSON");
  assert.equal(
    sceneAssetPath("sessions/A new session.json"),
    "./sessions/A%20new%20session.json",
  );
  for (const invalid of [
    "../outside.json",
    "https://example.com/data.json",
    "//example.com/data.json",
    "C:\\session.json",
    "plain.txt",
    "x.json?run=1",
  ])
    assert.throws(() => sceneAssetPath(invalid), /local JSON/);
  const value = {
    schema: "clio.scene-catalog.v1",
    scenes: [
      { file: "new.json", title: "Actual title", sessionId: "source-id" },
    ],
  };
  assert.deepEqual(parseSceneCatalog(value), value.scenes);
  assert.throws(() => parseSceneCatalog({}), /scene-catalog/);
  assert.throws(
    () => parseSceneCatalog({ ...value, scenes: [{}] }),
    /incomplete/,
  );
  assert.throws(
    () =>
      parseSceneCatalog({
        ...value,
        scenes: [...value.scenes, ...value.scenes],
      }),
    /Duplicate/,
  );
});

test("the same turn selection handles Tahoe, another parent and an assistant-only child", () => {
  const load = (file: string) =>
    JSON.parse(
      readFileSync(
        new URL(`../native/public/${file}`, import.meta.url),
        "utf8",
      ),
    );
  const tahoe = load("tahoe.native.json");
  const parent = load("reading-guide.native.json");
  const child = load("reading-child.native.json");
  assert.equal(conversationTurns(tahoe.view.messages).length, 3);
  assert.equal(conversationTurns(parent.view.messages).length, 1);
  const childTurns = conversationTurns(child.view.messages);
  assert.equal(childTurns.length, 1);
  assert.deepEqual(
    messagesForTurn(child.view.messages, childTurns[0].id),
    child.view.messages,
  );
  assert.equal(child.view.messages[0].role, "assistant");
});
