import { offlineStyle as nativeOfflineStyle } from "@clio-ui/components/clio/map-initial-view";
import { offlineStyle as tahoeOfflineStyle } from "../map-context";
export * from "@clio-ui/components/clio/map-initial-view";

/** Apply cached Tahoe context only when the loaded manifest identifies that scene. */
export function offlineStyle() {
  return document.querySelector('[data-demo-map-context="cached-usgs"]')
    ? tahoeOfflineStyle()
    : nativeOfflineStyle();
}
