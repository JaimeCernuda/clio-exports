/** Keep shot/copy handoffs synchronized with the actual registry and scene captions. */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { films } from "../src/registry.ts";
import { format } from "prettier";
const root = path.resolve(import.meta.dirname, "..");
const notes = {
  method: [
    "Your procedure can run, review its result and revise the relevant step.",
    "A deflecting beam travels through the flow and returns through simulation after review.",
    "beam.json; execution/method-*.json",
    "Euler–Bernoulli analytical beam, not a Slurm/finite-element run.",
    "Unfolding text into nodes, then routing the same result around the revision loop.",
  ],
  hypothesis: [
    "A useful scientific agent tests and revises a claim.",
    "The nonlinear period diverges from the small-angle prediction; linked graph entries preserve why the claim changed.",
    "science.json; science-log.json; execution/hypothesis-*.json",
    "Ideal numerical pendulum, not physical measurements. 60° result is +7.3182%.",
    "Shrinking the plot while graph nodes grow without collisions or clipping the pendulum.",
  ],
  team: [
    "An investigation can compose flows, concurrent specialists and evidence-dependent follow-up.",
    "Two preparation flows feed three concurrent specialists. Their joined results trigger a fourth specialist when peak times differ by more than one minute. The same graph persists through the finding.",
    "konza.json; science.json; workflow.json; execution/team-*.json; product/plugins/campaign-methods/ai.iowarp.clio/flows/burn_workflow.py",
    "Real deterministic SDK execution, not LLM-generated planning. The one-minute review threshold is an authored example policy. Bootstrap is illustrative; correlation and overlapping extremes do not establish causation. Native flow projections expose task calls/results, while the inspector's step labels condense the retained procedure source.",
    "Reframe the entire connected graph to inspect one nested flow; return without replacing nodes, then animate the join, decision and conditional branch continuously.",
  ],
  interface: [
    "An answer can be a tool you can use.",
    "Changing baseline updates quartiles and deltas; month choices focus the comparison; export retains that view.",
    "alta.json; science.json; exports/",
    "Reconstructed control gestures using archived scientific data; unselected months remain faint chart context.",
    "Controls, pointer and linked values must agree while rows collapse smoothly.",
  ],
  provenance: [
    "You can inspect where a result came from.",
    "Follow one boundary-area result through its measurement and polygon to its dataset, then return.",
    "boundary.geojson; tahoe.json; science.json",
    "Mapped boundary area is not current water extent.",
    "Keep the result identity continuous through the backward and forward inspection.",
  ],
  tools: [
    "Your scientific tools and sources can work together in a program.",
    "A genuine PTC program performs four source reads and produces a concise count summary with source references.",
    "genomics.json; execution/tools-*.json; product/requests/count-analysis.kernel",
    "CSC cells are columns; data vector entries are not cells. Displayed program is a condensed excerpt.",
    "Clear surrounding source/tool cards before the result expands; no idle toolbar.",
  ],
  selection: [
    "Ask a question scoped to selected scientific records.",
    "The same 12 geographic observations become highlighted rows and a composer reference. A genuine PTC program reads those records and computes the peak before the answer appears.",
    "hurricane.json; atlantic-basemap.json; execution/selection-*.json; product/requests/selection-analysis.kernel",
    "Authored reference gesture using actual NOAA rows and Natural Earth geometry. The read/maximum calculation is retained native execution; public activity labels condense it and do not invent model reasoning.",
    "Keep map labels as stable DOM text and preserve the selection through the reference handoff, record read, computation and answer.",
  ],
  streams: [
    "A running experiment can feed both an agent and a live view.",
    "A background script replays the burn observations; the agent queries them while a dashboard updates. The same recorded wind readings then drive an illustrative parcel-transport model whose output enters context and the view alongside its inputs.",
    "science.json; stream-query.json; execution/stream-snapshots.json; execution/burn-*-final.json; execution/streams-*.json",
    "Recorded observations and a kinematic model, not live physical sensors or a dispersion forecast. Minute-mean horizontal speed is held spatially uniform for each minute; travelled distance integrates speed × 60 s. No mixing, deposition or geographic displacement is inferred. Each stream keeps 18 rows; saved snapshots are versioned; the task stops on completion.",
    "Keep the original observations visible while wind feeds the model; align model output, live dashboard and retained query to the same source rows.",
  ],
};
for (const film of films) {
  const folder = path.join(
    root,
    "films",
    `${String(film.number).padStart(2, "0")}-${film.id}`,
  );
  const source = await readFile(path.join(folder, "scene.tsx"), "utf8");
  const copy = [...source.matchAll(/<Caption\s[\s\S]*?\/>/g)].map(([tag]) => ({
    at: Number(tag.match(/at=\{([\d.]+)\}/)?.[1]),
    until: Number(tag.match(/until=\{([\d.]+)\}/)?.[1]),
    text: tag.match(/text="([^"]+)"/)?.[1],
  }));
  if (
    copy.some(
      (c) => !Number.isFinite(c.at) || !Number.isFinite(c.until) || !c.text,
    )
  )
    throw new Error(`Unparsed copy: ${film.id}`);
  const [takeaway, proof, evidence, limits, hardest] = notes[film.id];
  const story = {
    id: film.id,
    title: film.title,
    seconds: film.seconds,
    takeaway,
    proof,
    evidence,
    limits,
    hardest,
    shots: film.markers.map((m, i) => ({
      ...m,
      until: film.markers[i + 1]?.at ?? film.seconds,
    })),
    copy,
  };
  await writeFile(
    path.join(folder, "storyboard.json"),
    JSON.stringify(story, null, 2) + "\n",
  );
  await writeFile(
    path.join(folder, "README.md"),
    `# ${film.number}. ${film.title}\n\n${takeaway}\n\n**Visible proof:** ${proof}\n\n**Evidence:** \`${evidence}\`. See [campaign source ledger](../../SOURCES.md).\n\n**Presentation limits:** ${limits}\n\n**Difficult mechanic:** ${hardest}\n\n## Timed shots\n\n| Time | Beat |\n| --- | --- |\n${story.shots.map((s) => `| ${s.at}–${s.until} s | ${s.label} |`).join("\n")}\n\n## On-screen copy\n\n${copy.map((c) => `- ${c.at}–${c.until} s: ${c.text}`).join("\n")}\n\n## Edit and render\n\n\`scene.tsx\` is the editable composition; \`storyboard.json\` is its shot/copy handoff.\nFrom the campaign root, run \`node render.mjs ${film.id} --draft\`, inspect, revise,\nthen \`node render.mjs ${film.id}\` and \`node scripts/review.mjs ${film.id}\`.\nThe latest local output is \`../../output/${String(film.number).padStart(2, "0")}-${film.id}.mp4\`.\nReview findings belong in [the campaign review history](../../REVIEW.md).\n`,
  );
  const guide = path.join(folder, "README.md");
  await writeFile(
    guide,
    await format(await readFile(guide, "utf8"), { parser: "markdown" }),
  );
}
console.log("Synchronized eight film guides and storyboards");
