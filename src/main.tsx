import React from "react";
import ReactDOM from "react-dom/client";
import AuthGate from "./auth/AuthGate";
import { bootstrapSecurity } from "./lib/bootstrap";
import "./utils/chart";
import "./App.css";

/* ─────────────────────────
   🔥 ADDED: HARD BAN GATE
   ───────────────────────── */

if (localStorage.getItem("device-banned") === "true") {
  console.error("⛔ DEVICE PERMANENTLY BANNED");
  // 👇 THIS IS WHERE YOUR EXISTING BANNED WINDOW GOES
  throw new Error("DEVICE_BANNED");
}

/* ───────────────────────── */

async function start() {
  console.log("🚀 APP STARTING");

  try {
    console.log("🔐 BOOTSTRAP: starting security bootstrap");
    await bootstrapSecurity();
    console.log("✅ BOOTSTRAP: security complete");
  } catch (err) {
    console.error("❌ BOOTSTRAP FAILED (APP WILL STILL LOAD)", err);
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
