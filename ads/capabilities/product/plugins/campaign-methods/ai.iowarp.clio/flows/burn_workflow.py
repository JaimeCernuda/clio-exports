"""Dependency-driven investigation with concurrent specialists and conditional follow-up."""

from __future__ import annotations

import json
import math
from datetime import datetime
from typing import Any

from clio_agent.sdk import Flow

CHANNELS = ("particle_mean_ug_m3", "CO2MFd_mean", "horizontal_speed_mean")


def is_observation(value: Any) -> bool:
    """Exclude missing, boolean and non-finite values from channel comparisons."""
    return not isinstance(value, bool) and isinstance(value, (int, float)) and math.isfinite(value)


def check_coverage(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Measure channel coverage while retaining the source's quality exclusions."""
    coverage = {key: sum(is_observation(row.get(key)) for row in rows) for key in CHANNELS}
    if not rows or any(count == 0 for count in coverage.values()):
        raise ValueError("Each channel requires observations")
    return {
        "source_minutes": len(rows),
        "valid_minutes": coverage,
        "excluded_wind_records": sum(int(row.get("wind_flagged") or 0) for row in rows),
    }


def align_minutes(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Join channels on actual minute keys, keeping complete original records."""
    complete = [row for row in rows if all(is_observation(row.get(key)) for key in CHANNELS)]
    if not complete:
        raise ValueError("No complete records can be aligned")
    if len({row["timestamp_utc"] for row in complete}) != len(complete):
        raise ValueError("Duplicate minute keys require an aggregation policy")
    return sorted(complete, key=lambda row: row["timestamp_utc"])


def compare_reports(reports: list[dict[str, Any]]) -> dict[str, Any]:
    """Compare fresh specialist peak records only after the three branches finish."""
    if len(reports) != 3 or any(report.get("pending") for report in reports):
        raise RuntimeError("A specialist did not produce a fresh result")
    particle, carbon, _ = reports
    p = datetime.fromisoformat(particle["peak"]["timestamp_utc"])
    c = datetime.fromisoformat(carbon["peak"]["timestamp_utc"])
    separation = abs((c - p).total_seconds()) / 60
    return {
        "particle_peak": particle["peak"]["local_label"],
        "co2_peak": carbon["peak"]["local_label"],
        "separation_minutes": separation,
        "needs_review": separation > 1,
        "rule": "Review when the channel peaks are more than one minute apart",
    }


def compare_joint_response(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Compute descriptive correlation and peak overlap without a causal inference."""
    if len(rows) < 10 or any(not is_observation(row.get(key)) for row in rows for key in CHANNELS):
        raise ValueError("A top-ten comparison requires ten complete finite minute records")
    x = [float(row[CHANNELS[0]]) for row in rows]
    y = [float(row[CHANNELS[1]]) for row in rows]
    mx, my = sum(x) / len(x), sum(y) / len(y)
    denominator = math.sqrt(sum((v - mx) ** 2 for v in x) * sum((v - my) ** 2 for v in y))
    if denominator == 0:
        raise ValueError("A constant channel cannot support correlation")
    correlation = sum((a - mx) * (b - my) for a, b in zip(x, y, strict=True)) / denominator
    particle_top = {
        row["timestamp_utc"]
        for row in sorted(rows, key=lambda row: row[CHANNELS[0]], reverse=True)[:10]
    }
    carbon_top = {
        row["timestamp_utc"]
        for row in sorted(rows, key=lambda row: row[CHANNELS[1]], reverse=True)[:10]
    }
    return {
        "paired_minutes": len(rows),
        "correlation": correlation,
        "top_ten_overlap": len(particle_top & carbon_top),
    }


class CoverageFlow(Flow):
    """A reusable preparation flow, composed into the parent investigation."""

    id = "burn-coverage"

    async def forward(self, task: Any, ctx: Any) -> dict[str, Any]:
        """Read source observations and retain channel coverage and exclusions."""
        rows = json.loads(await ctx.step(ctx.workspace.read, "burn.json"))
        coverage = await ctx.step(check_coverage, rows)
        await ctx.step(ctx.workspace.write, "coverage-result.json", json.dumps(coverage))
        return {"answer": f"Checked {len(rows)} minute records.", **coverage}


class AlignmentFlow(Flow):
    """A second preparation flow that shares the original observations."""

    id = "burn-alignment"

    async def forward(self, task: Any, ctx: Any) -> dict[str, Any]:
        """Align source records by minute and publish the shared input for specialists."""
        rows = json.loads(await ctx.step(ctx.workspace.read, "burn.json"))
        aligned = await ctx.step(align_minutes, rows)
        await ctx.step(ctx.workspace.write, "aligned-burn.json", json.dumps(aligned))
        return {
            "answer": f"Aligned {len(aligned)} complete minute records.",
            "aligned_minutes": len(aligned),
        }


class TimingReview(Flow):
    """A scientific follow-up that runs only when the comparison requests it."""

    id = "timing-review"

    async def forward(self, task: Any, ctx: Any) -> dict[str, Any]:
        """Read aligned observations, compare channels jointly and retain the result."""
        rows = json.loads(await ctx.step(ctx.workspace.read, "aligned-burn.json"))
        review = await ctx.step(compare_joint_response, rows)
        await ctx.step(ctx.workspace.write, "timing-result.json", json.dumps(review))
        return {
            "answer": f"Paired-minute correlation is {review['correlation']:.3f}; "
            f"{review['top_ten_overlap']} of the ten highest minutes overlap. "
            "Distinct signals do not establish a single causal mechanism.",
            **review,
        }


class BurnWorkflow(Flow):
    """Compose preparation, subagent flows, a join, decision and conditional branch."""

    id = "burn-workflow"

    async def forward(self, task: Any, ctx: Any) -> dict[str, Any]:
        """Follow real dependencies and reject stale or unfinished child results."""
        await ctx.step(ctx.workspace.read, "burn.json")
        await ctx.gather(
            [
                ctx.call(CoverageFlow, {}, key="coverage", label="Check coverage"),
                ctx.call(AlignmentFlow, {}, key="alignment", label="Align minutes"),
            ]
        )
        coverage = json.loads(await ctx.step(ctx.workspace.read, "coverage-result.json"))
        aligned = json.loads(await ctx.step(ctx.workspace.read, "aligned-burn.json"))
        for name in ("particles", "carbon", "wind", "timing"):
            await ctx.step(
                ctx.workspace.write, f"{name}-result.json", json.dumps({"pending": True})
            )
        children = list(
            await ctx.gather(
                [
                    ctx.call(name, "Analyze aligned-burn.json", key=name, label=label)
                    for name, label in [
                        ("particles", "Particles"),
                        ("carbon", "CO₂"),
                        ("wind", "Wind / quality"),
                    ]
                ]
            )
        )
        reports = [
            json.loads(await ctx.step(ctx.workspace.read, f"{name}-result.json"))
            for name in ("particles", "carbon", "wind")
        ]
        comparison = await ctx.step(compare_reports, reports)
        followup = None
        if comparison["needs_review"]:
            child = await ctx.call(
                "timing", "Compare aligned channels jointly", key="timing", label="Timing review"
            )
            children.append(child)
            followup = json.loads(await ctx.step(ctx.workspace.read, "timing-result.json"))
            if followup.get("pending"):
                raise RuntimeError("The conditional review did not finish")
        report = {
            "coverage": coverage,
            "aligned_minutes": len(aligned),
            "comparison": comparison,
            "followup": followup,
            "answers": [child.answer for child in children],
            "handles": [child.handle for child in children],
        }
        await ctx.step(ctx.workspace.write, "team-result.json", json.dumps(report))
        return {
            "answer": f"The channel peaks are {comparison['separation_minutes']:.0f} minutes apart. "
            "The workflow retains preparation, specialist results and the requested follow-up.",
            **report,
        }
