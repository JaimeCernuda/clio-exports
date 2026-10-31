import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const command = args[0] ?? "dev";
if (!["dev", "build", "preview", "check"].includes(command))
  throw new Error("Choose dev, build, preview or check");
const flag = args.indexOf("--source");
const profileFlag = args.indexOf("--profile");
const profile = profileFlag < 0 ? "default" : args[profileFlag + 1];
if (!["default", "opal", "wordle", "engineering"].includes(profile))
  throw new Error("Choose default, opal, wordle or engineering profile");
const nativeTemporary = path.join(here, "../.native-ui/tmp");
mkdirSync(nativeTemporary, { recursive: true });
process.env.TEMP = nativeTemporary;
process.env.TMP = nativeTemporary;
process.env.TMPDIR = nativeTemporary;
if (flag >= 0 && !args[flag + 1])
  throw new Error("--source needs a checkout path");
const source = path.resolve(
  flag >= 0
    ? args[flag + 1]
    : (process.env.CLIO_UI_SOURCE ?? path.join(here, "../.native-ui/source")),
);
const expected = JSON.parse(
  readFileSync(
    path.join(here, profile !== "default" ? "source-opal.json" : "source.json"),
    "utf8",
  ),
);
if (!existsSync(path.join(source, "web/package.json")))
  throw new Error(
    "Provide the pinned gact-tui checkout with --source PATH or CLIO_UI_SOURCE; see motion/native/README.md",
  );
const revision = spawnSync("git", ["-C", source, "rev-parse", "HEAD"], {
  encoding: "utf8",
});
if (revision.status !== 0 || revision.stdout.trim() !== expected.revision)
  throw new Error(
    `Expected gact-tui ${expected.revision}; select that revision in a separate checkout`,
  );
const changes = spawnSync(
  "git",
  ["-C", source, "status", "--porcelain", "--untracked-files=no"],
  { encoding: "utf8" },
);
if (changes.status !== 0 || changes.stdout.trim())
  throw new Error(
    "Use a clean pinned gact-tui checkout so the recorded source revision is accurate",
  );
const requireSource = createRequire(path.join(source, "web/package.json"));
if (command === "check") {
  const reactTypes = path.dirname(
    requireSource.resolve("@types/react/package.json"),
  );
  const reactDomTypes = path.dirname(
    requireSource.resolve("@types/react-dom/package.json"),
  );
  const packageTypes = (name) => {
    const location = requireSource.resolve(`${name}/package.json`);
    const metadata = JSON.parse(readFileSync(location, "utf8"));
    return path.join(
      path.dirname(location),
      metadata.types ?? metadata.typings,
    );
  };
  const cache = path.join(here, "../.native-ui");
  mkdirSync(cache, { recursive: true });
  const config = path.join(cache, `tsconfig-${profile}.json`);
  writeFileSync(
    config,
    JSON.stringify({
      extends: path.join(source, "web/tsconfig.app.json"),
      compilerOptions: {
        incremental: false,
        tsBuildInfoFile: undefined,
        types: [],
        strict: true,
        resolveJsonModule: true,
        paths: {
          react: [path.join(reactTypes, "index.d.ts")],
          "react/*": [path.join(reactTypes, "*")],
          "react-dom": [path.join(reactDomTypes, "index.d.ts")],
          "react-dom/*": [path.join(reactDomTypes, "*")],
          "@tanstack/react-query": [packageTypes("@tanstack/react-query")],
          "lucide-react": [packageTypes("lucide-react")],
          "@clio-ui/*": [path.join(source, "web/src/*")],
          "@/*": [path.join(source, "web/src/*")],
          "@clio/core/v3": [path.join(source, "packages/core/src/v3/index.ts")],
        },
      },
      include: [],
      files: [
        path.join(here, "entry.tsx"),
        ...(profile === "engineering"
          ? [path.join(here, "engineering-entry.tsx")]
          : []),
        ...(profile === "wordle" ? [path.join(here, "study-entry.tsx")] : []),
        path.join(here, "workspace.tsx"),
        path.join(here, "recorded-prompt.tsx"),
        path.join(here, "recorded-paragraph.tsx"),
        path.join(here, "recorded-thinking.tsx"),
        path.join(here, "spotter-notification.ts"),
        path.join(here, "map-context.ts"),
        path.join(
          path.dirname(requireSource.resolve("vite/package.json")),
          "client.d.ts",
        ),
        path.join(source, "web/src/brand.d.ts"),
      ],
    }),
  );
  const tsc = path.join(
    path.dirname(requireSource.resolve("typescript/package.json")),
    "bin/tsc",
  );
  const result = spawnSync(
    process.execPath,
    [tsc, "--project", config, "--pretty", "false"],
    { cwd: here, stdio: "inherit" },
  );
  process.exit(result.status ?? 1);
}
const vite = path.join(
  path.dirname(requireSource.resolve("vite/package.json")),
  "bin/vite.js",
);
const options = command === "dev" ? [] : [command];
const child = spawn(
  process.execPath,
  [
    vite,
    ...options,
    "--config",
    path.join(
      here,
      profile === "engineering"
        ? "engineering.vite.config.mjs"
        : "vite.config.mjs",
    ),
  ],
  {
    cwd: here,
    stdio: "inherit",
    env: { ...process.env, CLIO_UI_SOURCE: source, CLIO_UI_PROFILE: profile },
  },
);
child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
