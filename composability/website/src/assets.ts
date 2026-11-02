import { config as many } from "../many-agents/plan";
import { config as one } from "../one-composable-agent/plan";
import { config as composition } from "../plugin-composition/plan";
export const assets = [many, one, composition];
export type Asset = (typeof assets)[number];
/** Restrict renders to known asset folders before touching the browser or disk. */
export function selectAssets(names: readonly string[]): Asset[] {
  if (!names.length) return assets;
  return names.map((name) => {
    const asset = assets.find((item) => item.folder === name);
    if (!asset) throw new Error(`Unknown website asset: ${name}`);
    return asset;
  });
}
