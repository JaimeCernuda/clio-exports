import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { analogueComparison } from "../native/opal-rules";
import { buildOpalScenario } from "../native/opal-scenario";
import { filmPair } from "../native/spotter-film-plan";
import type { PairedReplay } from "../native/paired-replay";

test("the comparison applies panel eligibility before similarity and compares the supplied peak", () => {
  const rounds = buildOpalScenario(
    filmPair(
      JSON.parse(
        readFileSync(
          new URL(
            "../native/public/opal-chainB-7795459.native.json",
            import.meta.url,
          ),
          "utf8",
        ),
      ) as PairedReplay,
    ),
  );
  const comparison = analogueComparison(rounds);
  assert.equal(comparison.recorded, "73; MATCHES");
  assert.equal(comparison.rule, "NIL 373; DIVERGES");
  assert.equal(comparison.table.rows[0].panel, "observational");
  const changed = structuredClone(rounds);
  changed[0].answer = "ANSWER: 0";
  assert.equal(analogueComparison(changed).rule, "NIL 373; MATCHES");
  const panel = changed[4].packets.find(
    (p) => p.lookup === "design_lookup",
  )!.table;
  panel.rows.forEach((r) => {
    r.panel_role = "observational";
  });
  assert.throws(() => analogueComparison(changed), /No eligible/);
});
