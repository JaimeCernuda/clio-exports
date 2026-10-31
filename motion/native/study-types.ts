export type StudyChoices = {
  branch?: string;
  entry?: string;
  mode?: "list" | "graph" | "views";
  flowSelection?: string;
  viewEntry?: string;
  sourcesEntry?: string;
  seed?: string;
  seedMenu?: boolean;
  seedQuery?: string;
  toolCall?: string;
  graphScope?: "all" | "linked";
};
