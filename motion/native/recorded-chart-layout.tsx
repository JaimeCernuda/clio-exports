import { createContext, useContext, useMemo, type ReactNode } from "react";

const ChartLayout = createContext<Record<string, number>>({});
/** Reflow native vector plots for a film inspection, leaving their rows and encodings intact. */
export function RecordedChartLayout({
  heights,
  children,
}: {
  heights: Record<string, number>;
  children: ReactNode;
}) {
  return (
    <ChartLayout.Provider value={heights}>{children}</ChartLayout.Provider>
  );
}
/** Read an optional local plot height; ordinary transcript views retain their saved layout. */
export function useRecordedChartHeight(id: string): number | undefined {
  return useContext(ChartLayout)[id];
}

/** Resize a saved top-level plot without changing its data, domain or mark encodings. */
export function useRecordedChartSpec<T>(id: string, spec: T): T {
  const height = useRecordedChartHeight(id);
  return useMemo(() => {
    if (
      height === undefined ||
      !spec ||
      typeof spec !== "object" ||
      !("height" in spec) ||
      typeof spec.height !== "number" ||
      spec.height === height
    )
      return spec;
    return { ...spec, height };
  }, [spec, height]);
}
