import React, { useState, useEffect } from "react";
import { useCurrentFrame, delayRender, continueRender } from "remotion";
import { getFilm, type FilmId } from "./registry";
import { Stage } from "./kit";
import { MethodScene } from "../films/01-method/scene";
import { HypothesisScene } from "../films/02-hypothesis/scene";
import { TeamScene } from "../films/03-team/scene";
import { InterfaceScene } from "../films/04-interface/scene";
import { ProvenanceScene } from "../films/05-provenance/scene";
import { ToolsScene } from "../films/06-tools/scene";
import { SelectionScene } from "../films/07-selection/scene";
import { StreamsScene } from "../films/08-streams/scene";
export const capabilityScenes = {
  method: MethodScene,
  hypothesis: HypothesisScene,
  team: TeamScene,
  interface: InterfaceScene,
  provenance: ProvenanceScene,
  tools: ToolsScene,
  selection: SelectionScene,
  streams: StreamsScene,
};

/** Wait for the shared fonts in both advertisement and website compositions. */
export function useCampaignFonts(): void {
  const [fontHandle] = useState(() => delayRender("Load campaign fonts"));
  useEffect(() => {
    Promise.all([
      document.fonts.load('650 42px "Inter Variable"'),
      document.fonts.load('450 25px "JetBrains Mono Variable"'),
      document.fonts.ready,
    ]).then(() => continueRender(fontHandle));
  }, [fontHandle]);
}
export function CapabilityFilm({
  id,
  review = false,
}: {
  id: FilmId;
  review?: boolean;
}) {
  useCampaignFonts();
  const t = useCurrentFrame() / 60,
    film = getFilm(id);
  const Scene = capabilityScenes[id];
  useEffect(() => {
    if (!review) return;
    const measureHandle = delayRender("Measure campaign geometry");
    document.fonts.ready.then(() =>
      requestAnimationFrame(() => {
        const elements = [...document.querySelectorAll("[data-review]")]
          .map((element) => {
            const b = element.getBoundingClientRect();
            let opacity = 1;
            for (let p: Element | null = element; p; p = p.parentElement)
              opacity *= Number(getComputedStyle(p).opacity);
            return {
              kind: element.getAttribute("data-review"),
              text: element.textContent?.slice(0, 100),
              x: b.x,
              y: b.y,
              width: b.width,
              height: b.height,
              opacity,
            };
          })
          .filter((r) => r.opacity > 0.8);
        console.log("__REVIEW__" + JSON.stringify({ id, t, elements }));
        continueRender(measureHandle);
      }),
    );
  }, [id, t, review]);
  return (
    <Stage film={film} t={t}>
      <Scene t={t} />
    </Stage>
  );
}
