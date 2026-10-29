# SPOTTER opening

SPOTTER-AI is the subject of this film. Its full logo appears first and remains
the largest mark. OPAL, CLIO and Flowcept support its investigation. All marks
sit directly on the warm film background, with no colored cards or borders.

Question: **Where did the poisoned answer come from?**

The animation retains the supplied sketch's relationships: OPAL data enters CLIO;
Flowcept records provenance; SPOTTER receives provenance and points toward CLIO
to inspect the agent, then traces back toward the input. The curved connection
and its moving signal run from SPOTTER to CLIO. This is an introductory schematic, not captured runtime
activity or proof that every research component has been qualified by this replay.

The [Argonne project page](https://www.anl.gov/genesis-mission/projects/spotter-ai-scientific-provenance-oriented-threat-tracing-and-attribution-for-genesis-workflows)
was read on 2026-10-28. Its research framing combines provenance and importance
signals to investigate suspicious influence, with OPAL as an initial setting.
The question is original copy; track/detect/trace reflects the page's three stages.
Attention intensity alone is not treated as an attack verdict.

Flowcept's role is also grounded in the
[SPOTTER telemetry repository](https://github.com/JaimeCernuda/spotter-telemetry),
which describes joining CLIO and inference telemetry in Flowcept MongoDB.

The OPAL and Flowcept PNGs from logos.zip retain their original alpha channels.
The complete SPOTTER source mark came from Downloads/spotter-logo.png. Both that
original and its separate transparent cutout are retained. The render uses
SpotterLogo.transparent.png with a real alpha channel. It needs no white-matte
blend or edge mask. This derivative is separate from the two-entry logos.zip
available on this machine. CLIO uses its existing vector mark, with its smaller
name below it to align the three supporting lockups.

Edit question, roles and paths in spotter-intro.json. Timing and route geometry
are in src/spotter-intro-plan.ts; components are in src/SpotterIntro.tsx.
SpotterIntro is the 8-second 1080p/60fps opening. SpotterOpeningProof adds a dissolve
into the native security menu and paired replay at 720p.

```text
npm run stills -- --composition SpotterIntro --frames 45,205,340,465
npm run render -- --composition SpotterIntro --scale 1 --output out/spotter-intro-v4.mp4
```

Original asset SHA-256:

- FlowceptLogo.png: 8867f53ff5d83cbc96b540367c06554ae5cdfa6726da63f0f5216dca4bcb97f8
- OpalLogo.png: cc976172846044b950f9b64c223548bc1f7411e78ff1aef3923f411b7eea775f
- SpotterLogo.png: 41dcb1c946c44ff6b75d5f35458bbfa893b4713e60eee91ab075c2183ff8874b
- SpotterLogo.transparent.png: 080846d832566514df59e6bb1e00ce9103b6713a02a644f2c314657b519016d2

The final film still needs genuine attention captures and editorial review.
