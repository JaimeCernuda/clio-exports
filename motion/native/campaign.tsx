import { useEffect, useState } from "react";
import { BrandIcon } from "@clio-ui/components/clio/brand-icon";
import { NativeConversationReplay } from "./conversation-replay";
import type { NativeScene } from "./workspace";
import { campaignFrame, type CampaignCut } from "./campaign-plan";
import type { CampaignStory } from "./campaign-catalog";
import "./campaign.css";
import type { ReplayLayoutTrack } from "./replay-layout";

function BrandLockup() {
  return (
    <div className="campaign-lockup">
      <img
        className="campaign-ndp"
        src="./campaign/ndp-light.png"
        alt="National Data Platform"
      />
      <span className="campaign-plus">+</span>
      <div className="campaign-clio">
        <BrandIcon className="campaign-clio-mark" />
        <span>CLIO</span>
      </div>
    </div>
  );
}

/** Co-branded pitch and portrait treatment share the real, independently editable UI actors. */
export function NativeCampaignMovie({
  scene,
  frame,
  cut,
  layoutTrack,
  story,
}: {
  scene: NativeScene;
  story: CampaignStory;
  frame: number;
  cut: CampaignCut;
  layoutTrack?: ReplayLayoutTrack;
}) {
  const pose = campaignFrame(frame, cut, story),
    portrait = cut === "social";
  const [viewport, setViewport] = useState({
    width: innerWidth,
    height: innerHeight,
  });
  useEffect(() => {
    const resize = () =>
      setViewport({ width: innerWidth, height: innerHeight });
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const width = portrait ? 720 : 1280,
    height = portrait ? 1280 : 720;
  const scale = Math.min(viewport.width / width, viewport.height / height);
  return (
    <div className={`ndp-campaign ${portrait ? "ndp-social" : "ndp-pitch"}`}>
      <div
        className="campaign-native"
        style={{
          opacity: pose.nativeOpacity,
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: "0 0",
          left: (viewport.width - width * scale) / 2,
          top: (viewport.height - height * scale) / 2,
        }}
      >
        <NativeConversationReplay
          scene={scene}
          frame={pose.replayFrame}
          frames={pose.replayFrames}
          turns={pose.turns}
          edits={story.replay}
          workbench={story.workbench}
          focuses={
            portrait
              ? []
              : (story.focuses as import("./presentation-plan").FocusBeat[])
          }
          portrait={portrait}
          layoutTrack={layoutTrack}
        />
      </div>
      <div
        className="campaign-design"
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          left: (viewport.width - width * scale) / 2,
          top: (viewport.height - height * scale) / 2,
        }}
      >
        <div
          className="campaign-brand"
          style={{
            left: pose.brandLeft,
            top: pose.brandTop,
            transform: `scale(${pose.brandScale})`,
          }}
        >
          <BrandLockup />
        </div>
        <h1 className="campaign-hook" style={{ opacity: pose.introOpacity }}>
          {story.hook}
        </h1>
        <div
          className="campaign-closing"
          style={{ opacity: pose.outroOpacity }}
        >
          <h1>{story.closing}</h1>
          <div className="campaign-links">
            {story.links.map((link) => (
              <span key={link}>{link}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
