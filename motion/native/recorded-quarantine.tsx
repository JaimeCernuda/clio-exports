// Native gact-tui f333d67d spotter-quarantine-card.tsx; only import aliases adapted.
import { ShieldAlertIcon } from "lucide-react";
import { Badge } from "@clio-ui/components/ui/badge";
import { Button } from "@clio-ui/components/ui/button";

/** The quarantine a SPOTTER danger alert put on the session (``metadata.spotter_quarantine``). */
export interface SpotterQuarantine {
  title: string;
  detail: string;
  watcher_handle: string;
  raised_at?: string;
}

/**
 * Sits where the message box was while the session is in quarantine, like a request for
 * approval: what SPOTTER detected, then the person's two choices. Discuss opens SPOTTER's
 * conversation beside this one; Lift quarantine lets the session continue.
 */
export function SpotterQuarantineCard({
  quarantine,
  lifting,
  onDiscuss,
  onLift,
  compact = false,
}: {
  quarantine: SpotterQuarantine;
  lifting?: boolean;
  onDiscuss: () => void;
  onLift: () => void;
  compact?: boolean;
}) {
  return (
    <section
      aria-label="Session in quarantine"
      className="mb-2 rounded-lg border border-l-4 border-l-destructive bg-card px-4 py-3 text-sm"
      data-slot="spotter-quarantine"
      role="alert"
    >
      <header className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        <ShieldAlertIcon
          aria-hidden="true"
          className="size-3.5 shrink-0 text-destructive"
        />
        <span className="font-medium tracking-wide text-foreground">
          SPOTTER
        </span>
        <Badge variant="destructive">Danger</Badge>
        <span className="truncate">Session in quarantine</span>
      </header>
      <h3 className="mt-1.5 font-medium text-foreground">{quarantine.title}</h3>
      {compact && quarantine.detail ? (
        <p
          data-slot="spotter-quarantine-preview"
          className="mt-1 line-clamp-2 text-sm text-muted-foreground"
        >
          {quarantine.detail}
        </p>
      ) : null}
      {quarantine.detail && compact ? (
        <details className="mt-1 text-xs text-muted-foreground">
          <summary className="cursor-pointer">Finding details</summary>
          <p className="mt-2 whitespace-pre-wrap">{quarantine.detail}</p>
        </details>
      ) : quarantine.detail ? (
        <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
          {quarantine.detail}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">
        SPOTTER stopped this session. Discuss the finding with it, or lift the
        quarantine to continue.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={onDiscuss} size="sm" variant="outline">
          Discuss
        </Button>
        <Button
          disabled={lifting}
          onClick={onLift}
          size="sm"
          variant="destructive"
        >
          Lift quarantine
        </Button>
      </div>
    </section>
  );
}
