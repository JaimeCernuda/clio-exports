"""Data-backed campaign agents: deterministic scientific flows, no invented LM prose."""

from typing import ClassVar

from clio_agent.sdk import Agent, Flow


class DesignReview(Agent):
    """Execute a beam-design procedure with a real review branch."""

    id = "design-review"
    name = "CLIO Design Review"
    version = "1.0.0"
    role = "an engineering procedure that checks its calculations"
    plugins: ClassVar[list[str]] = ["core", "campaign-methods", "delegation", "streaming"]
    flow = Flow("beam-review")


class BurnTeam(DesignReview):
    """Run three specialist procedures as genuine child assignments."""

    id = "burn-team"
    name = "CLIO Burn Team"
    flow = Flow("burn-team")


class WatchExperiment(DesignReview):
    """Start a background script and leave it running after the response."""

    id = "watch-experiment"
    name = "CLIO Experiment Watcher"
    plugins = DesignReview.plugins + ["workspace"]
    flow = "react"


class CountAnalysis(DesignReview):
    """Use programmatic calls to scientific data tools."""

    id = "count-analysis"
    name = "CLIO Count Analysis"
    plugins = DesignReview.plugins + ["workspace"]
    flow = "react"


class PendulumStudy(DesignReview):
    """Record a numerical hypothesis test in CLIO's actual science log."""

    id = "pendulum-study"
    name = "CLIO Pendulum Study"
    plugins = DesignReview.plugins + ["science-log"]
    flow = Flow("pendulum-study")
