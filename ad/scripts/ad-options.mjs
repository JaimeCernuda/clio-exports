import { parseRenderArgs } from "./render-options.mjs";

/** Keep the standalone ad at 1080p by default without changing the shared CLI grammar. */
export function parseAdRenderArgs(args) {
  const options = parseRenderArgs([
    ...(args.length ? args : ["stills"]),
    ...(!args.includes("--composition")
      ? ["--composition", "ClioComposableAd"]
      : []),
    ...(!args.includes("--scale") ? ["--scale", "1"] : []),
  ]);
  if (options.composition !== "ClioComposableAd")
    throw new Error("This project only renders ClioComposableAd");
  return options;
}

export const adRenderHelp = `Usage: node render.mjs stills|video [options]
  --scale NUMBER         DPI scale (default 1: 1920x1080)
  --frames 480,560,934    Still frame numbers
  --props PATH           JSON props relative to ad/
  --output PATH.mp4      Video destination relative to ad/
  --concurrency NUMBER   Render pages, 1 through 8 (default 2)
Use npm run measure for the current inspection frame set.
`;
