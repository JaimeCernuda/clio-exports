import { Composition, registerRoot } from "remotion";
import "@fontsource-variable/inter";
import { ComposableAd } from "./ComposableAd";
import { copy } from "./composable-ad-plan";

function AdCompositions() {
  return (
    <Composition
      id="ClioComposableAd"
      component={ComposableAd}
      width={1920}
      height={1080}
      fps={60}
      durationInFrames={copy.frames}
      defaultProps={{}}
    />
  );
}
registerRoot(AdCompositions);
