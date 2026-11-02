import path from "node:path";
if (process.argv[2] && !process.argv[2].startsWith("--"))
  process.argv[2] = path.resolve(process.argv[2]);
process.chdir(path.resolve(import.meta.dirname, "../../ad"));
await import("../../ad/scripts/review");
