import http from "node:http";
import { createReadStream } from "node:fs";
import { stat, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  process.env.CLIO_SPOTTER_REVIEW_ROOT ??
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../out/spotter-v2",
    ),
);
const gallery = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../native/spotter-investigation-review.html",
);
const types = {
  ".html": "text/html; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".json": "application/json",
};
/** Local read-only review server with range requests for precise video seeking. */
const server = http.createServer(async (req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" });
      res.end();
      return;
    }
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.pathname === "/") {
      res.writeHead(200, { "Content-Type": types[".html"] });
      res.end(await readFile(gallery));
      return;
    }
    const name = decodeURIComponent(url.pathname.slice(1));
    const file = path.resolve(root, name);
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) {
      res.writeHead(404);
      res.end();
      return;
    }
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/u);
    const start = range ? Number(range[1]) : 0,
      end =
        range && range[2]
          ? Math.min(Number(range[2]), info.size - 1)
          : info.size - 1;
    if (start >= info.size || start > end) {
      res.writeHead(416, { "Content-Range": `bytes */${info.size}` });
      res.end();
      return;
    }
    res.writeHead(range ? 206 : 200, {
      "Content-Type": types[path.extname(file)] ?? "application/octet-stream",
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      ...(range
        ? { "Content-Range": `bytes ${start}-${end}/${info.size}` }
        : {}),
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    const stream = createReadStream(file, { start, end });
    stream.on("error", () => res.destroy());
    stream.pipe(res);
  } catch (error) {
    if (!res.headersSent) res.writeHead(error.code === "ENOENT" ? 404 : 500);
    res.end("Review file unavailable");
  }
});
server.listen(
  Number(process.env.CLIO_SPOTTER_REVIEW_PORT ?? 3360),
  "127.0.0.1",
  () => {
    const address = server.address();
    if (address && typeof address === "object")
      console.log(`SPOTTER review: http://127.0.0.1:${address.port}/`);
  },
);
