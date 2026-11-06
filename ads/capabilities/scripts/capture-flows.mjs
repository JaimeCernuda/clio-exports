/** Retain the native flow projections used to explain a composed investigation. */
import fs from "node:fs/promises";
import path from "node:path";

export async function captureFlows(
  base,
  directory,
  id,
  session,
  tasks,
  children,
) {
  const targets = [
    ...tasks.tasks
      .filter((t) => t.kind === "Session")
      .map((t) => ({ name: "parent", handle: t.handle })),
    ...children.tasks.map((t) => ({
      name: t.run_label.replaceAll(/[^a-z0-9]/gi, ""),
      handle: t.task_id,
    })),
  ];
  for (const target of targets) {
    const response = await fetch(
      `${base}/v1/sessions/${session.id}/tasks/${target.handle}/flow`,
    );
    if (!response.ok)
      throw new Error(
        `Native flow projection unavailable: ${target.name} (${response.status})`,
      );
    await fs.writeFile(
      path.join(directory, `${id}-${target.name}-flow.json`),
      JSON.stringify(await response.json(), null, 2),
    );
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
) {
  const root = path.resolve(import.meta.dirname, ".."),
    directory = path.join(root, "evidence/execution");
  const read = async (name) =>
    JSON.parse(await fs.readFile(path.join(directory, name), "utf8"));
  for (const id of process.argv.slice(2))
    await captureFlows(
      process.env.CLIO_URL ?? "http://127.0.0.1:8788",
      directory,
      id,
      await read(`${id}-session.json`),
      await read(`${id}-tasks.json`),
      await read(`${id}-children.json`),
    );
}
