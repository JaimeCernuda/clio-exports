import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties } from "react";
import {
  ClioRepository,
  dashboardReportSchema,
  messageSchema,
  type DashboardReport,
  type SessionReviewSnapshot,
} from "@clio/core/v3";
import { ArchiveTransport } from "@clio-ui/lib/session-export/archive-transport";
import { RepositoryOverrideProvider } from "@clio-ui/providers/repository-override";
import { DashboardView } from "@clio-ui/components/clio/dashboard-view";
import { MousePointer2Icon } from "lucide-react";
import {
  NativeProviders,
  NativeRecordedSession,
  type NativeScene,
} from "./workspace";
import { NativeConversationReplay } from "./conversation-replay";
import { RecordedWorkbench } from "./recorded-workbench";
import { buildReplayPlan } from "./replay-plan";
import { EngineeringControls, engineeringModels } from "./engineering-controls";
import {
  engineeringFrames,
  engineeringPose,
  engineeringPointer,
  cameraMatches,
  type EngineeringPart,
  type PointerKey,
} from "./engineering-plan";
import "./engineering-sketch.css";

export interface Bundle {
  report: DashboardReport;
  snapshot: SessionReviewSnapshot;
}
interface MeshState {
  meshUri: string;
  frame: number;
  color?: { name: string };
  threshold?: { min?: number; max?: number };
  camera: unknown;
}
interface MeshNode extends HTMLElement {
  __clioMeshState?: () => MeshState;
  __clioMeshCapture?: () => HTMLCanvasElement;
}
const query = new URLSearchParams(location.search);
const part: EngineeringPart =
  query.get("part") === "studio" ? "studio" : "sweep";
const renderMode = query.get("render") === "1";
const manual = query.get("manual") === "1";
const nextPaint = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
export const camera = (angle: number) => ({
  position: [
    1 + 3.1 * Math.sin(0.8 + angle),
    2.3,
    0.25 + 3.1 * Math.cos(0.8 + angle),
  ],
  target: [1, 0.5, 0.25],
  up: [0, 1, 0],
  fov: 38,
  zoom: 1,
});
export function MeshDashboard({ bundle }: { bundle: Bundle }) {
  const repository = useMemo(
    () => new ClioRepository(new ArchiveTransport(bundle.snapshot)),
    [bundle],
  );
  return (
    <RepositoryOverrideProvider repository={repository}>
      <DashboardView report={bundle.report} offline />
    </RepositoryOverrideProvider>
  );
}
export function meshStates(
  root: Element,
): Array<{ id: string; node: MeshNode; state: MeshState }> {
  return Array.from(
    root.querySelectorAll<HTMLElement>('[data-slot="a2ui-mesh-viewport"]'),
  ).flatMap((host) => {
    const node = Array.from(host.querySelectorAll<HTMLElement>("*")).find(
      (n) => typeof (n as MeshNode).__clioMeshState === "function",
    ) as MeshNode | undefined;
    return node?.__clioMeshState
      ? [
          {
            id: host.dataset.a2uiComponentId ?? "",
            node,
            state: node.__clioMeshState(),
          },
        ]
      : [];
  });
}
/** Native chat, native data bindings and source meshes under one explicit frame clock. */
export function EngineeringSketch() {
  const [data, setData] = useState<{ bundle: Bundle; scene: NativeScene }>();
  const [error, setError] = useState("");
  const [frame, setFrame] = useState(Number(query.get("frame") ?? 0));
  const [nonce, setNonce] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [manualMax, setManualMax] = useState(false);
  const [scale, setScale] = useState(
    Math.min(innerWidth / 1280, innerHeight / 720),
  );
  const [cursor, setCursor] = useState({ x: 540, y: 645 });
  const [ready, setReady] = useState("");
  const stage = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const painted = useRef(new WeakMap<MeshNode, string>());
  const log = document.querySelector(
    ".engineering-chat .replay-scroll",
  ) as HTMLElement | null;
  const pose = engineeringPose(part, frame);
  const frames = engineeringFrames(part);
  useEffect(() => {
    const load = async () => {
      const responses = await Promise.all([
        fetch("/engineering-" + (part === "sweep" ? "e4" : "e5") + ".json"),
        fetch("/engineering-scene.json"),
      ]);
      if (responses.some((r) => !r.ok))
        throw new Error("Prepare the engineering sketch data first");
      const [bundle, scene] = (await Promise.all(
        responses.map((r) => r.json()),
      )) as [Bundle, NativeScene];
      bundle.report = dashboardReportSchema.parse(bundle.report);
      setData({ bundle, scene });
    };
    void load().catch((e) => setError(String(e)));
  }, []);
  useEffect(() => {
    const resize = () =>
      setScale(Math.min(innerWidth / 1280, innerHeight / 720));
    const receive = (event: MessageEvent) => {
      if (event.source !== parent || event.data?.kind !== "clio-film-frame")
        return;
      setPlaying(false);
      setFrame(event.data.frame);
      setNonce(event.data.nonce);
    };
    addEventListener("resize", resize);
    addEventListener("message", receive);
    parent.postMessage({ kind: "clio-film-boot" }, "*");
    return () => {
      removeEventListener("resize", resize);
      removeEventListener("message", receive);
    };
  }, []);
  useEffect(() => {
    if (!playing) return;
    const begin = performance.now(),
      start = frame;
    let token = 0;
    const tick = (now: number) => {
      const next = Math.min(
        frames - 1,
        start + Math.floor((now - begin) * 0.06),
      );
      setFrame(next);
      if (next < frames - 1) token = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    token = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(token);
  }, [playing]);
  const plan = useMemo(
    () =>
      data
        ? buildReplayPlan(
            data.scene.view.messages.map((message) =>
              messageSchema.parse(message),
            ),
            1320,
            1,
            { answerParagraphsByBlockId: { part_509df9b4aea1: 1 } },
          )
        : undefined,
    [data],
  );
  const boundary = plan?.events.at(-1)?.start ?? 800;
  const sourceFrame = Math.floor(
    pose.sourcePhase <= 1
      ? Math.min(boundary, pose.sourcePhase * boundary)
      : boundary + (pose.sourcePhase - 1) * (1319 - boundary),
  );
  const values = useMemo(
    () =>
      part === "sweep"
        ? {
            "/threshold": pose.threshold,
            "/film/camera": camera(pose.orbit),
          }
        : {
            "/setup/morphorm/max_iterations": pose.t < 3 ? 50 : 10,
            "/res/iso": pose.threshold,
            "/res/iter": pose.iteration,
            "/film/camera": camera(pose.orbit),
            "/film/historyTitle": `T001 · Morphorm · iteration ${pose.iteration}/10`,
          },
    [
      part,
      pose.threshold,
      pose.selection,
      pose.tab,
      pose.iteration,
      pose.orbit,
      pose.t < 3,
    ],
  );
  useLayoutEffect(() => {
    if (!data || !stage.current) return;
    let cancelled = false;
    const apply = async () => {
      await document.fonts.ready;
      const deadline = performance.now() + 90000;
      let states: ReturnType<typeof meshStates> = [];
      let matched = false;
      while (performance.now() < deadline) {
        if (cancelled) return;
        const model = engineeringModels.get(data.bundle.report.surface.id);
        if (!manual && model) {
          if (part === "sweep") {
            const selection = model.dataModel.get("/selection/case") as
              | { values?: number[] }
              | undefined;
            if (selection?.values?.[0] !== pose.selection) {
              const name = pose.selection === 4 ? "c05" : "c10";
              Array.from(stage.current!.querySelectorAll<HTMLElement>("td"))
                .find((cell) => cell.textContent === name)
                ?.click();
            }
          } else if (model.dataModel.get("/ui/tab") !== pose.tab) {
            const label =
              pose.tab === "tSetup"
                ? "2 Setup"
                : pose.tab === "tRes"
                  ? "4 Results"
                  : "5 Saved trials";
            const tab = Array.from(
              stage.current!.querySelectorAll<HTMLElement>('[role="tab"]'),
            ).find((tab) => tab.textContent?.trim() === label);
            tab?.dispatchEvent(
              new MouseEvent("mousedown", {
                bubbles: true,
                button: 0,
                buttons: 1,
              }),
            );
            tab?.click();
          }
        }
        const failures = Array.from(
          stage.current!.querySelectorAll(
            '[data-visual-state="failed"],[role="alert"]',
          ),
        )
          .map((n) => n.textContent)
          .filter(Boolean);
        if (failures.length) throw new Error(failures.join("; "));
        states = meshStates(stage.current!);
        stage.current!.dataset.waiting = JSON.stringify(
          states.map((x) => ({
            id: x.id,
            frame: x.state.frame,
            threshold: x.state.threshold?.min,
            camera: x.state.camera,
            expectedCamera: camera(pose.orbit),
          })),
        );
        const expected = part === "sweep" ? 7 : pose.tab === "tRes" ? 1 : 0;
        const chart = stage.current!.querySelector<HTMLElement>(
          '[data-slot="a2ui-chart"]',
        );
        const chartReady =
          part !== "studio" ||
          pose.tab !== "tRes" ||
          (chart?.dataset.visualState === "ready" &&
            Boolean(
              chart.querySelector(
                '[data-slot="a2ui-chart-view"] canvas,[data-slot="a2ui-chart-view"] svg',
              ),
            ));
        const tableText =
          Array.from(stage.current!.querySelectorAll("table")).at(-1)
            ?.textContent ?? "";
        const tableReady =
          manual ||
          (part === "sweep"
            ? tableText.includes(
                pose.selection === 4 ? "E4/results/c05/" : "E4/results/c10/",
              )
            : pose.tab !== "tSaved" || tableText.includes("T001"));
        if (
          chartReady &&
          tableReady &&
          states.length >= expected &&
          states.every((x) => {
            if (manual) return true;
            if (
              Math.abs(
                (x.state.threshold?.min ?? pose.threshold) - pose.threshold,
              ) > 0.00001
            )
              return false;
            if (!cameraMatches(x.state.camera, camera(pose.orbit)))
              return false;
            if (
              part === "sweep" &&
              x.state.frame !==
                (x.id === "inspView"
                  ? pose.selection
                  : Number(x.id.slice(1)) - 1)
            )
              return false;
            if (
              part === "studio" &&
              x.id === "v1" &&
              x.state.frame !== pose.iteration
            )
              return false;
            return true;
          })
        ) {
          matched = true;
          break;
        }
        await nextPaint();
      }
      const expected = part === "sweep" ? 7 : pose.tab === "tRes" ? 1 : 0;
      if (!matched || states.length < expected)
        throw new Error("Mesh paint readiness timed out");
      for (const item of states) {
        const bounds = item.node.getBoundingClientRect();
        const signature = JSON.stringify([
          item.state,
          bounds.width,
          bounds.height,
        ]);
        if (painted.current.get(item.node) !== signature) {
          item.node.__clioMeshCapture?.();
          painted.current.set(item.node, signature);
        }
      }
      for (const spinner of stage.current!.querySelectorAll<HTMLElement>(
        ".animate-spin",
      ))
        spinner.style.transform = `rotate(${frame * 6}deg)`;
      if (scroll.current && part === "sweep") {
        const selected = scroll.current.querySelector<HTMLElement>(
          '[data-slot="a2ui-mesh-viewport"][data-a2ui-component-id="inspView"]',
        );
        if (selected) {
          const desired =
            selected.getBoundingClientRect().top / scale -
            scroll.current.getBoundingClientRect().top / scale +
            scroll.current.scrollTop -
            55;
          scroll.current.scrollTop = manual
            ? scroll.current.scrollTop
            : Math.max(0, desired) * pose.scroll;
        }
        const files = Array.from(scroll.current.querySelectorAll("table")).at(
          -1,
        )?.parentElement?.parentElement;
        if (files) {
          files.classList.add("engineering-file-limit");
        }
      }
      await nextPaint();
      await nextPaint();
      const root = stage.current!;
      const rectPoint = (
        element: Element | undefined,
        fallback: { x: number; y: number },
      ) => {
        if (!element) return fallback;
        const r = element.getBoundingClientRect();
        return {
          x: (r.left + r.width / 2) / scale,
          y: (r.top + r.height / 2) / scale,
        };
      };
      const max = rectPoint(
        root.querySelector(
          'button[aria-label="Maximize canvas"],button[aria-label="Restore canvas beside conversation"]',
        ) ?? undefined,
        { x: 1223, y: 45 },
      );
      const mesh =
        root.querySelector('[data-a2ui-component-id="c05"] canvas') ??
        root.querySelector('[data-a2ui-component-id="v1"] canvas');
      const m = rectPoint(mesh ?? undefined, { x: 500, y: 300 });
      const row = Array.from(root.querySelectorAll("td")).find(
        (n) => n.textContent === "c05",
      );
      const cell = rectPoint(row, { x: 100, y: 360 });
      const slider = root.querySelector('[role="slider"]');
      const sliderRect = slider?.parentElement?.getBoundingClientRect();
      const thumb = (fraction: number) =>
        sliderRect
          ? {
              x: (sliderRect.left + sliderRect.width * fraction) / scale,
              y: (sliderRect.top + sliderRect.height / 2) / scale,
            }
          : { x: 600 * fraction, y: 110 };
      const p50 = thumb(0.5),
        p35 = thumb(0.35);
      const park = { x: 540, y: 645 };
      const studioTab = (name: string) =>
        rectPoint(
          Array.from(root.querySelectorAll('[role="tab"]')).find(
            (tab) => tab.textContent?.trim() === name,
          ),
          { x: 360, y: 100 },
        );
      const keys: PointerKey[] =
        part === "sweep"
          ? [
              { at: 0, ...park },
              { at: 13, ...park },
              { at: 13.8, ...max },
              { at: 15.2, ...max },
              { at: 16, ...m },
              { at: 19, x: m.x + 11, y: m.y },
              { at: 19.3, x: m.x + 11, y: m.y },
              { at: 20, ...p50 },
              { at: 22, ...p35 },
              { at: 24, ...p35 },
              { at: 25, ...p50 },
              { at: 25.8, ...p50 },
              { at: 26.5, x: 1220, y: 440 },
              { at: 27.3, x: 1220, y: 440 },
              { at: 28, ...cell },
              { at: 34, ...cell },
              { at: 35, ...cell },
              { at: 36, ...max },
              { at: 38, ...max },
              { at: 39, ...park },
              { at: 42, ...park },
            ]
          : [
              { at: 0, x: 1100, y: 650 },
              { at: 2.3, x: 1100, y: 650 },
              {
                at: 3,
                ...rectPoint(
                  root.querySelector('input[aria-label="max_iterations"]') ??
                    undefined,
                  { x: 1150, y: 320 },
                ),
              },
              {
                at: 5,
                ...studioTab("4 Results"),
              },
              { at: 6, ...studioTab("4 Results") },
              { at: 7, x: 1120, y: 650 },
              { at: 27, x: 1120, y: 650 },
              { at: 28, ...m },
              { at: 30, x: m.x + 70, y: m.y - 25 },
              { at: 31, ...studioTab("5 Saved trials") },
              { at: 32, ...studioTab("5 Saved trials") },
              { at: 36, x: 1080, y: 650 },
            ];
      setCursor(engineeringPointer(keys, pose.t));
      const meshes = states.map((x) => ({ id: x.id, ...x.state }));
      const fileRows =
        Array.from(root.querySelectorAll("table")).at(-1)?.textContent ?? "";
      const nativeModel = engineeringModels.get(data.bundle.report.surface.id);
      const receipt = {
        part,
        frame,
        sourceFrame,
        meshCount: states.length,
        meshes,
        selection: nativeModel?.dataModel.get("/selection/case"),
        iteration: nativeModel?.dataModel.get("/res/iter"),
        threshold: nativeModel?.dataModel.get(
          part === "sweep" ? "/threshold" : "/res/iso",
        ),
        fileCase: fileRows.includes("E4/results/c05/")
          ? "c05"
          : fileRows.includes("E4/results/c10/")
            ? "c10"
            : null,
      };
      root.dataset.evidence = JSON.stringify(receipt);
      setReady("Ready · " + states.length + " mesh views");
      if (!cancelled)
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
  }, [data, frame, nonce, scale]);
  useLayoutEffect(() => {
    if (!log || !manual) return;
    log.style.overflow = "auto";
  }, [manual, log]);
  if (error) return <pre role="alert">{error}</pre>;
  if (!data) return <p>Loading native sketch…</p>;
  const bundle = data.bundle;
  const width =
    part === "studio"
      ? 1232
      : manual
        ? manualMax
          ? 1232
          : 630
        : 630 + 602 * pose.expansion;
  const widget = (
    <div className="engineering-scroll" ref={scroll}>
      <MeshDashboard bundle={bundle} />
    </div>
  );
  return (
    <NativeProviders>
      <NativeRecordedSession scene={data.scene}>
        {!renderMode && (
          <div className="engineering-review">
            <button onClick={() => setPlaying((v) => !v)}>
              {playing ? "Pause" : "Play"}
            </button>
            <input
              aria-label="Sketch frame"
              type="range"
              min={0}
              max={frames - 1}
              value={frame}
              onChange={(e) => {
                setPlaying(false);
                setFrame(Number(e.target.value));
              }}
            />
            <span>{pose.t.toFixed(1)}s</span>
            <a href={"?part=sweep"}>Sweep</a>
            <a href={"?part=studio"}>Studio</a>
            <a href={"?part=" + part + "&manual=1&frame=" + frame}>
              Manual controls
            </a>
          </div>
        )}
        <div
          ref={stage}
          className={"engineering-stage engineering-" + part}
          style={
            {
              transform: "scale(" + scale + ")",
              "--engineering-reserved": `${pose.opacity * 630}px`,
            } as CSSProperties
          }
        >
          <div className="engineering-window">
            <div className="engineering-chat">
              <NativeConversationReplay
                scene={data.scene}
                frame={Math.min(1319, sourceFrame)}
                frames={1320}
                turns={1}
                edits={{
                  reasoningIds: [],
                  includeInjections: false,
                  answerParagraphsByBlockId: { part_509df9b4aea1: 1 },
                }}
              />
            </div>
            <aside
              className="engineering-canvas"
              style={{ width, opacity: pose.opacity }}
            >
              <EngineeringControls.Provider
                value={{ values: manual ? undefined : values }}
              >
                <RecordedWorkbench
                  workspaceId={data.scene.session.workspace_id}
                  sessionId={bundle.report.session_id}
                  presentation={{
                    tabs: [
                      {
                        id: bundle.report.id,
                        kind: "workspace-file",
                        label:
                          part === "sweep"
                            ? "E4 parameter sweep"
                            : "E5 topology studio",
                        path: bundle.report.definition_path,
                        workspaceId: data.scene.session.workspace_id,
                      },
                    ],
                    activeTabId: bundle.report.id,
                    maximized: manual
                      ? manualMax
                      : part === "studio" || pose.expansion > 0.5,
                    onMaximizedChange: setManualMax,
                    content: widget,
                  }}
                />
              </EngineeringControls.Provider>
            </aside>
          </div>
          {!manual &&
            createPortal(
              <div
                className="engineering-pointer"
                data-pointer-frame={frame}
                style={{
                  left: cursor.x * scale,
                  top: cursor.y * scale,
                  transform: "scale(" + scale + ")",
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
        </div>
        {!renderMode && (
          <div className="engineering-readout">
            {ready} ·{" "}
            {manual
              ? "Manual controls; no jobs connected"
              : "Frame-driven sketch"}{" "}
            · {sourceFrame}
          </div>
        )}
      </NativeRecordedSession>
    </NativeProviders>
  );
}
