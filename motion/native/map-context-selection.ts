/** Keep the Tahoe reference raster out of unrelated recorded sessions. */
export function usesTahoeContext(search: string): boolean {
  const query = new URLSearchParams(search);
  const scene = query.get("scene");
  if (scene) return scene === "tahoe.native.json";
  const campaign = query.get("campaign");
  return !campaign || campaign === "tahoe";
}
