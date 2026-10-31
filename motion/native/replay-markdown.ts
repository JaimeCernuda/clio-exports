import remend from "remend";

/** Complete partial formatting without inventing a blocked placeholder link. */
export function replayMarkdown(value: string): string {
  return remend(value, { linkMode: "text-only" }).replace(
    /\[([^\]]*)\]$/,
    "$1",
  );
}

/** Compare visible prose with its source prefix, excluding Markdown syntax and URLs. */
export function replayPlainText(value: string): string {
  return replayMarkdown(value)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`#]/g, "")
    .replace(/\s+/g, "");
}
