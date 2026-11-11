# SPOTTER / OPAL campaign cut

The v2 investigation revision is specified in
[REVISION-PLAN.md](../../videos/spotter-opal/REVISION-PLAN.md), with exact sources
and pocket cues in [the generated ledger](../../videos/spotter-opal/investigation-v2.sources.json).
Its current output and review coverage are under `motion/out/spotter-v2/`.

**Historical v1 status: revision required.** The user reported incorrect SPOTTER stalls,
pointer disappearance and pointers beneath UI elements in the full cut. The
sequence below describes the intended story, not a claim that its synchronization
or cursor behavior is accepted. See the [lessons and open defects](../../.agents/skills/clio-videos/references/spotter-lessons.md)
and [review receipt](../evidence/spotter-opal-film-v1-review.json). No correction
of those reported defects is claimed by the historical receipt.

SPOTTER-AI is the subject. Use the approved transparent-logo opening, then one
continuous native workspace. The scientific task supplies real activity for the
reviewer; the film is about seeing and investigating an instruction in evidence.

1. Enable SPOTTER through the complete native security menu. Its tab opens before
   the first main-agent answer.
2. Replay the six-round investigation in source order. Both agents' thinking
   streams visibly. SPOTTER's real notifications expand, hold, and compact before
   its next recorded work. The right pocket alternates between scientific
   evidence, a growing reconstructed provenance graph, and native SPOTTER work.
   The primary prompts supply eighteen lookup-result packets, rather than actual
   main-agent tool calls. SPOTTER's seven tools retain their recorded identities.
3. SPOTTER raises its recorded danger alert and quarantine. This finding prompts
   the user's attention investigation; never put the investigation before it.
4. Return to the flagged answer, select `ANSWER: 73; MATCHES`, show the native
   selection menu and click Understand attention. Scroll to the real source heat.
   Words/Max is the default; token inspection remains optional. Return, exit
   attention, then repeat with `73`. Both source clocks pause through
   each gesture and return. Resume SPOTTER's recorded conclusion and close on its
   complete logo.

The actual run completes all six main answers before quarantine. Attention is
supporting evidence, not a stand-alone determination of poisoning. Keep the
native residual/unmapped coverage visible; do not invent SPOTTER model attention.

`native/spotter-film-plan.ts` owns editorial pace and the alert-bound insertion.
`native/attention-inspections.json` owns exact source spans and gesture timing.
The input exports, original bundle, source timestamps and source revisions stay
unchanged. The compact quarantine disclosure preserves its full recorded detail
under Finding details, and Lift quarantine remains disabled in this offline replay.

From `motion/`, with the OPAL native preview running on 3359:

```text
npm run render -- --composition SpotterLiveReviewProof --scale 1 --concurrency 3 --output out/spotter-live-review-v1.mp4
npm run render -- --composition SpotterAlertInspectionProof --scale 1 --concurrency 3 --output out/spotter-alert-inspections-v1.mp4
npm run render -- --composition SpotterOpalFilm --scale 1 --concurrency 3 --props examples/spotter-review.json --output out/spotter-v2/spotter-opal-investigation-v2.mp4
```

Render sequentially: the commands share the Remotion bundle and native build.
Do not rebuild native assets while a render is running. The full composition is
1280×720 at 60 fps. Its duration is derived from the source and the film plan.
Open the interactive native stage with `?mode=spotter&pair=opal-chainB-7795459.native.json&attention=chainB-7795459-attention.json&spotterFilm=1`.

Each filmed pointer has an explicit painted-frame marker. Native acknowledgement
waits for it, fonts and Markdown. Run `tsx scripts/audit-spotter-pointer.ts
out/spotter-v2/spotter-opal-investigation-v2.mp4.cursor.raw.json` against the completed
render's measured poses. This is a continuity check, not visual or editorial approval.
