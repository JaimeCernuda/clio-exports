/** Resolve an explicit UI generation without silently changing a historical film. */
export function nativeProfile(name = "default") {
  const historicalEntries = [
    "entry.tsx",
    "workspace.tsx",
    "recorded-prompt.tsx",
    "recorded-paragraph.tsx",
    "recorded-thinking.tsx",
    "spotter-notification.ts",
    "map-context.ts",
  ];
  const profiles = {
    default: {
      sourceFile: "source.json",
      config: "vite.config.mjs",
      entries: [
        "entry.tsx",
        "workspace.tsx",
        "recorded-prompt.tsx",
        "recorded-paragraph.tsx",
        "recorded-thinking.tsx",
        "spotter-notification.ts",
        "map-context.ts",
      ],
    },
    opal: {
      sourceFile: "source-opal.json",
      config: "vite.config.mjs",
      entries: historicalEntries,
    },
    wordle: {
      sourceFile: "source-opal.json",
      config: "vite.config.mjs",
      entries: [...historicalEntries, "study-entry.tsx"],
    },
    engineering: {
      sourceFile: "source-opal.json",
      config: "engineering.vite.config.mjs",
      entries: [...historicalEntries, "engineering-entry.tsx"],
    },
    current: {
      sourceFile: "source-current.json",
      config: "current/vite.config.mjs",
      entries: ["current/entry.tsx"],
    },
  };
  if (!Object.hasOwn(profiles, name))
    throw new Error(`Unknown native profile: ${name}`);
  return profiles[name];
}
