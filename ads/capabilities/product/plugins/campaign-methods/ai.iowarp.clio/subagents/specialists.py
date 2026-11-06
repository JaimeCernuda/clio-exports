"""Specialist agents own distinct data-analysis procedures."""

from clio_agent.sdk import Subagent

particles = Subagent(
    "particles",
    prompt="Analyze the recorded particle observations.",
    plugins=["core", "campaign-methods"],
    flow="particles",
)
carbon = Subagent(
    "carbon",
    prompt="Analyze the recorded carbon dioxide observations.",
    plugins=["core", "campaign-methods"],
    flow="carbon",
)
wind = Subagent(
    "wind",
    prompt="Analyze wind observations and their quality indicators.",
    plugins=["core", "campaign-methods"],
    flow="wind",
)

timing = Subagent(
    "timing",
    prompt="Compare aligned signals when the investigation requests a timing review.",
    plugins=["core", "campaign-methods"],
    flow="timing-review",
)
