import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const project = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const roots = {
  build: path.join(project, ".native-ui/engineering-build"),
  review: path.join(project, "out"),
};
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".vtt": "text/vtt; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".srt": "text/plain; charset=utf-8",
};
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url ?? "/", "http://127.0.0.1").pathname,
    );
    const review = pathname.startsWith("/review/");
    const root = review ? roots.review : roots.build;
    const relative = review ? pathname.slice(8) : pathname.slice(1);
    const filename = path.resolve(root, relative || "engineering.html");
    if (!filename.startsWith(root + path.sep)) {
      response.writeHead(403);
      response.end();
      return;
    }
    const info = await stat(filename);
    if (!info.isFile()) {
      response.writeHead(404);
      response.end();
      return;
    }
    const headers = {
      "Content-Type":
        types[path.extname(filename)] ?? "application/octet-stream",
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-cache",
    };
    const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    let start = 0,
      end = info.size - 1,
      status = 200;
    if (range) {
      start = Number(range[1]);
      end = range[2] ? Math.min(info.size - 1, Number(range[2])) : end;
      status = 206;
    }
    if (start > end || start >= info.size) {
      response.writeHead(416, { "Content-Range": `bytes */${info.size}` });
      response.end();
      return;
    }
    response.writeHead(status, {
      ...headers,
      "Content-Length": end - start + 1,
      ...(range
        ? { "Content-Range": `bytes ${start}-${end}/${info.size}` }
        : {}),
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(filename, { start, end })
      .on("error", () => response.destroy())
      .pipe(response);
  } catch (error) {
    response.writeHead(error?.code === "ENOENT" ? 404 : 500);
    response.end();
  }
}).listen(3365, "127.0.0.1", () =>
  console.log(
    "Engineering preview http://127.0.0.1:3365/engineering.html?cut=full | film review /review/engineering-review.html",
  ),
);
