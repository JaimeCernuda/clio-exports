import React from "react";
import { WebsiteLoop } from "../../src/WebsiteLoop";
/** Editable short website loop for tools. Shared timing is in website/src/plan.ts. */
export function Scene({ review = false }: { review?: boolean }) {
  return <WebsiteLoop assetKey="tools-short" review={review} />;
}
