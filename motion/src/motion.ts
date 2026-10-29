import { Easing, interpolate } from "remotion";

/** Editorial easing shared by geometry, camera and disclosure transitions. */
export const progress = (frame: number, from: number, to: number): number =>
  interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
/** Interpolate a layout dimension without resampling a bitmap. */
export const mix = (from: number, to: number, amount: number): number =>
  from + (to - from) * amount;
export const FPS = 60;
export const FRAMES = 900;
