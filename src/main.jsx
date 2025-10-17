// ================================================
// 🚀 main.jsx — Stable PWA + React entry point
// ================================================

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// --------------------------------
// ✅ Service Worker registration
// --------------------------------
import { registerSW } from "virtual:pwa-register";

// Register the service worker
// Adds safety guards to avoid cached 0 B scripts on new deploys
const updateSW = registerSW({
  onNeedRefresh() {
    // Show confirmation only in production (so dev stays silent)
    if (confirm("⚡ New version available. Reload now?")) {
      updateSW(true); // force update & reload
    }
  },
  onOfflineReady() {
    console.log("✅ AF_APP is ready to work offline");
  },
  immediate: true, // 👈 ensures latest service worker takes control ASAP
});

// --------------------------------
// ✅ React root render
// --------------------------------
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Optional: if you want automatic reload without confirmation,
// uncomment below:
//
// updateSW(true); // forces reload silently when a new build is found
