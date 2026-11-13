import { awaitCurrentPaint } from "./readiness";

let qualifiedViewport = "";
const task = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Reconcile film-owned scroll against the settled content extent, including cold result opens. */
export function reconcileSpotterScroll(host: HTMLElement): void {
  const max = Math.max(0, host.scrollHeight - host.clientHeight);
  const target = host.dataset.scrollTarget
    ? host.querySelector<HTMLElement>(
        `[data-tool="${host.dataset.scrollTarget}"]`,
      )
    : undefined;
  const desired = target
    ? Math.min(
        max,
        target.getBoundingClientRect().top -
          host.getBoundingClientRect().top +
          host.scrollTop -
          24,
      )
    : max;
  const amount = Math.max(
    0,
    Math.min(1, Number(host.dataset.scrollAmount ?? 0)),
  );
  host.scrollTop =
    host.dataset.inspecting === "true" ? max + (desired - max) * amount : max;
}
/** Qualify the full native shell, then recheck its geometry on every static-asset film frame. */
export async function awaitSpotterPaint(
  isCurrent: () => boolean,
  viewport: { width: number; height: number },
): Promise<boolean> {
  const key = `${viewport.width}x${viewport.height}`;
  if (qualifiedViewport !== key) {
    const ready = await awaitCurrentPaint(isCurrent, viewport);
    if (!ready) return false;
    qualifiedViewport = key;
  }
  await document.fonts.ready;
  let prior = "",
    stable = 0;
  const deadline = performance.now() + 45000;
  while (isCurrent() && performance.now() < deadline) {
    // This film has no changing rich assets. Let native layout effects settle,
    // force layout twice, then capture the compositor with its own paint fence.
    await task();
    const log = document.querySelector<HTMLElement>(".sv3-main-log");
    if (log) reconcileSpotterScroll(log);
    const cursor = document.querySelector<SVGElement>(".sv3-pointer");
    const cursorBox = cursor?.getBoundingClientRect();
    if (
      !cursor ||
      !cursorBox ||
      Math.abs(cursorBox.x - Number.parseFloat(cursor.style.left)) > 0.05 ||
      Math.abs(cursorBox.y - Number.parseFloat(cursor.style.top)) > 0.05
    ) {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      continue;
    }
    const selected = window.getSelection();
    const toolbar = document.querySelector('[data-slot="selection-actions"]');
    const needsToolbar = Boolean(
      selected && !selected.isCollapsed && selected.toString().trim(),
    );
    // Native selection updates are scheduled on animation frames. A macrotask
    // alone can observe the right DOM box before its portal has been painted.
    if (needsToolbar) {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    }
    if (needsToolbar !== Boolean(toolbar)) {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      continue;
    }
    if (needsToolbar && toolbar && selected?.rangeCount) {
      const anchor = selected.getRangeAt(0).getBoundingClientRect();
      const box = toolbar.getBoundingClientRect();
      if (
        Math.abs(box.left + box.width / 2 - anchor.left - anchor.width / 2) >
          0.75 ||
        Math.abs(box.bottom - Math.max(anchor.top - 8, 8)) > 0.75
      ) {
        // A cold seek can open the native split after the selection event.
        // Ask the native toolbar to reread that same range at its settled width.
        document.dispatchEvent(new Event("selectionchange"));
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
        continue;
      }
    }
    const nodes = [
      ".current-demo",
      ".current-demo-stage",
      '[aria-label="Workspace navigation"]',
      '[data-slot="clio-composer"]',
    ];
    const boxes = nodes.map((selector) =>
      document.querySelector(selector)?.getBoundingClientRect(),
    );
    const [main, stage, nav, composer] = boxes;
    const valid =
      innerWidth === viewport.width &&
      innerHeight === viewport.height &&
      main?.width === viewport.width &&
      main.height === viewport.height &&
      stage &&
      nav &&
      composer &&
      Math.abs(stage.bottom - viewport.height) < 1 &&
      Math.abs(nav.height - stage.height) < 1 &&
      composer.bottom <= viewport.height &&
      composer.bottom > viewport.height - 48 &&
      [...document.images].every(
        (image) => image.complete && image.naturalWidth > 0,
      );
    const layout = JSON.stringify([
      ...boxes,
      document.querySelector(".sv3-main-log")?.scrollHeight,
      document.querySelector(".sv3-main-log")?.scrollTop,
      toolbar?.getBoundingClientRect(),
      cursorBox,
      needsToolbar && selected?.rangeCount
        ? selected.getRangeAt(0).getBoundingClientRect()
        : null,
    ]);
    stable = valid && layout === prior ? stable + 1 : 0;
    prior = layout;
    if (stable >= 2) return true;
  }
  if (!isCurrent()) return false;
  throw new Error(
    "SPOTTER native frame did not settle at its declared viewport",
  );
}
