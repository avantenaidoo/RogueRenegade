import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { useEditorStore } from "../../store";
import TerminalSettings from "./TerminalSettings";

type TerminalInstance = {
  term: Terminal;
  fit: FitAddon;
  unlisten: UnlistenFn | null;
  dataHandlerSet: boolean;
};

const TERMINAL_REGISTRY: Record<string, TerminalInstance> = {};

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

  const spawnTerminal = async (
    shell: string | null,
    label: string,
    id?: string
  ) => {
    const [terminalId, resolvedShell] = id
      ? [id, shell ?? "bash"]
      : await invoke<[string, string]>("terminal_spawn", {
          shell,
          cwd: workspaceRoot ?? undefined,
        });

    if (TERMINAL_REGISTRY[terminalId]) {
      setActiveTerminal(terminalId);
      await invoke("terminal_ready", { id: terminalId });
      return;
    }

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

    // Debug: key presses inside terminal
    term.attachCustomKeyEventHandler((e: KeyboardEvent) => {
      console.debug(
        `[DEBUG-KEY] key=${e.key} ctrl=${e.ctrlKey} alt=${e.altKey} shift=${e.shiftKey}`
      );
      return true; // allow all keys
    });

    // Add to registry before attaching onData/listeners
    TERMINAL_REGISTRY[terminalId] = { term, fit, unlisten: null, dataHandlerSet: false };

    // Attach onData only once
    if (!TERMINAL_REGISTRY[terminalId].dataHandlerSet) {
      term.onData((data) => {
        console.debug(`[DEBUG-BODY] onData fired: "${data}"`);
        invoke("terminal_write", { id: terminalId, data });
      });
      TERMINAL_REGISTRY[terminalId].dataHandlerSet = true;
    }

    // Listen for terminal output once
    if (!TERMINAL_REGISTRY[terminalId].unlisten) {
      const unlisten = await listen<[string, string]>("terminal-output", (e) => {
        if (e.payload[0] !== terminalId) return;
        TERMINAL_REGISTRY[terminalId]?.term.write(e.payload[1]);
      });
      TERMINAL_REGISTRY[terminalId].unlisten = unlisten;
    }

    if (!id) {
      addTerminal({
        id: terminalId,
        shell: resolvedShell,
        label,
        workspaceId: workspaceId ?? `blank-${Date.now()}`,
        active: true,
      });
    }

    setActiveTerminal(terminalId);
    await invoke("terminal_ready", { id: terminalId });
  };

  // Attach active terminal to DOM
  useEffect(() => {
    const attach = async () => {
      if (!containerRef.current || !activeTerminalId) return;

      let instance = TERMINAL_REGISTRY[activeTerminalId];

      // Spawn if missing
      if (!instance) {
        const t = terminals.find((t) => t.id === activeTerminalId);
        if (t) {
          await spawnTerminal(t.shell, t.label ?? "Terminal", t.id);
          instance = TERMINAL_REGISTRY[activeTerminalId];
        }
      }

      if (!instance) return;

      containerRef.current.innerHTML = "";
      instance.term.open(containerRef.current);

      requestAnimationFrame(() => {
        instance.fit.fit();
        instance.term.focus();
        invoke("terminal_resize", {
          id: activeTerminalId,
          rows: instance.term.rows,
          cols: instance.term.cols,
        });
        invoke("terminal_redraw", { id: activeTerminalId });
      });
    };

    attach();
  }, [activeTerminalId, terminals.length, isMaximized]);

  // Restore live terminals on mount
  useEffect(() => {
    const restore = async () => {
      const liveTerminals: { id: string; shell: string }[] =
        await invoke("terminal_list");

      for (const t of liveTerminals) {
        if (!TERMINAL_REGISTRY[t.id]) {
          await spawnTerminal(t.shell, t.shell, t.id);
        }
      }
    };
    restore();
  }, []);

  // Resize observer
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

  // Close terminal safely
  const closeTerminalSafe = (id: string) => {
    const instance = TERMINAL_REGISTRY[id];
    if (instance) {
      instance.term.dispose();
      instance.unlisten?.();
      delete TERMINAL_REGISTRY[id];
    }
    invoke("terminal_kill", { id }).catch(() => {});
    closeTerminal(id);
  };

  if (terminals.length === 0) {
    return (
      <div className="flex flex-col w-full h-full bg-default border-t border-default">
        <div className="flex items-center justify-between px-2 h-9 bg-muted border-b border-default">
          <div className="text-xs text-muted">TERMINAL</div>
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

  return (
    <div
      className={`flex flex-col w-full h-full bg-default border-t border-default ${
        isMaximized ? "fixed top-0 left-0 w-full h-full z-50" : ""
      }`}
    >
      <div className="flex items-center justify-between px-2 h-9 bg-muted border-b border-default">
        <div className="text-xs text-muted">TERMINAL</div>

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
