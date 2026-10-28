# CLIO UI component API

**Fidelity correction:** the kit described below was rejected as an accurate
CLIO reconstruction. Preserve it for its motion mechanisms. New conversation
work starts with [the production-component adapter](native/README.md) and
`native/workspace.tsx`. That path uses the actual shell, composer, conversation
rows, Markdown, saved A2UI views and artifact viewers. Do not render Tahoe through
`SourceText`: it cannot represent the saved conversation's block structure.
For editable native film components and frame-controlled layout, use
[FILM.md](native/FILM.md), `native/film.tsx` and `native/film-plan.ts`.

Import from `src/ui/index.ts`. The kit uses React, lucide SVG icons and CSS; it
imports no transcript, film copy, Remotion runtime, service provider or agent
client. It presents state supplied by its host. Choreography and optional
interaction belong to the host.

Import `src/ui/theme.css` once and give the containing surface `className="clio-ui"`.
Tokens and component rules are scoped to that class. Load Inter Variable and
JetBrains Mono Variable as `src/index.tsx` does. A normal React host needs no
Remotion. A Remotion host should pass its `Img` as `brandMark` so renders wait for
the SVG; other React hosts can use `brandMarkSrc`.

| Component | Inputs and reuse boundary |
| --- | --- |
| `ClioUIProvider` | Partial `UILabels`; nested providers inherit labels without changing sibling compositions |
| `WorkspaceChrome` | `sidebarWidth`, `agentCount`, `title`, children, optional `brandMark` or `brandMarkSrc` |
| `Composer` | Recorded `text`, `messageId`, independent style, `pressed`, `caret`, `controls`, `fontSize` |
| `ConversationMessage` | `role`, content, `messageId`, optional assistant label and style |
| `AgentCard` | Minimal `{id,name,agent}`, explicit `frame`, `ended`, independent style; optional compact mode and `status: {label,kind}` |
| `ActivityRow` | Recorded label/detail, `callId`, frame and explicit completion state |
| `Panel` | Independent style/bounds, optional title/icon, body style, source session/message IDs |
| `SourceText` | Escaped recorded text, `partId`, line limit; strips limited Markdown markers, not a full Markdown renderer |

`style` is ordinary React CSS geometry: width, position, opacity, clipping and
font size can change independently of other elements or the camera. Override
`style.position` when embedding an absolute component in a flow layout.
Provenance props become `data-source-session`, `data-source-message`,
`data-source-call` and `data-source-part`; retain them when isolating elements.
They link to evidence rather than reconnecting or executing a live run.

## Minimal Remotion host

```tsx
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {AgentCard, ClioUIProvider, WorkspaceChrome} from './ui';
import evidence from '../data/parallel-reading.json';

export function CapabilityShot() {
  const frame = useCurrentFrame();
  const agent = evidence.agents[0];
  return <ClioUIProvider><AbsoluteFill className="clio-ui">
    <WorkspaceChrome sidebarWidth={88} agentCount={evidence.agents.length}
      title={evidence.sessionTitle}
      brandMark={<Img src={staticFile('clio-mark.svg')} style={{width:43,height:43}}/>}>
      <AgentCard agent={agent} frame={frame} ended={agent.stopReason === 'end_turn'}
        style={{left:250,top:160,width:640,height:140}}/>
    </WorkspaceChrome>
  </AbsoluteFill></ClioUIProvider>;
}
```

Register the composition in `src/Root.tsx` with a literal ID/default props so
Studio can edit them. Agent `end_turn` or tool `completed` status is distinct
from task success. Never manufacture response text for unfinished children.
Use the explicit `status` override for paused/unknown recorded activity; a missing
terminal reply alone does not establish that a child is currently running.

## Working examples

`ComponentGallery.tsx` uses the same components and real evidence in overview
and activity-focused layouts. It is an internal workbench, not approved promo
copy. `Film.tsx` is one choreography with separate copy and major shot controls.
The compatibility entrypoint `src/components/NativeUI.tsx` re-exports the kit.

From `motion/`:

```text
npm run stills -- --composition ClioComponents --frames 240
npm run stills -- --composition ClioComponents --frames 240 --props examples/gallery-activity.json
npm run render -- --composition ClioComponents --scale 1 --output out/components.mp4
npm test
```

The props example changes panel widths, sidebar density and card placement; it
reflows the UI rather than cropping the overview. Each gallery still is named
with its composition ID to keep it separate from proof frames.

## Extension

Use the source visual vocabulary recorded in `references/SOURCE-REUSE.md`.
Generalize components when a real scene needs them; keep example-specific
evidence, copy and camera directions outside the shared module. New charts,
attached views or artifact widgets must use actual exported data. The kit does
not yet recreate those entire product surfaces.

Keep animation frame-driven in the host. Test labels, provenance, escaping and
determinism; render another layout; inspect transition frames and play a short
encoded cut. Tests do not approve promotional effectiveness.
