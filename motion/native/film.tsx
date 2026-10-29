import { useEffect, useLayoutEffect, useRef, useState, useMemo } from "react";
import type { MapDebugSurface } from "@clio-ui/components/clio/scientific-map-view";
import {
  NativeProviders,
  NativeRecordedSession,
  type NativeScene,
} from "./workspace";
import { FILM_FPS, FILM_FRAMES } from "./film-plan";
import { NativeNarrativeMovie } from "./narrative";
import { NativeCampaignMovie } from "./campaign";
import type { CampaignCut } from "./campaign-plan";
import {
  campaignStory as getCampaignStory,
  type CampaignId,
} from "./campaign-catalog";
import "./film.css";
import {
  smoothScroll,
  interpolateMeasurements,
  type ReplayLayoutTrack,
} from "./replay-layout";
import { buildReplayPlan, type ReplayMessage } from "./replay-plan";
import { buildPresentation, type FocusBeat } from "./presentation-plan";
import { replayPlainText } from "./replay-markdown";
import type { controlAt } from "./control-plan";
import { paintVectorCharts } from "./vector-chart-paint";

const nextPaint = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

async function awaitReplayAssets(
  report?: (value: string) => void,
  portrait = false,
  measuring = false,
): Promise<void> {
  await document.fonts.ready;
  const deadline = performance.now() + 45000;
  while (performance.now() < deadline) {
    const ratio =
      devicePixelRatio *
      Number(
        document.querySelector<HTMLElement>(".replay-window")?.dataset
          .replayZoom ?? 1,
      ) *
      Math.min(
        innerWidth / (portrait ? 720 : 1280),
        innerHeight / (portrait ? 1280 : 720),
      );
    const maps = Array.from(
      document.querySelectorAll<MapDebugSurface>(
        '[data-slot="a2ui-map-surface"]',
      ),
    );
    const expectedMaps = document.querySelectorAll(
      '.replay-preload [data-replay-surface-kind="map"]',
    ).length;
    const mapsReady =
      maps.length >= expectedMaps &&
      maps.every((host) => {
        if (host.__clioMapFailure) throw new Error(host.__clioMapFailure);
        const map = host.__clioMap;
        if (!map) return false;
        if (Math.abs(map.getPixelRatio() - ratio) > 0.01)
          map.setPixelRatio(ratio);
        return map.loaded();
      });
    const charts = Array.from(
      document.querySelectorAll(
        '.replay-preload [data-replay-surface-kind="chart"]',
      ),
    );
    const chartsReady = charts.every((host) =>
      Boolean(host.querySelector("svg.marks,canvas")),
    );
    const imagesReady = Array.from(document.images).every(
      (image) => image.complete && image.naturalWidth > 0,
    );
    const log = document.querySelector<HTMLElement>(".replay-scroll");
    const expected = JSON.parse(
      log?.dataset.textExpectations ?? "[]",
    ) as Array<{ id: string; text: string }>;
    const plain = replayPlainText;
    const textReady = expected.every(
      (value) =>
        !value.text ||
        Array.from(
          log!.querySelectorAll<HTMLElement>(`[data-part-id="${value.id}"]`),
        ).some(
          (element) => plain(element.textContent ?? "") === plain(value.text),
        ),
    );
    const kinds = JSON.parse(
      document.querySelector<HTMLElement>(".replay-window")?.dataset
        .surfaceKinds ?? "{}",
    ) as Record<string, string>;
    const components = JSON.parse(
      document.querySelector<HTMLElement>(".replay-window")?.dataset
        .surfaceComponents ?? "{}",
    ) as Record<string, string[]>;
    const surfacesReady = Array.from(
      document.querySelectorAll<HTMLElement>('[id^="a2ui-surface-"]'),
    ).every((host) => {
      const id = host.id.slice("a2ui-surface-".length);
      const kind = kinds[id];
      if (
        components[id]?.includes("clio.data-table.v1") &&
        !host.querySelector("tbody tr")
      )
        return false;
      if (kind === "image") {
        const image = host.querySelector("img");
        return Boolean(image?.complete && image.naturalWidth > 0);
      }
      if (kind === "chart")
        return Boolean(host.querySelector("svg.marks,canvas"));
      return true;
    });
    report?.(
      `Maps ${mapsReady ? "ready" : "loading"} · charts ${chartsReady ? "ready" : "loading"}`,
    );
    const replayRoot = document.querySelector<HTMLElement>(".replay-window");
    const expectedChart = replayRoot?.dataset.expectedChartSelection;
    const activeChart = replayRoot?.querySelector<HTMLElement>(
      `.replay-canvas [data-canvas-surface="${replayRoot.dataset.focusSurface}"] [data-slot="a2ui-chart"]`,
    );
    const selectionReady =
      expectedChart === undefined ||
      activeChart?.dataset.recordedSelected === expectedChart;
    const zoomReady =
      replayRoot?.dataset.expectedChartZoom === undefined ||
      activeChart?.dataset.recordedZoomActive ===
        replayRoot.dataset.expectedChartZoom;
    const expectedControls = JSON.parse(
      replayRoot?.dataset.expectedControls ?? "[]",
    ) as Array<ReturnType<typeof controlAt>>;
    const controlHost = replayRoot?.querySelector(
      `.replay-canvas [data-canvas-surface="${replayRoot.dataset.focusSurface}"]`,
    );
    const controlsReady = expectedControls.every((control) =>
      control.kind === "choices"
        ? control.options.every((label) => {
            const element = Array.from(
              controlHost?.querySelectorAll(
                '[role="checkbox"],button[aria-pressed]',
              ) ?? [],
            ).find(
              (element) =>
                (element.getAttribute("aria-label") ??
                  element.textContent?.trim()) === label,
            );
            return (
              element &&
              ((element.getAttribute("aria-checked") ??
                element.getAttribute("aria-pressed")) ===
                "true") ===
                control.value.includes(label)
            );
          })
        : control.value.every(
            (value, index) =>
              Math.abs(
                Number(
                  controlHost
                    ?.querySelectorAll('[role="slider"]')
                    [index]?.getAttribute("aria-valuenow"),
                ) - value,
              ) < 0.001,
          ),
    );
    const queriesReady = !controlHost?.querySelector(
      '[data-slot="a2ui-chart"][data-visual-state="loading"]',
    );
    const rendererReady = Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="a2ui-chart-view"]'),
    ).every(
      (node) =>
        Number(node.dataset.replayChartPending ?? 0) === 0 &&
        Number(node.dataset.replayDataPending ?? 0) === 0,
    );
    const targetReady =
      !replayRoot?.dataset.expectedDomTarget ||
      Boolean(controlHost?.querySelector(replayRoot.dataset.expectedDomTarget));
    const expectedDownload = replayRoot?.dataset.expectedDownload;
    if (
      expectedDownload === "saved" &&
      document.body.dataset.clioExportStatus === "failed"
    )
      throw new Error(
        document.body.dataset.clioExportError ?? "Native export failed",
      );
    const visibleMenuItems = Array.from(
      document.querySelectorAll('[role="menuitem"]'),
    ).map((node) => node.textContent?.trim());
    const downloadReady =
      expectedDownload === undefined ||
      (expectedDownload === "closed" &&
        !document.querySelector('[role="menu"]')) ||
      (expectedDownload === "menu" &&
        visibleMenuItems.includes("Download") &&
        !visibleMenuItems.includes("PNG image")) ||
      (expectedDownload === "formats" &&
        visibleMenuItems.includes("PNG image")) ||
      (expectedDownload === "saved" &&
        document.body.dataset.clioExportStatus === "complete" &&
        !document.querySelector('button[aria-label="Downloading"]'));
    if (
      mapsReady &&
      chartsReady &&
      imagesReady &&
      textReady &&
      surfacesReady &&
      selectionReady &&
      zoomReady &&
      controlsReady &&
      queriesReady &&
      rendererReady &&
      downloadReady &&
      targetReady
    ) {
      await Promise.all(
        Array.from(document.images).map((image) => image.decode()),
      );
      let previous = "",
        stable = 0;
      for (
        let attempt = 0;
        attempt < 24 && stable < (measuring ? 1 : 3);
        attempt++
      ) {
        await nextPaint();
        window.dispatchEvent(new Event("clio-replay-layout"));
        const scroll = document.querySelector<HTMLElement>(".replay-scroll")!;
        // All saved assets are checked above; only painted geometry can affect this shot.
        const pane = document.querySelector(
          '.replay-canvas [role="tabpanel"][data-state="active"]',
        );
        const surface = Array.from(
          pane?.querySelectorAll<HTMLElement>("[data-canvas-surface]") ?? [],
        ).find((node) => node.style.visibility === "visible");
        const painted = surface ?? pane;
        const shapes = [
          ...Array.from(painted?.querySelectorAll("img,svg.marks,tbody") ?? []),
          ...(replayRoot?.dataset.canvasExpansion === "1"
            ? []
            : Array.from(scroll.querySelectorAll("img,svg.marks,tbody"))),
        ];
        const signature = `${scroll.dataset.scrollOffset}:${document.querySelector<HTMLElement>(".replay-canvas-scroll")?.dataset.scrollOffset}:${scroll.textContent?.length}:${Array.from(
          shapes,
        )
          .map((value) => value.getBoundingClientRect().height)
          .join(",")}:${Array.from(
          painted?.querySelectorAll("svg.marks .role-axis-label text") ?? [],
        )
          .map((value) => {
            const box = value.getBoundingClientRect();
            return `${box.width.toFixed(2)},${box.height.toFixed(2)}`;
          })
          .join(
            ";",
          )}:${painted?.querySelectorAll("svg.marks path[aria-label]").length}`;
        stable = signature === previous ? stable + 1 : 0;
        previous = signature;
      }
      if (stable < (measuring ? 1 : 3)) continue;
      window.dispatchEvent(new Event("clio-replay-layout"));
      await nextPaint();
      const viewport = document.querySelector<HTMLElement>(".replay-scroll")!;
      if (viewport.dataset.expectedOffset !== undefined) {
        const expected = Number(viewport.dataset.expectedOffset);
        const log = viewport.querySelector<HTMLElement>(".replay-log")!;
        const ratio =
          viewport.getBoundingClientRect().width / viewport.clientWidth;
        const actual =
          (viewport.getBoundingClientRect().top -
            log.getBoundingClientRect().top) /
          ratio;
        if (Math.abs(actual - expected) > 0.1) continue;
      }
      const canvas = document.querySelector<HTMLElement>(
        '.replay-canvas [role="tabpanel"][data-state="active"] .replay-canvas-scroll',
      );
      const content = canvas?.querySelector<HTMLElement>(
        ".replay-canvas-content",
      );
      if (canvas && content) {
        const trace = JSON.parse(canvas.dataset.scrollTrace ?? "{}") as {
          maxOffset?: number;
        };
        if (
          Math.abs(
            (trace.maxOffset ?? -1) -
              Math.max(0, content.offsetHeight - canvas.clientHeight),
          ) > 0.1
        )
          continue;
      }
      if (new URLSearchParams(location.search).get("render") === "1")
        await paintVectorCharts();
      return;
    }
    window.dispatchEvent(new Event("clio-replay-layout"));
    await nextPaint();
  }
  throw new Error("Conversation replay assets did not become ready");
}

async function awaitAssets(
  report?: (value: string) => void,
  portrait = false,
): Promise<void> {
  await document.fonts.ready;
  const deadline = performance.now() + 45000;
  while (performance.now() < deadline) {
    const host = document.querySelector<MapDebugSurface>(
      '[data-film-map] [data-slot="a2ui-map-surface"]',
    );
    if (host?.__clioMapFailure) throw new Error(host.__clioMapFailure);
    const map = host?.__clioMap;
    const mapHosts = Array.from(
      document.querySelectorAll<MapDebugSurface>(
        '[data-slot="a2ui-map-surface"]',
      ),
    );
    const allMapsReady = mapHosts.every((value) => {
      if (value.__clioMapFailure) throw new Error(value.__clioMapFailure);
      return (
        value.__clioMap?.loaded() &&
        value.__clioMap.getSource("cached-usgs-context")
      );
    });
    if (map) {
      const ratio =
        devicePixelRatio *
        Math.min(
          innerWidth / (portrait ? 720 : 1280),
          innerHeight / (portrait ? 1280 : 720),
        );
      if (Math.abs(map.getPixelRatio() - ratio) > 0.01)
        map.setPixelRatio(ratio);
    }
    const chart = document.querySelector<HTMLElement>(
      "[data-film-chart] canvas, [data-film-chart] svg.marks",
    );
    const figures = Array.from(
      document.querySelectorAll<HTMLImageElement>("[data-film-figure] img"),
    );
    report?.(
      JSON.stringify({
        map: Boolean(map),
        style: map?.isStyleLoaded(),
        sources: map ? Object.keys(map.getStyle()?.sources ?? {}) : [],
        loaded: map?.loaded(),
        land: map?.getSource("offline-land")
          ? map.isSourceLoaded("offline-land")
          : null,
        context: map?.getSource("cached-usgs-context")
          ? map.isSourceLoaded("cached-usgs-context")
          : null,
        chart: Boolean(chart),
      }),
    );
    if (
      map?.getSource("clio-map-geometry") &&
      map.getSource("cached-usgs-context") &&
      map.loaded() &&
      allMapsReady &&
      chart &&
      chart.getBoundingClientRect().width > 100 &&
      figures.length === 2 &&
      figures.every((image) => image.complete && image.naturalWidth > 0)
    ) {
      await Promise.all(
        Array.from(document.images).map((image) =>
          image.complete ? Promise.resolve() : image.decode(),
        ),
      );
      await nextPaint();
      await nextPaint();
      return;
    }
    await nextPaint();
  }
  throw new Error(
    "Native film assets did not become ready: map geometry, cached context and chart are required",
  );
}

/** Frame bridge: render explicit poses and acknowledge only after native assets paint. */
export function NativeFilmViewer({
  scene,
  campaign = false,
  cut = "pitch",
  campaignId = "tahoe",
}: {
  scene: NativeScene;
  campaign?: boolean;
  campaignId?: CampaignId;
  cut?: CampaignCut;
}) {
  const campaignStory = getCampaignStory(campaignId);
  const conversationStart = campaignStory[cut].stages.find(
    (stage) => stage.id === "conversation",
  )!.start;
  const frames = campaign ? campaignStory[cut].frames : FILM_FRAMES;
  const initial = Number(
    new URLSearchParams(location.search).get("frame") ?? 0,
  );
  const [request, setRequest] = useState({ frame: initial, nonce: 0 });
  const [playing, setPlaying] = useState(false);
  const [readiness, setReadiness] = useState("Loading native assets");
  const bakeMode = new URLSearchParams(location.search).has("bake");
  const [measuring, setMeasuring] = useState(false);
  const [measured, setMeasured] = useState<ReplayLayoutTrack>();
  const measurements = useRef<number[]>([]);
  const measurementStep = campaignId === "tahoe" ? 1 : 6;
  const [layoutTrack, setLayoutTrack] = useState<ReplayLayoutTrack>();
  const layoutFile =
    campaign && cut === "pitch" && !bakeMode
      ? campaignStory.pitch.layoutFile
      : undefined;
  const [layoutFailure, setLayoutFailure] = useState("");
  const presentation = useMemo(
    () =>
      campaign
        ? buildPresentation(
            buildReplayPlan(
              scene.view.messages as ReplayMessage[],
              campaignStory[cut].sourceFrames,
              campaignStory[cut].turns ?? (cut === "pitch" ? 2 : 1),
              campaignStory.replay,
            ),
            cut === "pitch" ? (campaignStory.focuses as FocusBeat[]) : [],
          )
        : undefined,
    [scene, campaign, cut, campaignStory],
  );
  useEffect(() => {
    if (layoutFile)
      void fetch(`./${layoutFile}`)
        .then(async (response) => {
          if (!response.ok)
            throw new Error(`Measured layout unavailable: ${response.status}`);
          setLayoutTrack(await response.json());
        })
        .catch((error: unknown) => setLayoutFailure(String(error)));
  }, [layoutFile]);
  useEffect(() => {
    if (layoutFailure)
      window.parent.postMessage(
        { kind: "clio-film-error", message: layoutFailure },
        "*",
      );
  }, [layoutFailure]);
  const measuredUrl = useMemo(
    () =>
      measured
        ? URL.createObjectURL(
            new Blob([JSON.stringify(measured)], { type: "application/json" }),
          )
        : undefined,
    [measured],
  );
  useEffect(
    () => () => {
      if (measuredUrl) URL.revokeObjectURL(measuredUrl);
    },
    [measuredUrl],
  );
  const renderMode = new URLSearchParams(location.search).get("render") === "1";
  const pending = useRef<MessageEvent | null>(null);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.source !== window.parent ||
        event.data?.kind !== "clio-film-frame"
      )
        return;
      if (
        !Number.isInteger(event.data.frame) ||
        event.data.frame < 0 ||
        event.data.frame >= frames
      )
        return;
      if (
        pending.current?.data.frame === event.data.frame &&
        pending.current?.data.nonce === event.data.nonce
      )
        return;
      pending.current = event;
      setRequest({ frame: event.data.frame, nonce: event.data.nonce });
    };
    window.addEventListener("message", receive);
    window.parent.postMessage({ kind: "clio-film-boot" }, "*");
    return () => window.removeEventListener("message", receive);
  }, []);
  useLayoutEffect(() => {
    if (layoutFile && !layoutTrack) return;
    let active = true;
    void (
      campaign
        ? awaitReplayAssets(setReadiness, cut === "social", measuring)
        : awaitAssets(setReadiness)
    )
      .then(() => {
        if (!active) return;
        if (measuring && presentation) {
          const host = document.querySelector<HTMLElement>(".replay-window")!;
          const sourceFrame = Number(host.dataset.sourceFrame);
          measurements.current[sourceFrame] = Number(
            document.querySelector<HTMLElement>(".replay-scroll")!.dataset
              .targetOffset,
          );
          if (sourceFrame === presentation.sourceFrames - 1) {
            const raw = interpolateMeasurements(
              measurements.current,
              presentation.sourceFrames,
            );
            setMeasured({
              schema: "clio.replay-layout.v1",
              key: host.dataset.layoutKey!,
              frames: presentation.sourceFrames,
              raw,
              scroll: smoothScroll(raw),
              measurementStep,
            });
            setMeasuring(false);
            setReadiness("Measured layout ready");
          } else {
            const next = Math.min(
              presentation.sourceFrames - 1,
              sourceFrame + measurementStep,
            );
            const added = presentation.focuses
              .filter((focus) => focus.sourceFrame < next)
              .reduce((sum, focus) => sum + focus.frames, 0);
            setRequest({
              frame: conversationStart + next + added,
              nonce: next,
            });
          }
          return;
        }
        setReadiness("Native assets ready");
        if (active && pending.current) {
          const event = pending.current;
          window.parent.postMessage(
            {
              kind: "clio-film-ready",
              frame: request.frame,
              nonce: request.nonce,
              cursor: (() => {
                const node =
                  document.querySelector<HTMLElement>(".replay-cursor");
                const graphic = node?.querySelector("svg");
                if (!node || !graphic) return null;
                const box = node.getBoundingClientRect();
                return {
                  x: box.left,
                  y: box.top,
                  size: graphic.getBoundingClientRect().width,
                };
              })(),
              layout: {
                height: document.querySelector<HTMLElement>(
                  ".replay-canvas-scroll",
                )?.clientHeight,
                content: document.querySelector<HTMLElement>(
                  ".replay-canvas-content",
                )?.offsetHeight,
                offset: document.querySelector<HTMLElement>(
                  ".replay-canvas-scroll",
                )?.dataset.scrollOffset,
                transform: document.querySelector<HTMLElement>(
                  ".replay-canvas-content",
                )?.style.transform,
                trace: document.querySelector<HTMLElement>(
                  ".replay-canvas-scroll",
                )?.dataset.scrollTrace,
              },
            },
            event.origin,
          );
        }
      })
      .catch((failure: unknown) => {
        setReadiness(String(failure));
        if (active && pending.current)
          window.parent.postMessage(
            { kind: "clio-film-error", message: String(failure) },
            pending.current.origin,
          );
      });
    return () => {
      active = false;
    };
  }, [request, layoutTrack, measuring, layoutFile]);
  useEffect(() => {
    if (!playing) return;
    const start = performance.now();
    const origin = request.frame;
    let handle = 0;
    const tick = (now: number) => {
      const frame = origin + Math.floor(((now - start) * FILM_FPS) / 1000);
      if (frame >= frames) {
        setPlaying(false);
        return;
      }
      setRequest({ frame, nonce: frame });
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [playing]);
  return (
    <NativeProviders>
      <NativeRecordedSession scene={scene}>
        {campaign ? (
          <NativeCampaignMovie
            scene={scene}
            story={campaignStory}
            frame={request.frame}
            cut={cut}
            layoutTrack={layoutTrack}
          />
        ) : (
          <NativeNarrativeMovie scene={scene} frame={request.frame} />
        )}
        {!renderMode && (
          <div className="film-review-controls">
            <button onClick={() => setPlaying(!playing)}>
              {playing ? "Pause" : "Play"}
            </button>
            <input
              aria-label="Film frame"
              type="range"
              min={0}
              max={frames - 1}
              value={request.frame}
              onChange={(event) => {
                setPlaying(false);
                setRequest({
                  frame: Number(event.target.value),
                  nonce: Date.now(),
                });
              }}
            />
            <output>{(request.frame / FILM_FPS).toFixed(1)} s</output>
            <output aria-label="Film asset readiness">{readiness}</output>
            {layoutFailure && <output role="alert">{layoutFailure}</output>}
            {bakeMode && (
              <button
                disabled={measuring}
                onClick={() => {
                  measurements.current = [];
                  setMeasured(undefined);
                  setPlaying(false);
                  setRequest({ frame: conversationStart, nonce: 0 });
                  setMeasuring(true);
                }}
              >
                Measure native layout
              </button>
            )}
            {measuredUrl && (
              <a
                href={measuredUrl}
                download={
                  campaignStory.pitch.layoutFile ??
                  `${campaignId}-pitch-layout.json`
                }
              >
                Download measured layout
              </a>
            )}
          </div>
        )}
      </NativeRecordedSession>
    </NativeProviders>
  );
}
