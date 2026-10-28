import React from "react";
import { Composition } from "remotion";
import { ClioProof } from "./Film";
import { FPS, FRAMES } from "./motion";
import { ComponentGallery } from "./ComponentGallery";

/** Named composition root so Studio can locate and persist editable default props. */
export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="ClioProof"
      component={ClioProof}
      width={1920}
      height={1080}
      fps={FPS}
      durationInFrames={FRAMES}
      defaultProps={{ cameraScale: 1, cameraX: 960, cameraY: 540 }}
    />
    <Composition
      id="ClioComponents"
      component={ComponentGallery}
      width={1920}
      height={1080}
      fps={60}
      durationInFrames={360}
      defaultProps={{ focus: "overview", cameraScale: 1 }}
    />
  </>
);
