import React, { createContext, useContext } from "react";

export type UILabels = {
  workspace: string;
  sidebar: readonly string[];
  standard: string;
  auto: string;
  returned: string;
  running: string;
  openConversation: string;
};

export const defaultLabels: UILabels = {
  workspace: "Research workspace",
  sidebar: ["New conversation", "Conversations", "Tasks", "Sources"],
  standard: "Standard",
  auto: "Auto",
  returned: "Turn ended",
  running: "Running",
  openConversation: "Open conversation",
};
const LabelContext = createContext(defaultLabels);

/** Override interface labels per film without coupling shared components to its copy file. */
export function ClioUIProvider({
  labels,
  children,
}: {
  labels?: Partial<UILabels>;
  children: React.ReactNode;
}) {
  const inherited = useContext(LabelContext);
  return (
    <LabelContext.Provider value={{ ...inherited, ...labels }}>
      {children}
    </LabelContext.Provider>
  );
}

/** Read the nearest composition's labels or CLIO's ordinary interface labels. */
export function useUILabels(): UILabels {
  return useContext(LabelContext);
}
