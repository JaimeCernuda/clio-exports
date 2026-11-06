import React from "react";
import { WebsiteLoop } from "../../src/WebsiteLoop";
/** Editable long website loop for selection. Shared timing is in website/src/plan.ts. */
export function Scene({ review = false }: { review?: boolean }) {
  return <WebsiteLoop assetKey="selection-long" review={review} />;
}
