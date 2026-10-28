import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { MapDebugSurface } from "@clio-ui/components/clio/scientific-map-view";
import type { presentationAt } from "./presentation-plan";
import { replayDownload, type DownloadState } from "./replay-download";
import { cursorObservation } from "./cursor-plan";

type Transport = ReturnType<typeof presentationAt>;
const ease = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

/** Select actual rendered text; preserve the browser's native selection appearance. */
function selectText(host: Element, text: string): DOMRect | undefined {
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const index = (node.textContent ?? "").indexOf(text);
    if (index >= 0) {
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + text.length);
      const selection = getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      return range.getBoundingClientRect();
    }
    node = walker.nextNode();
  }
  return undefined;
}

/** Frame-controlled gestures act on real checkbox, MapLibre, Vega and text elements. */
export function useReplayInteraction(
  root: RefObject<HTMLDivElement | null>,
  transport: Transport,
  selectedTextPart: string,
) {
  const [cursor, setCursor] = useState<{
    x: number;
    y: number;
    pulse: number;
  } | null>(null);
  const mapBase = useRef<{
    map: NonNullable<MapDebugSurface["__clioMap"]>;
    zoom: number;
    lng: number;
    lat: number;
  } | null>(null);
  const hovered = useRef<Element | null>(null);
  const clicked = useRef<string | null>(null);
  const lastTarget = useRef<{ focus: string; rect: DOMRect } | null>(null);
  const download = useRef<DownloadState>({
    focus: "",
    saved: false,
    rects: {},
  });
  const selection = useRef<{ plot: Element; labels: string[] } | null>(null);
  const zoomState = useRef<{ plot: Element; active: boolean } | null>(null);
  useLayoutEffect(() => {
    const act = () => {
      const host = root.current;
      if (!host) return;
      const action = transport.focus?.action,
        age = transport.age;
      const clearHover = () => {
        hovered.current?.dispatchEvent(
          new MouseEvent("mouseout", { bubbles: true, view: window }),
        );
        hovered.current = null;
        document
          .querySelector("#vg-tooltip-element")
          ?.classList.remove("visible");
      };
      const chartHost = host.querySelector<HTMLElement>(
        `.replay-canvas [data-canvas-surface="${transport.focus?.surfaceId}"]`,
      );
      const selectedPlot = chartHost?.querySelector("svg.marks");
      const choice = (label: string) =>
        Array.from(
          chartHost?.querySelectorAll<HTMLElement>(
            '[role="checkbox"],button[aria-pressed]',
          ) ?? [],
        ).find(
          (element) =>
            (element.getAttribute("aria-label") ??
              element.textContent?.trim()) === label,
        );
      for (const control of transport.controls) {
        if (control.kind === "choices") {
          const order = [
            ...control.value,
            ...control.options.filter(
              (label) => !control.value.includes(label),
            ),
          ];
          const next = order
            .map((label) => ({ label, node: choice(label) }))
            .find(
              ({ label, node }) =>
                node &&
                ((node.getAttribute("aria-checked") ??
                  node.getAttribute("aria-pressed")) ===
                  "true") !==
                  control.value.includes(label),
            );
          next?.node?.click();
        } else {
          const thumbs = Array.from(
            chartHost?.querySelectorAll<HTMLElement>('[role="slider"]') ?? [],
          );
          const index = control.value.findIndex(
            (value, index) =>
              Math.abs(
                Number(thumbs[index]?.getAttribute("aria-valuenow")) - value,
              ) > 0.001,
          );
          if (index >= 0 && thumbs[index]) {
            const element = thumbs[index],
              key =
                Number(element.getAttribute("aria-valuenow")) <
                control.value[index]
                  ? "ArrowRight"
                  : "ArrowLeft";
            element.focus({ preventScroll: true });
            element.dispatchEvent(
              new KeyboardEvent("keydown", { key, code: key, bubbles: true }),
            );
          }
        }
      }
      const clearSelection = (plot: Element) =>
        plot.dispatchEvent(
          new MouseEvent("dblclick", { bubbles: true, view: window }),
        );
      if (
        selection.current &&
        (!selectedPlot || !transport.selectedLabels.length)
      ) {
        clearSelection(selection.current.plot);
        selection.current = null;
      }
      if (
        selectedPlot &&
        transport.selectedLabels.length &&
        (selection.current?.plot !== selectedPlot ||
          JSON.stringify(selection.current.labels) !==
            JSON.stringify(transport.selectedLabels))
      ) {
        const marks = transport.selectedLabels.map((label) =>
          Array.from(
            selectedPlot.querySelectorAll<SVGElement>("path[aria-label]"),
          ).find((mark) => mark.getAttribute("aria-label")?.includes(label)),
        );
        if (marks.every(Boolean)) {
          let applied =
            selection.current?.plot === selectedPlot
              ? selection.current.labels
              : [];
          if (
            !applied.every(
              (label, index) => label === transport.selectedLabels[index],
            )
          ) {
            applied = [];
          }
          const next = applied.length;
          if (next < marks.length) {
            const mark = marks[next]!,
              rect = mark.getBoundingClientRect();
            mark.dispatchEvent(
              new MouseEvent("click", {
                bubbles: true,
                view: window,
                clientX: rect.x + rect.width / 2,
                clientY: rect.y + rect.height / 2,
                shiftKey: next > 0,
              }),
            );
          }
          selection.current = {
            plot: selectedPlot,
            labels: transport.selectedLabels.slice(0, next + 1),
          };
        }
      }
      const shouldZoom = transport.chartZoom === "selected";
      const actualSelection = Number(
        chartHost?.querySelector<HTMLElement>('[data-slot="a2ui-chart"]')
          ?.dataset.recordedSelected ?? -1,
      );
      if (
        selectedPlot &&
        shouldZoom &&
        actualSelection === transport.selectedLabels.length &&
        actualSelection > 0 &&
        (zoomState.current?.plot !== selectedPlot || !zoomState.current.active)
      ) {
        const button = chartHost?.querySelector<HTMLButtonElement>(
          'button[aria-label="Zoom to selection"]',
        );
        if (button) {
          button.focus({ preventScroll: true });
          button.click();
          zoomState.current = { plot: selectedPlot, active: true };
        }
      } else if (zoomState.current?.active && !shouldZoom) {
        const button = host.querySelector<HTMLButtonElement>(
          '.replay-canvas button[aria-label="Reset zoom"]',
        );
        if (button) {
          button.focus({ preventScroll: true });
          button.click();
          zoomState.current = { plot: zoomState.current.plot, active: false };
        }
      }
      const mapHost = host.querySelector<MapDebugSurface>(
        '.replay-canvas [data-slot="a2ui-map-surface"]',
      );
      const map = mapHost?.__clioMap;
      if (map?.loaded()) {
        if (mapBase.current?.map !== map) {
          const center = map.getCenter();
          mapBase.current = {
            map,
            zoom: map.getZoom(),
            lng: center.lng,
            lat: center.lat,
          };
        }
        const base = mapBase.current!;
        const mapClick = transport.focus?.canvas ? 198 : 135;
        const fraction = transport.completedActions.includes("map-zoom")
          ? 1
          : action === "map-zoom"
            ? ease((age - mapClick) / 50)
            : 0;
        const zoom = base.zoom + 0.65 * fraction;
        if (Math.abs(map.getZoom() - zoom) > 0.001)
          map.jumpTo({ zoom, center: [base.lng, base.lat] });
      }
      if (!action) {
        clearHover();
        clicked.current = null;
        getSelection()?.removeAllRanges();
        setCursor((current) => (current === null ? current : null));
        return;
      }
      let target: DOMRect | undefined,
        previous: DOMRect | undefined,
        pulse = 0;
      let gestureStart = 65,
        gestureEnd = 113;
      const canvas = transport.focus!.canvas;
      const returning = canvas && age >= transport.focus!.frames - 168;
      const canvasButton = host.querySelector<HTMLButtonElement>(
        '.replay-canvas button[aria-label="Maximize canvas"], .replay-canvas button[aria-label="Restore canvas beside conversation"]',
      );
      const observationMark = (label: string) =>
        (transport.focus?.observations?.find((obs) => obs.label === label)
          ?.selector
          ? chartHost?.querySelector(
              transport.focus.observations.find((obs) => obs.label === label)!
                .selector!,
            )
          : undefined) ??
        Array.from(
          host.querySelectorAll<SVGElement>(
            `.replay-canvas [data-canvas-surface="${transport.focus!.surfaceId}"] svg.marks path[aria-label]`,
          ),
        ).find((element) =>
          element.getAttribute("aria-label")?.includes(label),
        );
      if (canvas && (age < 150 || returning)) {
        clearHover();
        const button = host.querySelector<HTMLButtonElement>(
          '.replay-canvas button[aria-label="Maximize canvas"], .replay-canvas button[aria-label="Restore canvas beside conversation"]',
        );
        target = button?.getBoundingClientRect();
        if (returning) {
          const last =
            transport.focus!.observations?.at(-1)?.label ??
            transport.focus!.targetLabel;
          if (last) previous = observationMark(last)?.getBoundingClientRect();
        }
        const clickAt = returning ? transport.focus!.frames - 120 : 72;
        gestureStart = clickAt - 42;
        gestureEnd = clickAt;
        const key = `${transport.focus!.id}:${returning ? "restore" : "open"}`;
        if (button && age >= clickAt && clicked.current !== key) {
          button.click();
          clicked.current = key;
        }
        pulse =
          age >= clickAt && age < clickAt + 15
            ? 1 - ease((age - clickAt) / 15)
            : 0;
      } else if (action === "resources") {
        const resourceStart = canvas ? 178 : 110;
        const boxes = Array.from(
          host.querySelectorAll<HTMLElement>(
            '.replay-dataset [role="checkbox"]',
          ),
        ).slice(0, 3);
        const index = Math.max(
          0,
          Math.min(2, Math.floor((age - resourceStart) / 34)),
        );
        target = boxes[index]?.getBoundingClientRect();
        previous = boxes[Math.max(0, index - 1)]?.getBoundingClientRect();
        pulse = 1 - ease((age - (resourceStart + 20 + index * 34)) / 14);
        if (age < resourceStart + 20 + index * 34) pulse = 0;
        gestureStart = resourceStart + index * 34;
        gestureEnd = gestureStart + 20;
      } else if (action === "map-zoom") {
        target = mapHost
          ?.querySelector('[aria-label="Zoom in"]')
          ?.getBoundingClientRect();
        const clickAt = canvas ? 198 : 135;
        gestureStart = canvas ? 150 : 65;
        gestureEnd = clickAt;
        previous = canvasButton?.getBoundingClientRect();
        pulse =
          age >= clickAt && age < clickAt + 15
            ? 1 - ease((age - clickAt) / 15)
            : 0;
      } else if (action === "chart-hover") {
        const pointerLabel = canvas
          ? cursorObservation(transport.focus!, age)
          : undefined;
        const plot = host.querySelector(
          transport.focus?.surfaceId
            ? `.replay-canvas [data-canvas-surface="${transport.focus.surfaceId}"] svg.marks`
            : ".replay-canvas svg.marks",
        );
        const label =
          transport.observation?.label ?? transport.focus?.targetLabel;
        const mark = transport.observation?.selector
          ? chartHost?.querySelector(transport.observation.selector)
          : label
            ? Array.from(
                plot?.querySelectorAll<SVGElement>("path[aria-label]") ?? [],
              ).find((element) =>
                element.getAttribute("aria-label")?.includes(label),
              )
            : (plot?.querySelector<SVGElement>('path[aria-label*="112.67"]') ??
              plot?.querySelector<SVGElement>(".mark-symbol path"));
        target = mark?.getBoundingClientRect();
        const scrolling =
          Math.abs(
            transport.canvasScroll - (transport.observation?.scroll ?? 0),
          ) > 0.01;
        if (scrolling) {
          clearHover();
          if (target)
            target = new DOMRect(
              target.x,
              target.y +
                (transport.canvasScroll -
                  (transport.observation?.scroll ?? 0)) *
                  (host.getBoundingClientRect().width / host.offsetWidth),
              target.width,
              target.height,
            );
        }
        if (canvas) {
          const index =
            transport.focus!.observations?.indexOf(transport.observation!) ??
            -1;
          const prior =
            index > 0 ? transport.focus!.observations![index - 1] : undefined;
          previous = prior
            ? observationMark(prior.label)?.getBoundingClientRect()
            : canvasButton?.getBoundingClientRect();
          if (prior && previous)
            previous = new DOMRect(
              previous.x,
              previous.y +
                (transport.canvasScroll - (prior.scroll ?? 0)) *
                  (host.getBoundingClientRect().width / host.offsetWidth),
              previous.width,
              previous.height,
            );
        }
        if (hovered.current !== mark) clearHover();
        if (canvas && pointerLabel !== label) clearHover();
        if (transport.observation) {
          gestureStart = transport.observation.at;
          gestureEnd = gestureStart + 32;
        } else if (canvas) {
          gestureStart = 150;
          gestureEnd = 190;
        }
        if (
          mark &&
          target &&
          (!canvas || pointerLabel === label) &&
          age >= gestureEnd &&
          Math.abs(
            transport.canvasScroll - (transport.observation?.scroll ?? 0),
          ) < 0.01 &&
          age < transport.focus!.frames - (canvas ? 168 : 76)
        ) {
          const x = target.x + target.width / 2,
            y = target.y + target.height / 2;
          mark.dispatchEvent(
            new MouseEvent("mouseover", {
              bubbles: true,
              clientX: x,
              clientY: y,
              view: window,
            }),
          );
          mark.dispatchEvent(
            new MouseEvent("mousemove", {
              bubbles: true,
              clientX: x,
              clientY: y,
              view: window,
            }),
          );
          for (const type of ["pointerover", "pointermove"])
            mark.dispatchEvent(
              new PointerEvent(type, {
                bubbles: true,
                clientX: x,
                clientY: y,
                pointerType: "mouse",
                view: window,
              }),
            );
          hovered.current = mark;
        }
        if (mark && age >= transport.focus!.frames - (canvas ? 168 : 76))
          mark.dispatchEvent(
            new MouseEvent("mouseout", {
              bubbles: true,
              view: window,
            }),
          );
      } else if (action === "select-text") {
        const passage = host.querySelector(
          `[data-part-id="${transport.focus?.blockId ?? selectedTextPart}"]`,
        );
        if (passage && age >= 70)
          target = selectText(
            passage,
            transport.focus?.selectionText ?? "8.4% shorter",
          );
      }
      if (action === "chart-hover" && transport.observation?.select) {
        const clickAt = transport.observation.at + 60;
        if (age >= clickAt && age < clickAt + 15)
          pulse = 1 - ease((age - clickAt) / 15);
      }
      const controlGesture = transport.controls.find(
        (control) => control.gesture,
      );
      if (controlGesture?.gesture && chartHost) {
        clearHover();
        const gesture = controlGesture.gesture;
        const element =
          controlGesture.kind === "choices"
            ? choice(controlGesture.gesture.target)
            : chartHost.querySelectorAll<HTMLElement>('[role="slider"]')[
                controlGesture.gesture.thumb
              ];
        if (element) {
          previous = target;
          target = element.getBoundingClientRect();
          gestureStart = gesture.at - 24;
          gestureEnd = gesture.at;
          pulse =
            age >= gesture.at && age < gesture.at + 12
              ? 1 - ease((age - gesture.at) / 12)
              : 0;
        }
      }
      const zoom = transport.focus?.chartZoom;
      if (zoom && age >= zoom.at - 42 && age < transport.focus!.frames - 168) {
        clearHover();
        const resetting = age >= zoom.reset - 42;
        const label = resetting ? "Reset zoom" : "Zoom to selection";
        const button =
          chartHost?.querySelector<HTMLButtonElement>(
            `button[aria-label="${label}"]`,
          ) ??
          chartHost?.querySelector<HTMLButtonElement>(
            'button[aria-label="Filters"]',
          );
        if (button) {
          const from = resetting
            ? chartHost
                ?.querySelector('button[aria-label="Zoom to selection"]')
                ?.getBoundingClientRect()
            : observationMark(
                transport.focus!.observations!.at(-1)!.label,
              )?.getBoundingClientRect();
          previous = from;
          target = button.getBoundingClientRect();
          gestureEnd = resetting ? zoom.reset : zoom.at;
          gestureStart = gestureEnd - 42;
          pulse =
            age >= gestureEnd && age < gestureEnd + 15
              ? 1 - ease((age - gestureEnd) / 15)
              : 0;
        }
      }
      if (chartHost && transport.focus?.download) {
        const gesture = replayDownload(
          chartHost,
          transport.focus.id,
          transport.focus.download,
          age,
          download.current,
        );
        if (gesture && !returning) {
          clearHover();
          target = gesture.target;
          previous = gesture.previous;
          gestureStart = gesture.start;
          gestureEnd = gesture.end;
          pulse = gesture.pulse;
        }
        if (returning && download.current.rects.format)
          previous = download.current.rects.format;
      }
      if (!target || age < 50 || age > transport.focus!.frames - 25) {
        setCursor((current) => (current === null ? current : null));
        return;
      }
      if (
        returning &&
        !previous &&
        lastTarget.current?.focus === transport.focus!.id
      )
        previous = lastTarget.current.rect;
      if (!returning)
        lastTarget.current = { focus: transport.focus!.id, rect: target };
      const bounds = host.getBoundingClientRect(),
        ratio = bounds.width / host.offsetWidth;
      const progress = ease((age - gestureStart) / (gestureEnd - gestureStart));
      const fromX = previous
        ? previous.x + previous.width / 2
        : bounds.x + bounds.width * 0.72;
      const fromY = previous
        ? previous.y + previous.height / 2
        : bounds.y + bounds.height * 0.55;
      const toX = target.x + target.width / 2,
        toY = target.y + target.height / 2;
      const x = (fromX + (toX - fromX) * progress - bounds.x) / ratio,
        y = (fromY + (toY - fromY) * progress - bounds.y) / ratio;
      setCursor((current) =>
        current &&
        Math.abs(current.x - x) < 0.01 &&
        Math.abs(current.y - y) < 0.01 &&
        current.pulse === pulse
          ? current
          : { x, y, pulse },
      );
    };
    act();
    window.addEventListener("clio-replay-layout", act);
    return () => window.removeEventListener("clio-replay-layout", act);
  }, [
    root,
    transport.sourceFrame,
    transport.focus?.id,
    transport.age,
    selectedTextPart,
  ]);
  return cursor;
}
