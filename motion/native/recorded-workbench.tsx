import type { ComponentType, ReactNode } from "react";
import {
  ClioWorkbench,
  type ClioWorkbenchProps,
} from "@clio-ui/components/clio/workbench";
import type { WorkbenchTab } from "@clio-ui/components/clio/workbench-shared";

export interface RecordedWorkbenchPresentation {
  tabs: WorkbenchTab[];
  activeTabId: string;
  content: ReactNode;
  maximized?: boolean;
  onTabChange?: (id: string) => void;
  onMaximizedChange?: (value: boolean) => void;
}

// The Vite adapter adds only a controlled state/content port. Production renders
// the complete header, icons, launcher, close affordances and maximize control.
const ControlledWorkbench = ClioWorkbench as ComponentType<
  ClioWorkbenchProps & { recordedPresentation: RecordedWorkbenchPresentation }
>;

/** Use CLIO's complete workbench chrome with deterministic recorded tab state. */
export function RecordedWorkbench({
  workspaceId,
  sessionId,
  presentation,
}: {
  workspaceId: string;
  sessionId: string;
  presentation: RecordedWorkbenchPresentation;
}) {
  return (
    <ControlledWorkbench
      workspaceId={workspaceId}
      sessionId={sessionId}
      files={[]}
      artifacts={[]}
      diffs={[]}
      sessionView={null}
      inStudy={presentation.tabs.some((tab) => tab.kind === "science-log")}
      onOpenSubagent={() => {
        throw new Error("No child selected in this recorded shot");
      }}
      onUndoDiff={async () => {
        throw new Error("Recorded workbench has no editable diff");
      }}
      recordedPresentation={presentation}
    />
  );
}
