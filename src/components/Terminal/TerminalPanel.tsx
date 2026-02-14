import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { useEditorStore } from "../../store";
import TerminalSettings from "./TerminalSettings";

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

  const terminalIdRef = useRef<string | null>(null);
  const activeIdRef = useRef<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  const didSetupRef = useRef(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const forceUpdateRef = useRef(0);

  // Force-sync ref on ANY Zustand active change
  useEffect(() => {
    const unsubscribe = useEditorStore.subscribe((state) => {
      if (state.activeTerminalId !== activeIdRef.current) {
        console.log(
          "[ZUSTAND SUB DEBUG] Active changed via subscribe to:", state.activeTerminalId
        );
        activeIdRef.current = state.activeTerminalId;
      }
    });

    return unsubscribe;
  }, []);

  /* ───────────── SPAWN & SETUP ───────────── */
  useEffect(() => {
    console.log("[TERMINAL][DEBUG] Mounting for workspace:", workspaceId);

    if (!workspaceId || !containerRef.current) return;

    if (!termRef.current) {
      const term = new Terminal({
        cursorBlink: true,
        cursorStyle: 'block',
        fontFamily: 'monospace',
        fontSize: 14,
        lineHeight: 1.2,
        theme: {
          background: '#1e1e1e',
          foreground: '#cccccc',
        },
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(containerRef.current);
      fit.fit();

      console.log("[TERMINAL][DEBUG] Created xterm instance");

      termRef.current = term;
      fitRef.current = fit;

      term.onData((data) => {
        const target = activeIdRef.current || terminalIdRef.current;
        console.log("[INPUT DEBUG] Typed:", JSON.stringify(data), "→ to:", target);
        if (target) {
          invoke("terminal_write", { id: target, data });
        } else {
          console.warn("[INPUT DEBUG] NO TARGET - keystroke dropped");
        }
      });
    }

    if (didSetupRef.current) {
      console.log("[TERMINAL][SKIP] Already setup");
      return;
    }

    didSetupRef.current = true;

    (async () => {
      console.log("[TERMINAL][DEBUG] First-time setup");

      const existing = terminals.find(t => t.workspaceId === workspaceId);

      let id: string;
      let shell: string;

      if (existing) {
        id = existing.id;
        shell = existing.shell;
        console.log("[TERMINAL][REUSE] Using:", id);
      } else {
        [id, shell] = await invoke<[string, string]>("terminal_spawn", {
          shell: null,
          cwd: workspaceRoot ?? undefined,
        });
        addTerminal({ id, shell, workspaceId: workspaceId!, active: true });
        console.log("[TERMINAL][SPAWN] New:", id);
      }

      terminalIdRef.current = id;
      activeIdRef.current = id;
      setActiveTerminal(id);

      console.log("[TERMINAL][DEBUG] IDs synced:", { terminalIdRef: terminalIdRef.current, activeRef: activeIdRef.current });

      const unlisten = await listen<[string, string]>("terminal-output", (e) => {
        const [outId, output] = e.payload;
        const current = activeIdRef.current || terminalIdRef.current;
        console.log("[OUTPUT DEBUG] From:", outId, "active:", current);
        if (outId === current && termRef.current) {
          termRef.current.write(output);
          console.log("[OUTPUT DEBUG] Written");
        } else {
          console.log("[OUTPUT DEBUG] Ignored");
        }
      });

      return () => {
        console.log("[TERMINAL][UNMOUNT] Cleanup");
        unlisten();
        if (termRef.current) {
          termRef.current.dispose();
          termRef.current = null;
          fitRef.current = null;
        }
      };
    })();
  }, [workspaceId, workspaceRoot]);

  // Refit & resize on active change
  useEffect(() => {
    if (!activeTerminalId || !termRef.current || !fitRef.current) return;

    console.log("[REFIT DEBUG] Active switch to:", activeTerminalId);
    activeIdRef.current = activeTerminalId;

    fitRef.current.fit();
    invoke("terminal_resize", {
      id: activeTerminalId,
      rows: termRef.current.rows,
      cols: termRef.current.cols,
    }).catch(console.error);

    termRef.current.write('\r');
  }, [activeTerminalId, forceUpdateRef.current]);

  // Container resize observer
  useEffect(() => {
    if (!containerRef.current || !fitRef.current) return;

    const resize = () => {
      console.log("[RESIZE DEBUG] Container resize");
      fitRef.current!.fit();
      const target = activeIdRef.current || terminalIdRef.current;
      if (target && termRef.current) {
        invoke("terminal_resize", {
          id: target,
          rows: termRef.current.rows,
          cols: termRef.current.cols,
        }).catch(console.error);
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  const spawnTerminal = async (shell: string | null) => {
    console.log("[SPAWN DEBUG] Starting spawn with shell:", shell);
    const currentRoot = workspaceRoot ?? undefined;

    const [id, resolvedShell] = await invoke<[string, string]>("terminal_spawn", {
      shell,
      cwd: currentRoot,
    });

    const fallbackWsId = workspaceId ?? `blank-${Date.now()}`;

    useEditorStore.getState().addTerminal({
      id,
      shell: resolvedShell,
      workspaceId: fallbackWsId,
      active: true,
    });

    useEditorStore.getState().setActiveTerminal(id);
    console.log("[SPAWN DEBUG] Spawn complete - set active:", id);
  };

  return (
    <div className={`flex flex-col w-full h-full bg-default border-t border-default ${
        isMaximized ? 'fixed top-0 left-0 w-full h-full z-50' : ''
    }`}>
      <div className="flex items-center justify-between px-2 h-9 bg-muted border-b border-default">
        <div className="flex gap-3 text-xs text-muted">
          {["PROBLEMS", "OUTPUT", "DEBUG CONSOLE", "PORTS", "TERMINAL"].map(v => (
            <button key={v} className={v === "TERMINAL" ? "text-default font-medium" : ""}>
              {v}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-muted">
          <TerminalSettings onSpawn={spawnTerminal} />
          <button onClick={() => setIsMaximized(prev => !prev)}>
            {isMaximized ? '🗗' : '▢'}
          </button>
          <button onClick={toggleTerminalPanel}>✕</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div ref={containerRef} className="flex-1 bg-black" />

        <div className="w-40 border-l border-default bg-muted text-xs">
          {terminals.map(t => (
            <div
              key={t.id}
              className={`flex justify-between items-center px-3 h-10 cursor-pointer relative group ${
                t.id === activeTerminalId ? "bg-default text-default" : ""
              }`}
            >
              <span
                onClick={() => {
                  console.log(
                    "[TAB CLICK DEBUG] Click:", t.id, "shell:", t.shell,
                    "old active:", activeTerminalId
                  );
                  setActiveTerminal(t.id);
                  activeIdRef.current = t.id; // IMMEDIATE sync (bypass batching)
                  forceUpdateRef.current += 1; // Force re-render to trigger effects
                }}
              >
                {t.shell}
              </span>

              <button
                className="ml-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-lg"
                onClick={() => {
                  if (t.id) {
                    console.log("[KILL DEBUG] Killing:", t.id);
                    invoke("terminal_kill", { id: t.id }).catch(console.error);
                  }
                  closeTerminal(t.id);
                }}
                title="Close"
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