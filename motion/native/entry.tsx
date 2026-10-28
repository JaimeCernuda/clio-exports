import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  NativeProviders,
  NativeWorkspace,
  type NativeScene,
} from "./workspace";
import {
  conversationTurns,
  parseSceneCatalog,
  sceneAssetPath,
  type SceneCatalogEntry,
} from "./scene-selection";
import { NativeFilmViewer } from "./film";
import { campaignStory, type CampaignId } from "./campaign-catalog";

const query = new URLSearchParams(location.search);
const campaignId = query.get("campaign") ?? "tahoe";
const selectedCampaign = campaignStory(campaignId);
const sceneFile = query.get("scene") ?? selectedCampaign.sceneFile;

async function loadCatalog(): Promise<SceneCatalogEntry[]> {
  const response = await fetch("./scenes.json");
  if (response.status === 404) return [];
  if (!response.ok)
    throw new Error(`Scene catalog unavailable: ${response.status}`);
  return parseSceneCatalog(await response.json());
}

function App() {
  const [loaded, setLoaded] = useState<{
    scene: NativeScene;
    turnId: string;
    choices: SceneCatalogEntry[];
  }>();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void (async () => {
      if (
        query.get("mode") === "campaign" &&
        sceneFile !== selectedCampaign.sceneFile
      )
        throw new Error("The selected scene does not match this campaign");
      const path = sceneAssetPath(sceneFile);
      const [response, catalog] = await Promise.all([
        fetch(path),
        loadCatalog(),
      ]);
      if (!response.ok)
        throw new Error(
          `Native scene ${sceneFile} unavailable: ${response.status}`,
        );
      const scene: NativeScene = await response.json();
      if (scene.schema !== "clio.native-scene.v1")
        throw new Error("Unsupported native scene");
      const turns = conversationTurns(scene.view.messages);
      const legacyIndex = Number(query.get("exchange") ?? "-1");
      let turnId = query.get("turn") ?? "";
      if (!query.has("turn") && legacyIndex !== -1) {
        if (!Number.isInteger(legacyIndex) || !turns[legacyIndex])
          throw new Error(
            "The requested exchange is outside this recorded conversation",
          );
        turnId = turns[legacyIndex].id;
      }
      if (turnId && !turns.some((turn) => turn.id === turnId))
        throw new Error(`No recorded turn starts at ${turnId}`);
      const choices = catalog.some((entry) => entry.file === sceneFile)
        ? catalog
        : [
            ...catalog,
            {
              file: sceneFile,
              title: scene.session.title,
              sessionId: scene.session.id,
            },
          ];
      if (active) setLoaded({ scene, turnId, choices });
    })().catch((failure: unknown) => {
      if (active) setError(String(failure));
    });
    return () => {
      active = false;
    };
  }, []);
  if (error) return <p role="alert">{error}</p>;
  if (!loaded) return <p>Loading recorded conversation…</p>;
  if (query.get("mode") === "campaign") {
    const cut = query.get("cut") ?? "pitch";
    if (cut !== "pitch" && cut !== "social")
      return <p role="alert">Unknown campaign cut</p>;
    return (
      <NativeFilmViewer
        scene={loaded.scene}
        campaign
        cut={cut}
        campaignId={campaignId as CampaignId}
      />
    );
  }
  if (query.get("mode") === "film")
    return <NativeFilmViewer scene={loaded.scene} />;
  return (
    <NativeProviders
      key={`${loaded.scene.source.sha256}:${loaded.scene.session.id}`}
    >
      <NativeWorkspace
        scene={loaded.scene}
        initialTurnId={loaded.turnId}
        reviewControls={query.get("controls") !== "off"}
        reviewActions={
          <label className="flex min-w-0 items-center gap-2">
            <span className="shrink-0">Session</span>
            <select
              aria-label="Recorded session"
              className="h-7 max-w-64 truncate rounded-md border bg-background px-2"
              value={sceneFile}
              onChange={(event) => {
                const next = new URL(location.href);
                next.search = new URLSearchParams({
                  scene: event.target.value,
                }).toString();
                location.assign(next.href);
              }}
            >
              {loaded.choices.map((entry) => (
                <option key={entry.file} value={entry.file}>
                  {entry.title}
                </option>
              ))}
            </select>
          </label>
        }
      />
    </NativeProviders>
  );
}

const container = document.getElementById("root");
if (!container) throw new Error("The native review page has no root container");
const root = import.meta.hot?.data.root ?? createRoot(container);
if (import.meta.hot) import.meta.hot.data.root = root;
root.render(<App />);
