import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const folder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../out/native-downloads",
);
await mkdir(folder, { recursive: true });
/** Preserve the actual Blob produced by CLIO's native download handler as render evidence. */
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:3357");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  try {
    if (req.method !== "POST" || !req.url?.startsWith("/export/"))
      throw new Error("Unsupported export request");
    const name = decodeURIComponent(req.url.slice("/export/".length));
    if (name !== path.basename(name) || !/^.+\.(png|svg|jpg)$/i.test(name))
      throw new Error("Invalid export filename");
    const target = path.resolve(folder, name);
    if (!target.startsWith(folder + path.sep))
      throw new Error("Export escapes capture folder");
    const chunks = [];
    let bytes = 0;
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 20 * 1024 * 1024)
        throw new Error("Native export exceeds 20 MiB");
      chunks.push(chunk);
    }
    const content = Buffer.concat(chunks);
    await writeFile(target, content);
    const receipt = {
      name,
      bytes,
      sha256: createHash("sha256").update(content).digest("hex"),
    };
    await writeFile(target + ".json", JSON.stringify(receipt, null, 2) + "\n");
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(receipt));
    console.log("CAPTURED " + name + " " + bytes + " bytes");
  } catch (error) {
    res.writeHead(400);
    res.end(String(error));
  }
});
server.listen(3358, "127.0.0.1", () =>
  console.log("Native export capture: http://127.0.0.1:3358"),
);
