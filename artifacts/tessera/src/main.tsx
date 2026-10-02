import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { applyTheme } from "./lib/theme-constants";

applyTheme(localStorage.getItem("tessera-accent") || "cyan");

createRoot(document.getElementById("root")!).render(<App />);
