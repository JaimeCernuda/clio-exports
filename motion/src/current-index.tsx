import { Composition, registerRoot } from "remotion";
import { CurrentDemo } from "./CurrentDemo";

function CurrentRoot() {
  return (
    <Composition
      id="ClioCurrentDemo"
      component={CurrentDemo}
      width={1920}
      height={1080}
      fps={60}
      durationInFrames={2400}
      defaultProps={{
        demoFile: "demos/tahoe-current.json",
        frames: 2400,
      }}
      calculateMetadata={({ props }) => {
        if (Array.isArray(props.sourceFrames)) {
          if (
            !props.sourceFrames.length ||
            props.sourceFrames.some(
              (frame) =>
                typeof frame !== "number" ||
                !Number.isSafeInteger(frame) ||
                frame < 0,
            )
          )
            throw new Error("Invalid current source-frame selection");
          return { durationInFrames: props.sourceFrames.length };
        }
        if (
          typeof props.frames !== "number" ||
          !Number.isSafeInteger(props.frames) ||
          props.frames < 1
        )
          throw new Error("Invalid current demo duration");
        return { durationInFrames: props.frames };
      }}
    />
  );
}
registerRoot(CurrentRoot);
