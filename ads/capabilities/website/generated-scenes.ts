import type { ComponentType } from "react";
import { Scene as Scene0 } from "./method/short/Scene";
import { Scene as Scene1 } from "./method/long/Scene";
import { Scene as Scene2 } from "./hypothesis/short/Scene";
import { Scene as Scene3 } from "./hypothesis/long/Scene";
import { Scene as Scene4 } from "./team/short/Scene";
import { Scene as Scene5 } from "./team/long/Scene";
import { Scene as Scene6 } from "./interface/short/Scene";
import { Scene as Scene7 } from "./interface/long/Scene";
import { Scene as Scene8 } from "./provenance/short/Scene";
import { Scene as Scene9 } from "./provenance/long/Scene";
import { Scene as Scene10 } from "./tools/short/Scene";
import { Scene as Scene11 } from "./tools/long/Scene";
import { Scene as Scene12 } from "./selection/short/Scene";
import { Scene as Scene13 } from "./selection/long/Scene";
import { Scene as Scene14 } from "./streams/short/Scene";
import { Scene as Scene15 } from "./streams/long/Scene";
export const scenes: Record<string, ComponentType<{ review?: boolean }>> = {
  "method-short": Scene0,
  "method-long": Scene1,
  "hypothesis-short": Scene2,
  "hypothesis-long": Scene3,
  "team-short": Scene4,
  "team-long": Scene5,
  "interface-short": Scene6,
  "interface-long": Scene7,
  "provenance-short": Scene8,
  "provenance-long": Scene9,
  "tools-short": Scene10,
  "tools-long": Scene11,
  "selection-short": Scene12,
  "selection-long": Scene13,
  "streams-short": Scene14,
  "streams-long": Scene15,
};
