type Paint = { source: string; image: HTMLImageElement; url: string };
const paints = new WeakMap<SVGSVGElement, Paint>();

/** Preserve authored chart typography while rejecting corrupt or invalid glyph sizes. */
export function vectorFontSize(
  attribute: string | null,
  computed: string,
): string {
  const authored = Number.parseFloat(attribute ?? "");
  if (Number.isFinite(authored) && authored > 0) return `${authored}px`;
  const size = Number.parseFloat(attribute ?? computed);
  return `${Number.isFinite(size) && size > 0 && size <= 32 ? size : 12}px`;
}

/** Paint native Vega vectors in an isolated SVG image to avoid Chromium's transformed text cache. */
export async function paintVectorCharts(): Promise<void> {
  const roots = Array.from(
    document.querySelectorAll<SVGSVGElement>(".replay-window svg.marks"),
  );
  for (const svg of roots) {
    if (svg.closest(".replay-preload")) continue;
    const hiddenSurface = svg.closest<HTMLElement>("[data-canvas-surface]");
    if (hiddenSurface?.style.visibility === "hidden") continue;
    const width = svg.width.baseVal.value,
      height = svg.height.baseVal.value;
    if (width <= 0 || height <= 0) continue;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.classList.remove("replay-vector-source");
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("viewBox", `0 0 ${width} ${height}`);
    const ratio =
      (svg.getBoundingClientRect().width / width) * devicePixelRatio;
    clone.setAttribute("width", String(width * ratio));
    clone.setAttribute("height", String(height * ratio));
    const texts = Array.from(svg.querySelectorAll("text"));
    Array.from(clone.querySelectorAll("text")).forEach((node, index) => {
      const original = texts[index],
        style = getComputedStyle(original);
      node.style.fontSize = vectorFontSize(
        original.getAttribute("font-size"),
        style.fontSize,
      );
      node.style.fontFamily = style.fontFamily;
      node.style.fontWeight = style.fontWeight;
      node.style.fontStyle = style.fontStyle;
      node.style.fill = style.fill;
    });
    const source = new XMLSerializer().serializeToString(clone);
    const existing = paints.get(svg);
    const image = existing?.image ?? document.createElement("img");
    image.dataset.nativeVectorPaint = "true";
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    const parent = svg.parentElement!;
    if (getComputedStyle(parent).position === "static")
      parent.style.position = "relative";
    const bounds = svg.getBoundingClientRect(),
      parentBounds = parent.getBoundingClientRect();
    const localRatio = bounds.width / width;
    Object.assign(image.style, {
      position: "absolute",
      left: `${(bounds.left - parentBounds.left) / localRatio}px`,
      top: `${(bounds.top - parentBounds.top) / localRatio}px`,
      width: `${width}px`,
      height: `${height}px`,
      pointerEvents: "none",
      maxWidth: "none",
    });
    if (existing?.source !== source) {
      const url = URL.createObjectURL(
        new Blob([source], { type: "image/svg+xml" }),
      );
      image.src = url;
      await image.decode();
      if (!image.isConnected) parent.append(image);
      if (existing) URL.revokeObjectURL(existing.url);
      paints.set(svg, { source, image, url });
    }
    svg.classList.add("replay-vector-source");
  }
}
