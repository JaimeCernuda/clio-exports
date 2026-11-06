import { pointerAt } from "../../src/motion";

/** One result lane shared by execution, revision and the moving result's center. */
export const resultLane = 460;
export const stepCenters = [217.5, 622.5, 1027.5, 1432.5];
export const executionRail = "M217.5 289 V375 H1432.5 V289";
export const revisionRail = "M1432.5 289 V375 H622.5 V289";

/** Keep the result attached to its visible route for the whole execution. */
export function methodPayload(t: number): { x: number; y: number } {
  return pointerAt(t, [
    { at: 10, x: stepCenters[0], y: resultLane },
    { at: 12.5, x: stepCenters[1], y: resultLane },
    { at: 14, x: stepCenters[2], y: resultLane },
    { at: 16, x: stepCenters[3], y: resultLane },
    { at: 18, x: stepCenters[3], y: resultLane },
    { at: 20, x: stepCenters[1], y: resultLane },
    { at: 20.6, x: stepCenters[1], y: resultLane },
    { at: 22.5, x: stepCenters[2], y: resultLane },
    { at: 27, x: stepCenters[2], y: resultLane },
  ]);
}
