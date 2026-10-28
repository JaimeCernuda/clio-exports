export interface DownloadBeat {
  open: number;
  formats: number;
  save: number;
  label: string;
}
/** Keep the real native export menu on a deterministic frame schedule. */
export function downloadPhase(beat: DownloadBeat | undefined, age: number) {
  if (!beat || age < beat.open) return "closed";
  if (age < beat.formats) return "menu";
  if (age < beat.save) return "formats";
  return "saved";
}
