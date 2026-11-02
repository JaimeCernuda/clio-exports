import source from "../data/composable-prompts.json";

export type PromptSnapshot = (typeof source.snapshots)[number];
export const snapshots = source.snapshots;
export const byId = Object.fromEntries(
  snapshots.map((snapshot) => [snapshot.id, snapshot]),
) as Record<string, PromptSnapshot>;
export const COMPOSABLE_FRAMES = 1800;
export const PROMPT_WIDTH = 1136;

/** Editorial changes refer to genuine composer snapshots, not invented replies. */
export const transformations = [
  {
    at: 444,
    duration: 102,
    from: "clio",
    to: "clio-slurm",
    action: "add",
    label: "Slurm",
    menuAt: 376,
    click: 430,
  },
  {
    at: 756,
    duration: 102,
    from: "clio-slurm",
    to: "factorio",
    action: "switch",
    label: "Factorio",
    menuAt: 682,
    click: 742,
  },
  {
    at: 1044,
    duration: 66,
    from: "factorio",
    to: "factorio-ndp",
    action: "add",
    label: "NDP",
    menuAt: 976,
    click: 1030,
  },
  {
    at: 1224,
    duration: 58,
    from: "factorio-ndp",
    to: "earthscope",
    action: "montage",
    label: "EarthScope",
    menuAt: -1,
    click: -1,
  },
  {
    at: 1302,
    duration: 58,
    from: "earthscope",
    to: "opal",
    action: "montage",
    label: "OPAL",
    menuAt: -1,
    click: -1,
  },
  {
    at: 1380,
    duration: 58,
    from: "opal",
    to: "clio-data",
    action: "montage",
    label: "CLIO Data",
    menuAt: -1,
    click: -1,
  },
] as const;

export function transformationAt(frame: number) {
  const change = [...transformations].reverse().find((t) => frame >= t.at);
  if (!change)
    return { from: byId.clio, to: byId.clio, progress: 1, change: undefined };
  return {
    from: byId[change.from],
    to: byId[change.to],
    progress: Math.min(1, (frame - change.at) / change.duration),
    change,
  };
}

/** Native fragment unwrapping, matching gact-tui's plugin-presentation helper. */
export function unwrap(text: string): string {
  const out: string[] = [];
  let fenced = false;
  const block = /^\s*(?:[-*+]\s|\d+[.)]\s|#|>|```|~~~|\|)/u;
  for (const line of text.split("\n")) {
    const fence = /^\s*(?:```|~~~)/u.test(line);
    const previous = out.at(-1) ?? "";
    if (
      !fenced &&
      !fence &&
      line.trim() &&
      previous.trim() &&
      !block.test(line) &&
      !/^\s*(?:```|~~~|#|\|)/u.test(previous)
    )
      out[out.length - 1] = `${previous.trimEnd()} ${line.trimStart()}`;
    else out.push(line);
    if (fence) fenced = !fenced;
  }
  return out.join("\n");
}

export function fragmentText(snapshot: PromptSnapshot, id: string): string {
  return unwrap(
    snapshot.prompt.sections
      .flatMap((section) => section.fragments)
      .find((fragment) => fragment.id === id)?.text ?? "",
  );
}
