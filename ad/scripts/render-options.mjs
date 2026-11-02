/** Parse rendering options without starting Chrome, bundling code or mutating files. */
export function parseRenderArgs(args) {
  const mode = args[0] ?? "stills";
  if (!["stills", "video"].includes(mode))
    throw new Error("Mode must be stills or video");
  const result = {
    mode,
    composition: "ClioProof",
    scale: mode === "video" ? 2 : 1,
    frames: [],
    propsFile: null,
    output: null,
    concurrency: 2,
    help: false,
  };
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help") {
      result.help = true;
      continue;
    }
    if (arg.startsWith("--")) {
      if (
        ![
          "--composition",
          "--scale",
          "--frames",
          "--props",
          "--output",
          "--concurrency",
        ].includes(arg)
      )
        throw new Error(`Unknown option: ${arg}`);
      const value = args[++i];
      if (value === undefined || value.startsWith("--"))
        throw new Error(`Missing value: ${arg}`);
      if (arg === "--composition") result.composition = value;
      if (arg === "--scale") result.scale = Number(value);
      if (arg === "--frames") {
        if (value.split(",").some((frame) => !frame.trim()))
          throw new Error("Frame list contains an empty value");
        result.frames.push(...value.split(",").map(Number));
      }
      if (arg === "--props") result.propsFile = value;
      if (arg === "--output") result.output = value;
      if (arg === "--concurrency") result.concurrency = Number(value);
    } else if (mode === "stills") result.frames.push(Number(arg));
    else if (i === 1) result.scale = Number(arg);
    else throw new Error(`Unexpected argument: ${arg}`);
  }
  if (!/^[A-Za-z0-9_-]+$/.test(result.composition))
    throw new Error("Invalid composition ID");
  if (!Number.isFinite(result.scale) || result.scale < 0.25 || result.scale > 4)
    throw new Error("Scale must be between 0.25 and 4");
  if (
    !Number.isInteger(result.concurrency) ||
    result.concurrency < 1 ||
    result.concurrency > 8
  )
    throw new Error("Concurrency must be an integer from 1 to 8");
  if (result.frames.some((frame) => !Number.isSafeInteger(frame) || frame < 0))
    throw new Error("Frames must be nonnegative integers");
  if (mode === "video" && result.frames.length)
    throw new Error("--frames applies only to stills");
  if (mode === "stills" && result.output)
    throw new Error("--output applies only to video");
  if (result.output && !result.output.toLowerCase().endsWith(".mp4"))
    throw new Error("Video output must end in .mp4");
  return result;
}

export const renderHelp = `Usage: node render.mjs stills|video [options]
  --composition ID       Registered composition (default ClioProof)
  --scale NUMBER         Output DPI scale (video 2, stills 1)
  --frames 50,130,270     Still frames; positional frames also work
  --props PATH           JSON input props, relative to motion/
  --output PATH.mp4      Video destination, relative to motion/
  --concurrency NUMBER   Render pages, 1 through 8 (default 2)
Legacy: npm run render -- 1, npm run stills -- 130 270
`;
