// src/components/SidebarPanel.tsx
import React from "react";
import { FaFolderOpen, FaCodeBranch, FaPuzzlePiece, FaPlay } from "react-icons/fa";

interface SidebarPanelProps {
  activePanel: string;
  onSelectPanel: (panel: string) => void;
}

const SidebarPanel: React.FC<SidebarPanelProps> = ({ activePanel, onSelectPanel }) => {
  const buttons = [
    {
      name: "explorer",
      tooltip: "Explorer",
      icon: <FaFolderOpen size={20} />,
    },
    {
      name: "sourceControl",
      tooltip: "Source Control",
      icon: <FaCodeBranch size={20} />,
    },
    {
      name: "extensions",
      tooltip: "Extensions",
      icon: <FaPuzzlePiece size={20} />,
    },
    {
      name: "run",
      tooltip: "Run / Debug",
      icon: <FaPlay size={20} />,
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--muted)",
        color: "var(--foreground)",
        width: "56px",
        userSelect: "none",
      }}
    >
      {buttons.map((btn) => (
        <button
          key={btn.name}
          title={btn.tooltip}
          onClick={() => onSelectPanel(btn.name)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "48px",
            width: "100%",
            backgroundColor: activePanel === btn.name ? "#094771" : "transparent",
            border: "none",
            cursor: "pointer",
            color: "inherit",
            transition: "background-color 0.2s",
          }}
          onMouseEnter={(e) => {
            if (activePanel !== btn.name) (e.currentTarget.style.backgroundColor = "#37373D");
          }}
          onMouseLeave={(e) => {
            if (activePanel !== btn.name) (e.currentTarget.style.backgroundColor = "transparent");
          }}
        >
          {btn.icon}
        </button>
      ))}
    </div>
  );
};

export default SidebarPanel;
