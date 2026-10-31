import { Composition, registerRoot } from "remotion";
import { NativeProductFilm } from "./NativeProductFilm";

function WordleCompositions() {
  return (
    <>
      <Composition
        id="WordleStudyOpeningReview"
        component={NativeProductFilm}
        width={1280}
        height={720}
        fps={60}
        durationInFrames={2880}
        defaultProps={{
          nativeServer: "http://127.0.0.1:3361",
          mode: "study",
          cut: "pitch",
        }}
      />
      <Composition
        id="WordleStudyProof"
        component={NativeProductFilm}
        width={1280}
        height={720}
        fps={60}
        durationInFrames={5760}
        defaultProps={{
          nativeServer: "http://127.0.0.1:3361",
          mode: "study",
          cut: "social",
        }}
      />
      <Composition
        id="WordleStudyWalkthrough"
        component={NativeProductFilm}
        width={1280}
        height={720}
        fps={60}
        durationInFrames={30600}
        defaultProps={{
          nativeServer: "http://127.0.0.1:3361",
          mode: "study",
          cut: "pitch",
        }}
      />
      <Composition
        id="WordleStudySmoke"
        component={NativeProductFilm}
        width={1280}
        height={720}
        fps={60}
        durationInFrames={360}
        defaultProps={{
          nativeServer: "http://127.0.0.1:3361",
          mode: "study",
          cut: "social",
          frameOffset: 2280,
        }}
      />
    </>
  );
}
registerRoot(WordleCompositions);
