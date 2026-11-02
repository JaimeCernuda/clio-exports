import { Composition, registerRoot } from "remotion";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "../../ad/src/composable-ad.css";
import "./website.css";
import { ManyAgents } from "../many-agents/Scene";
import { OneComposableAgent } from "../one-composable-agent/Scene";
import { PluginComposition } from "../plugin-composition/Scene";
import { config as many } from "../many-agents/plan";
import { config as one } from "../one-composable-agent/plan";
import { config as composition } from "../plugin-composition/plan";
function Root() {
  return (
    <>
      <Composition
        {...many}
        durationInFrames={many.frames}
        component={ManyAgents}
      />
      <Composition
        {...one}
        durationInFrames={one.frames}
        component={OneComposableAgent}
      />
      <Composition
        {...composition}
        durationInFrames={composition.frames}
        component={PluginComposition}
      />
    </>
  );
}
registerRoot(Root);
