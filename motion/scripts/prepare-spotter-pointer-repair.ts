import { readFile, writeFile } from "node:fs/promises";
import {
  spotterPointerMotionRanges,
  type PointerProfile,
} from "../native/current/spotter-pointer";

const data = JSON.parse(
  await readFile("native/current/spotter-pointer.json", "utf8"),
) as { profiles: PointerProfile[] };
const profile = data.profiles.find(
  (p) => p.width === 1920 && p.height === 1080,
);
if (!profile) throw new Error("Missing approved capture profile");
const ranges = spotterPointerMotionRanges(profile, 420, 12600);
const plan = {
  schema: "clio.spotter-pointer-repair.v1",
  first: 420,
  end: 12600,
  handles: 12,
  ranges,
  frames: ranges.reduce((n, [a, b]) => n + b - a, 0),
  reason:
    "Remove inherited wall-clock transitions from the cursor portal; retain unchanged idle footage.",
};
await writeFile(
  ".native-ui/spotter-v3-pointer-repair.json",
  JSON.stringify(plan, null, 2),
);
console.log(plan);
