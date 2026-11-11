import { readFile, writeFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import {
  filmPair,
  buildSpotterFilmPlan,
  spotterFilmAt,
} from "../native/spotter-film-plan";
import { prefixAt, type PairedReplay } from "../native/paired-replay";
import { recordedThinkingMarkdown } from "../native/recorded-text-format";
import { videoHash } from "./video-tools";

/** Locate temporary underline syntax in genuine streamed prefixes, with stationary-pointer handles around each correction. */
async function main(): Promise<void> {
  const source = path.resolve(
    fileURLToPath(new URL("../.native-ui/source-ui-f333d67d", import.meta.url)),
  );
  const requireSource = createRequire(path.join(source, "web/package.json"));
  const pnpm = path.join(source, "node_modules/.pnpm");
  const parserPackage = (await readdir(pnpm)).find(
    (n) => n === "remark-parse@11.0.0",
  );
  if (!parserPackage)
    throw new Error("Pinned native remark parser is unavailable");
  const { unified } = await import(
    pathToFileURL(requireSource.resolve("unified")).href
  );
  const { default: remarkParse } = await import(
    pathToFileURL(
      path.join(pnpm, parserPackage, "node_modules/remark-parse/index.js"),
    ).href
  );
  const parser = unified().use(remarkParse);
  type Node = {
    type: string;
    children?: Node[];
    position?: { end: { offset: number }; start: { offset: number } };
  };
  const setext = (node: Node, text: string): boolean =>
    (node.type === "heading" &&
      !!node.position &&
      node.position.end.offset >= text.trimEnd().length &&
      /\n {0,3}[-=]+[ \t]*$/u.test(
        text.slice(node.position.start.offset, node.position.end.offset),
      )) ||
    (node.children?.some((n) => setext(n, text)) ?? false);
  const syntaxCache = new Map<string, boolean>();
  const pair = filmPair(
    JSON.parse(
      await readFile(
        new URL(
          "../native/public/opal-chainB-7795459.native.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as PairedReplay,
  );
  const root = new URL("../out/spotter-v2/", import.meta.url);
  const poses = JSON.parse(
    await readFile(
      new URL("spotter-opal-investigation-v2.mp4.cursor.raw.json", root),
      "utf8",
    ),
  ) as Record<string, { x: number; y: number }>;
  const blocks = pair.sessions.flatMap((s) =>
    s.blocks.flatMap((b) => {
      const part = s.view.messages
        .find((m) => m.id === b.messageId)
        ?.blocks.find((p) => p.id === b.blockId);
      return part?.type === "reasoning" && part.text
        ? [{ ...b, points: [...part.text] }]
        : [];
    }),
  );
  const bad: number[] = [];
  const end = buildSpotterFilmPlan(pair).frames;
  for (let frame = 420; frame < 15000; frame++) {
    const clock = spotterFilmAt(pair, frame);
    if (clock.inspectionId) continue;
    for (const b of blocks) {
      if (clock.source < b.start || clock.source >= b.end) continue;
      const count = prefixAt(b.checkpoints, clock.source);
      if (!count || count >= b.points.length) continue;
      const text = b.points.slice(0, count).join("");
      if (recordedThinkingMarkdown(text, true) !== text) {
        const key = b.blockId + ":" + count;
        if (!syntaxCache.has(key))
          syntaxCache.set(key, setext(parser.parse(text) as Node, text));
        if (!syntaxCache.get(key)) continue;
        bad.push(frame);
        break;
      }
    }
  }
  const parked = (f: number) =>
    poses[f] &&
    Math.abs(poses[f].x - 1260) < 0.1 &&
    Math.abs(poses[f].y - 775) < 0.1;
  const observedChangeFrames = [
    2444, 2848, 10904, 2913, 3407, 2901, 3443, 3530, 1184, 2836, 3548, 7724,
  ].map((f) => f - 450);
  const raw = [...new Set([...bad, ...observedChangeFrames])].map((f) => {
    let start = Math.max(420, f - 8),
      stop = Math.min(15000, f + 9);
    while (start > 420 && !(parked(start) && parked(start - 1))) start--;
    while (stop < 15000 && !(parked(stop) && parked(stop + 1))) stop++;
    return { start, end: stop };
  });
  raw.push({ start: 15000, end });
  raw.sort((a, b) => a.start - b.start);
  const ranges: { start: number; end: number }[] = [];
  for (const r of raw) {
    const previous = ranges.at(-1);
    if (previous && r.start <= previous.end)
      previous.end = Math.max(previous.end, r.end);
    else ranges.push({ ...r });
  }
  const frames = ranges.flatMap((r) =>
    Array.from({ length: r.end - r.start }, (_, i) => r.start + i),
  );
  const manifest = {
    sourceSha256: pair.source.sha256,
    baseSha256: await videoHash(
      fileURLToPath(new URL("spotter-opal-investigation-v2.mp4", root)),
    ),
    badFrames: bad,
    observedChangeFrames,
    ranges,
    frames,
  };
  await writeFile(
    new URL("../native/spotter-text-repairs.json", import.meta.url),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      badFrames: bad.length,
      ranges,
      renderFrames: frames.length,
    }),
  );
}
await main();
