import React, { useEffect } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  delayRender,
  continueRender,
} from "remotion";
import { capabilityScenes, useCampaignFonts } from "../../src/scenes";
import { WebsitePresentation, navy } from "../../src/kit";
import { getAsset, loopOpacity, sourceTime } from "./plan";

/** Render editable product pieces directly; advertisement bookends never enter this tree. */
export function WebsiteLoop({
  assetKey,
  review = false,
}: {
  assetKey: string;
  review?: boolean;
}) {
  useCampaignFonts();
  const asset = getAsset(assetKey),
    t = useCurrentFrame() / asset.fps,
    scale = asset.width / asset.crop.width;
  const Scene = capabilityScenes[asset.id];
  useEffect(() => {
    if (!review) return;
    const handle = delayRender("Measure website framing");
    document.fonts.ready.then(() =>
      requestAnimationFrame(() => {
        const elements = [...document.querySelectorAll("[data-review]")]
          .map((el) => {
            const r = el.getBoundingClientRect();
            let opacity = 1;
            for (let p: Element | null = el; p; p = p.parentElement)
              opacity *= Number(getComputedStyle(p).opacity);
            return {
              kind: el.getAttribute("data-review"),
              text: el.textContent?.slice(0, 90),
              x: r.x,
              y: r.y,
              width: r.width,
              height: r.height,
              opacity,
            };
          })
          .filter((r) => r.opacity > 0.8);
        console.log(
          "__WEBSITE__" +
            JSON.stringify({
              key: asset.key,
              t,
              sourceTime: sourceTime(asset, t),
              elements,
            }),
        );
        continueRender(handle);
      }),
    );
  }, [asset, t, review]);
  return (
    <AbsoluteFill
      style={{
        background: "#fbfdfd",
        color: navy,
        fontFamily: '"Inter Variable",sans-serif',
        overflow: "hidden",
      }}
    >
      <WebsitePresentation.Provider value={true}>
        <div
          style={{
            position: "absolute",
            left: -asset.crop.x * scale,
            top: -asset.crop.y * scale,
            width: 1920,
            height: 1080,
            transform: `scale(${scale})`,
            transformOrigin: "0 0",
            opacity: loopOpacity(asset, t),
          }}
        >
          <Scene t={sourceTime(asset, t)} />
        </div>
      </WebsitePresentation.Provider>
    </AbsoluteFill>
  );
}
