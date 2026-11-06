import React from "react";
import { WebsiteLoop } from "../../src/WebsiteLoop";
/** Editable long website loop for hypothesis. Shared timing is in website/src/plan.ts. */
export function Scene({ review = false }: { review?: boolean }) {
  return <WebsiteLoop assetKey="hypothesis-long" review={review} />;
}
