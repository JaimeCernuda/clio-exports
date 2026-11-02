# CLIO UI source references

The film reconstructs source UI as editable DOM and vector components. It does not
import the application's service/runtime providers, and does not execute archived
tool calls. Source text is rendered as escaped React text, not executable HTML.

Inspected local source: `iowarp/gact-tui` at
`2692126d38a8c92b27fec750351aa3c85880de93`.

- `web/src/theme/themes.css`: light theme token values.
- `web/src/index.css`: Inter Variable and JetBrains Mono Variable font families.
- `web/src/components/ai-elements/message.tsx`: conversation composition.
- `web/src/components/clio/activity-row.tsx`: tool icon/title/detail hierarchy.
- `web/src/components/clio/subagent-card.tsx`: child identity, navigation and lifecycle semantics.
- `web/src/components/theokit/sub-agent-dispatch.tsx`: card structure, left accent,
  agent/model labels and state badge. That file also retains its upstream TheoKit
  source attribution; this reconstruction uses CLIO's general composition rather
  than copying that module's implementation.
- `iowarp/clio-agent/branding/clio/mark.svg`: unmodified CLIO brand asset.

MIT notice for reused CLIO source is retained in `GACT-LICENSE.txt`.
The three original motion skill documents are retained here as references. Their
method is adapted for Windows and native UI animation. The old suggestion that
React hooks can be called inside a fixed-length map is not followed; hooks remain
at component top level. Old scene choices and restrictive brand-layout defaults
are not mandatory art direction. Production timestamps remain separate from film
frames. Source UI may be deliberately reflowed and scaled for the shot.
