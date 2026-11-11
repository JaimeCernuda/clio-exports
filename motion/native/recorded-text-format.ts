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

/** Escape only a dangling Markdown underline while thinking streams; keep canonical source and completed rendering untouched. */
export function recordedThinkingMarkdown(
  text: string,
  streaming: boolean,
): string {
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
