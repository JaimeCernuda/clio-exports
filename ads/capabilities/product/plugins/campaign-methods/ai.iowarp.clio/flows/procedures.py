"""Reproducible CLIO procedures. All external effects go through ctx.step/call."""

from __future__ import annotations

import json
import random
from typing import Any

from clio_agent.sdk import Flow


def sweep(thicknesses: list[float]) -> list[dict[str, float]]:
    """Euler–Bernoulli cantilever tip deflection: 10 N, 0.2 m, 20 mm, 70 GPa."""
    return [
        {
            "thickness_mm": h,
            "deflection_mm": 10 * 0.2**3 / (3 * 70e9 * (0.02 * (h / 1000) ** 3 / 12)) * 1000,
        }
        for h in thicknesses
    ]


def bootstrap_mean(rows: list[dict[str, Any]], field: str) -> dict[str, float]:
    """Seeded Monte Carlo interval for the retained minute means; no fake waiting."""
    values = [float(row[field]) for row in rows if isinstance(row.get(field), (int, float))]
    rng = random.Random(515)
    samples = sorted(sum(rng.choices(values, k=len(values))) / len(values) for _ in range(500_000))
    return {
        "mean": sum(values) / len(values),
        "p025": samples[12500],
        "p975": samples[487500],
        "replicates": 500000,
    }


def locate_peak(rows: list[dict[str, Any]], field: str) -> dict[str, Any]:
    """Retain a source row at the maximum, rejecting an empty scientific input."""
    if not rows:
        raise ValueError("A peak requires observations")
    return max(rows, key=lambda row: row[field])


class BeamReview(Flow):
    """Compare candidates, calculate, check, and refine an unsuccessful design."""

    id = "beam-review"
    description = "A cantilever design review with a thickness revision."

    async def forward(self, task: Any, ctx: Any) -> dict[str, Any]:
        """Calculate, review and revise the candidate beam through recorded steps."""
        candidates = await ctx.step(sweep, [2.0, 3.0, 4.0])
        initial = min(candidates, key=lambda row: row["deflection_mm"])
        review = {"limit_mm": 1.0, "revise": initial["deflection_mm"] > 1.0}
        await ctx.step(ctx.workspace.write, "initial-review.json", json.dumps(review))
        revised = await ctx.step(sweep, [6.0, 6.5, 7.0]) if review["revise"] else candidates
        selected = min(
            (row for row in revised if row["deflection_mm"] <= 1.0),
            key=lambda row: row["thickness_mm"],
        )
        report = {
            "initial": candidates,
            "review": review,
            "revised": revised,
            "selected": selected,
            "model": "Euler–Bernoulli analytical beam model",
        }
        await ctx.step(ctx.workspace.write, "beam-result.json", json.dumps(report))
        return {
            "answer": f"The revised {selected['thickness_mm']} mm beam deflects "
            f"{selected['deflection_mm']:.3f} mm and passes the 1 mm limit.",
            **report,
        }


class Particles(Flow):
    """Read the actual minute rows and compute their particle maximum."""

    id = "particles"

    async def forward(self, task: Any, ctx: Any) -> dict[str, Any]:
        """Return the particle maximum and the retained uncertainty calculation."""
        rows = json.loads(await ctx.step(ctx.workspace.read, "aligned-burn.json"))
        valid = [r for r in rows if isinstance(r.get("particle_mean_ug_m3"), (int, float))]
        peak = await ctx.step(locate_peak, valid, "particle_mean_ug_m3")
        uncertainty = await ctx.step(bootstrap_mean, valid, "particle_mean_ug_m3")
        report = {
            "answer": f"Particle mean peaks at {peak['particle_mean_ug_m3']:.2f} µg/m³ "
            f"at {peak['local_label']}.",
            "rows": len(valid),
            "peak": peak,
            "illustrative_bootstrap": uncertainty,
        }
        await ctx.step(ctx.workspace.write, "particles-result.json", json.dumps(report))
        return report


class Carbon(Flow):
    """Analyze the separate CO2 channel without inventing a causal relationship."""

    id = "carbon"

    async def forward(self, task: Any, ctx: Any) -> dict[str, Any]:
        """Analyze CO₂ separately so distinct signals retain their own evidence."""
        rows = json.loads(await ctx.step(ctx.workspace.read, "aligned-burn.json"))
        valid = [r for r in rows if isinstance(r.get("CO2MFd_mean"), (int, float))]
        peak = await ctx.step(locate_peak, valid, "CO2MFd_mean")
        uncertainty = await ctx.step(bootstrap_mean, valid, "CO2MFd_mean")
        report = {
            "answer": f"CO₂ mean peaks at {peak['CO2MFd_mean']:.2f} µmol/mol "
            f"at {peak['local_label']}.",
            "rows": len(valid),
            "peak": peak,
            "illustrative_bootstrap": uncertainty,
        }
        await ctx.step(ctx.workspace.write, "carbon-result.json", json.dumps(report))
        return report


class Wind(Flow):
    """Keep the available wind-quality exclusions in the scientific record."""

    id = "wind"

    async def forward(self, task: Any, ctx: Any) -> dict[str, Any]:
        """Summarize wind observations with their recorded quality exclusions."""
        rows = json.loads(await ctx.step(ctx.workspace.read, "aligned-burn.json"))
        valid = [r for r in rows if isinstance(r.get("horizontal_speed_mean"), (int, float))]
        flags = sum(int(r.get("wind_flagged") or 0) for r in rows)
        uncertainty = await ctx.step(bootstrap_mean, valid, "horizontal_speed_mean")
        report = {
            "answer": f"Wind has {len(valid)} minute means; {flags} flagged records "
            "are excluded in the source summary.",
            "rows": len(valid),
            "flagged": flags,
            "illustrative_bootstrap": uncertainty,
        }
        await ctx.step(ctx.workspace.write, "wind-result.json", json.dumps(report))
        return report


class PendulumStudy(Flow):
    """Write linked entries through the actual science-log tools."""

    id = "pendulum-study"

    async def forward(self, task: Any, ctx: Any) -> dict[str, Any]:
        """Record the question, test, evidence and qualified conclusion."""

        async def entry(kind: str, fields: dict[str, Any], links: Any = None) -> str:
            """Write an entry, refusing to continue after a typed rejection."""
            result = (
                await ctx.call("log_entry", {"type": kind, "fields": fields, "links": links})
            ).value
            if not result.get("accepted"):
                raise RuntimeError(str(result))
            return str(result["id"])

        q = await entry(
            "question",
            {
                "statement": "Does release amplitude change pendulum period?",
                "scope": "Ideal 1 m pendulum, g=9.80665 m/s²; numerical simulation.",
            },
        )
        h = await entry(
            "hypothesis",
            {
                "claim": "Amplitude does not change the period.",
                "refuting_prediction": "A larger angle yields a different period.",
            },
            {"question": q},
        )
        e = await entry(
            "experiment",
            {
                "method": "Integrate the nonlinear pendulum period over 46 release angles from 0 to 90 degrees.",
                "sample_size": 46,
            },
            {"hypothesis": h},
        )
        data = (await ctx.call("compute_pendulum", {"angle_deg": 60.0})).value
        o = await entry(
            "observation",
            {
                "result": f"At 60 degrees, period is {data['period']:.6f} s, {data['difference_pct']:.4f}% above the small-angle prediction.",
                "from_calls": [data["source_call"]],
                "measurements": [
                    {
                        "metric": "period",
                        "source": {"call": data["source_call"], "field": "period"},
                        "unit": "s",
                        "conditions": {"amplitude_deg": 60},
                    },
                    {
                        "metric": "small_angle_prediction",
                        "source": {"call": data["source_call"], "field": "prediction"},
                        "unit": "s",
                    },
                ],
            },
            {"experiment": e},
        )
        evidence = await entry(
            "evidence",
            {
                "interpretation": "The amplitude-independent claim fails for large release angles.",
                "strength": "strong",
            },
            {"observation": [o], "refutes": [h]},
        )
        await ctx.call(
            "set_status",
            {
                "entry_id": h,
                "status": "refuted",
                "reason": "The 60-degree simulation differs by more than numerical integration error.",
            },
        )
        await ctx.call(
            "set_status",
            {
                "entry_id": e,
                "status": "done",
                "reason": "The numerical calculation and sourced observation are recorded.",
            },
        )
        await entry(
            "conclusion",
            {
                "claims": [
                    {
                        "text": "Amplitude independence is a small-angle approximation.",
                        "cites": [o, evidence],
                    }
                ],
                "confidence": "high",
                "relation": "answers",
                "caveats": ["Ideal numerical pendulum, not a physical measurement."],
            },
            {"question": q},
        )
        await ctx.call(
            "set_status",
            {
                "entry_id": q,
                "status": "answered",
                "reason": "The linked numerical evidence supports a qualified conclusion.",
            },
        )
        return {
            "answer": "Amplitude independence is a small-angle approximation.",
            "question": q,
            "hypothesis": h,
            "experiment": e,
            "observation": o,
        }
