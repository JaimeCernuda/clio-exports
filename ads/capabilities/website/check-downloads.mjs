/** Verify the exact deployment bytes served by the local review gallery. */
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
const root = import.meta.dirname,
  base = process.argv[2] ?? "http://127.0.0.1:3381/website/";
const manifest = JSON.parse(
  await fs.readFile(path.join(root, "manifest.json"), "utf8"),
);
const files = manifest.flatMap((a) =>
  a.files.map((f) => ({
    ...f,
    key: a.key,
    relative: `${a.id}/${a.variant}/output/${f.name}`,
  })),
);
const results = [];
for (let i = 0; i < files.length; i += 4) {
  const batch = await Promise.allSettled(
    files.slice(i, i + 4).map(async (f) => {
      const response = await fetch(new URL(f.relative + "?download=1", base));
      if (!response.ok)
        throw new Error(`${f.relative}: HTTP ${response.status}`);
      const actual = Buffer.from(await response.arrayBuffer());
      if (
        actual.length !== f.bytes ||
        createHash("sha256").update(actual).digest("hex") !== f.sha256
      )
        throw new Error(`Download differs: ${f.relative}`);
      const filename =
        f.name === "poster.png"
          ? `${f.key}-poster.png`
          : `${f.key}.${f.name.split(".")[1]}`;
      if (!response.headers.get("content-disposition")?.includes(filename))
        throw new Error(`Ambiguous download filename: ${f.relative}`);
      return {
        key: f.key,
        file: f.name,
        bytes: f.bytes,
        sha256: f.sha256,
        status: "passed",
      };
    }),
  );
  for (const result of batch) {
    if (result.status === "rejected") throw result.reason;
    results.push(result.value);
  }
}
const handoff = JSON.parse(
  await fs.readFile(path.join(root, "handoff.json"), "utf8"),
);
const response = await fetch(
  new URL("output/clio-capabilities-website.zip?download=1", base),
);
if (!response.ok) throw new Error(`ZIP unavailable: ${response.status}`);
const archive = Buffer.from(await response.arrayBuffer());
if (createHash("sha256").update(archive).digest("hex") !== handoff.sha256)
  throw new Error("ZIP download differs from handoff");
await fs.writeFile(
  path.join(root, "download-verification.json"),
  JSON.stringify(
    {
      base,
      files: results,
      handoff: {
        sha256: handoff.sha256,
        bytes: archive.length,
        status: "passed",
      },
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Verified ${results.length} media downloads and complete ZIP, byte for byte`,
);
