import type { MapDebugSurface } from "@clio-ui/components/clio/scientific-map-view";

const paint = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** Wait for real native surface paint, decoded assets and settled layout, never just React's commit. */
export async function awaitCurrentPaint(
  isCurrent: () => boolean,
  viewport: { width: number; height: number } = {
    width: innerWidth,
    height: innerHeight,
  },
): Promise<boolean> {
  await document.fonts.ready;
  const deadline = performance.now() + 45000;
  let stable = 0;
  let last = "";
  while (isCurrent() && performance.now() < deadline) {
    await paint();
    const failure =
      document.querySelector(
        '[aria-label="Interactive agent surface unavailable"]',
      ) ?? document.querySelector(".current-demo-error");
    if (failure)
      throw new Error(failure.textContent ?? "Native surface failed");
    const images = Array.from(document.images);
    for (const image of images) {
      if (image.complete && image.naturalWidth === 0)
        throw new Error(`Image did not load: ${image.currentSrc}`);
    }
    const maps = Array.from(
      document.querySelectorAll<MapDebugSurface>(
        '[data-slot="a2ui-map-surface"]',
      ),
    );
    const mapsReady = maps.every((host) => {
      if (host.__clioMapFailure) throw new Error(host.__clioMapFailure);
      return host.__clioMap?.loaded();
    });
    const surfaces = Array.from(
      document.querySelectorAll(
        '[id^="a2ui-surface-"], [data-current-surface]',
      ),
    );
    const main = document.querySelector<HTMLElement>(".current-demo");
    const stage = document.querySelector<HTMLElement>(".current-demo-stage");
    const nav = document.querySelector<HTMLElement>(
      '[aria-label="Workspace navigation"]',
    );
    const composer = document.querySelector<HTMLElement>(
      '[data-slot="clio-composer"]',
    );
    const mainBox = main?.getBoundingClientRect();
    const stageBox = stage?.getBoundingClientRect();
    const navBox = nav?.getBoundingClientRect();
    const composerBox = composer?.getBoundingClientRect();
    // Assets can be stable inside a transient 150px iframe layout. Require the
    // complete shell to occupy the host's declared capture viewport as well.
    const shellReady =
      innerWidth === viewport.width &&
      innerHeight === viewport.height &&
      mainBox?.width === viewport.width &&
      mainBox?.height === viewport.height &&
      Boolean(
        stageBox &&
          navBox &&
          composerBox &&
          Math.abs(stageBox.bottom - viewport.height) < 1 &&
          Math.abs(navBox.height - stageBox.height) < 1 &&
          composerBox.bottom <= viewport.height &&
          (composerBox.bottom > viewport.height - 48 ||
            (Boolean(
              document.querySelector('[data-composer-layout="welcome"]'),
            ) &&
              composerBox.width <= 896 &&
              composerBox.top >= stageBox.top)),
      );
    const ready =
      shellReady &&
      Boolean(document.querySelector('[data-slot="clio-composer"]')) &&
      mapsReady &&
      images.every((image) => image.complete && image.naturalWidth > 0) &&
      surfaces.every((host) =>
        host.querySelector('[data-slot="a2ui-surface-root"]'),
      ) &&
      surfaces.every((host) => !host.querySelector('[aria-busy="true"]'));
    // Loading rich results changes the scroll height after the source block commits.
    const log = document.querySelector<HTMLElement>(".current-demo-log");
    if (log && log.dataset.filmScroll !== "manual")
      log.scrollTop = log.scrollHeight;
    const layout = JSON.stringify([
      mainBox,
      stageBox,
      navBox,
      composerBox,
      log?.scrollHeight,
      ...surfaces.map((host) => {
        const box = host.getBoundingClientRect();
        return [box.x, box.y, box.width, box.height, host.textContent?.length];
      }),
    ]);
    stable = ready && layout === last ? stable + 1 : 0;
    last = layout;
    if (stable >= 4) return true;
  }
  if (!isCurrent()) return false;
  throw new Error(
    "Current UI did not finish painting its recorded assets within 45 seconds",
  );
}
