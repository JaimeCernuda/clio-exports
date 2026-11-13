import {
  Component,
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import { CurrentProviders, CurrentWorkspace } from "./workspace";
import {
  demoPlan,
  previewFrameAt,
  validateDemo,
  type DemoSpec,
  type DemoScene,
} from "./demo-model";
import { sceneAssetPath } from "../scene-selection";
import "./styles.css";
import { awaitCurrentPaint } from "./readiness";

const query = new URLSearchParams(location.search);
const render = query.get("render") === "1";

/** Turn production component/schema failures into explicit capture failures. */
class DemoBoundary extends Component<
  { children: ReactNode; onError: (error: Error) => void },
  { failed: boolean }
> {
  public state = { failed: false };
  public static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  public componentDidCatch(error: Error): void {
    this.props.onError(error);
  }
  public render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

function App() {
  const [loaded, setLoaded] = useState<{ spec: DemoSpec; scene: DemoScene }>();
  const [error, setError] = useState("");
  const [request, setRequest] = useState({ frame: 0, nonce: 0 });
  const [playing, setPlaying] = useState(false);
  const pending = useRef(request);
  useEffect(() => {
    let active = true;
    void (async () => {
      const specResponse = await fetch(
        sceneAssetPath(query.get("demo") ?? "demos/tahoe-current.json"),
      );
      if (!specResponse.ok) throw new Error("Demo manifest unavailable");
      const spec = (await specResponse.json()) as DemoSpec;
      const response = await fetch(
        sceneAssetPath(query.get("scene") ?? spec.sceneFile),
      );
      if (!response.ok) throw new Error("Recorded scene unavailable");
      const scene = (await response.json()) as DemoScene;
      validateDemo(spec, scene);
      demoPlan(spec, scene);
      if (active) setLoaded({ spec, scene });
    })().catch((e) => setError(String(e)));
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const receive = (event: MessageEvent) => {
      if (
        event.source !== window.parent ||
        event.data?.kind !== "clio-film-frame"
      )
        return;
      const { frame, nonce } = event.data;
      if (
        !Number.isInteger(frame) ||
        frame < 0 ||
        frame >= loaded.spec.frames ||
        !Number.isInteger(nonce)
      )
        return;
      if (pending.current.frame === frame && pending.current.nonce === nonce)
        return;
      pending.current = { frame, nonce };
      setRequest(pending.current);
    };
    window.addEventListener("message", receive);
    window.parent.postMessage({ kind: "clio-film-boot" }, "*");
    return () => window.removeEventListener("message", receive);
  }, [loaded]);
  useLayoutEffect(() => {
    if (!loaded || !render) return;
    let active = true;
    void (async () => {
      const ready = await awaitCurrentPaint(
        () =>
          active &&
          pending.current.frame === request.frame &&
          pending.current.nonce === request.nonce,
      );
      if (!ready) return;
      window.parent.postMessage({ kind: "clio-film-ready", ...request }, "*");
    })().catch((e) => {
      if (active)
        window.parent.postMessage(
          { kind: "clio-film-error", message: String(e) },
          "*",
        );
    });
    return () => {
      active = false;
    };
  }, [loaded, request]);
  useEffect(() => {
    if (error && render)
      window.parent.postMessage(
        { kind: "clio-film-error", message: error },
        "*",
      );
  }, [error]);
  useEffect(() => {
    if (!loaded || !playing || render) return;
    let id = 0;
    const first = request.frame;
    let epoch: number | undefined;
    const tick = (now: number) => {
      epoch ??= now;
      const frame = previewFrameAt(
        first,
        now - epoch,
        loaded.spec.frames,
        loaded.spec.fps,
      );
      setRequest({ frame, nonce: 0 });
      if (frame < loaded.spec.frames - 1) id = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing, loaded]);
  if (error)
    return (
      <p role="alert" className="current-demo-error">
        {error}
      </p>
    );
  if (!loaded) return <p>Loading recorded scene…</p>;
  return (
    <main
      className="current-demo"
      data-render={render || undefined}
      data-frame={request.frame}
      style={
        { "--demo-spin": `${request.frame * 6}deg` } as React.CSSProperties
      }
    >
      {!render && (
        <div className="current-demo-controls">
          <span>{loaded.spec.title}</span>
          <button onClick={() => setPlaying((v) => !v)}>
            {playing ? "Pause" : "Play"}
          </button>
          <button
            onClick={() => {
              setPlaying(false);
              setRequest({ frame: 0, nonce: 0 });
            }}
          >
            Restart
          </button>
          <input
            aria-label="Demo frame"
            type="range"
            min="0"
            max={loaded.spec.frames - 1}
            value={request.frame}
            onChange={(e) => {
              setPlaying(false);
              setRequest({ frame: Number(e.target.value), nonce: 0 });
            }}
          />
          <span>{(request.frame / 60).toFixed(1)} s</span>
        </div>
      )}
      <div className="current-demo-stage">
        <DemoBoundary onError={(error) => setError(error.message)}>
          <CurrentProviders scene={loaded.scene}>
            <CurrentWorkspace
              scene={loaded.scene}
              spec={loaded.spec}
              frame={request.frame}
            />
          </CurrentProviders>
        </DemoBoundary>
      </div>
    </main>
  );
}
const target = document.getElementById("root");
if (!target) throw new Error("Demo root missing");
createRoot(target).render(<App />);
