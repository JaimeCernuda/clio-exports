/** Source-message ranges for any conversation, including assistant-only children. */
export type ConversationTurn = {
  id: string;
  label: string;
  start: number;
  end: number;
};

export type SceneCatalogEntry = {
  file: string;
  title: string;
  sessionId: string;
};

/** Encode a public JSON path while rejecting remote URLs and parent traversal. */
export function sceneAssetPath(file: string): string {
  const segments = file.split("/");
  if (
    !file.toLowerCase().endsWith(".json") ||
    /[\\:?#\u0000-\u001f]/u.test(file) ||
    segments.some((part) => !part || part === "." || part === "..")
  )
    throw new Error(
      "Choose a local JSON scene below the preview's public directory",
    );
  return "./" + segments.map(encodeURIComponent).join("/");
}

/** Group contiguous source messages at user-message boundaries, never in pairs. */
export function conversationTurns(
  messages: readonly unknown[],
): ConversationTurn[] {
  const turns: ConversationTurn[] = [];
  const ids = new Set<string>();
  messages.forEach((value, index) => {
    if (
      !value ||
      typeof value !== "object" ||
      !("id" in value) ||
      !("role" in value)
    )
      throw new Error(
        "A native conversation message is missing its identity or role",
      );
    const { id, role } = value;
    if (
      typeof id !== "string" ||
      !id ||
      ids.has(id) ||
      typeof role !== "string"
    )
      throw new Error(
        "Native conversation message identities must be unique strings",
      );
    ids.add(id);
    if (!turns.length || role === "user") {
      let excerpt = "";
      if ("blocks" in value && Array.isArray(value.blocks)) {
        excerpt = value.blocks
          .filter(
            (block) => block?.type === "text" && typeof block.text === "string",
          )
          .map((block) => block.text)
          .join(" ")
          .replace(/\s+/gu, " ")
          .slice(0, 80);
      }
      turns.push({
        id,
        label: `${turns.length + 1}. ${excerpt || role}`,
        start: index,
        end: index + 1,
      });
    } else {
      turns[turns.length - 1].end = index + 1;
    }
  });
  return turns;
}

/** Keep the exact objects and order belonging to a selected source-message turn. */
export function messagesForTurn<T>(messages: T[], turnId: string): T[] {
  if (!turnId) return messages;
  const turn = conversationTurns(messages).find((item) => item.id === turnId);
  if (!turn) throw new Error(`No recorded turn starts at ${turnId}`);
  return messages.slice(turn.start, turn.end);
}

/** Validate the optional catalog before exposing its local scene choices. */
export function parseSceneCatalog(value: unknown): SceneCatalogEntry[] {
  if (
    !value ||
    typeof value !== "object" ||
    !("schema" in value) ||
    value.schema !== "clio.scene-catalog.v1" ||
    !("scenes" in value) ||
    !Array.isArray(value.scenes)
  )
    throw new Error("Expected a clio.scene-catalog.v1 catalog");
  const files = new Set<string>();
  return value.scenes.map((entry: unknown) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      !("file" in entry) ||
      typeof entry.file !== "string" ||
      !("title" in entry) ||
      typeof entry.title !== "string" ||
      !("sessionId" in entry) ||
      typeof entry.sessionId !== "string"
    )
      throw new Error("A scene catalog entry is incomplete");
    sceneAssetPath(entry.file);
    if (files.has(entry.file))
      throw new Error(`Duplicate catalog scene ${entry.file}`);
    files.add(entry.file);
    return { file: entry.file, title: entry.title, sessionId: entry.sessionId };
  });
}
