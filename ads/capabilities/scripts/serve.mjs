/** Local-only review server, including range requests and downloadable final movies. */
import http from "node:http";
import path from "node:path";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import {
  reviewPath,
  reviewTypes,
  reviewDownloadName,
} from "./review-paths.mjs";
const root = path.resolve(import.meta.dirname, ".."),
  port = Number(process.env.PORT ?? 3381);
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    const relative = reviewPath(decodeURIComponent(url.pathname));
    if (!relative) {
      res.writeHead(403);
      res.end();
      return;
    }
    const file = path.resolve(root, "." + relative);
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const stat = await fs.stat(file);
    if (!stat.isFile())
      throw Object.assign(new Error("Not a file"), { code: "ENOENT" });
    const headers = {
      "content-type":
        reviewTypes[path.extname(file)] ?? "application/octet-stream",
      "accept-ranges": "bytes",
      "cache-control": "no-cache",
    };
    if (url.searchParams.has("download"))
      headers["content-disposition"] =
        `attachment; filename="${reviewDownloadName(relative)}"`;
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    let stream;
    if (range) {
      const start = Number(range[1]),
        end = Math.min(
          stat.size - 1,
          range[2] ? Number(range[2]) : stat.size - 1,
        );
      if (start > end || start >= stat.size) {
        res.writeHead(416, { "content-range": `bytes */${stat.size}` });
        res.end();
        return;
      }
      res.writeHead(206, {
        ...headers,
        "content-range": `bytes ${start}-${end}/${stat.size}`,
        "content-length": end - start + 1,
      });
      stream = createReadStream(file, { start, end });
    } else {
      res.writeHead(200, { ...headers, "content-length": stat.size });
      stream = createReadStream(file);
    }
    // Seeking/closing a video aborts its HTTP response. Release the Windows file
    // handle as well, so a validated replacement can be published while reviewing.
    res.on("close", () => stream.destroy());
    stream.on("error", () => res.destroy());
    stream.pipe(res);
  } catch (error) {
    res.writeHead(error.code === "ENOENT" ? 404 : 500);
    res.end("File unavailable");
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(`REVIEW http://127.0.0.1:${port}/`),
);
