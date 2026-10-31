import type { StudyShot } from "./study-film-plan";

/** Resolve a semantic film action to the actual production control or data mark. */
export function studyTarget(target?: string): Element | null {
  if (!target) return null;
  const split = target.indexOf(":"),
    kind = target.slice(0, split),
    name = target.slice(split + 1);
  const find = (selector: string, test: (element: Element) => boolean) =>
    [...document.querySelectorAll(selector)].find(test) ?? null;
  if (kind === "tab")
    return find('[role="tab"]', (e) => e.textContent?.trim() === name);
  if (kind === "nav")
    return find(
      "[data-study-navigation] button",
      (e) => e.textContent?.trim() === name,
    );
  if (kind === "button")
    return find(
      ".study-workbench button",
      (e) =>
        e.textContent?.trim() === name ||
        e.getAttribute("aria-label") === name ||
        (name === "Open" && e.textContent?.trim() === "Open english"),
    );
  if (kind === "graph-node")
    return document.querySelector(
      `.study-workbench .react-flow__node[data-id="${name}"] button`,
    );
  if (kind === "flow")
    return find(
      '[data-native-flow] [role="checkbox"], [data-native-flow] [role="button"], [data-native-flow] button',
      (e) => e.getAttribute("aria-label")?.startsWith(`${name}:`) ?? false,
    );
  if (kind === "task")
    return document.querySelector(`[aria-label="Open the task of ${name}"]`);
  if (kind === "sources")
    return document.querySelector(`#science-entry-${name} summary`);
  if (kind === "source")
    return document.querySelector(
      `[aria-label="View call ${name} in transcript"]`,
    );
  if (kind === "view")
    return find(
      '.study-workbench [role="radio"]',
      (e) => e.textContent?.includes(name) ?? false,
    );
  if (kind === "seed-option")
    return find('[role="option"]', (e) => e.textContent?.trim() === name);
  if (kind === "seed")
    return document.querySelector(
      '.study-workbench [aria-label="Game (seed)"]',
    );
  if (kind === "chart") {
    const marks = [
      ...document.querySelectorAll(
        ".study-workbench svg.marks path[aria-label]",
      ),
    ];
    return (
      marks.find((e) =>
        e
          .getAttribute("aria-label")
          ?.includes(
            name === "games"
              ? "guess: riufo"
              : name === "comparison"
                ? "3.6"
                : "guess: terva",
          ),
      ) ??
      marks[0] ??
      null
    );
  }
  return null;
}

/** Apply deliberate reading scrolls; no whole-page scroll or transcript clock mutation. */
export function studyReadingPose(shot: StudyShot, seconds: number): void {
  const entryId = shot.choices?.entry;
  if (entryId && shot.scroll) {
    const card = document.getElementById(`science-entry-${entryId}`);
    const host = card?.closest<HTMLElement>('[data-slot="tabs-content"] > div');
    if (card && host) {
      const sourceRows = [
        ...card.querySelectorAll<HTMLElement>('[data-slot="science-source"]'),
      ];
      const offset = shot.call
        ? 0
        : (shot.target?.startsWith("source:")
            ? 1
            : Math.min(1, Math.max(0, (seconds - shot.begin - 3) / 4))) *
          Math.max(
            0,
            (sourceRows.at(-1)?.offsetTop ?? 0) -
              (sourceRows[0]?.offsetTop ?? 0),
          );
      host.scrollTop +=
        card.getBoundingClientRect().top -
        host.getBoundingClientRect().top -
        12 +
        offset;
    }
  }
  if (seconds - shot.begin < 1.1 || shot.target?.startsWith("source:")) {
    const target = studyTarget(shot.target),
      bounds = target?.getBoundingClientRect();
    if (
      target &&
      bounds &&
      (bounds.top < 140 || bounds.bottom > innerHeight - 40)
    ) {
      let parent = target.parentElement;
      while (
        parent &&
        !(
          parent.scrollHeight > parent.clientHeight &&
          /auto|scroll/.test(getComputedStyle(parent).overflowY)
        )
      )
        parent = parent.parentElement;
      if (parent)
        parent.scrollTop +=
          bounds.top - parent.getBoundingClientRect().top - 150;
    }
  }
}

/** A valid measured action must land inside the viewport, on its native target. */
export function studyTargetMeasurement(shot: StudyShot) {
  const element = studyTarget(shot.target);
  const rect = element?.getBoundingClientRect();
  return rect
    ? {
        begin: shot.begin,
        target: shot.target,
        x: rect.x + rect.width * 0.5,
        y: rect.y + rect.height * 0.5,
        width: innerWidth,
        height: innerHeight,
        label:
          element?.getAttribute("aria-label") ??
          element?.textContent?.slice(0, 120),
      }
    : { begin: shot.begin, target: shot.target, unavailable: true };
}
