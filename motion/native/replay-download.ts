import { downloadPhase, type DownloadBeat } from "./download-plan";
export interface DownloadGesture {
  target?: DOMRect;
  previous?: DOMRect;
  start: number;
  end: number;
  pulse: number;
}
export interface DownloadState {
  focus: string;
  saved: boolean;
  rects: Record<string, DOMRect>;
}
const key = (node: HTMLElement, value: string) => {
  node.focus({ preventScroll: true });
  node.dispatchEvent(
    new KeyboardEvent("keydown", { key: value, code: value, bubbles: true }),
  );
};
const item = (host: Element | null | undefined, label: string) =>
  Array.from(
    host?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
  ).find((node) => node.textContent?.trim() === label);

/** Drive CLIO's own export menu and its real format handler; no substitute menu is rendered. */
export function replayDownload(
  host: HTMLElement,
  focus: string,
  beat: DownloadBeat,
  age: number,
  state: DownloadState,
): DownloadGesture | undefined {
  if (state.focus !== focus) {
    state.focus = focus;
    state.saved = false;
    state.rects = {};
    document.body.dataset.clioExportStatus = "";
  }
  const phase = downloadPhase(beat, age),
    more = host
      .querySelector('[data-slot="a2ui-chart"]')
      ?.querySelector<HTMLElement>(
        'button[aria-label="More"],button[aria-label="Downloading"]',
      );
  if (age < beat.save) state.saved = false;
  const rootMenu = document.getElementById(
    more?.getAttribute("aria-controls") ?? "",
  );
  const download = item(rootMenu, "Download"),
    format = item(
      document.getElementById(download?.getAttribute("aria-controls") ?? ""),
      beat.label,
    );
  if (more) state.rects.more = more.getBoundingClientRect();
  if (download) state.rects.download = download.getBoundingClientRect();
  if (format) state.rects.format = format.getBoundingClientRect();
  if (phase === "closed") {
    const menu = document.querySelector<HTMLElement>('[role="menu"]');
    if (menu) key(menu, "Escape");
  } else if (!state.saved) {
    if (phase === "menu" && format)
      key(format.closest<HTMLElement>('[role="menu"]')!, "Escape");
    if (more && more.getAttribute("aria-expanded") !== "true")
      key(more, "Enter");
    if (
      (phase === "formats" || phase === "saved") &&
      download &&
      download.getAttribute("aria-expanded") !== "true"
    )
      key(download, "ArrowRight");
    if (phase === "saved" && format) {
      state.saved = true;
      format.click();
    }
  }
  const stage =
    age < beat.formats - 24
      ? "more"
      : age < beat.save - 24
        ? "download"
        : "format";
  const at =
    stage === "more"
      ? beat.open
      : stage === "download"
        ? beat.formats
        : beat.save;
  if (age < beat.open - 24) return;
  return {
    target: state.rects[stage],
    previous:
      stage === "format"
        ? state.rects.download
        : stage === "download"
          ? state.rects.more
          : undefined,
    start: at - 24,
    end: at,
    pulse: age >= at && age < at + 12 ? 1 - (age - at) / 12 : 0,
  };
}
