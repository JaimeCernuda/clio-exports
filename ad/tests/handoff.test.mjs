import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const sources = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? sources(file) : [file];
  });

test("the ad's relative code imports resolve entirely within the shareable folder", () => {
  const files = [
    path.join(root, "render.mjs"),
    ...sources(path.join(root, "src")),
    ...sources(path.join(root, "scripts")),
    ...sources(path.join(root, "tests")),
  ].filter((file) => /\.(?:tsx?|mjs)$/u.test(file));
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(
      /(?:from\s*|import\s*\(?\s*)["'](\.[^"']+)["']/gu,
    )) {
      const base = path.resolve(path.dirname(file), match[1]);
      assert.ok(
        base.startsWith(root + path.sep),
        `${file}: import escapes ad/: ${match[1]}`,
      );
      assert.ok(
        ["", ".ts", ".tsx", ".mjs"].some((extension) =>
          existsSync(base + extension),
        ),
        `${file}: missing import ${match[1]}`,
      );
    }
  }
});

test("the handoff includes the creative brief, commands, assets, skill and review history", () => {
  for (const file of [
    "HANDOFF.md",
    "README.md",
    "AGENTS.md",
    "CLAUDE.md",
    "ART-DIRECTION.md",
    "package-lock.json",
    "public/clio-mark.svg",
    "public/composable/clio-qr-white.svg",
    "references/ui-sources.json",
    "skills/clio-composable-ad/SKILL.md",
    "docs/reviews/review-ad-v9.md",
    "docs/reviews/review-ad-v10.md",
    "docs/reviews/review-ad-v11.md",
    "docs/reviews/review-ad-v12.md",
    "examples/composable-measure.json",
  ])
    assert.ok(
      existsSync(path.join(root, file)),
      `Missing handoff material: ${file}`,
    );
  const manifest = JSON.parse(
    readFileSync(path.join(root, "package.json"), "utf8"),
  );
  for (const file of [
    "HANDOFF.md",
    "CLAUDE.md",
    "src",
    "tests",
    "public",
    "skills",
    "docs",
  ])
    assert.ok(manifest.files.includes(file), `Source archive omits ${file}`);
  for (const generated of ["node_modules", "bundle", "review", "out", ".cache"])
    assert.ok(
      !manifest.files.includes(generated),
      `Source archive includes ${generated}`,
    );
});
