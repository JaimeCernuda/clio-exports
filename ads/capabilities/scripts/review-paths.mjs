/** Limit the local gallery to published media and placement examples. */
export function reviewPath(pathname) {
  const relative =
    pathname === "/"
      ? "/gallery.html"
      : pathname === "/website/"
        ? "/website/gallery.html"
        : pathname;
  if (
    relative === "/gallery.html" ||
    relative.startsWith("/output/") ||
    relative.startsWith("/public/")
  )
    return relative;
  if (
    /^\/website\/(gallery\.html|manifest\.json|output\/clio-capabilities-website\.zip)$/.test(
      relative,
    )
  )
    return relative;
  if (
    /^\/website\/(method|hypothesis|team|interface|provenance|tools|selection|streams)\/(short|long)\/(embed\.html|output\/(loop\.(mp4|webm|gif)|poster\.png))$/.test(
      relative,
    )
  )
    return relative;
  return null;
}
export const reviewTypes = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".gif": "image/gif",
  ".zip": "application/zip",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

/** Give individually downloaded website assets useful, distinct filenames. */
export function reviewDownloadName(relative) {
  const website = relative.match(
    /^\/website\/([a-z]+)\/(short|long)\/output\/(loop\.(mp4|webm|gif)|poster\.png)$/,
  );
  if (website)
    return `${website[1]}-${website[2]}${website[3] === "poster.png" ? "-poster.png" : "." + website[4]}`;
  return relative.split("/").at(-1);
}
