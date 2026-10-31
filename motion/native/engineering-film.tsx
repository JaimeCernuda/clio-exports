import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { dashboardReportSchema, messageSchema } from "@clio/core/v3";
import { MousePointer2Icon } from "lucide-react";
import {
  NativeProviders,
  NativeRecordedSession,
  type NativeScene,
} from "./workspace";
import { NativeConversationReplay } from "./conversation-replay";
import { RecordedWorkbench } from "./recorded-workbench";
import { EngineeringControls, engineeringModels } from "./engineering-controls";
import {
  MeshDashboard,
  meshStates,
  camera,
  type Bundle,
} from "./engineering-sketch";
import { cameraMatches, type PointerKey } from "./engineering-plan";
import {
  engineeringFilmPose,
  engineeringFilmPointer,
  engineeringFieldHover,
  engineeringReplayEdits,
  ENGINEERING_FILM_FRAMES,
  engineeringTimeBridge,
} from "./engineering-film-plan";
import type { ReplayLayoutTrack } from "./replay-layout";
import "./engineering-film.css";

interface FilmAssets {
  scenes: Record<"e4" | "e5", NativeScene>;
  pointer: PointerKey[];
  layouts?: Partial<Record<"e4" | "e5", ReplayLayoutTrack>>;
}
const query = new URLSearchParams(location.search);
const paint = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const bundleCache = new Map<string, Bundle>();

/** Reconstruct two related recorded engineering sessions on one explicit presentation clock. */
export function EngineeringFilm() {
  const [assets, setAssets] = useState<FilmAssets>();
  const [bundle, setBundle] = useState<{ name: string; value: Bundle }>();
  const [frame, setFrame] = useState(Number(query.get("frame") ?? 0));
  const [nonce, setNonce] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const [scale, setScale] = useState(
    Math.min(innerWidth / 1280, innerHeight / 720),
  );
  const root = useRef<HTMLDivElement>(null);
  const canvasScroll = useRef<HTMLDivElement>(null);
  const captured = useRef(new WeakMap<Element, string>());
  const chartGeometry = useRef(
    new WeakMap<Element, { signature: string; stable: number }>(),
  );
  const requestedSelections = useRef(new WeakMap<object, number>());
  const receivedFrames = useRef<number[]>([]);
  const hovered = useRef<Element | null>(null);
  const pose = engineeringFilmPose(frame);
  const render = query.get("render") === "1";
  useEffect(() => {
    const load = async () => {
      const files = await Promise.all(
        ["scene-e4", "scene-e5"].map(async (name) => {
          const response = await fetch(`/engineering-film-${name}.json`);
          if (!response.ok) throw new Error(`Missing prepared ${name}`);
          return response.json() as Promise<NativeScene>;
        }),
      );
      const pointerResponse = await fetch("/engineering-pointer.json");
      const pointer =
        pointerResponse.ok &&
        pointerResponse.headers.get("content-type")?.includes("json")
          ? ((await pointerResponse.json()) as PointerKey[])
          : [
              { at: 0, x: 1120, y: 654 },
              { at: 356, x: 1120, y: 654 },
            ];
      const layoutResponse =
        query.get("layout") === "record"
          ? undefined
          : await fetch("/engineering-layout.json");
      const layouts =
        layoutResponse?.ok &&
        layoutResponse.headers.get("content-type")?.includes("json")
          ? ((await layoutResponse.json()) as FilmAssets["layouts"])
          : undefined;
      setAssets({
        scenes: { e4: files[0], e5: files[1] },
        pointer,
        layouts,
      });
    };
    void load().catch((e) => setError(String(e)));
  }, []);
  useEffect(() => {
    if (!pose.dashboard) {
      setBundle(undefined);
      return;
    }
    let cancelled = false;
    const load = async () => {
      let value = bundleCache.get(pose.report);
      if (!value) {
        const response = await fetch(`/engineering-film-${pose.report}.json`);
        if (!response.ok)
          throw new Error(`Missing native ${pose.report} report`);
        value = (await response.json()) as Bundle;
        value.report = dashboardReportSchema.parse(value.report);
        bundleCache.set(pose.report, value);
      }
      if (!cancelled) setBundle({ name: pose.report, value });
    };
    void load().catch((e) => {
      if (!cancelled) setError(String(e));
    });
    return () => {
      cancelled = true;
    };
  }, [pose.dashboard, pose.report]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== parent || event.data?.kind !== "clio-film-frame")
        return;
      setPlaying(false);
      receivedFrames.current = [
        ...receivedFrames.current.slice(-9),
        event.data.frame,
      ];
      setFrame(event.data.frame);
      setNonce(event.data.nonce);
    };
    const resize = () =>
      setScale(Math.min(innerWidth / 1280, innerHeight / 720));
    addEventListener("message", receive);
    addEventListener("resize", resize);
    parent.postMessage({ kind: "clio-film-boot" }, "*");
    return () => {
      removeEventListener("message", receive);
      removeEventListener("resize", resize);
    };
  }, []);
  useEffect(() => {
    if (!playing) return;
    const begin = performance.now(),
      first = frame;
    let token = 0;
    const tick = (now: number) => {
      const next = Math.min(
        ENGINEERING_FILM_FRAMES - 1,
        first + Math.floor((now - begin) * 0.06),
      );
      setFrame(next);
      if (next < ENGINEERING_FILM_FRAMES - 1)
        token = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    token = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(token);
  }, [playing]);
  const scene = assets?.scenes[pose.run];
  const edits = useMemo(
    () =>
      scene
        ? engineeringReplayEdits(
            scene.view.messages.map((m) => messageSchema.parse(m)),
            pose.run,
          )
        : undefined,
    [scene],
  );
  const values = useMemo(
    () =>
      pose.run === "e4"
        ? {
            "/threshold": pose.threshold,
            "/film/camera": camera(pose.orbit),
          }
        : {
            "/setup/morphorm/max_iterations": 10,
            "/res/iso": pose.threshold,
            "/res/iter": pose.iteration,
            "/film/camera": camera(pose.orbit),
            "/film/historyTitle": `Morphorm · iteration ${pose.iteration}/10`,
            "/film/resultTitle":
              pose.phase === "fields"
                ? "Abaqus/Tosca · completed 10-cycle test"
                : "Morphorm · saved 10-iteration test",
          },
    [pose.run, pose.threshold, pose.orbit, pose.iteration, pose.phase],
  );
  useLayoutEffect(() => {
    if (
      !assets ||
      !root.current ||
      (pose.dashboard && bundle?.name !== pose.report)
    )
      return;
    let cancelled = false;
    const apply = async () => {
      await document.fonts.ready;
      dispatchEvent(new Event("clio-replay-layout"));
      const deadline = performance.now() + 90000;
      let meshes: ReturnType<typeof meshStates> = [];
      const expected = !pose.dashboard
        ? 0
        : pose.report === "sweep"
          ? 13
          : pose.report === "comparison"
            ? 2
            : pose.tab === "tRes"
              ? 1
              : pose.tab === "tMesh"
                ? 2
                : 0;
      let matched = false;
      while (performance.now() < deadline && !cancelled) {
        const node = root.current!;
        const model = bundle
          ? engineeringModels.get(bundle.value.report.surface.id)
          : undefined;
        node.dataset.pending = JSON.stringify({
          surface: bundle?.value.report.surface.id,
          models: [...engineeringModels.keys()],
          tab: model?.dataModel.get("/ui/tab"),
          expectedTab: pose.tab,
          selection: model?.dataModel.get("/selection/case"),
        });
        if (pose.dashboard && !model) {
          await paint();
          continue;
        }
        if (model && pose.run === "e4") {
          const selected = model.dataModel.get("/selection/case") as
            | { values?: unknown[] }
            | undefined;
          const current = selected?.values?.[0];
          if (
            Number(current) !== pose.selection &&
            requestedSelections.current.get(model) !== pose.selection
          ) {
            // A frame acknowledgement can be superseded while React commits the
            // row selection. Retrying the click would toggle that selection off.
            requestedSelections.current.set(model, pose.selection);
            const row = Array.from(
              node.querySelectorAll<HTMLElement>(".engineering-canvas td"),
            ).find(
              (c) => c.textContent === (pose.selection === 4 ? "c05" : "c10"),
            );
            if (row) row.click();
            else
              model.dataModel.set("/selection/case", {
                field: "frame_index",
                values: [pose.selection],
                source: "init",
              });
          }
        }
        if (
          model &&
          pose.run === "e5" &&
          model.dataModel.get("/ui/tab") !== pose.tab
        ) {
          const label =
            pose.tab === "tMesh"
              ? "1 Geometry & Mesh"
              : pose.tab === "tSetup"
                ? "2 Setup"
                : pose.tab === "tSaved"
                  ? "5 Saved trials"
                  : "4 Results";
          const tab = Array.from(
            node.querySelectorAll<HTMLElement>('[role="tab"]'),
          ).find((t) => t.textContent?.trim() === label);
          tab?.dispatchEvent(
            new MouseEvent("mousedown", {
              bubbles: true,
              button: 0,
              buttons: 1,
            }),
          );
          tab?.dispatchEvent(
            new MouseEvent("mouseup", { bubbles: true, button: 0 }),
          );
          tab?.click();
        }
        const failures = Array.from(
          node.querySelectorAll('[data-visual-state="failed"]'),
        )
          .map((n) => n.textContent)
          .filter(Boolean);
        if (failures.length) throw new Error(failures.join("; "));
        const visibleImages = Array.from(
          node.querySelectorAll<HTMLImageElement>("img"),
        ).filter((image) => image.getBoundingClientRect().width > 0);
        const brokenImage = visibleImages.find(
          (image) => image.complete && image.naturalWidth === 0,
        );
        if (brokenImage)
          throw new Error(`Missing native UI image: ${brokenImage.src}`);
        const imagesReady = visibleImages.every(
          (image) => image.complete && image.naturalWidth > 0,
        );
        meshes = meshStates(node);
        const tabReady =
          pose.run !== "e5" ||
          !pose.dashboard ||
          model?.dataModel.get("/ui/tab") === pose.tab;
        const allReady =
          tabReady &&
          meshes.length >= expected &&
          meshes.every((m) => {
            if (!cameraMatches(m.state.camera, camera(pose.orbit)))
              return false;
            if (pose.report === "sweep") {
              const expectedFrame =
                m.id === "inspView"
                  ? pose.selection
                  : Number(m.id.slice(1)) - 1;
              if (m.state.frame !== expectedFrame) return false;
            }
            if (
              pose.report === "comparison" &&
              m.state.frame !== pose.selection
            )
              return false;
            if (m.id === "v1" && m.state.frame !== pose.iteration) return false;
            if (["v1", "inspView"].includes(m.id) || /^c\d+$/.test(m.id))
              if (
                Math.abs(
                  (m.state.threshold?.min ?? pose.threshold) - pose.threshold,
                ) > 0.00001
              )
                return false;
            return true;
          });
        const chart = node.querySelector<HTMLElement>(
          '[data-slot="a2ui-chart"]',
        );
        let chartReady = pose.run !== "e5" || pose.tab !== "tRes";
        if (!chartReady && chart?.dataset.visualState === "ready") {
          const marks = Array.from(
            chart.querySelectorAll("svg .mark-symbol path"),
          );
          const expectedTrial = pose.report === "fields" ? "T009" : "T001";
          const endpoints = [marks[0], marks.at(-1)];
          const correctData = endpoints.every((mark) =>
            mark
              ?.getAttribute("aria-label")
              ?.includes(`trial: ${expectedTrial}`),
          );
          const signature = JSON.stringify(
            endpoints.map((mark) => {
              const rect = mark?.getBoundingClientRect();
              return rect
                ? [rect.x, rect.y, rect.width, rect.height].map(
                    (n) => Math.round(n * 100) / 100,
                  )
                : null;
            }),
          );
          const previous = chartGeometry.current.get(chart);
          const stable =
            previous?.signature === signature ? previous.stable + 1 : 0;
          chartGeometry.current.set(chart, { signature, stable });
          chartReady = correctData && stable >= 4;
        }
        const tableReady =
          pose.phase !== "case" ||
          (
            Array.from(node.querySelectorAll("table")).at(-1)?.textContent ?? ""
          ).includes(
            pose.selection === 4 ? "E4/results/c05/" : "E4/results/c10/",
          );
        if (allReady && chartReady && tableReady && imagesReady) {
          matched = true;
          break;
        }
        await paint();
      }
      if (cancelled) return;
      if (!matched)
        throw new Error(
          `Native ${pose.report} not ready: ${root.current!.dataset.pending}; received: ${receivedFrames.current}; mesh ids: ${meshes.map((m) => m.id).join(",")}; view tail: ${root.current!.innerText.slice(-2500)}`,
        );
      for (const mesh of meshes) {
        const rect = mesh.node.getBoundingClientRect();
        const signature = JSON.stringify([mesh.state, rect.width, rect.height]);
        if (captured.current.get(mesh.node) !== signature) {
          mesh.node.__clioMeshCapture?.();
          captured.current.set(mesh.node, signature);
        }
      }
      const viewport = canvasScroll.current;
      if (viewport) {
        let target = 0;
        if (pose.report === "sweep") {
          const row = viewport.querySelector<HTMLElement>(
            '[data-slot="a2ui-mesh-viewport"][data-a2ui-component-id="inspView"]',
          );
          if (row)
            target =
              (row.getBoundingClientRect().top -
                viewport.getBoundingClientRect().top) /
                scale +
              viewport.scrollTop -
              55;
          target *= pose.scroll;
        }
        viewport.scrollTop = Math.max(0, target);
        if (pose.report === "sweep") {
          const files = Array.from(viewport.querySelectorAll("table")).at(-1)
            ?.parentElement?.parentElement;
          if (files) {
            files.style.maxHeight = "180px";
            files.style.overflow = "auto";
          }
        }
      }
      for (const spinner of root.current!.querySelectorAll<HTMLElement>(
        ".animate-spin",
      ))
        spinner.style.transform = `rotate(${pose.sourceFrame * 6}deg)`;
      const pointer = engineeringFilmPointer(assets.pointer, frame);
      const hover = engineeringFieldHover(frame);
      const target =
        hover === "mesh"
          ? (meshes.find((mesh) => mesh.id === "v9s")?.node ?? null)
          : hover === "chart"
            ? document.elementFromPoint(pointer.x * scale, pointer.y * scale)
            : null;
      const position = {
        bubbles: true,
        view: window,
        clientX: pointer.x * scale,
        clientY: pointer.y * scale,
      };
      if (hovered.current && hovered.current !== target) {
        hovered.current.dispatchEvent(
          new PointerEvent("pointerout", {
            ...position,
            relatedTarget: document.body,
          }),
        );
        hovered.current.dispatchEvent(
          new MouseEvent("mouseout", {
            ...position,
            relatedTarget: document.body,
          }),
        );
      }
      if (target) {
        if (hover === "mesh")
          target.dispatchEvent(
            new PointerEvent("pointermove", {
              ...position,
              buttons: 0,
              pointerType: "mouse",
            }),
          );
        else {
          if (hovered.current !== target) {
            target.dispatchEvent(new MouseEvent("mouseover", position));
            target.dispatchEvent(
              new PointerEvent("pointerover", {
                ...position,
                pointerType: "mouse",
              }),
            );
          }
          target.dispatchEvent(
            new PointerEvent("pointermove", {
              ...position,
              buttons: 0,
              pointerType: "mouse",
            }),
          );
          target.dispatchEvent(new MouseEvent("mousemove", position));
        }
      }
      hovered.current = target;
      await paint();
      await paint();
      const scroll = root.current!.querySelector<HTMLElement>(".replay-scroll");
      const receipt = {
        frame,
        phase: pose.phase,
        sourceFrame: pose.sourceFrame,
        run: pose.run,
        report: pose.report,
        rawScroll: Number(scroll?.dataset.targetOffset ?? 0),
        meshes: meshes.map((m) => ({ id: m.id, ...m.state })),
        pointer: engineeringFilmPointer(assets.pointer, frame),
        inspection: hover
          ? {
              kind: hover,
              text:
                hover === "mesh"
                  ? target
                      ?.querySelector("[data-engineering-probe]")
                      ?.textContent?.trim()
                  : document
                      .getElementById("vg-tooltip-element")
                      ?.textContent?.trim(),
            }
          : undefined,
        selection: bundle
          ? engineeringModels
              .get(bundle.value.report.surface.id)
              ?.dataModel.get("/selection/case")
          : undefined,
      };
      root.current!.dataset.evidence = JSON.stringify(receipt);
      parent.postMessage(
        { kind: "clio-film-ready", frame, nonce, evidence: receipt },
        "*",
      );
    };
    void apply().catch((e) => {
      if (!cancelled) {
        setError(String(e));
        parent.postMessage(
          { kind: "clio-film-error", message: String(e) },
          "*",
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [assets, bundle, frame, nonce, scale]);
  if (error) return <pre role="alert">{error}</pre>;
  if (!assets || !scene || !edits) return <p>Loading engineering session…</p>;
  const pointer = engineeringFilmPointer(assets.pointer, frame);
  const bridge = engineeringTimeBridge(pose.t);
  const reserved = pose.dashboard ? 630 * pose.pane : 0;
  return (
    <NativeProviders>
      <NativeRecordedSession scene={scene}>
        {!render && (
          <div className="engineering-review">
            <button onClick={() => setPlaying(!playing)}>
              {playing ? "Pause" : "Play"}
            </button>
            <input
              type="range"
              min={0}
              max={ENGINEERING_FILM_FRAMES - 1}
              value={frame}
              onChange={(e) => {
                setPlaying(false);
                setFrame(Number(e.target.value));
              }}
            />
            <span>
              {pose.t.toFixed(1)}s · {pose.phase}
            </span>
          </div>
        )}
        <div
          ref={root}
          className="engineering-stage engineering-full"
          style={
            {
              transform: `scale(${scale})`,
              "--engineering-reserved": `${reserved}px`,
            } as CSSProperties
          }
        >
          <div className="engineering-chapter">
            {pose.run === "e4"
              ? "01 / Parameter study"
              : "02 / Topology studio"}
          </div>
          <div className="engineering-window">
            <div className="engineering-chat">
              <NativeConversationReplay
                key={pose.run}
                scene={scene}
                frame={pose.sourceFrame}
                frames={pose.sourceFrames}
                turns={20}
                edits={edits}
                layoutTrack={assets.layouts?.[pose.run]}
              />
            </div>
            {pose.dashboard && bundle && (
              <aside
                className="engineering-canvas"
                style={{
                  width: 630 + 602 * pose.expansion,
                  right: -630 * (1 - pose.pane),
                }}
              >
                <EngineeringControls.Provider value={{ values }}>
                  <RecordedWorkbench
                    workspaceId={scene.session.workspace_id}
                    sessionId={scene.session.id}
                    presentation={{
                      tabs: [
                        {
                          id: bundle.value.report.id,
                          kind: "workspace-file",
                          label:
                            pose.run === "e4"
                              ? pose.report === "comparison"
                                ? "c05 · original & smoothed"
                                : "Cantilever parameter study"
                              : "Topology studio",
                          path: bundle.value.report.definition_path,
                          workspaceId: scene.session.workspace_id,
                        },
                      ],
                      activeTabId: bundle.value.report.id,
                      maximized: pose.expansion > 0.5,
                      content: (
                        <div className="engineering-scroll" ref={canvasScroll}>
                          <MeshDashboard
                            key={bundle.name}
                            bundle={bundle.value}
                          />
                        </div>
                      ),
                    }}
                  />
                </EngineeringControls.Provider>
              </aside>
            )}
          </div>
          {bridge > 0 && (
            <div
              className="engineering-time-bridge"
              style={{ opacity: bridge }}
              aria-label="Editorial time passage"
            >
              <span>Later</span>
            </div>
          )}
          <div className="engineering-speed">
            {["conversation", "comparison-work", "studio-work"].includes(
              pose.phase,
            )
              ? ""
              : ""}
          </div>
        </div>
        {createPortal(
          <div
            className="engineering-pointer"
            style={{
              left: pointer.x * scale,
              top: pointer.y * scale,
              transform: `scale(${scale})`,
              transformOrigin: "0 0",
            }}
          >
            <MousePointer2Icon
              size={20}
              fill="white"
              stroke="#123245"
              strokeWidth={1.4}
            />
          </div>,
          document.body,
        )}
      </NativeRecordedSession>
    </NativeProviders>
  );
}
