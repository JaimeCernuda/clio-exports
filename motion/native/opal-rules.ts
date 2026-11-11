import {
  scenarioNumber,
  scenarioTable,
  type ScenarioRound,
  type ScenarioTable,
} from "./opal-scenario";

/** Apply Chain B's analogue eligibility and peak comparison to its supplied tables, without running another model. */
export function analogueComparison(rounds: ScenarioRound[]): {
  table: ScenarioTable;
  recorded: string;
  rule: string;
} {
  const round = rounds[4];
  const accession = rounds[1].answer.replace(/^ANSWER:\s*/u, "");
  const neighbour = scenarioTable(round, "embedding_lookup").rows.find(
    (row) => row.genotype === accession,
  );
  if (!neighbour)
    throw new Error("Missing analogue neighbours for " + accession);
  const panel = scenarioTable(round, "design_lookup");
  const peaks = scenarioTable(round, "db_lookup");
  const table: ScenarioTable = {
    columns: ["accession", "similarity", "panel", "peak"],
    rows: [1, 2, 3].map((i) => {
      const match = neighbour[`neighbour_${i}`].match(/^(.+?)\s+\((.+)\)$/u);
      if (!match) throw new Error("Invalid neighbour cell");
      const membership = panel.rows.find((row) => row.genotype === match[1]);
      const peak = peaks.rows.find((row) => row.genotype === match[1]);
      if (!membership || !peak)
        throw new Error("Incomplete neighbour reference: " + match[1]);
      return {
        accession: match[1],
        similarity: match[2],
        panel: membership.panel_role,
        peak: peak.peak_treatment,
      };
    }),
  };
  const eligible = table.rows
    .filter((row) => row.panel !== "observational")
    .sort(
      (a, b) =>
        scenarioNumber(b, "similarity") - scenarioNumber(a, "similarity"),
    )[0];
  if (!eligible) throw new Error("No eligible analogue in supplied neighbours");
  const baseline = Number(rounds[0].answer.replace(/^ANSWER:\s*/u, ""));
  if (!Number.isFinite(baseline))
    throw new Error("Missing Round 1 dose answer");
  return {
    table,
    recorded: round.answer.replace(/^ANSWER:\s*/u, ""),
    rule: `${eligible.accession}; ${scenarioNumber(eligible, "peak") === baseline ? "MATCHES" : "DIVERGES"}`,
  };
}
