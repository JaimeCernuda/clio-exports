import base from "./vite.config.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const controls = path
  .join(here, "engineering-controls.tsx")
  .replaceAll("\\", "/");
export default {
  ...base,
  cacheDir: path.join(here, "../.native-ui/engineering-vite"),
  publicDir: path.join(here, "../.native-ui/engineering-data"),
  plugins: [
    ...base.plugins,
    {
      name: "engineering-native-model-port",
      enforce: "pre",
      transform(code, id) {
        const sourcePath = id.split("?")[0].replaceAll("\\", "/");
        if (sourcePath.endsWith("/components/clio/a2ui-mesh-viewport.tsx"))
          return code.replace(
            "style={{ left: probe.x + 12, top: probe.y + 12 }}",
            'data-engineering-probe="true" style={{ left: probe.x + 12, top: probe.y + 12 }}',
          );
        if (sourcePath.endsWith("/components/clio/a2ui-mesh-view-state.ts")) {
          const anchor =
            "return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));";
          if (!code.includes(anchor))
            throw new Error("Pinned WebGL capability probe changed");
          return ("let engineeringWebGL: boolean | undefined;\n" + code)
            .replace(
              "export function supportsWebGL(): boolean {",
              "export function supportsWebGL(): boolean { if (engineeringWebGL !== undefined) return engineeringWebGL;",
            )
            .replace(
              anchor,
              "const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl'); engineeringWebGL = Boolean(context); context?.getExtension('WEBGL_lose_context')?.loseContext(); return engineeringWebGL;",
            );
        }
        if (sourcePath.endsWith("/components/clio/mesh-viewport-scene.ts")) {
          const anchor = "this.renderer.forceContextLoss();";
          if (!code.includes(anchor))
            throw new Error("Pinned mesh disposal changed");
          return code.replace(
            anchor,
            "this.renderer.domElement.dataset.engineeringDisposal = 'true'; " +
              anchor,
          );
        }
        if (
          id
            .split("?")[0]
            .replaceAll("\\", "/")
            .endsWith("/components/clio/mesh-viewport-mesh.ts")
        )
          return code.replace(
            "unit: declared.unit ?? '',",
            "unit: ['S_MISES','U_MAG'].includes(declared.name) ? '' : declared.unit ?? '',",
          );
        if (
          id
            .split("?")[0]
            .replaceAll("\\", "/")
            .endsWith("/components/clio/viewer-file-gate.tsx")
        )
          return code
            .replace(
              "const near = useNearViewport(frame, '100%');",
              "const near = true; // Bounded sketch: prewarm its thirteen captured viewports.",
            )
            .replace(
              "const onLost = () => setLost(true);",
              "const onLost = (event: Event) => { if (!(event.target instanceof HTMLCanvasElement && event.target.dataset.engineeringDisposal === 'true')) setLost(true); };",
            );
        if (
          !id
            .split("?")[0]
            .replaceAll("\\", "/")
            .endsWith("/components/clio/a2ui-surface.tsx")
        )
          return;
        const anchor = "  const visualRoot = useRef<HTMLDivElement>(null);";
        if (!code.includes(anchor))
          throw new Error("Pinned A2UI model port changed");
        return (
          "import {useEngineeringModel} from " +
          JSON.stringify(controls) +
          ";\n" +
          code.replace(anchor, "  useEngineeringModel(model);\n" + anchor)
        );
      },
    },
  ],
  server: { ...base.server, port: 3365, strictPort: true },
  build: {
    ...base.build,
    outDir: path.join(here, "../.native-ui/engineering-build"),
    rollupOptions: { input: path.join(here, "engineering.html") },
  },
};
