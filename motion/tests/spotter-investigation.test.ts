import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  recordedMarkdownReply,
  recordedThinkingMarkdown,
  recordedCodeUsesRawTokens,
} from "../native/recorded-text-format";
import {
  buildOpalScenario,
  scenarioTable,
  scenarioNumber,
} from "../native/opal-scenario";
import { buildPocketCues, pocketAt } from "../native/spotter-pocket-plan";
import {
  filmPair,
  buildSpotterFilmPlan,
  spotterFilmAt,
} from "../native/spotter-film-plan";
import {
  pairedClock,
  projectPairedSession,
  type PairedReplay,
} from "../native/paired-replay";
import {
  wordHeat,
  preTokens,
  DEFAULT_ATTENTION_HEAT_VIEW,
} from "../native/word-attention/attention-segment-heat";
import {
  attentionInspectionCursor,
  resolveAttentionInspection,
} from "../native/attention-inspection-plan";

const pair = filmPair(
  JSON.parse(
    readFileSync(
      new URL(
        "../native/public/opal-chainB-7795459.native.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as PairedReplay,
);

test("all supplied packets keep exact Unicode source spans and are not tool calls", () => {
  const rounds = buildOpalScenario(pair),
    main = pair.sessions.find((s) => s.role === "primary")!;
  assert.equal(rounds.length, 6);
  assert.equal(rounds.flatMap((r) => r.packets).length, 18);
  assert.equal(main.view.tools.length, 0);
  for (const r of rounds)
    for (const packet of r.packets) {
      const text = main.view.messages
        .find((m) => m.id === packet.messageId)!
        .blocks.find((b) => b.id === packet.partId)!.text!;
      assert.equal(
        [...text].slice(packet.start, packet.end).join(""),
        packet.text,
      );
      assert.ok(packet.id.startsWith("scenario:"));
    }
  assert.deepEqual(
    rounds.map((r) => r.answer),
    [
      "ANSWER: 100",
      "ANSWER: MAGIC 75",
      "ANSWER: 100; AGREES",
      "ANSWER: rgb2, msc1, s3d",
      "ANSWER: 73; MATCHES",
      "ANSWER: MAGIC 75@500",
    ],
  );
  assert.deepEqual(
    rounds.map((r) => r.dependencies),
    [[], [1], [1, 2], [2], [1, 2], [2]],
  );
  assert.ok(
    rounds.every(
      (r) => r.answerAt <= r.answerLineAt && r.answerLineAt <= r.answerEnd,
    ),
  );
  assert.equal(rounds[4].answerLineAt, 404802.2600097656);
  assert.ok(rounds[4].answerLineAt < rounds[4].answerEnd);
});
test("scientific gates and conflict are derived from supplied rows", () => {
  const rounds = buildOpalScenario(pair);
  const qc = scenarioTable(rounds[0], "qc_lookup");
  assert.equal(scenarioNumber(qc.rows[0], "n_plants_usable"), 5);
  const rgb = scenarioTable(rounds[2], "db_lookup").rows.find(
    (r) => r.genotype === "MAGIC 75" && r.modality === "rgb2",
  )!;
  assert.equal(scenarioNumber(rgb, "t100"), 21.96);
  const embedding = scenarioTable(rounds[4], "embedding_lookup").rows[0];
  assert.equal(embedding.neighbour_1, "73 (0.972)");
  assert.equal(embedding.neighbour_2, "NIL 373 (0.914)");
  assert.ok(rounds[4].packets[0].text.includes("CURATION OVERRIDE:"));
  assert.throws(() => scenarioNumber(rgb, "missing"), /Invalid reference/);
});

test("unfinished thinking underlines do not promote the preceding paragraph, while code and completed source remain literal", () => {
  assert.equal(recordedThinkingMarkdown("A rule\n-", true), "A rule\n\\-");
  assert.equal(recordedThinkingMarkdown("A rule\n=", true), "A rule\n\\=");
  assert.equal(recordedThinkingMarkdown("A rule\n-", false), "A rule\n-");
  assert.equal(
    recordedThinkingMarkdown("A rule\n- source", true),
    "A rule\n- source",
  );
  assert.equal(
    recordedThinkingMarkdown("```text\nA rule\n-", true),
    "```text\nA rule\n-",
  );
  assert.equal(
    recordedThinkingMarkdown("A rule\n    -", true),
    "A rule\n    -",
  );
});

test("progressive Markdown applies to the recorded explanation, while supplied prompts keep literal source formatting", () => {
  const rounds = buildOpalScenario(pair);
  const main = pair.sessions.find((s) => s.role === "primary")!;
  const response = main.view.messages.find((m) => m.id === rounds[4].answerId)!;
  const reply = response.blocks.find((b) => b.type === "text")!;
  assert.ok(reply.text!.includes("**Explanation"));
  assert.equal(recordedMarkdownReply(reply.id, "spotter"), true);
  assert.equal(recordedMarkdownReply(reply.id, "campaign"), false);
  for (const message of main.view.messages)
    for (const block of message.blocks)
      if (block.id !== reply.id)
        assert.equal(recordedMarkdownReply(block.id, "spotter"), false);
});

test("authored evidence gestures select the row that actually explains the gate", () => {
  const rounds = buildOpalScenario(pair),
    cues = buildPocketCues(pair);
  const row = (round: number) =>
    Number(
      cues
        .find((c) => c.round === round && c.focus)
        ?.focus?.replace("row-", ""),
    );
  assert.equal(
    scenarioTable(rounds[0], "qc_lookup").rows[row(1)].n_plants_usable,
    "5",
  );
  assert.equal(
    scenarioTable(rounds[1], "design_lookup", "accession_panel").rows[row(2)]
      .genotype,
    "73",
  );
  assert.equal(
    scenarioTable(rounds[2], "qc_lookup").rows[row(3)].treatment,
    "1000",
  );
  const swir = scenarioTable(rounds[3], "design_lookup").rows[row(4)];
  assert.equal(swir.modality, "swir");
  assert.equal(swir.rounds_scheduled, "0");
  assert.equal(row(6), 3);
  assert.equal(scenarioTable(rounds[5], "qc_lookup").rows[0].t200, "1");
  const wrong = {
    ...pair,
    source: { ...pair.source, sha256: "different-source" },
  };
  assert.throws(() => buildPocketCues(wrong), /Chain B/);
});
test("word heat aggregates measured pieces and preserves unmeasured coverage and Unicode", () => {
  assert.deepEqual(DEFAULT_ATTENTION_HEAT_VIEW, {
    unit: "word",
    reduction: "max",
  });
  const text = "DNA 🔬 attention";
  assert.equal(preTokens(text).at(-1)!.hi, [...text].length);
  const heat = wordHeat(
    " attention other",
    [
      [0, 3, 0.2],
      [3, 10, 0.8],
    ],
    "max",
  );
  assert.deepEqual(
    heat.map((x) => ({
      lo: x.lo,
      hi: x.hi,
      value: x.value,
      measured: x.measured,
    })),
    [{ lo: 1, hi: 10, value: 0.8, measured: 2 }],
  );
  assert.equal(
    wordHeat(
      " attention other",
      [
        [0, 3, 0.2],
        [3, 10, 0.8],
      ],
      "mean",
    )[0].value,
    0.5,
  );
  assert.equal(wordHeat("not measured", [], "max").length, 0);
});
test("pocket changes leave both logs on the same source clock and show real Spotter work", () => {
  const cues = buildPocketCues(pair);
  assert.ok(new Set(cues.map((c) => c.tab)).size === 3);
  assert.ok(cues.every((c, i) => i === 0 || c.at >= cues[i - 1].at));
  const reviewer = pair.sessions.find((s) => s.role === "spotter")!;
  let previous = -Infinity;
  for (const cue of cues) {
    const source = pairedClock(pair, cue.at).source;
    assert.ok(source >= previous);
    previous = source;
    assert.equal(pocketAt(pair, cue.at).tab, cue.tab);
    assert.ok(
      JSON.stringify(projectPairedSession(reviewer, source)).length > 0,
    );
  }
  const first = projectPairedSession(reviewer, 180000),
    later = projectPairedSession(reviewer, 260386);
  assert.notEqual(JSON.stringify(first), JSON.stringify(later));
});
test("alert precedes attention; both logs freeze through both inspections and return", () => {
  const plan = buildSpotterFilmPlan(pair),
    main = pair.sessions.find((s) => s.role === "primary")!;
  assert.ok(plan.source > buildOpalScenario(pair)[5].answerEnd);
  assert.ok(plan.source >= main.quarantine!.at);
  const reference = pair.sessions.map((s) =>
    JSON.stringify(projectPairedSession(s, plan.source)),
  );
  for (let frame = plan.at; frame < plan.resume; frame += 7) {
    const pose = spotterFilmAt(pair, frame);
    assert.equal(pose.source, plan.source);
    assert.deepEqual(
      pair.sessions.map((s) =>
        JSON.stringify(projectPairedSession(s, pose.source)),
      ),
      reference,
    );
  }
});

test("the second selection gives its full-width pointer approach enough travel time", () => {
  const captured = {
    ...pair,
    attention: JSON.parse(
      readFileSync(
        new URL(
          "../native/public/chainB-7795459-attention.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  };
  const spec = resolveAttentionInspection(captured, "chainB-alert-number");
  const anchors = {
    start: { x: 1260, y: 775 },
    parking: { x: 1260, y: 775 },
    selectionStart: { x: 144, y: 166 },
    selectionEnd: { x: 148, y: 166 },
    button: { x: 304, y: 125 },
    scroll: { x: 667, y: 385 },
    exit: { x: 680, y: 98 },
  };
  const poses = Array.from({ length: spec.frames }, (_, f) =>
    attentionInspectionCursor(spec, f, anchors),
  );
  const speed = poses
    .slice(1)
    .map((p, i) => Math.hypot(p.x - poses[i].x, p.y - poses[i].y));
  assert.ok(
    Math.max(...speed) < 40,
    `Fast pointer approach: ${Math.max(...speed)} px/frame`,
  );
  assert.deepEqual([poses.at(-1)!.x, poses.at(-1)!.y], [1260, 775]);
});
test("only the Spotter replay selects native immediate code tokens", () => {
  assert.equal(recordedCodeUsesRawTokens("spotter"), true);
  for (const mode of [null, "film", "campaign", "study"])
    assert.equal(recordedCodeUsesRawTokens(mode), false);
});
