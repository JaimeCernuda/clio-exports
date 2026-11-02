import path from "node:path";
for (const index of [2, 3])
  if (process.argv[index])
    process.argv[index] = path.resolve(process.argv[index]);
await import("../../composability/ad/scripts/finish.mjs");
