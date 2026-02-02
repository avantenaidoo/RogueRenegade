import React from "react";
import ReactDOM from "react-dom/client";
import AuthGate from "./auth/AuthGate";
import "./utils/chart";

//import App from "./pages/App";
import './App.css';

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthGate />
  </React.StrictMode>,
);
