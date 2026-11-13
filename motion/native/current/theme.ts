/** Native RC1 palettes; theme IDs are independent of the review dropdown labels. */
export const DEMO_THEMES = [
  { id: "classic-light", label: "Cool · light" },
  { id: "light", label: "Light · warm" },
  { id: "classic-dark", label: "Neutral · dark" },
  { id: "dark", label: "Dark · warm" },
] as const;
export type DemoTheme = (typeof DEMO_THEMES)[number]["id"];

/** Reject an unknown palette rather than silently capturing the wrong appearance. */
export function demoTheme(value: unknown = "classic-light"): DemoTheme {
  if (!DEMO_THEMES.some((theme) => theme.id === value))
    throw new Error(`Unknown native demo theme: ${String(value)}`);
  return value as DemoTheme;
}
