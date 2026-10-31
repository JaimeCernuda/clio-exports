import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import { CollapsibleContent } from "@clio-ui/components/ui/collapsible";

/** Frame-derived openness for native thinking disclosures; absent outside replay. */
export const RecordedThinkingContext = createContext<
  ReadonlyMap<string, number>
>(new Map());

/** Keep the real native notification body mounted through an editorial disclosure. */
export function RecordedInjectionContent({
  disclosureKey,
  expanded,
  children,
}: {
  disclosureKey: string;
  expanded: boolean;
  children: ReactNode;
}) {
  const values = useContext(RecordedThinkingContext);
  const amount = values.get(disclosureKey);
  if (amount === undefined) return expanded ? <>{children}</> : null;
  // Match native disclosure lifetime once the animated close has finished.
  if (amount === 0)
    return (
      <div data-slot="recorded-injection-clip" data-openness="0" aria-hidden />
    );
  return (
    <div
      data-slot="recorded-injection-clip"
      data-openness={amount}
      aria-hidden={amount === 0 || undefined}
      style={{
        display: "grid",
        gridTemplateRows: `${amount}fr`,
        overflow: "hidden",
      }}
    >
      <div style={{ minHeight: 0, overflow: "hidden" }}>{children}</div>
    </div>
  );
}

/** Animate native thinking height without wall-clock CSS transitions or early unmounting. */
export function RecordedThinkingContent({
  disclosureKey,
  children,
}: {
  disclosureKey?: string;
  children: ReactNode;
}) {
  const values = useContext(RecordedThinkingContext);
  const openness = disclosureKey ? values.get(disclosureKey) : undefined;
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const passage = ref.current?.closest<HTMLElement>(
      '[data-slot="transcript-reasoning"]',
    );
    if (passage && openness !== undefined)
      passage.style.setProperty("--recorded-thinking-open", String(openness));
  }, [openness]);
  if (openness === undefined)
    return <CollapsibleContent>{children}</CollapsibleContent>;
  // Keep content throughout the close, then release hidden Markdown/code views.
  if (openness === 0)
    return (
      <div
        ref={ref}
        data-slot="recorded-thinking-clip"
        data-openness="0"
        aria-hidden
      />
    );
  return (
    <div
      ref={ref}
      data-slot="recorded-thinking-clip"
      data-openness={openness}
      aria-hidden={openness === 0 || undefined}
      style={{
        display: "grid",
        gridTemplateRows: `${openness}fr`,
        overflow: "hidden",
      }}
    >
      <div style={{ minHeight: 0, overflow: "hidden" }}>
        <CollapsibleContent forceMount style={{ animation: "none" }}>
          {children}
        </CollapsibleContent>
      </div>
    </div>
  );
}
