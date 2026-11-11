import type { PairedReplay } from "./paired-replay";

export type ScenarioTable = {
  columns: string[];
  rows: Record<string, string>[];
};
export type ScenarioPacket = {
  id: string;
  messageId: string;
  partId: string;
  start: number;
  end: number;
  lookup: string;
  arguments: string;
  text: string;
  table: ScenarioTable;
};
export type ScenarioRound = {
  number: number;
  title: string;
  promptId: string;
  promptAt: number;
  answerId: string;
  answerAt: number;
  answerLineAt: number;
  answerEnd: number;
  answer: string;
  dependencies: number[];
  packets: ScenarioPacket[];
};
const TITLES = [
  "Dose response",
  "Transition sensitivity",
  "Leaf area",
  "Modality coverage",
  "Nearest analogue",
  "Variance regime",
];
const DEPENDENCIES = [[], [1], [1, 2], [2], [1, 2], [2]];

/** Parse the fixed-width tables as printed in the reference packets, retaining multi-word labels. */
export function parseScenarioTable(text: string): ScenarioTable {
  const lines = text.split(/\r?\n/u);
  const rule = lines.findIndex((line) => /^\s*-+(?:\s+-+)+\s*$/u.test(line));
  if (rule < 1)
    throw new Error("Supplied lookup packet has no fixed-width table");
  const spans = [...lines[rule].matchAll(/-+/gu)].map((m) => ({
    lo: m.index,
    hi: m.index + m[0].length,
  }));
  const columns = spans.map(({ lo, hi }) =>
    lines[rule - 1].slice(lo, hi).trim(),
  );
  const rows: Record<string, string>[] = [];
  for (const line of lines.slice(rule + 1)) {
    if (!line.trim() || /^(?:\s*CURATION|\s*OUTPUT FORMAT)/u.test(line)) break;
    rows.push(
      Object.fromEntries(
        spans.map(({ lo }, i) => [
          columns[i],
          line.slice(lo, spans[i + 1]?.lo).trim(),
        ]),
      ),
    );
  }
  if (!rows.length || columns.some((c) => !c))
    throw new Error("Empty or malformed supplied table");
  return { columns, rows };
}

/** Index only supplied prompt lookups and actual answer parts. Never creates tool invocation records. */
export function buildOpalScenario(pair: PairedReplay): ScenarioRound[] {
  const main = pair.sessions.find((s) => s.role === "primary");
  if (!main || main.view.tools.length)
    throw new Error("This scenario requires the six-round inlined OPAL replay");
  const prompts = main.view.messages.filter((m) => m.role === "user");
  const answers = main.view.messages.filter((m) => m.role === "assistant");
  if (prompts.length !== 6 || answers.length !== 6)
    throw new Error("Expected six recorded prompt/answer pairs");
  return prompts.map((prompt, i) => {
    const part = prompt.blocks.find((b) => b.type === "text" && b.text);
    const reply = answers[i].blocks.find((b) => b.type === "text" && b.text);
    const p = main.blocks.find((b) => b.blockId === part?.id);
    const a = main.blocks.find((b) => b.blockId === reply?.id);
    if (!part?.text || !reply?.text || !p || !a)
      throw new Error(`Missing timed Round ${i + 1} source`);
    const text = part.text;
    const matches = [...text.matchAll(/^>>> (\w+_lookup)\((.*)\)$/gmu)];
    const packets = matches.map((match, j): ScenarioPacket => {
      const start = match.index;
      const end = matches[j + 1]?.index ?? text.indexOf("OUTPUT FORMAT", start);
      if (end < start) throw new Error("Lookup source boundary missing");
      const body = text.slice(start, end).trimEnd();
      return {
        id: `scenario:r${i + 1}:lookup:${j + 1}`,
        messageId: prompt.id,
        partId: part.id,
        start: [...text.slice(0, start)].length,
        end: [...text.slice(0, start + body.length)].length,
        lookup: match[1],
        arguments: match[2],
        text: body,
        table: parseScenarioTable(body),
      };
    });
    if (packets.length !== 3)
      throw new Error(`Round ${i + 1} must retain all three supplied packets`);
    const answer = reply.text.trim().split(/\r?\n/u)[0];
    const lineEnd = [
      ...reply.text.slice(0, reply.text.indexOf(answer) + answer.length),
    ].length;
    const answerLineAt =
      a.checkpoints.find(([, count]) => count >= lineEnd)?.[0] ?? a.end;
    return {
      number: i + 1,
      title: TITLES[i],
      promptId: prompt.id,
      promptAt: p.start,
      answerId: answers[i].id,
      answerAt: a.start,
      answerLineAt,
      answerEnd: a.end,
      answer,
      dependencies: DEPENDENCIES[i],
      packets,
    };
  });
}

/** Source-derived current task, including the last completed round at the end of the recording. */
export function scenarioRoundAt(
  rounds: ScenarioRound[],
  source: number,
): ScenarioRound {
  return rounds.filter((r) => r.promptAt <= source).at(-1) ?? rounds[0];
}

/** Resolve a required supplied table; fail rather than substitute invented chart data. */
export function scenarioTable(
  round: ScenarioRound,
  lookup: string,
  includes = "",
): ScenarioTable {
  const packet = round.packets.find(
    (p) => p.lookup === lookup && p.arguments.includes(includes),
  );
  if (!packet)
    throw new Error(`Missing ${lookup}(${includes}) in Round ${round.number}`);
  return packet.table;
}

/** Strict numerical access keeps missing reference cells visibly erroneous. */
export function scenarioNumber(
  row: Record<string, string>,
  key: string,
): number {
  const n = Number(row[key]);
  if (row[key] === undefined || !Number.isFinite(n))
    throw new Error(`Invalid reference cell ${key}`);
  return n;
}
