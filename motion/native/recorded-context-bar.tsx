import type { Session } from "@clio/core/v3";
import { GitBranchIcon } from "lucide-react";
import { AddIcon } from "@clio-ui/lib/icon-vocabulary";
import { Button } from "@clio-ui/components/ui/button";
import { ClioSessionActions } from "@clio-ui/components/clio/session-actions";
import { ClioDownloadsButton } from "@clio-ui/components/clio/downloads-button";

/**
 * Read-only presentation of CLIO's browser context bar and agent + control.
 * The archive has no pinned plugin resolution; keep its product affordance
 * without inventing agent metadata or enabling a live composition mutation.
 */
export function RecordedSessionContextBar({
  session,
  agentLabel,
  onOpenAgent,
  onExplainComposition,
  readonlyAction,
}: {
  session: Session;
  agentLabel: string;
  onOpenAgent: () => void;
  onExplainComposition: () => void;
  readonlyAction: () => Promise<never>;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 overflow-hidden">
      <div className="flex min-w-0 items-center gap-1.5">
        <h1 className="min-w-[4ch] shrink-[3] truncate text-sm font-medium">
          {session.title}
        </h1>
        <span aria-hidden="true" className="shrink-0 text-muted-foreground">
          /
        </span>
        <span className="flex min-w-0 shrink items-center gap-0.5">
          <Button
            aria-label={`Open agent ${agentLabel}`}
            className="h-7 min-w-0 max-w-full justify-start px-1.5 text-xs font-normal text-muted-foreground"
            onClick={onOpenAgent}
            size="xs"
            title={`Open agent ${agentLabel}`}
            variant="ghost"
          >
            <span className="min-w-[4ch] truncate">{agentLabel}</span>
          </Button>
          {!session.metadata?.agent_subagent && (
            <Button
              aria-label="Add a plugin to this conversation"
              aria-haspopup="dialog"
              className="max-sm:size-8"
              onClick={onExplainComposition}
              size="icon-xs"
              title="Add a plugin · recorded session"
              variant="ghost"
            >
              <AddIcon aria-hidden="true" />
            </Button>
          )}
        </span>
      </div>
      <span aria-hidden="true" className="h-4 w-px shrink-0 bg-border" />
      <ClioSessionActions
        disabled
        onCompact={readonlyAction}
        onShare={readonlyAction}
        onUndo={readonlyAction}
        title={session.title}
      />
      <ClioDownloadsButton />
      {session.branch ? (
        <span className="hidden items-center gap-1 font-mono text-[0.625rem] text-muted-foreground lg:flex">
          <GitBranchIcon aria-hidden="true" className="size-3" />
          {session.branch}
        </span>
      ) : null}
    </div>
  );
}
