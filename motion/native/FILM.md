# Native CLIO product cut

This is an earlier rendering reference. For new film decisions, read
[clio-videos](../../.agents/skills/clio-videos/SKILL.md); the later NDP full edit
also received negative creative feedback and is not an approved template.

`ClioNativePromo` is a 108-second, 60 fps Remotion composition. It renders the
editable native React stage in `narrative.tsx`; panels, questions, tool rows, composer,
map and chart remain independent DOM/UI components. There are no screenshot
backgrounds or movie clips standing in for the interface.

The story is an investigation viewers can follow: CLIO finds a source, explains
its method, inspects metadata, calculates, creates the map, then uses the same
evidence for a follow-up. Recorded thought passages, terminal results and actual
widget-generation calls connect the question to its result. The earlier 26-second
cut proved rendering but skipped those connections. ZIP packaging is omitted, per the
user's direction. The original source export and complete prepared scene remain
unchanged. This cut makes no elapsed-time or newly rerun scientific claim.

## Story beats

| Time | Recorded work |
| --- | --- |
| 0–5 s | Ask the real area question |
| 5–11 s | Search NDP, open the selected dataset and its actual resource choices |
| 11–23 s | Read CLIO's plan to inspect the source and cross-check two methods |
| 23–30 s | Show a recorded thought and publisher metadata |
| 30–38 s | Run the calculation; inspect geometry checks and both area values |
| 38–45 s | Generate the map widget, then reveal the map |
| 45–56 s | Read the area result alongside the captured method figure |
| 56–62 s | Ask the real shoreline follow-up |
| 62–74 s | Explain how the same saved boundary will be tested |
| 74–83 s | Show the closing-edge check and actual ten-setting output |
| 83–90 s | Read the chart spec, generate the chart widget, then reveal it |
| 90–104 s | Interpret the numbers and compare the captured shoreline detail panels |
| 104–108 s | Hold the practical takeaway and CLIO identity |

## Render

Use the pinned gact-tui setup in `README.md`. In `motion/`:

```text
npm run native:build -- --source <pinned-gact-tui-checkout>
node native/run.mjs preview --source <pinned-gact-tui-checkout>
```

Keep that local server running. In another terminal:

```text
node render.mjs stills --composition ClioNativePromo --frames 500,1000,1550,2000,2500,3000,4000,4700,5250,6000,6479 --scale 1
npm run promo:render -- --concurrency 2
```

The requested deliverable is 1920 x 1080; a 4K final is not needed. The named
`promo:render` command defaults to scale 1. An explicit `--scale 2` on
`node render.mjs video` remains available for other work. Text and the film's SVG chart are rendered at output
resolution. The map renderer receives a corresponding pixel ratio; the reference
map is a cached 2560 x 2304 PNG. Preview `/?mode=film&frame=2500`, or use its Play
and frame controls. `&render=1` hides those controls.

## Time and native rendering

`film-plan.ts` computes every pose and text prefix from frame. `film-story.json`
holds the contiguous stage timing, source identities, text-excerpt anchors,
short captions and editorial omissions. `NativeProductFilm.tsx`
provides the Remotion frame bridge: it posts an explicit frame/nonce to the native
stage and releases `delayRender` only after the matching painted frame is ready.
The stage waits for fonts, images, actual loaded map geometry/reference imagery,
the chart and both native image views. A loading error aborts the capture rather than encoding a blank view.
This requires the native server, not an LLM or running CLIO/NDP service.

The browser preview's Play control uses a wall clock solely to select frames.
Rendering uses explicit frame messages. Preview controls and diagnostic state are
outside the film. Native CSS animations/caret clocks are disabled in the stage.

The native chart selects the recorded `length` component from the saved
chart/table surface and changes plot height for the shot. All ten rows, data URI,
transforms, scales and plotted values remain recorded. Film mode uses the native
Vega SVG renderer so zooming does not enlarge a low-resolution chart canvas.
The ordinary conversation preview retains its default renderer.

The composer types the exact recorded questions. Native user/assistant rows,
thinking passages and tool components render selected real records. Thought
excerpts come from the supplied archive, with their original message/part IDs.
They are not newly written agent thoughts. Terminal panels select recorded output
ranges, omitting install warnings, unneeded coordinates and long commands. The
geometry check and equal-area/geodesic excerpts belong to the same recorded run.
The real dataset row and selected resource IDs match the recorded connection.

Production/disclosure notes, duplicate source-credit strips and token-usage
footers are absent from the film. The source's scientific qualifications remain
in the native conversation and captured figures. Source selection and editorial
timing are documented here rather than interrupting the narrative.

## Map background

The archive's Natural Earth world outline has little local detail at Tahoe's
scale. `map-context.ts` adds a georeferenced cached USGS reference image beneath
the scientific geometry. It does not change the captured lake boundary.

The cache is from [USGS The National Map](https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer).
Its request, returned extent, dimensions, retrieval time and SHA-256 are in
`map-context/tahoe-usgs.json`. Returned EPSG:3857 corners are converted to geographic
coordinates, including the service's aspect-ratio adjustment. The PNG lives in
`public/map-context/`; all film renders use those local bytes. Attribution stays
on the map. This is added presentation context, not newly
collected scientific evidence or a claim about today's shoreline.

`uv run python tools/cache_map_context.py` from the repository root regenerates
this Tahoe cache from the official public service. Review any replacement image
and its geography before rendering. Source exports/checksums are never rewritten.

## Reuse and review

Other session exports use the importer/catalog documented in `README.md`.
Another film selects its own source IDs and shot design; an unrelated session
does not acquire a Tahoe map/story automatically. Keep production components and
the frame bridge; adapt the actor selection/layout/copy to the capability shown.

Inspect settled shots and transition frames, then play the encoded cut. Verify
the final with `tools/verify_video.py`, expecting 6480 frames, 60 fps and the chosen
output dimensions. This cut is silent. Encoding and source checks do not approve
creative taste or pacing.

The native composition defaults to Chromium ANGLE for hardware rendering;
`DEMO_GL=swangle` selects the software fallback. Recheck actual map/chart output
when changing the rendering backend. Other legacy compositions retain their
software default.
