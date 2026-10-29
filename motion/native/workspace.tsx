import React, { useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ClioRepository,
  sessionSchema,
  type Artifact,
  type SessionReviewSnapshot,
} from "@clio/core/v3";
import {
  ChevronDownIcon,
  FolderGit2Icon,
  SearchIcon,
  ActivityIcon,
  SettingsIcon,
  ArchiveIcon,
} from "lucide-react";
import { ArchiveConnectionProvider } from "@clio-ui/providers/connection-provider";
import { RepositoryOverrideProvider } from "@clio-ui/providers/repository-override";
import {
  AppearanceProvider,
  useAppearancePreferences,
} from "@clio-ui/providers/appearance-provider";
import { useA2uiSessionRegistry } from "@clio-ui/lib/a2ui/processor-store";
import { RecordedSessionContextBar } from "./recorded-context-bar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@clio-ui/components/ui/dialog";
import { ClioMotionProvider } from "@clio-ui/components/clio/motion";
import { TooltipProvider } from "@clio-ui/components/ui/tooltip";
import { ClioAppShell } from "@clio-ui/components/clio/app-shell";
import { BrandIcon } from "@clio-ui/components/clio/brand-icon";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@clio-ui/components/ui/sidebar";
import { ArchiveTransport } from "@clio-ui/lib/session-export/archive-transport";
import {
  ArchiveConversation,
  type ArchiveTranscriptView,
} from "@clio-ui/lib/session-export/archive-conversation";
import { ArtifactView } from "@clio-ui/components/clio/resource-viewers";
import { ClioComposer } from "@clio-ui/components/clio/composer";
import { conversationTurns, messagesForTurn } from "./scene-selection";
import "./styles.css";

export type NativeScene = {
  schema: string;
  source: { archive: string; sha256: string };
  session: {
    id: string;
    workspace_id: string;
    title: string;
    metadata?: Record<string, unknown>;
    status: string;
    agent: { id: string };
    model: { provider_id: string; model_id: string };
  };
  view: ArchiveTranscriptView;
  snapshot: SessionReviewSnapshot;
  coverage: {
    messages: number;
    tools: number;
    surfaces: number;
    artifacts: number;
  };
};

function BaselinePreferences() {
  const preferences = useAppearancePreferences();
  useEffect(() => {
    preferences.setTheme("light");
    preferences.setMotion("reduced");
  }, []);
  return null;
}

function SessionRegistry({ id }: { id: string }) {
  const ids = useMemo(() => [id], [id]);
  useA2uiSessionRegistry(ids);
  return null;
}

/** Share real archive transport and session catalog with isolated film components. */
export function NativeRecordedSession({
  scene,
  children,
}: {
  scene: NativeScene;
  children: React.ReactNode;
}) {
  const repository = useMemo(
    () => new ClioRepository(new ArchiveTransport(scene.snapshot)),
    [scene],
  );
  return (
    <RepositoryOverrideProvider repository={repository}>
      <SessionRegistry id={scene.session.id} />
      {children}
    </RepositoryOverrideProvider>
  );
}

function Navigation({
  scene,
  onHome,
}: {
  scene: NativeScene;
  onHome: () => void;
}) {
  return (
    <Sidebar collapsible="icon" contained>
      <nav
        aria-label="Workspace navigation"
        className="flex h-full min-w-0 flex-1 flex-col"
      >
        <SidebarHeader className="gap-1 px-2 pb-2 pt-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                aria-label="CLIO recorded session"
                className="h-10 gap-2"
                size="lg"
                onClick={onHome}
              >
                <span className="grid size-6 shrink-0 place-items-center text-primary">
                  <BrandIcon className="size-5" label="CLIO" />
                </span>
                <span className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="font-semibold">CLIO</span>
                  <span className="text-[11px] text-muted-foreground">
                    Recorded session
                  </span>
                </span>
                <ChevronDownIcon
                  aria-hidden="true"
                  className="size-3.5 group-data-[collapsible=icon]:hidden"
                />
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton disabled aria-label="Search" tooltip="Search">
                <SearchIcon aria-hidden="true" />
                <span className="truncate group-data-[collapsible=icon]:hidden">
                  Search
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspaces</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onHome}
                  aria-label={scene.session.workspace_id}
                  tooltip={scene.session.workspace_id}
                >
                  <FolderGit2Icon aria-hidden="true" />
                  <span className="truncate group-data-[collapsible=icon]:hidden">
                    {scene.session.workspace_id}
                  </span>
                </SidebarMenuButton>
                <SidebarMenu className="ml-2 group-data-[collapsible=icon]:hidden">
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive onClick={onHome}>
                      <span className="truncate">{scene.session.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="gap-0 px-2 pb-2">
          <SidebarGroupLabel>Explore</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton disabled aria-label="Runs" tooltip="Runs">
                <ActivityIcon aria-hidden="true" />
                <span className="group-data-[collapsible=icon]:hidden">
                  Runs
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                disabled
                aria-label="Settings"
                tooltip="Settings"
              >
                <SettingsIcon aria-hidden="true" />
                <span className="group-data-[collapsible=icon]:hidden">
                  Settings
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </nav>
    </Sidebar>
  );
}

/** Production CLIO rows and shell; the only transport reads saved archive responses. */
export function NativeWorkspace({
  scene,
  initialExchange = -1,
  initialTurnId,
  reviewControls = true,
  reviewActions,
}: {
  scene: NativeScene;
  initialExchange?: number;
  initialTurnId?: string;
  reviewControls?: boolean;
  reviewActions?: React.ReactNode;
}) {
  const turns = useMemo(() => conversationTurns(scene.view.messages), [scene]);
  const [turnId, setTurnId] = useState(
    () =>
      initialTurnId ??
      (initialExchange < 0 ? "" : (turns[initialExchange]?.id ?? "")),
  );
  const [notice, setNotice] = useState("");
  const session = useMemo(
    () =>
      sessionSchema.parse({
        ...scene.session,
        state: scene.session.status,
        provider_id: scene.session.model.provider_id,
        model_id: scene.session.model.model_id,
        agent_id: scene.session.agent.id,
      }),
    [scene],
  );
  const [opened, setOpened] = useState<Artifact>();
  const repository = useMemo(
    () => new ClioRepository(new ArchiveTransport(scene.snapshot)),
    [scene],
  );
  const view = useMemo(
    () => ({
      ...scene.view,
      messages: messagesForTurn(scene.view.messages, turnId),
    }),
    [scene, turnId],
  );
  const [draft, setDraft] = useState("");
  const onHome = () => {
    setTurnId("");
    setOpened(undefined);
  };
  const readonlySubmit = async () => {
    throw new Error(
      "This is a recorded conversation; no live agent is connected.",
    );
  };
  return (
    <RepositoryOverrideProvider repository={repository}>
      <SessionRegistry id={scene.session.id} />
      <div className="flex h-dvh w-full flex-col bg-background text-foreground">
        {reviewControls && (
          <div className="flex h-9 shrink-0 items-center gap-3 overflow-x-auto border-b bg-card px-2 text-xs">
            <span className="mr-3 text-muted-foreground">
              Fidelity review controls
            </span>
            {reviewActions}
            <label className="flex min-w-0 items-center gap-2">
              <span className="shrink-0">Turn</span>
              <select
                aria-label="Conversation turn"
                className="h-7 max-w-72 truncate rounded-md border bg-background px-2"
                value={turnId}
                onChange={(event) => {
                  setTurnId(event.target.value);
                  setOpened(undefined);
                }}
              >
                <option value="">All messages</option>
                {turns.map((turn) => (
                  <option key={turn.id} value={turn.id}>
                    {turn.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        <div className="min-h-0 flex-1">
          <ClioAppShell
            navigation={<Navigation scene={scene} onHome={onHome} />}
            contextBar={
              <RecordedSessionContextBar
                session={session}
                agentLabel={scene.session.agent.id}
                readonlyAction={readonlySubmit}
                onOpenAgent={() =>
                  setNotice(
                    "The agent configuration was not captured in this export.",
                  )
                }
                onExplainComposition={() =>
                  setNotice(
                    "In CLIO, + adds a plugin to this conversation’s agent. This recorded session is read-only.",
                  )
                }
              />
            }
            workbench={
              opened ? (
                <ArtifactView
                  artifact={opened}
                  workspaceId={scene.session.workspace_id}
                  files={[]}
                  onOpenArtifact={setOpened}
                />
              ) : null
            }
            workbenchRevealKey={opened?.id}
            statusStrip={
              <div className="flex h-full items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ArchiveIcon className="size-3" />
                  Recorded · {scene.coverage.messages} messages ·{" "}
                  {scene.coverage.tools} tool records
                </span>
                <span>
                  Native CLIO renderer · source{" "}
                  {scene.source.sha256.slice(0, 12)}
                </span>
              </div>
            }
          >
            <div className="relative flex h-full min-h-0 flex-col">
              <div
                key={turnId}
                className="clio-scrollbar min-h-0 flex-1 overflow-y-auto pb-40 pt-5"
                aria-label="Conversation"
                role="log"
              >
                <div className="mx-auto w-full max-w-4xl">
                  <ArchiveConversation
                    sessionId={scene.session.id}
                    metadata={scene.session.metadata}
                    view={view}
                    snapshot={scene.snapshot}
                    onOpenArtifact={setOpened}
                    onOpenFile={(path) =>
                      setNotice(`This workspace file was not captured: ${path}`)
                    }
                  />
                </div>
              </div>
              <div className="pointer-events-none absolute inset-0 z-20 flex min-h-0 flex-col justify-end">
                <ClioComposer
                  disabled
                  state={session.state}
                  confirmationPolicy={
                    session.approval_mode === "unknown"
                      ? undefined
                      : session.approval_mode
                  }
                  attachments={false}
                  contextReferences={false}
                  provider={scene.session.model.provider_id}
                  model={scene.session.model.model_id}
                  modelOptions={[
                    {
                      providerId: scene.session.model.provider_id,
                      providerName: scene.session.model.provider_id,
                      id: scene.session.model.model_id,
                      label: scene.session.model.model_id,
                      available: true,
                    },
                  ]}
                  value={draft}
                  onValueChange={setDraft}
                  onSubmit={readonlySubmit}
                  variant="docked"
                />
              </div>
            </div>
          </ClioAppShell>
        </div>
        <Dialog
          open={Boolean(notice)}
          onOpenChange={(open) => {
            if (!open) setNotice("");
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Recorded session</DialogTitle>
            </DialogHeader>
            <p>{notice}</p>
          </DialogContent>
        </Dialog>
      </div>
    </RepositoryOverrideProvider>
  );
}

/** Real CLIO providers with an isolated offline transport; no agent service is required. */
export function NativeProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <ArchiveConnectionProvider>
        <AppearanceProvider>
          <BaselinePreferences />
          <ClioMotionProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </ClioMotionProvider>
        </AppearanceProvider>
      </ArchiveConnectionProvider>
    </QueryClientProvider>
  );
}
