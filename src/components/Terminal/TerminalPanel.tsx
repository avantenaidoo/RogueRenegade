import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { useEditorStore } from "../../store";


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
  } = useEditorStore(); // ✅ hook call at top-level

  // REMOVE: prevWorkspaceIdRef - no longer needed, as we handle reuse properly without it
  // const prevWorkspaceIdRef = useRef<string | null>(null);
  
  const terminalIdRef = useRef<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  const didSetupRef       = useRef(false);
  const [terminalId, setTerminalId] = useState<string | null>(null);

  const [isMaximized, setIsMaximized] = useState(false);


  /* ───────────── SPAWN TERMINAL PER WORKSPACE ───────────── */
    useEffect(() => {
      // ADD: Debug log for mounting
      console.log("[TERMINAL][DEBUG] Mounting TerminalPanel for workspace:", workspaceId);

      if (!workspaceId || !containerRef.current) return;

      // 🔥 ALWAYS CREATE A NEW FRONTEND XTERM INSTANCE ON MOUNT (this was the core issue - previously skipped on reuse)
      const term = new Terminal({
          cursorBlink: true,
          cursorStyle: 'block',       // match VS Code cursor
          fontFamily: 'monospace',    // monospace font like VS Code
          fontSize: 14,               // adjust font size to match VS Code
          lineHeight: 1.2,            // adjust line spacing
          theme: {
              background: '#1e1e1e',   // VS Code dark background
              foreground: '#cccccc',   // VS Code text color
          },
      });
      const fit = new FitAddon();

      term.loadAddon(fit);
      term.open(containerRef.current);
      fit.fit();

      // ADD: Debug log for xterm creation
      console.log("[TERMINAL][DEBUG] Created new xterm frontend instance");

      termRef.current = term;
      fitRef.current = fit;

      // 🔥 HANDLE BACKEND: REUSE IF EXISTS, SPAWN IF NOT (moved spawn logic here, removed prev check)
      // Only run setup logic ONCE — even under Strict Mode double mount
      if (didSetupRef.current) {
        console.log("[TERMINAL][SKIP] Already set up this component instance");
        return;
      }

      (async () => {
        didSetupRef.current = true;  // Mark as done immediately (sync)

        console.log("[TERMINAL][DEBUG] Starting terminal setup (first time)");

        // ─── CHECK EXISTING IN STORE ───
        const existing = terminals.find(t => t.workspaceId === workspaceId);

        let id: string;
        let shell: string;

        if (existing) {
          console.log("[TERMINAL][REUSE] Found existing terminal →", existing.id);
          id = existing.id;
          shell = existing.shell;
        } else {
          console.log("[TERMINAL][SPAWN] No terminal found → spawning new");
          [id, shell] = await invoke<[string, string]>("terminal_spawn", {
            shell: null,
            cwd: workspaceRoot ?? undefined,
          });

          addTerminal({
            id,
            shell,
            workspaceId: workspaceId!,
            active: true,
          });

          console.log("[TERMINAL][SPAWN] Added new terminal →", id);
        }

        terminalIdRef.current = id;
        setTerminalId(id);
        setActiveTerminal(id);

        // Setup xterm → backend write listener
        const removeOnData = term.onData((data) => {
          if (terminalIdRef.current) {
            invoke("terminal_write", { id: terminalIdRef.current, data });
          }
        });

        // Setup backend → xterm listener
        const unlisten = await listen<[string, string]>("terminal-output", (e) => {
          const [outId, output] = e.payload;
          if (outId === terminalIdRef.current) {
            term.write(output);
          }
        });

        console.log("[TERMINAL][DEBUG] Setup complete for terminal ID:", id);

        // Cleanup on unmount (will run twice in Strict Mode, but safe)
        return () => {
          console.log("[TERMINAL][UNMOUNT] Cleaning up frontend for ID:", id);
          unlisten();
          removeOnData.dispose();
          term.dispose();
          termRef.current = null;
          fitRef.current = null;
          // IMPORTANT: do NOT set didSetupRef.current = false here
          // We want to remember we already spawned across Strict Mode's fake unmount
        };
      })();
    }, [workspaceId, workspaceRoot]); // Dependencies unchanged




  /* ───────────── RESIZE HANDLING ───────────── */
  useEffect(() => {
    if (!terminalId || !termRef.current || !fitRef.current || !containerRef.current) {
      return;
    }

    const resize = () => {
      fitRef.current!.fit();

      invoke("terminal_resize", {
        id: terminalId,
        rows: termRef.current!.rows,
        cols: termRef.current!.cols,
      }).catch(console.error);
    };

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [terminalId]);

    return (
    <div className={`flex flex-col w-full h-full bg-default border-t border-default ${
        isMaximized ? 'fixed top-0 left-0 w-full h-full z-50' : ''
    }`}>

        {/* HEADER */}
        <div className="flex items-center justify-between px-2 h-9 bg-muted border-b border-default">

        {/* LEFT: VIEW SELECTOR */}
        <div className="flex gap-3 text-xs text-muted">
            {["PROBLEMS", "OUTPUT", "DEBUG CONSOLE", "PORTS", "TERMINAL"].map(v => (
            <button
                key={v}
                className={v === "TERMINAL" ? "text-default font-medium" : ""}
            >
                {v}
            </button>
            ))}
        </div>

        {/* RIGHT: ACTIONS */}
        <div className="flex items-center gap-2 text-muted">
            {/* NEW + BUTTON */}
             <button
                onClick={() => {
                    // Spawn new terminal for current workspace
                    (async () => {
                        const wsId = workspaceId;
                        if (!wsId || !workspaceRoot) return;

                        console.log("[TERMINAL][NEW] Creating additional terminal");

                        const [id, shell] = await invoke<[string, string]>("terminal_spawn", {
                            shell: null,
                            cwd: workspaceRoot ?? undefined,
                        });

                        useEditorStore.getState().addTerminal({
                            id,
                            shell,
                            workspaceId: wsId,
                            active: true,
                        });

                        // Optional: switch to the new one
                        useEditorStore.getState().setActiveTerminal(id);
                    })();
                }}
                title="New Terminal"
                className="text-xl hover:text-default leading-none" 
                disabled={!workspaceId || !workspaceRoot}
            >
                <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 20 20" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-default"
                >
                    <path 
                        d="M10 4V16M4 10H16" 
                        stroke="currentColor" 
                        strokeWidth="1" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                    />
                </svg>
            </button>
            <button onClick={() => setIsMaximized(prev => !prev)}>
                {isMaximized ? '🗗' : '▢'}
            </button>
            <button 
                onClick={toggleTerminalPanel}
                title="Toggle Terminal Panel"
            >
                ✕
            </button>
        </div>
        </div>

        {/* TERMINAL BODY */}
        <div className="flex flex-1 overflow-hidden">

        {/* LEFT TERMINAL */}
        <div ref={containerRef} className="flex-1 bg-black" />


        {/* RIGHT TERMINAL LIST */}
        <div className="w-40 border-l border-default bg-muted text-xs">
           {terminals.map(t => (
                <div
                    key={t.id}
                    className={`flex justify-between items-center px-3 h-10 cursor-pointer relative group ${
                        t.id === activeTerminalId ? "bg-default text-default" : ""
                    }`}
                >
                    {/* Tab label */}
                    <span onClick={() => setActiveTerminal(t.id)}>{t.shell}</span>

                    {/* Trash icon appears on hover */}
                    <button
                        className="ml-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-lg"
                        onClick={() => {
                            // dispose xterm if active
                            if (t.id === terminalIdRef.current && termRef.current) {
                                termRef.current.dispose();
                                termRef.current = null;
                                fitRef.current = null;
                                terminalIdRef.current = null;
                                setTerminalId(null);
                            }

                            // ADD: Kill backend terminal on explicit close (assuming 'terminal_kill' exists in your Rust backend; if not, implement it there)
                            if (t.id) {
                              console.log("[TERMINAL][DEBUG] Killing backend terminal ID:", t.id);
                              invoke("terminal_kill", { id: t.id }).catch(console.error);
                            }

                            // remove from store
                            closeTerminal(t.id);
                        }}
                        title="Close terminal"
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