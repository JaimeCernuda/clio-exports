# Video projects

Start here to find a film's sources, editable plan, launch commands and review status.
The shared [UI replay emulator](../motion/native/EMULATOR.md) serves all four projects.
Each entry below owns its script and source map; production components and transport
adapters stay shared in `motion/native/`.

| Project | What it shows | Start here | Current boundary |
| --- | --- | --- | --- |
| NDP + CLIO | Tahoe mapping, Alta snowfall, Konza burn observations; standalone and combined cuts | [NDP](ndp/README.md) | Final campaign's creative treatment was rejected; retain its technical pipeline and lessons |
| SPOTTER-AI / OPAL | Concurrent primary/reviewer logs, alerts and source-token attention | [SPOTTER / OPAL](spotter-opal/README.md) | Full film needs reviewer/pointer revisions; manual attention is a separate working mode |
| Wordle science study | Evolving flow, delegated workers, boards, Science Log graph and attached views | [Wordle](wordle/README.md) | Revised 8:30 technical walkthrough; presenter captions and later speech alignment |
| Engineering studies | Twelve-case Slurm sweep, linked 3D designs, solver studio and saved history | [Engineering](engineering/README.md) | Revised 5:56 cut; source-linked editorial copy, corrected job timing and native panel sizing |

[`catalog.json`](catalog.json) is the machine-readable source map. Its paths are
relative to the repository root. A passing build or encoding check does not mean
the user approved a film's direction.

The plans, code, small recorded fixtures, skills, tests and dependency locks are
versioned. Rendered videos, browser caches, full attention tensors, tokenizer
directories and private source ZIPs stay local. Each project's guide explains
which local inputs are needed to regenerate it. Original published exports and
their checksums remain unchanged.

For a new transcript, follow the emulator's import path, then create a source-linked
project plan. Reuse the native components rather than cloning another example's
scientific story or focus gestures.
