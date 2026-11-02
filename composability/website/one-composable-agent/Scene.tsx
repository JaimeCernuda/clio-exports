import { AbsoluteFill, useCurrentFrame } from "remotion";
import { KeywordWheel } from "../src/KeywordWheel";
import { pose, words } from "./plan";
export function OneComposableAgent() {
  return (
    <AbsoluteFill className="website-film">
      <KeywordWheel {...pose(useCurrentFrame())} words={words} />
    </AbsoluteFill>
  );
}
