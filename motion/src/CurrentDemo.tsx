import { NativeProductFilm } from "./NativeProductFilm";
import { useCurrentFrame } from "remotion";

/** Frame-clock bridge to the separately pinned current production UI. */
export function CurrentDemo({
  demoFile = "demos/tahoe-current.json",
  sceneFile,
  sourceFrames,
}: {
  demoFile?: string;
  sceneFile?: string;
  frames?: number;
  sourceFrames?: number[];
}) {
  const frame = useCurrentFrame();
  const sourceFrame = sourceFrames?.[frame];
  if (sourceFrames && !Number.isSafeInteger(sourceFrame))
    throw new Error("Missing source frame for current UI capture");
  return (
    <NativeProductFilm
      nativeServer="http://127.0.0.1:3372"
      mode="current"
      demoFile={demoFile}
      sceneFile={sceneFile}
      sourceFrame={sourceFrame}
    />
  );
}
