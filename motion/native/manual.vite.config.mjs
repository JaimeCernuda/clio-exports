import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = process.env.CLIO_UI_SOURCE;
const branding = process.env.CLIO_MANUAL_BRANDING;
if (!source || !branding) {
  throw new Error(
    "Set CLIO_UI_SOURCE and CLIO_MANUAL_BRANDING before starting the manual UI",
  );
}
const web = path.join(source, "web");
const requireSource = createRequire(path.join(web, "package.json"));
const load = async (name) =>
  import(pathToFileURL(requireSource.resolve(name)).href);
const { default: react } = await load("@vitejs/plugin-react");
const { default: tailwind } = await load("@tailwindcss/vite");
const { brandPlugin } = await import(
  pathToFileURL(path.join(web, "vite-plugin-brand.ts")).href
);
const { maplibreWorkerPlugin } = await import(
  pathToFileURL(path.join(web, "vite-plugin-maplibre-worker.ts")).href
);

/** Keep exact source coordinates in the native frontend, without film clocks or fixtures. */
function manualAttentionProjection() {
  return {
    name: "manual-attention-source-coordinates",
    enforce: "pre",
    transform(code, id) {
      const relative = path
        .relative(web, id.split("?")[0])
        .replaceAll("\\", "/");
      const replaceRequired = (needle, replacement) => {
        if (!code.includes(needle))
          throw new Error(`Manual attention port changed: ${relative}`);
        return code.replace(needle, replacement);
      };
      if (relative === "src/main.tsx") {
        return (
          `import ${JSON.stringify(path.join(here, "manual-attention.css").replaceAll("\\", "/"))};\n` +
          code
        );
      }
      if (relative === "src/lib/attention-text.ts") {
        return replaceRequired(
          "const source = projectText(sourceText, { source: true });",
          "let source = projectText(sourceText, { source: true }); if (source.text !== domProjection.text) { const literal = projectText(sourceText, { source: false }); if (literal.text === domProjection.text) source = literal; }",
        );
      }
      if (relative === "src/lib/transcript-content-selection.ts") {
        return replaceRequired(
          "const raw = projectText(bound.source.slice(sourceStart), { source: true });",
          "let raw = projectText(bound.source.slice(sourceStart), { source: true }); if (raw.text !== dom.text) { const literal = projectText(bound.source.slice(sourceStart), { source: false }); if (literal.text === dom.text) raw = literal; }",
        );
      }
      if (relative === "src/components/ai-elements/markdown.tsx") {
        return (
          `import { RecordedParagraph } from ${JSON.stringify(path.join(here, "recorded-paragraph.tsx").replaceAll("\\", "/"))};\n` +
          replaceRequired(
            "components={{ ...streamdownComponents, ...components }}",
            "components={{ ...streamdownComponents, p: RecordedParagraph, ...components }}",
          )
        );
      }
      if (relative === "src/components/clio/transcript-text-block.tsx") {
        return (
          `import { RecordedOpalPrompt } from ${JSON.stringify(path.join(here, "recorded-prompt.tsx").replaceAll("\\", "/"))};\n` +
          replaceRequired(
            "<SentReferenceMessage text={block.text} />",
            "<RecordedOpalPrompt text={block.text} />",
          )
        );
      }
      return undefined;
    },
  };
}

export default {
  root: web,
  cacheDir: path.join(here, "../.native-ui/manual-vite-cache"),
  plugins: [
    manualAttentionProjection(),
    brandPlugin(branding, "clio"),
    react(),
    tailwind(),
    maplibreWorkerPlugin(),
  ],
  define: {
    "import.meta.env.VITE_CLIO_WORKSPACE_VERSION":
      JSON.stringify("0.11.3-beta.11"),
    "import.meta.env.VITE_CLIO_DESKTOP_CHANGELOG": JSON.stringify(""),
  },
  resolve: {
    alias: {
      "@": path.join(web, "src"),
      "@clio/core/v3": path.join(source, "packages/core/src/v3/index.ts"),
      react: path.dirname(requireSource.resolve("react/package.json")),
      "react-dom": path.dirname(
        requireSource.resolve("react-dom/package.json"),
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  server: {
    host: "127.0.0.1",
    port: 4394,
    strictPort: true,
    fs: { allow: [source, here, branding] },
  },
};
