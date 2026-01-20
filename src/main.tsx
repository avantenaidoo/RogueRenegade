import React from "react";
import { IconProvider } from "@once-ui-system/core";
import ReactDOM from "react-dom/client";
import Workspace from "./pages/Workspace";
//import App from "./pages/App";
import './App.css';

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <IconProvider>
      <Workspace />
    </IconProvider>
  </React.StrictMode>,
);
