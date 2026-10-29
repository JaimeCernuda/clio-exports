/** Present the actual mailbox text; its original envelope stays in native technical details. */
export function spotterNotificationPresentation(
  source: string,
  text: string,
): { label: string; text: string; format: "text" } | null {
  if (source !== "spotter" || !/^\[Agent session [^\n]+; spotter; /u.test(text))
    return null;
  const boundary = text.indexOf("\n");
  if (boundary < 0) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(text.slice(boundary + 1));
  } catch {
    return null;
  }
  if (
    !payload ||
    typeof payload !== "object" ||
    !("text" in payload) ||
    typeof payload.text !== "string"
  )
    return null;
  return {
    label: "Watched answer received",
    format: "text",
    text: payload.text
      .replace(/ Its answer is message [^:]+: /u, "\n\n")
      .replace(" It answers the request: ", "\n\nIt answers the request: "),
  };
}
