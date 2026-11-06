/** Run genuine SDK procedures against an isolated current CLIO backend and save receipts. */
import fs from "node:fs/promises";
import path from "node:path";
import { captureFlows } from "./capture-flows.mjs";
const root = path.resolve(import.meta.dirname, ".."),
  base = process.env.CLIO_URL ?? "http://127.0.0.1:8788";
const api = async (method, route, body) => {
  const response = await fetch(base + route, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      `${method} ${route} ${response.status}: ${JSON.stringify(result).slice(0, 1000)}`,
    );
  return result;
};
const workspace = path.join(root, ".cache/workspace");
await fs.mkdir(workspace, { recursive: true });
const science = JSON.parse(
  await fs.readFile(path.join(root, "evidence/science.json"), "utf8"),
);
await fs.writeFile(
  path.join(workspace, "burn.json"),
  JSON.stringify(science.burn),
);
await fs.copyFile(
  path.join(root, ".cache/datasets/pbmc3k.h5"),
  path.join(workspace, "gene-counts.h5"),
);
await fs.copyFile(
  path.join(root, "evidence/science.json"),
  path.join(workspace, "science.json"),
);
const genomics = JSON.parse(
  await fs.readFile(path.join(root, "evidence/genomics.json"), "utf8"),
);
await fs.writeFile(
  path.join(workspace, "dataset-record.json"),
  JSON.stringify({
    doi: "10.5281/zenodo.14884845",
    url: genomics.url,
    sha256: genomics.sha256,
  }),
);
const storm = JSON.parse(
  await fs.readFile(path.join(root, "evidence/hurricane.json"), "utf8"),
);
const sources = JSON.parse(
  await fs.readFile(path.join(root, "evidence/sources.json"), "utf8"),
);
await fs.writeFile(
  path.join(workspace, "selected-storm.json"),
  JSON.stringify({
    rows: storm.filter(
      (r) => r.lon >= -79 && r.lon <= -76 && r.lat >= 25 && r.lat <= 28,
    ),
    selection: { west: -79, east: -76, south: 25, north: 28 },
    source_sha256: sources.sources.find((s) => s.name === "hurricane").sha256,
  }),
);
const market = await api("POST", "/v1/plugins/marketplaces", {
  source: path.join(root, "product"),
  name: "capability-campaign",
});
console.log("INSTALLED", market.name ?? market);
await api("POST", "/v1/plugins/marketplaces/capability-campaign/trust", {});
const listed = await api("GET", "/v1/workspaces");
const w =
  (listed.workspaces ?? listed.items ?? []).find(
    (x) =>
      (x.root_path ?? x.root ?? "").toLowerCase() === workspace.toLowerCase(),
  ) ??
  (await api("POST", "/v1/workspaces", {
    name: "CLIO capability campaign",
    root_path: workspace,
  }));
const model = { provider_id: "codex", model_id: "gpt-6-luna" };
const selected = process.argv.slice(2),
  all = [
    ["method", "design-review"],
    ["hypothesis", "pendulum-study"],
    ["team", "burn-team"],
    ["tools", "count-analysis"],
    ["selection", "selection-analysis"],
    ["streams", "watch-experiment"],
  ].filter(([id]) => !selected.length || selected.includes(id));
const directory = path.join(root, "evidence/execution");
await fs.mkdir(directory, { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
for (const [id, agent] of all) {
  let runWorkspace = w;
  if (id === "streams") {
    const runRoot = path.join(root, ".cache", `stream-run-${Date.now()}`);
    await fs.mkdir(runRoot, { recursive: true });
    await fs.copyFile(
      path.join(workspace, "burn.json"),
      path.join(runRoot, "burn.json"),
    );
    runWorkspace = await api("POST", "/v1/workspaces", {
      name: "Burn stream proof",
      root_path: runRoot,
    });
  }
  const session = await api("POST", "/v1/sessions", {
    workspace_id: runWorkspace.id,
    title: `Campaign: ${id}`,
    model,
    agent: { id: `capability-campaign/${agent}` },
    approval_mode: "bypass",
  });
  await fs.writeFile(
    path.join(directory, `${id}-session.json`),
    JSON.stringify(session, null, 2),
  );
  console.log("SESSION", id, session.id);
  const program = ["tools", "streams", "selection"].includes(id)
    ? await fs.readFile(
        path.join(
          root,
          "product/requests",
          id === "tools"
            ? "count-analysis.kernel"
            : id === "selection"
              ? "selection-analysis.kernel"
              : "watch-experiment.kernel",
        ),
        "utf8",
      )
    : null;
  await api("POST", `/v1/sessions/${session.id}/messages`, {
    parts: [
      {
        type: "text",
        text: program
          ? `Execute the following exact Python program using run_code${id === "streams" ? ' with background=True and label="Watch the experiment"' : ""}. Do not substitute shell execution. The tools/stream/task names are CLIO kernel bindings. Keep outputs in the workspace. Report only the genuine result or launch handle.\n\n${program}`
          : "Execute your scientific procedure on the retained workspace data. Keep all outputs inside this workspace.",
      },
    ],
  });
  const start = Date.now();
  let current, messages;
  while (Date.now() - start < 240000) {
    await sleep(1500);
    const pending = await api(
      "GET",
      `/v1/permissions?session_id=${session.id}&status=pending`,
    );
    for (const permission of pending.permissions ?? [])
      await api(
        "POST",
        `/v1/permissions/${permission.id ?? permission.permission_id}`,
        { action: "allow_session" },
      );
    current = await api("GET", `/v1/sessions/${session.id}`);
    messages = await api("GET", `/v1/sessions/${session.id}/messages`);
    const rows = Array.isArray(messages)
      ? messages
      : (messages.messages ?? messages.items ?? []);
    if (
      rows.some((m) => m.role === "assistant") &&
      ["idle", "completed", "failed", "error", "cancelled"].includes(
        current.status,
      )
    )
      break;
  }
  await fs.writeFile(
    path.join(directory, `${id}-messages.json`),
    JSON.stringify(messages, null, 2),
  );
  await fs.writeFile(
    path.join(directory, `${id}-settled.json`),
    JSON.stringify(current, null, 2),
  );
  console.log("SETTLED", id, current.status);
  if (!["idle", "completed"].includes(current.status))
    throw new Error(
      `Campaign ${id} did not finish successfully: ${current.status}`,
    );
  const taskView = await api("GET", `/v1/sessions/${session.id}/tasks/query`);
  await fs.writeFile(
    path.join(directory, `${id}-tasks.json`),
    JSON.stringify(taskView, null, 2),
  );
  if (id === "hypothesis") {
    const log = await api("GET", `/v1/sessions/${session.id}/science-log`);
    await fs.writeFile(
      path.join(root, "evidence/science-log.json"),
      JSON.stringify(log, null, 2),
    );
  }
  if (id === "team")
    await fs.copyFile(
      path.join(workspace, "team-result.json"),
      path.join(root, "evidence/workflow.json"),
    );
  const related = await api("GET", `/v1/sessions/${session.id}/agent-tasks`);
  if (id === "team")
    await captureFlows(base, directory, id, session, taskView, related);
  await fs.writeFile(
    path.join(directory, `${id}-children.json`),
    JSON.stringify(related, null, 2),
  );
  for (const child of related.tasks ?? []) {
    const transcript = await api(
      "GET",
      `/v1/sessions/${child.child_session_id}/messages`,
    );
    await fs.writeFile(
      path.join(
        directory,
        `${id}-${child.run_label.replaceAll(/[^a-z0-9]/gi, "")}-messages.json`,
      ),
      JSON.stringify(transcript, null, 2),
    );
  }
  if (id === "streams") {
    const snapshots = [];
    for (let i = 0; i < 65; i++) {
      await sleep(650);
      const reference = await api(
        "GET",
        `/v1/sessions/${session.id}/references/resolve?uri=${encodeURIComponent(`artifact://${runWorkspace.id}/burn-observations.parquet@latest`)}`,
      );
      const stream = reference.stream;
      if (!stream) throw new Error("The launched task has no actual stream");
      if (i % 6 === 0)
        await api("POST", `/v1/streams/${stream.stream_id}/watch`, {
          session_id: session.id,
        });
      const table = await api(
        "POST",
        `/v1/streams/${stream.stream_id}/table-query`,
        {},
      );
      const list = await api("GET", `/v1/sessions/${session.id}/tasks/query`);
      snapshots.push({
        observed_at: new Date().toISOString(),
        reference,
        table,
        tasks: list,
      });
      if (i === 6)
        await api("POST", `/v1/sessions/${session.id}/messages`, {
          parts: [
            {
              type: "text",
              text: "Use read_stream to tell me the latest particle reading and its local time. Keep the existing watcher running. Do not launch anything new.",
            },
          ],
        });
    }
    await fs.writeFile(
      path.join(directory, "stream-snapshots.json"),
      JSON.stringify(snapshots, null, 2),
    );
    for (const name of ["burn-observations", "burn-transport"]) {
      const reference = await api(
        "GET",
        `/v1/sessions/${session.id}/references/resolve?uri=${encodeURIComponent(`artifact://${runWorkspace.id}/${name}.parquet@latest`)}`,
      );
      const table = await api(
        "POST",
        `/v1/streams/${reference.stream.stream_id}/table-query`,
        {},
      );
      await fs.writeFile(
        path.join(directory, `${name}-final.json`),
        JSON.stringify({ reference, table }, null, 2),
      );
    }
    const finalMessages = await api(
      "GET",
      `/v1/sessions/${session.id}/messages`,
    );
    const streamRead = finalMessages.messages
      .flatMap((m) => m.parts)
      .find((p) => p.type === "tool_result" && p.tool_name === "read_stream");
    if (!streamRead?.metadata?.result?.latest)
      throw new Error("No recorded stream query result");
    const latest = streamRead.metadata.result.latest;
    const sourceIndex = science.burn.findIndex(
      (r) => r.local_label === latest.local_label,
    );
    if (sourceIndex < 1)
      throw new Error("The query cannot be joined to source observations");
    await fs.writeFile(
      path.join(root, "evidence/stream-query.json"),
      JSON.stringify(
        {
          sourceIndex,
          latest,
          streamState: streamRead.metadata.result.state,
          streamWrites: streamRead.metadata.result.writes,
        },
        null,
        2,
      ),
    );
    await fs.writeFile(
      path.join(directory, "streams-messages.json"),
      JSON.stringify(finalMessages, null, 2),
    );
    const finalTasks = await api(
      "GET",
      `/v1/sessions/${session.id}/tasks/query`,
    );
    await fs.writeFile(
      path.join(directory, "streams-tasks.json"),
      JSON.stringify(finalTasks, null, 2),
    );
  }
}
