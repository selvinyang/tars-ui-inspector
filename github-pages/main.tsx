import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { InspectorWorkspace } from "../app/workspace";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <InspectorWorkspace />
  </StrictMode>,
);
