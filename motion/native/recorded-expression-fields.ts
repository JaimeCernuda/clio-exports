/** Source columns read by Vega expressions, needed before a recorded table is projected. */
export function expressionFields(spec: unknown): string[] {
  const fields = new Set<string>();
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      if (
        (key === "calculate" || key === "filter") &&
        typeof value === "string"
      ) {
        for (const match of value.matchAll(
          /\bdatum\.([A-Za-z_][A-Za-z_0-9]*)/gu,
        ))
          fields.add(match[1]);
        for (const match of value.matchAll(/\bdatum\[['"]([^'"]+)['"]\]/gu))
          fields.add(match[1]);
      }
      visit(value);
    }
  };
  visit(spec);
  return [...fields];
}
