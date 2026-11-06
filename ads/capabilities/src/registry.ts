export type FilmId =
  | "method"
  | "hypothesis"
  | "team"
  | "interface"
  | "provenance"
  | "tools"
  | "selection"
  | "streams";
export type Film = {
  id: FilmId;
  number: number;
  title: string;
  domain: string;
  seconds: number;
  color: string;
  light: string;
  markers: { at: number; label: string }[];
};
export const films: Film[] = [
  {
    id: "method",
    number: 1,
    title: "Bring your method.",
    domain: "Engineering",
    seconds: 32,
    color: "#c26d30",
    light: "#ffe8cf",
    markers: [
      { at: 0, label: "The method" },
      { at: 4, label: "A flow takes shape" },
      { at: 10, label: "Execute" },
      { at: 17, label: "Review and revise" },
      { at: 23, label: "Updated result" },
      { at: 27, label: "Build with us" },
    ],
  },
  {
    id: "hypothesis",
    number: 2,
    title: "What if we’re wrong?",
    domain: "Physics",
    seconds: 34,
    color: "#7257bf",
    light: "#e9e0ff",
    markers: [
      { at: 0, label: "The claim" },
      { at: 4, label: "Numerical experiment" },
      { at: 11, label: "Where it breaks" },
      { at: 17, label: "Science log grows" },
      { at: 24, label: "A better claim" },
      { at: 29, label: "Build with us" },
    ],
  },
  {
    id: "team",
    number: 3,
    title: "Workflows as complex as your science.",
    domain: "Environmental science",
    seconds: 40,
    color: "#218a7b",
    light: "#d8f2e9",
    markers: [
      { at: 0, label: "The question" },
      { at: 4, label: "Start the investigation flow" },
      { at: 5, label: "Parallel preparation flows" },
      { at: 8, label: "Concurrent specialists" },
      { at: 10, label: "Inside a subagent flow" },
      { at: 18, label: "Join the results" },
      { at: 22, label: "Evidence triggers a follow-up" },
      { at: 29, label: "Combined finding" },
      { at: 35, label: "Build with us" },
    ],
  },
  {
    id: "interface",
    number: 4,
    title: "The answer is an interface.",
    domain: "Climate",
    seconds: 30,
    color: "#247eaf",
    light: "#dceffb",
    markers: [
      { at: 0, label: "A usable answer" },
      { at: 4, label: "Build the view" },
      { at: 9, label: "Change baseline" },
      { at: 15, label: "Focus on months" },
      { at: 21, label: "Export" },
      { at: 25, label: "Build with us" },
    ],
  },
  {
    id: "provenance",
    number: 5,
    title: "Show me where that came from.",
    domain: "Geospatial analysis",
    seconds: 30,
    color: "#327c75",
    light: "#d9efeb",
    markers: [
      { at: 0, label: "A result" },
      { at: 4, label: "Inspect evidence" },
      { at: 10, label: "The geometry" },
      { at: 16, label: "The source" },
      { at: 21, label: "Return to the result" },
      { at: 25, label: "Build with us" },
    ],
  },
  {
    id: "tools",
    number: 6,
    title: "Your tools. Your sources. Your science.",
    domain: "Genomics",
    seconds: 32,
    color: "#ad4e86",
    light: "#f8ddeb",
    markers: [
      { at: 0, label: "Your workbench" },
      { at: 4, label: "Connect sources" },
      { at: 10, label: "A program calls the tools" },
      { at: 17, label: "Compute the summary" },
      { at: 22, label: "An inspectable result" },
      { at: 27, label: "Build with us" },
    ],
  },
  {
    id: "selection",
    number: 7,
    title: "Ask your data.",
    domain: "Meteorology",
    seconds: 34,
    color: "#3679aa",
    light: "#dcecf8",
    markers: [
      { at: 0, label: "Point to evidence" },
      { at: 4, label: "Select observations" },
      { at: 10, label: "Reference this" },
      { at: 15, label: "Ask a precise question" },
      { at: 20, label: "Read and analyse the selection" },
      { at: 24, label: "An answer grounded in the records" },
      { at: 29, label: "Build with us" },
    ],
  },
  {
    id: "streams",
    number: 8,
    title: "Tap into your experiment.",
    domain: "Observations and simulation",
    seconds: 40,
    color: "#127f89",
    light: "#d9f2f0",
    markers: [
      { at: 0, label: "A changing signal" },
      { at: 4, label: "Start background work" },
      { at: 10, label: "Live context" },
      { at: 17, label: "Ask without restarting" },
      { at: 23, label: "A live dashboard" },
      { at: 28, label: "Wind readings drive a transport model" },
      { at: 32, label: "A meaningful notification" },
      { at: 35, label: "Build with us" },
    ],
  },
];
export const getFilm = (id: string): Film => {
  const film = films.find((f) => f.id === id);
  if (!film) throw new Error(`Unknown film ${id}`);
  return film;
};
