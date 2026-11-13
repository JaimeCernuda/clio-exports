import assert from "node:assert/strict";
import test from "node:test";
import { nativeProfile } from "../native/profiles.mjs";
test("the current UI is isolated while every previous film retains its pinned source profile", () => {
  assert.equal(nativeProfile("current").sourceFile, "source-current.json");
  assert.equal(nativeProfile("current").config, "current/vite.config.mjs");
  assert.equal(nativeProfile("default").sourceFile, "source.json");
  for (const name of ["opal", "wordle", "engineering"])
    assert.equal(nativeProfile(name).sourceFile, "source-opal.json");
  assert.deepEqual(nativeProfile("current").entries, ["current/entry.tsx"]);
  assert.throws(() => nativeProfile("unknown"), /Unknown native profile/);
});
