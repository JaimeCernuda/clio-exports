import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { readFileSync } from "node:fs";

const here = path.dirname(fileURLToPath(import.meta.url));
const native = path.dirname(here);
const pin = JSON.parse(
  readFileSync(path.join(native, "source-current.json"), "utf8"),
);
const source = process.env.CLIO_UI_SOURCE;
if (!source) throw new Error("Launch through native/run.mjs --profile current");
const web = path.join(source, "web");
const fromSource = createRequire(path.join(web, "package.json"));
const load = async (name) =>
  import(pathToFileURL(fromSource.resolve(name)).href);
const { default: react } = await load("@vitejs/plugin-react");
const { default: tailwind } = await load("@tailwindcss/vite");
const { brandPlugin } = await import(
  pathToFileURL(path.join(web, "vite-plugin-brand.ts")).href
);
const { maplibreWorkerPlugin } = await import(
  pathToFileURL(path.join(web, "vite-plugin-maplibre-worker.ts")).href
);
const { hdf5ViewerPlugin } = await import(
  pathToFileURL(path.join(web, "vite-plugin-hdf5-viewer.ts")).href
);
const singleton = [
  "react",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "react-dom",
  "react-dom/client",
  "@tanstack/react-query",
  "lucide-react",
  "react-router-dom",
];

export default {
  root: here,
  base: "./",
  publicDir: path.join(native, "public"),
  cacheDir: path.join(native, "../.native-ui/current-vite"),
  optimizeDeps: { exclude: ["maplibre-gl"] },
  plugins: [
    {
      name: "demo-source-receipt",
      configureServer(server) {
        server.middlewares.use("/clio-ui-source.json", (_req, res) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(pin));
        });
      },
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "clio-ui-source.json",
          source: JSON.stringify(pin),
        });
      },
    },
    {
      name: "current-native-tailwind",
      enforce: "pre",
      transform(code, id) {
        if (
          id.split("?")[0].replaceAll("\\", "/") ===
          path.join(here, "styles.css").replaceAll("\\", "/")
        )
          return `${code}\n@source "${path.join(web, "src").replaceAll("\\", "/")}";\n`;
      },
    },
    brandPlugin(path.join(native, "branding"), "clio"),
    react(),
    tailwind(),
    maplibreWorkerPlugin(),
    hdf5ViewerPlugin(),
  ],
  resolve: {
    alias: [
      {
        find: /^\.\/navigation-agent-menu$/,
        replacement: path.join(here, "navigation-agent-menu.tsx"),
      },
      {
        find: "@/lib/shared-clock",
        replacement: path.join(here, "replay-clock.ts"),
      },
      {
        find: /^\.\/map-initial-view$/,
        replacement: path.join(here, "map-context.ts"),
      },
      { find: "@clio-ui", replacement: path.join(web, "src") },
      {
        find: "@clio/core/v3",
        replacement: path.join(source, "packages/core/src/v3/index.ts"),
      },
      { find: "@", replacement: path.join(web, "src") },
      ...singleton.map((name) => ({
        find: new RegExp(
          "^" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$",
        ),
        replacement: fromSource.resolve(name),
      })),
    ],
  },
  define: {
    "import.meta.env.VITE_CLIO_WORKSPACE_VERSION": JSON.stringify("recorded"),
    "import.meta.env.VITE_CLIO_DESKTOP_CHANGELOG": JSON.stringify(""),
  },
  server: {
    host: "127.0.0.1",
    port: 3372,
    strictPort: true,
    fs: { allow: [native, path.dirname(native), source] },
  },
  preview: { host: "127.0.0.1", port: 3372, strictPort: true },
  build: {
    outDir: path.join(native, "../.native-ui/build-current"),
    emptyOutDir: true,
    assetsInlineLimit: 0,
  },
};
