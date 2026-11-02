import { createServer, type Server } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** Serve the asset gallery locally, including byte ranges for native video seeking. */
export function createPreviewServer(directory: string): Server {
  const root = path.resolve(directory),
    types: Record<string, string> = {
      ".html": "text/html; charset=utf-8",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".gif": "image/gif",
      ".png": "image/png",
      ".json": "application/json",
    };
  return createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
          new URL(req.url ?? "/", "http://localhost").pathname,
        ),
        file = path.resolve(
          root,
          "." + (pathname === "/" ? "/preview.html" : pathname),
        );
      if (pathname.includes("\\") || !file.startsWith(root + path.sep)) {
        res.writeHead(403).end();
        return;
      }
      const info = await stat(file);
      if (!info.isFile()) {
        res.writeHead(404).end();
        return;
      }
      res.setHeader(
        "Content-Type",
        types[path.extname(file)] ?? "application/octet-stream",
      );
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Cache-Control", "no-store");
      let start = 0,
        end = info.size - 1;
      if (req.headers.range) {
        const match = /^bytes=(\d+)-(\d*)$/u.exec(req.headers.range);
        if (!match) {
          res.writeHead(416, { "Content-Range": `bytes */${info.size}` }).end();
          return;
        }
        start = Number(match[1]);
        end = match[2] ? Math.min(Number(match[2]), end) : end;
        if (start > end || start >= info.size) {
          res.writeHead(416, { "Content-Range": `bytes */${info.size}` }).end();
          return;
        }
        res.statusCode = 206;
        res.setHeader("Content-Range", `bytes ${start}-${end}/${info.size}`);
      }
      res.setHeader("Content-Length", end - start + 1);
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      const stream = createReadStream(file, { start, end });
      stream.on("error", (error) => res.destroy(error));
      stream.pipe(res);
    } catch (error) {
      if (error instanceof URIError) {
        res.writeHead(400).end();
        return;
      }
      const missing =
        error instanceof Error && "code" in error && error.code === "ENOENT";
      res.writeHead(missing ? 404 : 500).end();
    }
  });
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  createPreviewServer(path.resolve(import.meta.dirname, "..")).listen(
    3380,
    "127.0.0.1",
    () => console.log("Website loop gallery: http://127.0.0.1:3380/"),
  );
}
