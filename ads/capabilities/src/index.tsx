import React from "react";
import { Composition, registerRoot } from "remotion";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import { films } from "./registry";
import { CapabilityFilm } from "./scenes";
function Root() {
  return (
    <>
      {films.map((f) => (
        <Composition
          key={f.id}
          id={`Clio-${f.id}`}
          component={CapabilityFilm}
          width={1920}
          height={1080}
          fps={60}
          durationInFrames={f.seconds * 60}
          defaultProps={{ id: f.id, review: false }}
        />
      ))}
    </>
  );
}
registerRoot(Root);
