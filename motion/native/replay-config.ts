export interface ReplayWorkbench {
  searchCall?: string;
  connectCall?: string;
  downloadCall?: string;
  datasetId?: string;
  tabs: Array<{ surfaceId: string; label: string; artifactId?: string }>;
}
