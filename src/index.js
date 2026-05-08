import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// ── Google Fonts — Syne (headings) + DM Sans (body) ──────────
const link = document.createElement("link");
link.rel = "stylesheet";
link.href =
  "https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap";
document.head.appendChild(link);

// ── Meta viewport (should already be in public/index.html) ───
const metaViewport = document.querySelector('meta[name="viewport"]');
if (!metaViewport) {
  const meta = document.createElement("meta");
  meta.name = "viewport";
  meta.content = "width=device-width, initial-scale=1";
  document.head.prepend(meta);
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
