import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = process.env.CLIO_UI_SOURCE;
const opalProfile = process.env.CLIO_UI_PROFILE === "opal";
const nativePort = opalProfile ? 3359 : 3357;
if (!source) throw new Error("Use native/run.mjs to select a source checkout");
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
  cacheDir: path.join(here, "node_modules/.vite"),
  base: "./",
  plugins: [
    {
      name: "native-source-classes",
      enforce: "pre",
      transform(code, id) {
        const sourcePath = id.split("?")[0].replaceAll("\\", "/");
        if (
          opalProfile &&
          sourcePath ===
            path
              .join(web, "src/components/clio/injection-presentation.ts")
              .replaceAll("\\", "/")
        ) {
          return (
            `import {spotterNotificationPresentation} from ${JSON.stringify(path.join(here, "spotter-notification.ts").replaceAll("\\", "/"))};\n` +
            code.replace(
              "  const header =",
              "  const recorded = spotterNotificationPresentation(source, text); if (recorded) return recorded;\n  const header =",
            )
          );
        }
        if (
          opalProfile &&
          sourcePath ===
            path
              .join(web, "src/components/clio/selection-actions.tsx")
              .replaceAll("\\", "/")
        )
          return code.replace(
            "left: anchor.left, top:",
            "left: Math.max(200, Math.min(anchor.left, innerWidth - 200)), top:",
          );
        if (
          opalProfile &&
          sourcePath ===
            path
              .join(
                web,
                "src/components/clio/conversation-harness-injection.tsx",
              )
              .replaceAll("\\", "/")
        ) {
          const opening =
            '{expanded ? (\n          <div className="mt-2 min-w-0 space-y-2 pl-1">';
          const closing =
            "</div>\n        ) : null}\n        <ToolDetailsContent";
          if (!code.includes(opening) || !code.includes(closing))
            throw new Error(
              "Native injection disclosure changed; update the replay adapter",
            );
          return (
            `import {RecordedInjectionContent} from ${JSON.stringify(path.join(here, "recorded-thinking.tsx").replaceAll("\\", "/"))};\n` +
            code
              .replace(
                opening,
                '<RecordedInjectionContent disclosureKey={`injection:${block.id}`} expanded={expanded}>\n          <div className="mt-2 min-w-0 space-y-2 pl-1">',
              )
              .replace(
                closing,
                "</div>\n        </RecordedInjectionContent>\n        <ToolDetailsContent",
              )
          );
        }
        if (
          sourcePath ===
          path
            .join(web, "src/components/clio/transcript-reasoning-passage.tsx")
            .replaceAll("\\", "/")
        ) {
          if (!code.includes("<CollapsibleContent>"))
            throw new Error(
              "Native thinking disclosure changed; update the replay adapter",
            );
          return (
            `import {RecordedThinkingContent} from ${JSON.stringify(path.join(here, "recorded-thinking.tsx").replaceAll("\\", "/"))};\n` +
            code
              .replace(
                "<CollapsibleContent>",
                "<RecordedThinkingContent disclosureKey={key}>",
              )
              .replace("</CollapsibleContent>", "</RecordedThinkingContent>")
          );
        }
        if (
          sourcePath ===
          path.join(web, "src/lib/attention-text.ts").replaceAll("\\", "/")
        )
          return code.replace(
            "const source = projectText(sourceText, { source: true });",
            "let source = projectText(sourceText, { source: true }); if (source.text !== domProjection.text) { const literal = projectText(sourceText, {source: false}); if (literal.text === domProjection.text) source = literal; }",
          );
        if (
          sourcePath ===
          path
            .join(web, "src/lib/transcript-content-selection.ts")
            .replaceAll("\\", "/")
        )
          return code.replace(
            "const raw = projectText(bound.source.slice(sourceStart), { source: true });",
            "let raw = projectText(bound.source.slice(sourceStart), { source: true }); if (raw.text !== dom.text) { const literal = projectText(bound.source.slice(sourceStart), {source: false}); if (literal.text === dom.text) raw = literal; }",
          );
        if (
          sourcePath ===
          path
            .join(web, "src/components/clio/transcript-text-block.tsx")
            .replaceAll("\\", "/")
        )
          return (
            `import {RecordedOpalPrompt} from ${JSON.stringify(path.join(here, "recorded-prompt.tsx").replaceAll("\\", "/"))};\n` +
            code.replace(
              "<SentReferenceMessage text={block.text} />",
              "new URLSearchParams(location.search).get('mode') === 'spotter' ? <RecordedOpalPrompt text={block.text} /> : <SentReferenceMessage text={block.text} />",
            )
          );
        if (
          sourcePath ===
          path
            .join(web, "src/components/ai-elements/message.tsx")
            .replaceAll("\\", "/")
        )
          return code
            .replace(
              /const MarkdownText = lazy\(\(\) =>\s*import\('\.\/markdown'\)\.then\(\(module\) => \(\{ default: module\.MarkdownText \}\)\),\s*\);/,
              "import { MarkdownText } from './markdown';",
            )
            .replace(
              "<p className={className}>{String(props.children ?? '')}</p>",
              "<p data-replay-markdown-pending className={className}>{String(props.children ?? '')}</p>",
            );
        if (
          sourcePath ===
          path
            .join(web, "src/components/clio/composer.tsx")
            .replaceAll("\\", "/")
        )
          return code
            .replace(
              "export interface ClioComposerProps extends ComposerQueueControls {",
              "export interface ClioComposerProps extends ComposerQueueControls { recordedApprovalMenuOpen?: boolean;",
            )
            .replace(
              "  confirmationPolicy = 'ask',",
              "  confirmationPolicy = 'ask', recordedApprovalMenuOpen,",
            )
            .replace(
              "<ClioComposerBehaviorControls",
              "<ClioComposerBehaviorControls recordedApprovalMenuOpen={recordedApprovalMenuOpen}",
            );
        if (
          sourcePath ===
          path
            .join(web, "src/components/clio/composer-behavior-controls.tsx")
            .replaceAll("\\", "/")
        )
          return code
            .replace(
              "interface ClioComposerBehaviorControlsProps {",
              "interface ClioComposerBehaviorControlsProps { recordedApprovalMenuOpen?: boolean;",
            )
            .replace(
              "  defaultEffortLabel =",
              "  recordedApprovalMenuOpen,\n  defaultEffortLabel =",
            )
            .replace(
              "open={openMenu === 'approval'}",
              "open={recordedApprovalMenuOpen ?? (openMenu === 'approval')}",
            );
        if (
          sourcePath ===
          path
            .join(web, "src/components/clio/use-chart-view.ts")
            .replaceAll("\\", "/")
        )
          return code
            .replace(
              "dataRefreshCountRef.current += 1;",
              "dataRefreshCountRef.current += 1; if(containerRef.current)containerRef.current.dataset.replayDataPending=String(dataRefreshCountRef.current);",
            )
            .replace(
              "dataRefreshCountRef.current = Math.max(0, dataRefreshCountRef.current - 1);",
              "dataRefreshCountRef.current = Math.max(0, dataRefreshCountRef.current - 1); if(containerRef.current)containerRef.current.dataset.replayDataPending=String(dataRefreshCountRef.current);",
            )
            .replace(
              /return resizeChartView\(([\s\S]*?)\n          \);/,
              `node.dataset.replayChartPending=String(Number(node.dataset.replayChartPending??0)+1);
          return resizeChartView($1
          ).finally(()=>{node.dataset.replayChartPending=String(Math.max(0,Number(node.dataset.replayChartPending??1)-1));});`,
            );
        if (
          sourcePath ===
          path
            .join(web, "src/components/clio/surface-export.ts")
            .replaceAll("\\", "/")
        )
          return code.replace(
            "export function downloadBlob(blob: Blob, filename: string): void {",
            `export function downloadBlob(blob: Blob, filename: string): void {
 if(['film','campaign'].includes(new URLSearchParams(location.search).get('mode')??'')){
  document.body.dataset.clioExportStatus='pending';
  void fetch('http://127.0.0.1:3358/export/'+encodeURIComponent(filename),{method:'POST',body:blob}).then(async response=>{if(!response.ok)throw new Error(await response.text());const receipt=await response.json();document.body.dataset.clioExportStatus='complete';document.body.dataset.clioExportReceipt=JSON.stringify(receipt);}).catch(error=>{document.body.dataset.clioExportStatus='failed';document.body.dataset.clioExportError=String(error);});
 }
`,
          );
        if (
          sourcePath ===
          path
            .join(web, "src/lib/session-export/archive-conversation.tsx")
            .replaceAll("\\", "/")
        ) {
          // The archive is immutable. Keep its parsed surface identities stable
          // while the message projection changes, so chart models aren't rebuilt.
          return code
            .replace(
              "export interface ArchiveTranscriptView {",
              `const recordedSurfaceCache = new WeakMap<object, ReturnType<typeof a2uiSurfaceSchema.parse>>();
function parseRecordedSurface(value: unknown) {
  if (!value || typeof value !== 'object') return a2uiSurfaceSchema.parse(value);
  let parsed = recordedSurfaceCache.get(value);
  if (!parsed) {parsed = a2uiSurfaceSchema.parse(value); recordedSurfaceCache.set(value, parsed);}
  return parsed;
}
export interface ArchiveTranscriptView {`,
            )
            .replace(
              "a2uiSurfaceSchema.parse(value),",
              "parseRecordedSurface(value),",
            );
        }
        if (
          sourcePath ===
          path
            .join(web, "src/components/clio/conversation-turn.tsx")
            .replaceAll("\\", "/")
        )
          return code.replace(
            'className="@container my-3 space-y-0"',
            'className="@container my-3 space-y-0" data-replay-activity={id}',
          );
        if (
          sourcePath ===
          path
            .join(web, "src/components/clio/workbench.tsx")
            .replaceAll("\\", "/")
        ) {
          if (!code.includes("      requestedOpen,\n"))
            throw new Error(
              "Native workbench signature changed; update the recorded adapter",
            );
          return code
            .replace(
              "export interface ClioWorkbenchProps {",
              "export interface ClioWorkbenchProps { recordedPresentation?: {tabs: WorkbenchTab[]; activeTabId:string; content:ReactNode; maximized?:boolean};",
            )
            .replace(
              "      requestedOpen,\n",
              "      requestedOpen,\n      recordedPresentation,\n",
            )
            .replace(
              "const [tabs, setTabs] = useState<WorkbenchTab[]>(initialState.tabs);",
              "const [liveTabs, setTabs] = useState<WorkbenchTab[]>(initialState.tabs); const tabs = recordedPresentation?.tabs ?? liveTabs;",
            )
            .replace(
              "const [activeTabId, setActiveTabId] = useState<string>(initialState.activeTabId);",
              "const [liveActiveTabId, setActiveTabId] = useState<string>(initialState.activeTabId); const activeTabId = recordedPresentation?.activeTabId ?? liveActiveTabId;",
            )
            .replace(
              "const [maximized, setMaximized] = useState(false);",
              "const [liveMaximized, setMaximized] = useState(false); const maximized = recordedPresentation?.maximized ?? liveMaximized;",
            )
            .replace(
              "maximized && 'fixed inset-0 z-[80] bg-background shadow-2xl'",
              "maximized && (recordedPresentation ? 'z-[80] bg-background' : 'fixed inset-0 z-[80] bg-background shadow-2xl')",
            )
            .replace(
              "{maximized\n          ? createPortal(",
              "{maximized && !recordedPresentation\n          ? createPortal(",
            )
            .replace(
              /<WorkbenchTabContent([\s\S]*?)\/>/,
              "{recordedPresentation ? (activeTabId === tab.id ? recordedPresentation.content : null) : (<WorkbenchTabContent$1/>)}",
            );
        }
        if (
          sourcePath ===
          path
            .join(web, "src/components/ai-elements/markdown.tsx")
            .replaceAll("\\", "/")
        )
          return (
            `import {RecordedParagraph} from ${JSON.stringify(path.join(here, "recorded-paragraph.tsx").replaceAll("\\", "/"))};\n` +
            code
          )
            .replace(
              "components={{ ...streamdownComponents, ...components }}",
              "components={{ ...streamdownComponents, ...(new URLSearchParams(location.search).get('mode') === 'spotter' ? {p: RecordedParagraph} : {}), ...components }}",
            )
            .replace(
              "        {...props}\n",
              "        {...props}\n        mode={['film','campaign','spotter'].includes(new URLSearchParams(location.search).get('mode') ?? '') ? 'static' : props.mode}\n",
            );
        if (
          id.split("?")[0].replaceAll("\\", "/") ===
          path
            .join(web, "src/components/clio/a2ui-chart.tsx")
            .replaceAll("\\", "/")
        )
          return code
            .replace(
              "export function ClioChart(props: ClioChartProps) {",
              `import {useRecordedChartHeight,useRecordedChartSpec} from ${JSON.stringify(path.join(here, "recorded-chart-layout.tsx").replaceAll("\\", "/"))};\nexport function ClioChart(props: ClioChartProps) {`,
            )
            .replace(
              "const { accessibility, componentId, height = DEFAULT_CHART_HEIGHT, title, weight } = props;",
              "const { accessibility, componentId, height: savedHeight = DEFAULT_CHART_HEIGHT, title, weight } = props; const recordedHeight = useRecordedChartHeight(componentId); const height = recordedHeight ?? savedHeight;",
            )
            .replace(
              "const rawSpec = props.spec;",
              "const rawSpec = useRecordedChartSpec(componentId,props.spec);",
            )
            .replace(
              'data-slot="a2ui-chart"',
              'data-slot="a2ui-chart" data-recorded-selected={selectedZoomRows.length} data-recorded-zoom-active={zoomActive}',
            )
            .replace(
              "canvasAvailable() ? 'canvas' : 'svg'",
              "['film', 'campaign'].includes(new URLSearchParams(location.search).get('mode') ?? '') ? 'svg' : (canvasAvailable() ? 'canvas' : 'svg')",
            )
            .replace(
              "setMeasuredWidth(Math.floor(node.getBoundingClientRect().width))",
              "setMeasuredWidth(Math.floor(['film', 'campaign'].includes(new URLSearchParams(location.search).get('mode') ?? '') ? node.clientWidth : node.getBoundingClientRect().width))",
            );
        if (
          id.split("?")[0].replaceAll("\\", "/") ===
          path
            .join(web, "src/components/clio/conversation-message-blocks.tsx")
            .replaceAll("\\", "/")
        )
          return code.replace(
            "const renderSurface = live || nearViewport || hasInteracted || targeted;",
            "const renderSurface = ['film', 'campaign'].includes(new URLSearchParams(location.search).get('mode') ?? '') || live || nearViewport || hasInteracted || targeted;",
          );
        if (
          id.split("?")[0].replaceAll("\\", "/") ===
          path
            .join(web, "src/components/clio/scientific-map-view.tsx")
            .replaceAll("\\", "/")
        )
          return code.replace(
            "Offline map · Natural Earth land outline · saved scientific data",
            "Offline map · cached geographic context · saved scientific data",
          );
        if (
          id.split("?")[0].replaceAll("\\", "/") ===
          path.join(here, "styles.css").replaceAll("\\", "/")
        )
          return (
            code +
            '\n@source "' +
            path.join(web, "src").replaceAll("\\", "/") +
            '";\n'
          );
      },
    },
    brandPlugin(path.join(here, "branding"), "clio"),
    react(),
    tailwind(),
    maplibreWorkerPlugin(),
  ],
  resolve: {
    alias: [
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
        replacement: requireSource.resolve(name),
      })),
    ],
  },
  define: {
    "import.meta.env.VITE_CLIO_WORKSPACE_VERSION": JSON.stringify("recorded"),
    "import.meta.env.VITE_CLIO_DESKTOP_CHANGELOG": JSON.stringify(""),
  },
  server: {
    host: "127.0.0.1",
    port: nativePort,
    strictPort: true,
    fs: { allow: [here, path.dirname(here), source] },
  },
  preview: { host: "127.0.0.1", port: nativePort, strictPort: true },
  build: {
    outDir: path.join(
      here,
      opalProfile ? "../.native-ui/build-opal" : "../.native-ui/build",
    ),
    emptyOutDir: true,
    assetsInlineLimit: 0,
  },
};
