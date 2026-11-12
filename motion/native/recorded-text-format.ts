/** Keep this recorded Markdown answer formatted while its prefix grows, preserving the native source binding and completion state. */
export function recordedMarkdownReply(
  partId: string,
  mode: string | null,
): boolean {
  return mode === "spotter" && partId === "part_2174d879dc87";
}

/** Use native immediate code tokens in the Spotter film so asynchronous syntax paint cannot flash between frames. */
export function recordedCodeUsesRawTokens(mode: string | null): boolean {
  return mode === "spotter";
}

/** Keep answer-format metavariables visible outside code, rather than letting Markdown consume them as HTML. */
function literalAnswerPlaceholders(text: string): string {
  let fence: { char: string; length: number } | undefined;
  return text
    .split("\n")
    .map((line) => {
      const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/u);
      if (marker) {
        if (!fence) fence = { char: marker[1][0], length: marker[1].length };
        else if (
          marker[1][0] === fence.char &&
          marker[1].length >= fence.length &&
          !marker[2].trim()
        )
          fence = undefined;
        return line;
      }
      if (fence) return line;
      let inlineFence = 0;
      return line.replace(
        /`+|<(?=(?:accession|dose)(?:[>\s]|$))/gu,
        (token, offset: number) => {
          if (token.startsWith("`")) {
            if (!inlineFence) inlineFence = token.length;
            else if (inlineFence === token.length) inlineFence = 0;
            return token;
          }
          return inlineFence || line[offset - 1] === "\\" ? token : "\\<";
        },
      );
    })
    .join("\n");
}

/** Preserve visible answer-format placeholders and guard unfinished underlines without changing canonical transcript bytes. */
export function recordedThinkingMarkdown(
  text: string,
  streaming: boolean,
  partId?: string,
): string {
  if (partId === "part_cba0f67a7e31") text = literalAnswerPlaceholders(text);
  if (!streaming || !/(?:^|\n) {0,3}[-=]+[ \t]*$/u.test(text)) return text;
  let fence: { char: string; length: number } | undefined;
  for (const line of text.split(/\r?\n/u)) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/u);
    if (!marker) continue;
    if (!fence) fence = { char: marker[1][0], length: marker[1].length };
    else if (
      marker[1][0] === fence.char &&
      marker[1].length >= fence.length &&
      !marker[2].trim()
    )
      fence = undefined;
  }
  if (fence) return text;
  return text.replace(/(^|\n)( {0,3})([-=]+)([ \t]*)$/u, "$1$2\\$3$4");
}
