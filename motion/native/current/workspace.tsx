import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ClioRepository,
  sessionSchema,
  artifactSchema,
  a2uiSurfaceSchema,
  type SessionReviewSnapshot,
} from "@clio/core/v3";
import { ArchiveConnectionProvider } from "@clio-ui/providers/connection-provider";
import { RepositoryOverrideProvider } from "@clio-ui/providers/repository-override";
import {
  AppearanceProvider,
  useAppearancePreferences,
} from "@clio-ui/providers/appearance-provider";
import { ConversationDisplayProvider } from "@clio-ui/providers/conversation-display-provider";
import { ArchiveTransport } from "@clio-ui/lib/session-export/archive-transport";
import { ArchiveConversation } from "@clio-ui/lib/session-export/archive-conversation";
import { useA2uiSessionRegistry } from "@clio-ui/lib/a2ui/processor-store";
import { ClioMotionProvider } from "@clio-ui/components/clio/motion";
import { TooltipProvider } from "@clio-ui/components/ui/tooltip";
import { ClioAppShell } from "@clio-ui/components/clio/app-shell";
import { ClioSessionContextBar } from "@clio-ui/components/clio/session-context-bar";
import { BrandIcon } from "@clio-ui/components/clio/brand-icon";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@clio-ui/components/ui/sidebar";
import { ClioComposer } from "@clio-ui/components/clio/composer";
import {
  ClioWorkbench,
  type ClioWorkbenchHandle,
  type ClioWorkbenchOpenRequest,
} from "@clio-ui/components/clio/workbench";
import { ClioA2UISurface } from "@clio-ui/components/clio/a2ui-surface";
import { FrameTab } from "@clio-ui/components/clio/primitives/frame-bar";
import { IconButton } from "@clio-ui/components/clio/primitives/icon-button";
import { WorkbenchStrip } from "@clio-ui/components/clio/workbench-strip";
import {
  FolderIcon,
  ActivityIcon,
  MapIcon,
  ChartNoAxesCombinedIcon,
  Maximize2Icon,
  Minimize2Icon,
} from "lucide-react";
import {
  demoAt,
  demoPlan,
  demoPocket,
  recordedNowAt,
  type DemoScene,
  type DemoSpec,
} from "./demo-model";
import { RecordedClock } from "./replay-clock";

const unavailable = async (): Promise<never> => {
  throw new Error("This recorded demo has no live agent connection.");
};
function Preferences() {
  const p = useAppearancePreferences();
  useLayoutEffect(() => {
    p.setTheme("light");
    p.setMotion("reduced");
  }, []);
  return null;
}

/** Use the current production providers and immutable archive transport on an isolated origin. */
export function CurrentProviders({
  scene,
  children,
}: {
  scene: DemoScene;
  children: ReactNode;
}) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  const repository = useMemo(
    () =>
      new ClioRepository(
        new ArchiveTransport(scene.snapshot as SessionReviewSnapshot, {
          views: { [scene.session.id]: scene.view },
        }),
      ),
    [scene],
  );
  return (
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <ArchiveConnectionProvider>
          <RepositoryOverrideProvider repository={repository}>
            <AppearanceProvider>
              <Preferences />
              <ConversationDisplayProvider>
                <ClioMotionProvider>
                  <TooltipProvider>{children}</TooltipProvider>
                </ClioMotionProvider>
              </ConversationDisplayProvider>
            </AppearanceProvider>
          </RepositoryOverrideProvider>
        </ArchiveConnectionProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

function Registry({ id }: { id: string }) {
  const ids = useMemo(() => [id], [id]);
  useA2uiSessionRegistry(ids);
  return null;
}

/** Native RC1 tabs and strip surround independently editable, source-linked result views. */
function ResultPocket({
  scene,
  spec,
  frame,
  plan,
}: {
  scene: DemoScene;
  spec: DemoSpec;
  frame: number;
  plan: ReturnType<typeof demoPlan>;
}) {
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set());
  const panes = demoPocket(spec, plan, frame).filter(
    (p) => !closed.has(p.surfaceId),
  );
  const [choice, setChoice] = useState<string>();
  const active = panes.find((p) => p.surfaceId === choice) ?? panes.at(-1);
  const [maximized, setMaximized] = useState(false);
  const [builtin, setBuiltin] = useState<ClioWorkbenchOpenRequest>();
  const lastFrame = useRef(frame);
  useLayoutEffect(() => {
    if (frame < lastFrame.current) {
      setChoice(undefined);
      setBuiltin(undefined);
      setMaximized(false);
      setClosed(new Set());
    }
    lastFrame.current = frame;
  }, [frame]);
  const previous = useRef(active?.surfaceId);
  useEffect(() => {
    if (active?.surfaceId !== previous.current) {
      previous.current = active?.surfaceId;
      setBuiltin(undefined);
    }
  }, [active?.surfaceId]);
  const control = useRef<ClioWorkbenchHandle>(null);
  const projection = demoAt(scene, plan, frame);
  if (builtin || !active)
    return (
      <ClioWorkbench
        ref={control}
        workspaceId={scene.session.workspace_id}
        sessionId={scene.session.id}
        files={[]}
        filesError="A workspace file listing was not captured in this export."
        artifacts={projection.view.artifacts.map((a) =>
          artifactSchema.parse(a),
        )}
        diffs={[]}
        sessionView={null}
        requestedOpen={
          builtin
            ? { key: JSON.stringify(builtin), request: builtin }
            : undefined
        }
        onOpenSubagent={unavailable}
        onUndoDiff={unavailable}
      />
    );
  const surface = scene.view.surfaces.find((s) => s.id === active.surfaceId)!;
  return (
    <aside
      aria-label="Workspace canvas"
      data-workbench-pocket=""
      data-current-surface={active.surfaceId}
      className="relative flex h-full min-w-0 bg-background"
      style={
        maximized ? { position: "fixed", inset: 0, zIndex: 80 } : undefined
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div
          role="tablist"
          aria-label="Result views"
          className="flex h-10 shrink-0 items-stretch overflow-x-auto border-b"
        >
          {panes.map((p) => (
            <FrameTab
              key={p.surfaceId}
              label={p.label}
              icon={
                p.surfaceId.includes("map") ? (
                  <MapIcon className="size-3.5" />
                ) : (
                  <ChartNoAxesCombinedIcon className="size-3.5" />
                )
              }
              active={p.surfaceId === active.surfaceId}
              onSelect={() => setChoice(p.surfaceId)}
              onClose={() =>
                setClosed((previous) => new Set([...previous, p.surfaceId]))
              }
            />
          ))}
          <div className="ml-auto flex items-center">
            <IconButton
              label={
                maximized
                  ? "Restore canvas beside conversation"
                  : "Maximize canvas"
              }
              icon={maximized ? <Minimize2Icon /> : <Maximize2Icon />}
              onClick={() => setMaximized((v) => !v)}
            />
          </div>
        </div>
        <div
          className="clio-scrollbar min-h-0 flex-1 overflow-auto"
          data-current-pocket-body=""
        >
          <ClioA2UISurface surface={a2uiSurfaceSchema.parse(surface)} />
        </div>
      </div>
      <WorkbenchStrip
        items={[
          { id: "files", label: "Files", icon: <FolderIcon />, pressed: false },
          {
            id: "activity",
            label: "Activity",
            icon: <ActivityIcon />,
            pressed: false,
          },
        ]}
        onSelect={(id) =>
          setBuiltin(
            id === "files"
              ? { kind: "resources", section: "files" }
              : { kind: "session" },
          )
        }
      />
    </aside>
  );
}

/** Reflow the production shell, composer and transcript around the frame-projected recorded session. */
export function CurrentWorkspace({
  scene,
  spec,
  frame,
}: {
  scene: DemoScene;
  spec: DemoSpec;
  frame: number;
}) {
  const plan = useMemo(() => demoPlan(spec, scene), [scene, spec]);
  const projection = useMemo(
    () => demoAt(scene, plan, frame),
    [scene, plan, frame],
  );
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
  const scroll = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState<ClioWorkbenchOpenRequest>();
  const workbench = useRef<ClioWorkbenchHandle>(null);
  useLayoutEffect(() => {
    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [frame]);
  useEffect(() => {
    const log = scroll.current;
    const content = log?.firstElementChild;
    if (!log || !content) return;
    const observer = new ResizeObserver(() => {
      log.scrollTop = log.scrollHeight;
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);
  const openArtifact = (artifact: ReturnType<typeof artifactSchema.parse>) =>
    setOpened({ kind: "artifact", artifact });
  return (
    <RecordedClock.Provider value={recordedNowAt(scene, plan, frame)}>
      <Registry id={session.id} />
      <ClioAppShell
        navigation={
          <Sidebar collapsible="icon">
            <SidebarHeader>
              <div className="flex h-10 items-center gap-2 px-2">
                <BrandIcon className="size-5" />
                <span className="font-semibold">CLIO</span>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive title={session.title}>
                    <FolderIcon />
                    <span className="truncate">{session.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
        }
        contextBar={
          <ClioSessionContextBar
            session={session}
            actionsPending={false}
            onCompact={unavailable}
            onFork={unavailable}
            onShare={unavailable}
            onUndo={unavailable}
            onReturnToParent={unavailable}
          />
        }
        statusStrip={null}
        workbench={
          opened ? (
            <ClioWorkbench
              ref={workbench}
              workspaceId={session.workspace_id}
              sessionId={session.id}
              files={[]}
              filesError="Workspace files were not captured."
              artifacts={projection.view.artifacts.map((a) =>
                artifactSchema.parse(a),
              )}
              diffs={[]}
              sessionView={null}
              requestedOpen={{ key: JSON.stringify(opened), request: opened }}
              onOpenSubagent={unavailable}
              onUndoDiff={unavailable}
            />
          ) : demoPocket(spec, plan, frame).length ? (
            <ResultPocket scene={scene} spec={spec} frame={frame} plan={plan} />
          ) : null
        }
        workbenchRevealKey={
          opened
            ? JSON.stringify(opened)
            : demoPocket(spec, plan, frame).at(-1)?.surfaceId
        }
      >
        <div className="relative flex h-full min-h-0 flex-col">
          <div
            className="current-demo-log clio-scrollbar flex-1"
            role="log"
            aria-label="Conversation"
            ref={scroll}
          >
            <div className="mx-auto w-full max-w-4xl px-6 pt-6 pb-8">
              <ArchiveConversation
                sessionId={session.id}
                metadata={scene.session.metadata}
                view={projection.view}
                snapshot={scene.snapshot as SessionReviewSnapshot}
                onOpenArtifact={openArtifact}
                onOpenFile={(path) =>
                  setOpened({ kind: "workspace-file", path })
                }
              />
            </div>
          </div>
          <ClioComposer
            disabled
            state={frame < plan.frames ? "running" : session.state}
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
            value={projection.draft}
            onSubmit={unavailable}
            variant="docked"
          />
        </div>
      </ClioAppShell>
    </RecordedClock.Provider>
  );
}
