import { offlineStyle as baseOfflineStyle } from "@clio-ui/components/clio/map-initial-view";
import context from "./map-context/tahoe-usgs.json";
import { usesTahoeContext } from "./map-context-selection";

export * from "@clio-ui/components/clio/map-initial-view";

/** Add georeferenced local reference imagery below the unchanged scientific layers. */
export function offlineStyle() {
  const base = baseOfflineStyle();
  if (!usesTahoeContext(location.search)) return base;
  return {
    ...base,
    sources: {
      ...base.sources,
      "offline-land": {
        ...base.sources["offline-land"],
        attribution: "Natural Earth / USGS The National Map",
      },
      "cached-usgs-context": {
        type: "image" as const,
        url: new URL(context.image, document.baseURI).href,
        coordinates: context.coordinates,
      },
    },
    layers: [
      ...base.layers,
      {
        id: "cached-usgs-context",
        type: "raster" as const,
        source: "cached-usgs-context",
        paint: {
          "raster-opacity": 0.86,
          "raster-saturation": -0.25,
          "raster-fade-duration": 0,
        },
      },
    ],
  };
}
