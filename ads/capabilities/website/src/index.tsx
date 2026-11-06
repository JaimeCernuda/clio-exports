import React from "react";
import { Composition, registerRoot } from "remotion";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import { assets } from "./plan";
import { scenes } from "../generated-scenes";
function Root() {
  return (
    <>
      {assets.map((asset) => (
        <Composition
          key={asset.key}
          id={`Website-${asset.key}`}
          component={scenes[asset.key]}
          width={asset.width}
          height={asset.height}
          fps={asset.fps}
          durationInFrames={asset.frames}
          defaultProps={{ review: false }}
        />
      ))}
    </>
  );
}
registerRoot(Root);
