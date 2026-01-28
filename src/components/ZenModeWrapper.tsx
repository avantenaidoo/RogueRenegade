// src/components/ZenModeWrapper.tsx
import React, { useState, createContext, useContext } from "react";

interface ZenModeContextValue {
  zen: boolean;
  toggleZen: () => void;
}

const ZenModeContext = createContext<ZenModeContextValue | undefined>(undefined);

export function useZenMode() {
  const ctx = useContext(ZenModeContext);
  if (!ctx) throw new Error("useZenMode must be inside ZenModeWrapper");
  return ctx;
}

export default function ZenModeWrapper({ children }: { children: React.ReactNode }) {
  const [zen, setZen] = useState(false);

  const toggleZen = () => setZen(!zen);

  return (
    <ZenModeContext.Provider value={{ zen, toggleZen }}>
      {/* <div style={{ height: "100%", position: "relative" }}> */}
      <div className="h-full w-full bg-black">
        {/* Toggle button */}
        <button
          onClick={toggleZen}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 1000,
            padding: "5px 10px",
            borderRadius: 4,
            border: "1px solid gray",
            background: zen ? "#ff0" : "#ddd",
          }}
        >
          {zen ? "Exit Zen" : "Zen Mode"}
        </button>

        {/* Editor + panels */}
        <div
          style={{
            height: "100%",
            background: zen ? "#222" : "inherit",
          }}
        >
          {children}
        </div>
      </div>
    </ZenModeContext.Provider>
  );
}
