export type PromptSegment = {
  kind: "reference" | "prose" | "spacing";
  text: string;
};

/** Separate OPAL reference blocks for styling without changing a single source character. */
export function promptSegments(text: string): PromptSegment[] {
  return text
    .split(/(\n{2,})/)
    .filter(Boolean)
    .map((part) => ({
      kind: /^\n+$/.test(part)
        ? "spacing"
        : /^(>>> |TOOLS\b|TERMS\b)/.test(part)
          ? "reference"
          : "prose",
      text: part,
    }));
}
