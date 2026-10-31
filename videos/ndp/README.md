# NDP + CLIO

Three real scientific conversations drive this campaign: Lake Tahoe boundary
measurement, Alta snowfall and Konza burn observations. CLIO's work and interactive
outputs are the subject. Data-producer research is retained in
[`RESEARCH.md`](../../motion/story/RESEARCH.md).

| Cut | Composition | Editable plan | Recorded native scene |
| --- | --- | --- | --- |
| Tahoe | `NdpClioPitch` | `motion/native/campaign-story.json` | `motion/native/public/tahoe.native.json` |
| Alta | `NdpClioAlta` | `motion/native/campaigns/alta.json` | `motion/native/public/alta.native.json` |
| Konza | `NdpClioKonza` | `motion/native/campaigns/konza.json` | `motion/native/public/konza.native.json` |
| Combined | `NdpClioConnectedStory` | `motion/story/ndp-connected.json` | Moving actors generated from those three scenes |

Use the shared emulator's **default** UI pin from `motion/native/source.json`.
From the repository root, after the [common setup](../../motion/native/EMULATOR.md):

```powershell
node motion/native/run.mjs check --source '<clean-default-ui-checkout>'
node motion/native/run.mjs build --source '<clean-default-ui-checkout>'
node motion/native/run.mjs preview --source '<clean-default-ui-checkout>'
```

Keep that preview running on 3357. In another terminal:

```powershell
npm --prefix motion run campaign:pitch
npm --prefix motion run campaign:alta
npm --prefix motion run campaign:konza
```

For 1080p drafts from a 1280×720 native composition, pass `--scale 1.5` to the
render command. Inspect composition dimensions before choosing another scale.
For the combined edit, follow the exact actor/conform/assembly sequence in
[`motion/story/README.md`](../../motion/story/README.md). It needs its local source
movies or freshly regenerated actors; a code-only checkout does not contain MP4s.

Author new transcript events and inspections through
[`REPLAY.md`](../../motion/native/REPLAY.md). Its native ChoicePicker, slider,
linked-table and export tracks provide actual data interactions. Measured layout
and pointer tracks belong to their own source and timing; remeasure after edits.

The final full campaign was rejected for unnecessary full-screen selection,
an uninteresting map zoom and arbitrary text selection. Do not reuse those choices
as an approved template. The maintained technical code and the
[NDP lessons](../../.agents/skills/clio-videos/references/lessons.md) remain useful.
