import React from "react";
import ReactDOM from "react-dom/client";
import AuthGate from "./auth/AuthGate";
import { bootstrapSecurity } from "./lib/bootstrap";
import "./utils/chart";
import "./App.css";

async function start() {
  console.log("🚀 APP STARTING");

  try {
    console.log("🔐 BOOTSTRAP: starting security bootstrap");
    await bootstrapSecurity();
    console.log("✅ BOOTSTRAP: security complete");
  } catch (err) {
    console.error("❌ BOOTSTRAP FAILED (APP WILL STILL LOAD)", err);

    // 🔥 CRITICAL: DO NOT HARD STOP
    // We allow the UI to mount so you can see errors, devtools, UI, etc.
  }

  const rootEl = document.getElementById("root");

  if (!rootEl) {
    console.error("❌ ROOT ELEMENT NOT FOUND");
    return;
  }

  console.log("🎨 MOUNTING REACT APP");

  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <AuthGate />
    </React.StrictMode>
  );
}

start();
