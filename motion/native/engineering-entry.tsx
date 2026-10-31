import { createRoot } from "react-dom/client";
import { EngineeringSketch } from "./engineering-sketch";
import { EngineeringFilm } from "./engineering-film";
const root = document.getElementById("root");
if (!root) throw new Error("Sketch root missing");
createRoot(root).render(
  new URLSearchParams(location.search).get("cut") === "full" ? (
    <EngineeringFilm />
  ) : (
    <EngineeringSketch />
  ),
);
