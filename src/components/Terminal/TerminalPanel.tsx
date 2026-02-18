import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { useEditorStore } from "../../store";
import TerminalSettings from "./TerminalSettings";

/* ─────────────────────────────────────────────
   🔒 GLOBAL TERMINAL REGISTRY (SURVIVES UNMOUNT)
   ───────────────────────────────────────────── */

type TerminalInstance = {
  term: Terminal;
  fit: FitAddon;
  unlisten: UnlistenFn | null;
};

const TERMINAL_REGISTRY: Record<string, TerminalInstance> = {};

/* ───────────────────────────────────────────── */

export default function TerminalPanel({
  workspaceId,
  workspaceRoot,
}: {
  workspaceId: string | null;
  workspaceRoot: string | null;
}) {
  const {
    terminals,
    activeTerminalId,
    addTerminal,
    setActiveTerminal,
    closeTerminal,
    toggleTerminalPanel,
  } = useEditorStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  /* ─────────────────────────────────────────────
     🧪 DEBUG — PROVES UNMOUNT / REMOUNT SAFETY
     ───────────────────────────────────────────── */
  useEffect(() => {
    console.log("=== TERMINAL PANEL DEBUG ===");
    console.log("Active ID:", activeTerminalId);
    console.log("Store terminal count:", terminals.length);
    console.log("Registry keys:", Object.keys(TERMINAL_REGISTRY));
    console.log("Container exists:", !!containerRef.current);
    console.log(
      "Container size:",
      containerRef.current?.clientWidth,
      containerRef.current?.clientHeight
    );
    console.log("Is maximized:", isMaximized);
    console.log("============================");
  });

  /* ─────────────────────────────────────────────
     SPAWN TERMINAL (ONCE — NEVER RECREATED)
     ───────────────────────────────────────────── */
  const spawnTerminal = async (shell: string | null, label: string) => {
    const [id, resolvedShell] = await invoke<[string, string]>(
      "terminal_spawn",
      {
        shell,
        cwd: workspaceRoot ?? undefined,
      }
    );

    if (TERMINAL_REGISTRY[id]) {
      console.warn("⚠️ Terminal already exists:", id);
      setActiveTerminal(id);
      return;
    }

    console.log("🟢 Spawning terminal:", id);

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "block",
      fontFamily: "monospace",
      fontSize: 14,
      lineHeight: 1.2,
      theme: { background: "#1e1e1e", foreground: "#cccccc" },
    });

    const fit = new FitAddon();
    term.loadAddon(fit);

    const unlisten = await listen<[string, string]>(
      "terminal-output",
      (e) => {
        if (e.payload[0] !== id) return;
        TERMINAL_REGISTRY[id]?.term.write(e.payload[1]);
      }
    );

    TERMINAL_REGISTRY[id] = { term, fit, unlisten };

    addTerminal({
      id,
      shell: resolvedShell,
      label,
      workspaceId: workspaceId ?? `blank-${Date.now()}`,
      active: true,
    });

    setActiveTerminal(id);

    await invoke("terminal_ready", { id });

    term.onData((data) => {
      invoke("terminal_write", { id, data });
    });
  };

  /* ─────────────────────────────────────────────
     ATTACH ACTIVE TERMINAL (ON REMOUNT / TOGGLE)
     ───────────────────────────────────────────── */
  useEffect(() => {
    const id = activeTerminalId;
    if (!id || !containerRef.current) return;

    const instance = TERMINAL_REGISTRY[id];
    if (!instance) {
      console.warn("❌ No terminal instance found for:", id);
      return;
    }

    console.log("🔗 Attaching terminal to DOM:", id);

    containerRef.current.innerHTML = "";
    instance.term.open(containerRef.current);

    requestAnimationFrame(() => {
      instance.fit.fit();
      invoke("terminal_resize", {
        id,
        rows: instance.term.rows,
        cols: instance.term.cols,
      });
      invoke("terminal_redraw", { id });
    });
  }, [activeTerminalId, terminals.length, isMaximized]);

  /* ─────────────────────────────────────────────
     RESIZE OBSERVER
     ───────────────────────────────────────────── */
  useEffect(() => {
    if (!containerRef.current) return;

    const resize = () => {
      const id = activeTerminalId;
      if (!id) return;

      const instance = TERMINAL_REGISTRY[id];
      if (!instance) return;

      requestAnimationFrame(() => {
        instance.fit.fit();
        invoke("terminal_resize", {
          id,
          rows: instance.term.rows,
          cols: instance.term.cols,
        });
      });
    };

    const observer = new ResizeObserver(resize);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [activeTerminalId]);

  /* ─────────────────────────────────────────────
     CLOSE TERMINAL FOR REAL
     ───────────────────────────────────────────── */
  const closeTerminalSafe = (id: string) => {
    const instance = TERMINAL_REGISTRY[id];

    if (instance) {
      console.log("🧹 Disposing terminal:", id);
      instance.term.dispose();
      if (instance.unlisten) instance.unlisten();
      delete TERMINAL_REGISTRY[id];
    }

    closeTerminal(id);
  };

  /* ─────────────────────────────────────────────
     EMPTY STATE
     ───────────────────────────────────────────── */
  if (terminals.length === 0) {
    return (
      <div className="flex flex-col w-full h-full bg-default border-t border-default">
        <div className="flex items-center justify-between px-2 h-9 bg-muted border-b border-default">
          <div className="flex gap-3 text-xs text-muted">
            {["PROBLEMS", "OUTPUT", "DEBUG CONSOLE", "PORTS", "TERMINAL"].map(
              (v) => (
                <button
                  key={v}
                  className={v === "TERMINAL" ? "text-default font-medium" : ""}
                >
                  {v}
                </button>
              )
            )}
          </div>
          <div className="flex items-center gap-2 text-muted">
            <TerminalSettings onSpawn={spawnTerminal} />
            <button onClick={toggleTerminalPanel}>✕</button>
          </div>
        </div>
        <div className="flex-1 bg-black flex items-center justify-center text-muted">
          No terminals open. Click + to create one.
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────
     MAIN RENDER
     ───────────────────────────────────────────── */
  return (
    <div
      className={`flex flex-col w-full h-full bg-default border-t border-default ${
        isMaximized ? "fixed top-0 left-0 w-full h-full z-50" : ""
      }`}
    >
      <div className="flex items-center justify-between px-2 h-9 bg-muted border-b border-default">
        <div className="flex gap-3 text-xs text-muted">
          {["PROBLEMS", "OUTPUT", "DEBUG CONSOLE", "PORTS", "TERMINAL"].map(
            (v) => (
              <button
                key={v}
                className={v === "TERMINAL" ? "text-default font-medium" : ""}
              >
                {v}
              </button>
            )
          )}
        </div>

        <div className="flex items-center gap-2 text-muted">
          <TerminalSettings onSpawn={spawnTerminal} />
          <button onClick={() => setIsMaximized((v) => !v)}>
            {isMaximized ? "🗗" : "▢"}
          </button>
          <button onClick={toggleTerminalPanel}>✕</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div ref={containerRef} className="flex-1 bg-black" />

        <div className="w-40 border-l border-default bg-muted text-xs overflow-y-auto">
          {terminals.map((t) => (
            <div
              key={t.id}
              className={`flex justify-between items-center px-3 h-10 cursor-pointer group ${
                t.id === activeTerminalId
                  ? "bg-default text-foreground border-l-4 border-l-foreground font-medium"
                  : "text-default hover:bg-neutral-500"
              }`}
              onClick={() => setActiveTerminal(t.id)}
            >
              <span className="flex-1 truncate">{t.label ?? t.shell}</span>
              <button
                className="ml-2 text-red-500 opacity-0 group-hover:opacity-100 text-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  invoke("terminal_kill", { id: t.id }).catch(() => {});
                  closeTerminalSafe(t.id);
                }}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
