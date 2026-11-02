import { Composition, registerRoot } from "remotion";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import { ComposableFilm } from "./ComposableFilm";
import { COMPOSABLE_FRAMES } from "./composable-plan";

function ComposableCompositions() {
  return (
    <Composition
      id="ClioComposable"
      component={ComposableFilm}
      width={1920}
      height={1080}
      fps={60}
      durationInFrames={COMPOSABLE_FRAMES}
      defaultProps={{}}
    />
  );
}
registerRoot(ComposableCompositions);
