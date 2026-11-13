import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  demoPlan,
  validateDemo,
  type DemoScene,
  type DemoSpec,
} from "../native/current/demo-model";
import { sceneAssetPath } from "../native/scene-selection";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "native/public");
const temp = path.join(root, ".native-ui/current-demo");
await mkdir(temp, { recursive: true });
process.env.TEMP = temp;
process.env.TMP = temp;
process.env.TMPDIR = temp;
const [command = "plan", file = "demos/tahoe-current.json", ...args] =
  process.argv.slice(2);
sceneAssetPath(file);
const specText = await readFile(path.join(publicDir, file), "utf8");
const spec = JSON.parse(specText) as DemoSpec;
sceneAssetPath(spec.sceneFile);
const sceneText = await readFile(path.join(publicDir, spec.sceneFile), "utf8");
const scene = JSON.parse(sceneText) as DemoScene;
validateDemo(spec, scene);
const plan = demoPlan(spec, scene);
const pin = JSON.parse(
  await readFile(path.join(root, "native/source-current.json"), "utf8"),
);
if (command === "plan") {
  console.log(
    JSON.stringify(
      {
        id: spec.id,
        ui: pin,
        source: scene.source,
        sessionId: scene.session.id,
        frames: spec.frames,
        fps: spec.fps,
        events: plan.events,
        pocket: spec.pocket,
      },
      null,
      2,
    ),
  );
} else if (command === "render" || command === "stills") {
  const response = await fetch("http://127.0.0.1:3372/clio-ui-source.json");
  if (!response.ok || (await response.json()).revision !== pin.revision)
    throw new Error(
      "Start the matching current UI server on port 3372 before rendering",
    );
  const previewHtmlSha256 = createHash("sha256")
    .update(await (await fetch("http://127.0.0.1:3372/")).text())
    .digest("hex");
  const props = path.join(temp, `${spec.id}-${process.pid}-props.json`);
  await writeFile(
    props,
    JSON.stringify({
      demoFile: file,
      sceneFile: spec.sceneFile,
      frames: spec.frames,
    }),
  );
  const output = path.resolve(root, args[0] ?? `out/current-ui/${spec.id}.mp4`);
  if (
    path.parse(output).root.toLowerCase() !==
    path.parse(root).root.toLowerCase()
  )
    throw new Error("Keep demo output on the project drive");
  const renderArgs = [
    path.join(root, "render.mjs"),
    command === "render" ? "video" : "stills",
    "--composition",
    "ClioCurrentDemo",
    "--props",
    props,
    "--scale",
    "1",
    "--concurrency",
    "1",
  ];
  if (command === "render") renderArgs.push("--output", output);
  else if (args.length) renderArgs.push("--frames", args.join(","));
  const status = await new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, renderArgs, {
      cwd: root,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
  if (status !== 0) throw new Error(`Current UI render failed (${status})`);
  if (command === "render") {
    const hash = createHash("sha256");
    for await (const bytes of createReadStream(output)) hash.update(bytes);
    await writeFile(
      `${output}.json`,
      JSON.stringify(
        {
          schema: "clio.demo-render.v1",
          manifest: file,
          manifestSha256: createHash("sha256").update(specText).digest("hex"),
          sceneSha256: createHash("sha256").update(sceneText).digest("hex"),
          previewHtmlSha256,
          ui: pin,
          source: scene.source,
          sessionId: scene.session.id,
          frames: spec.frames,
          fps: spec.fps,
          width: 1920,
          height: 1080,
          output,
          sha256: hash.digest("hex"),
          review:
            "Rendering is complete; visual acceptance is recorded separately.",
        },
        null,
        2,
      ) + "\n",
    );
  }
} else throw new Error("Choose plan, render or stills");
