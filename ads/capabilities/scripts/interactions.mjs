/** Read click times from the actual authored cursor routes, without duplicating their clock. */
import ts from "typescript";
export function clickFrames(source) {
  const file = ts.createSourceFile(
    "scene.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const times = [];
  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const properties = Object.fromEntries(
        node.properties
          .filter(ts.isPropertyAssignment)
          .map((p) => [p.name.getText(file), p.initializer]),
      );
      if (
        properties.press?.kind === ts.SyntaxKind.TrueKeyword &&
        properties.at &&
        ts.isNumericLiteral(properties.at)
      )
        times.push(Math.round(Number(properties.at.text) * 60));
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return [...new Set(times)].sort((a, b) => a - b);
}
