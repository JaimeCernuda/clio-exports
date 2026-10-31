import { createRoot } from "react-dom/client";
import { StudyReplayApp } from "./study-replay-app";

const container = document.getElementById("root");
if (!container) throw new Error("The study replay needs a root container");
createRoot(container).render(<StudyReplayApp />);
