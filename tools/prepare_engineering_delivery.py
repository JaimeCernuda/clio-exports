"""Write the engineering film's presenter cues, captions and chaptered review page."""

from __future__ import annotations

import argparse
import html
import json
from pathlib import Path
from typing import Any

from study_captions import timestamp, write_captions


def engineering_cues() -> list[dict[str, Any]]:
    """Return short, globally timed cues for the actual implemented film."""
    entries = [
        (0, 5.5, "How does material budget change a cantilever design?"),
        (6, 12, "CLIO checks the problem definition."),
        (12, 20, "Four material budgets. Three filter radii. Twelve cases."),
        (20, 24.5, "The starting density matches each case’s volume fraction."),
        (26.5, 31.5, "CLIO submits the study as one Slurm array."),
        (31.5, 38.2, "The Slurm jobs run in the background."),
        (41, 45, "CLIO collects the completed cases."),
        (45, 54, "Each case took 10–19 minutes. CLIO checks all twelve results."),
        (59, 70, "The checked results become registered artifacts."),
        (70.5, 85, "CLIO builds the interactive dashboard."),
        (88, 98, "Compare the completed designs in one workspace."),
        (101, 110, "The density threshold changes the view, not the solver run."),
        (115, 124, "The remaining six cases use higher material budgets."),
        (135.5, 142, "Select c05: its design and file list update together."),
        (143.5, 150, "Switch cases to compare settings and results."),
        (155, 166, "Compare an original design with its smoothed version."),
        (178, 190, "The same Morphorm case, before and after smoothing."),
        (195, 201, "Build a studio for individual optimization trials."),
        (201, 213, "Mesh checks and a delegated solver setup."),
        (213, 220, "Morphorm runs on Slurm while CLIO builds the view."),
        (220, 231, "Ten iterations complete. The trial is saved."),
        (233, 244, "A second solver produces a different set of fields."),
        (244, 253, "Retain the results. Remove temporary solver files."),
        (253, 257, "The topology studio is published."),
        (258, 265, "Inspect the mesh and its boundary sets."),
        (267, 275, "The controls match the recorded ten-iteration trial."),
        (278, 286, "Open the saved result. These are recorded iterations."),
        (288, 301, "The material distribution changes across eleven saved states."),
        (302, 308, "Raise the display threshold and inspect the final structure."),
        (310, 321, "Inspect Tosca’s stress field and recorded convergence."),
        (
            323,
            333,
            "This is a unitless test. Its objective is not directly comparable with Morphorm’s.",
        ),
        (337, 343, "The saved-trial record keeps the design and its settings."),
        (347, 355, "From an engineering request to an inspectable result."),
    ]
    return [
        {"id": f"engineering-{index:02}", "start": begin, "end": end, "text": text}
        for index, (begin, end, text) in enumerate(entries, 1)
    ]


def prepare(output: Path) -> dict[str, Any]:
    """Write editable sidecars and a caption-capable local player without contacting voice APIs."""
    output.mkdir(parents=True, exist_ok=True)
    cues = engineering_cues()
    plan: dict[str, Any] = {
        "schema": "clio.engineering-delivery.v1",
        "title": "Engineering studies with CLIO",
        "durationSeconds": 356,
        "fps": 60,
        "resolution": [1920, 1080],
        "timing": "editorial_not_audio_aligned",
        "chapters": [
            {"id": "sweep", "start": 0, "end": 195, "title": "Parameter study"},
            {"id": "studio", "start": 195, "end": 356, "title": "Topology studio"},
        ],
        "cues": cues,
        "sourceOrder": "E4 followed by the separate E5 session; E5 was recorded earlier.",
        "limits": [
            "Recorded execution; no live cluster or solver jobs are launched by the film.",
            "Film dialogue is explicitly edited for clarity; it is not a verbatim transcript. Original exports and per-block edit receipts are retained.",
            "E4 mesh frames index independent cases. E5 T001 frames index iterations 0–10.",
            "The exported dashboard's Run/Save/Discard routing is not demonstrated.",
            "Stress and displacement units are suppressed by a scoped viewer adapter for the E=1 unitless test. Original files and numeric field data remain unchanged.",
        ],
    }
    write_captions(cues, output, "engineering-demo")
    (output / "engineering-presenter.json").write_text(
        json.dumps(plan, indent=2, ensure_ascii=False) + "\n", "utf-8"
    )
    script = ["# Engineering studies with CLIO", "", "Silent presentation cut · 5:56", ""]
    jobs: list[dict[str, Any]] = []
    narration = output / "engineering-narration"
    narration.mkdir(exist_ok=True)
    for cue in cues:
        script.append(
            f"**{timestamp(cue['start'], '.')}–{timestamp(cue['end'], '.')}** {cue['text']}\n"
        )
        (narration / f"{cue['id']}.txt").write_text(cue["text"] + "\n", "utf-8")
        jobs.append(
            {
                "cue": cue["id"],
                "globalStartSeconds": cue["start"],
                "windowEndSeconds": cue["end"],
                "textFile": f"engineering-narration/{cue['id']}.txt",
                "requestBody": {"text": cue["text"]},
                "responseFile": f"alignment/{cue['id']}.json",
                "audioFile": f"audio/{cue['id']}.mp3",
            }
        )
    (output / "engineering-presenter.md").write_text("\n".join(script), "utf-8")
    (output / "engineering-elevenlabs-jobs.json").write_text(
        json.dumps(
            {
                "schema": "clio.narration-jobs.v1",
                "timing": "editorial_not_audio_aligned",
                "ttsEndpoint": "/v1/text-to-speech/{voice_id}/with-timestamps",
                "forcedAlignmentEndpoint": "/v1/forced-alignment",
                "clips": jobs,
            },
            indent=2,
        )
        + "\n",
        "utf-8",
    )
    chapters = ";FFMETADATA1\n" + "\n".join(
        f"[CHAPTER]\nTIMEBASE=1/1000\nSTART={c['start'] * 1000}\nEND={c['end'] * 1000}\ntitle={c['title']}"
        for c in plan["chapters"]
    )
    (output / "engineering-chapters.ffmeta").write_text(chapters + "\n", "utf-8")
    cue_json = json.dumps(cues, ensure_ascii=False).replace("</", "<\\/")
    document = """<!doctype html><html lang="en"><meta charset="utf-8"><title>Engineering studies with CLIO</title>
<style>body{margin:0;background:#f3f5f5;color:#17394a;font:15px system-ui}main{max-width:1500px;margin:20px auto;padding:0 20px}h1{font-size:23px;font-weight:550}video{width:100%;max-height:80vh;background:#eef7f9;border:1px solid #c3d5dc;border-radius:9px}button,a{font:inherit;border:1px solid #bfcfd7;background:white;border-radius:5px;padding:7px 12px;color:#17445a;cursor:pointer;text-decoration:none}nav{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}#cue{min-height:40px;text-align:center;font-size:18px;margin:10px auto}details{margin-top:20px}li{margin:8px 0}</style>
<main><h1>Engineering studies with CLIO</h1><video id="video" controls preload="metadata" src="engineering-demo-clean.mp4"><track kind="captions" srclang="en" label="Presenter cues" src="engineering-demo.vtt"></video>
<div id="cue" aria-live="off"></div><nav><button data-time="0">Parameter study</button><button data-time="88">Designs</button><button data-time="130">Case selection</button><button data-time="178">Smoothing</button><button data-time="195">Individual trials</button><button data-time="258">Mesh</button><button data-time="278">History</button><button data-time="309">Solver field</button><button data-time="336">Saved trials</button></nav>
<nav><button id="version">Show burned-caption version</button><a href="engineering-presenter.md">Presenter script</a><a href="engineering-demo.vtt">WebVTT</a><a href="engineering-demo.srt">SRT</a></nav>
<details><summary>Source and playback notes</summary><ul><li>Two separate exported sessions, ordered for this presentation.</li><li>Source work is condensed; the views use the actual saved mesh and table data.</li><li>The density threshold changes display geometry. It does not launch another solver run.</li><li>These short test results are not converged production designs.</li><li>No audio is included. Voice jobs retain global editorial cue windows for later real alignment.</li></ul></details></main>
<script>const cues=CUES;const v=document.getElementById('video');let burned=false;v.addEventListener('timeupdate',()=>{const c=cues.find(c=>v.currentTime>=c.start&&v.currentTime<c.end);document.getElementById('cue').textContent=burned||Array.from(v.textTracks).some(track=>track.mode==='showing')?'':c?.text??''});document.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>{v.currentTime=Number(b.dataset.time);v.play()});document.getElementById('version').onclick=()=>{const t=v.currentTime,p=!v.paused;burned=!burned;for(const track of v.textTracks)track.mode='disabled';v.src=burned?'engineering-demo-captioned.mp4':'engineering-demo-clean.mp4';v.addEventListener('loadedmetadata',()=>{v.currentTime=t;if(p)v.play()},{once:true});document.getElementById('version').textContent=burned?'Show clean master':'Show burned-caption version'};</script></html>""".replace(
        "CUES", cue_json
    )
    document = (
        document.replace('src="engineering-demo-clean.mp4"', 'src="engineering-demo-captioned.mp4"')
        .replace("let burned=false", "let burned=true")
        .replace(">Show burned-caption version</button>", ">Show clean master</button>")
    )
    document = document.replace(">Individual trials</button>", ">Topology studio</button>").replace(
        "<li>Source work is condensed;",
        "<li>Dialogue is edited for this film; original transcripts remain unchanged.</li><li>Source work is condensed;",
    )
    (output / "engineering-review.html").write_text(document, "utf-8")
    rows = "".join(
        f"<tr><td>{timestamp(c['start'], '.')}</td><td>{html.escape(c['text'])}</td></tr>"
        for c in cues
    )
    (output / "engineering-plan.html").write_text(
        '<!doctype html><meta charset="utf-8"><title>Engineering film plan</title><style>body{font:16px/1.6 system-ui;max-width:1000px;margin:40px auto;color:#153849}td{padding:10px;border-bottom:1px solid #ccd9df}td:first-child{white-space:nowrap}</style><h1>Engineering studies with CLIO · 5:56</h1><p>First, a recorded parameter sweep. Then, a separate session building an individual-trial studio. Native chat preserves source order; inspections pause the source clock.</p><table>'
        + rows
        + "</table>",
        "utf-8",
    )
    return plan


def main() -> None:
    """Export local presentation deliverables alongside the rendered movies."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=Path("motion/out"))
    args = parser.parse_args()
    result = prepare(args.out)
    print(json.dumps({"durationSeconds": result["durationSeconds"], "cues": len(result["cues"])}))


if __name__ == "__main__":
    main()
