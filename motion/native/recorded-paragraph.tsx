import { createElement, type ComponentProps } from "react";

/** Preserve paragraph boundaries in DOM text for native exact-source selection mapping. */
export function RecordedParagraph({
  children,
  node: _node,
  ...props
}: ComponentProps<"p"> & { node?: unknown }) {
  return createElement("p", props, children, "\n");
}
