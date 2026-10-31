import { createContext, useContext, type ComponentProps } from "react";
import { CollapsibleContent } from "@clio-ui/components/ui/collapsible";
import { RecordedThinkingContext } from "./recorded-thinking";

export const StudyActivityKey = createContext<string | undefined>(undefined);

/** Keep native tool rows mounted during a frame-driven group collapse. */
export function StudyActivityContent({
  children,
  ...props
}: ComponentProps<typeof CollapsibleContent>) {
  const key = useContext(StudyActivityKey);
  const values = useContext(RecordedThinkingContext);
  const amount = key ? values.get(key) : undefined;
  if (amount === undefined)
    return <CollapsibleContent {...props}>{children}</CollapsibleContent>;
  if (amount === 0) return <div aria-hidden data-study-activity-open="0" />;
  return (
    <div
      data-study-activity-open={amount}
      style={{
        display: "grid",
        gridTemplateRows: `${amount}fr`,
        overflow: "hidden",
      }}
    >
      <div style={{ minHeight: 0, overflow: "hidden" }}>
        <CollapsibleContent {...props} forceMount style={{ animation: "none" }}>
          {children}
        </CollapsibleContent>
      </div>
    </div>
  );
}
