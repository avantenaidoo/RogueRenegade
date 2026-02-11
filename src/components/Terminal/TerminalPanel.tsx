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
  } = useEditorStore(); // ✅ hook call at top-level

  const prevWorkspaceIdRef = useRef<string | null>(null);
  
  const terminalIdRef = useRef<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [terminalId, setTerminalId] = useState<string | null>(null);

  const [isMaximized, setIsMaximized] = useState(false);


  /* ───────────── SPAWN TERMINAL PER WORKSPACE ───────────── */
    useEffect(() => {
      if (!workspaceId || !containerRef.current) return;

        // 🔥 REUSE EXISTING TERMINAL FOR THIS WORKSPACE
        const existing = terminals.find(t => t.workspaceId === workspaceId);
        if (existing) {
            terminalIdRef.current = existing.id;
            setTerminalId(existing.id);
            return; // exit early, do not spawn a new terminal
        }

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

    term.onData((data) => {
        if (terminalIdRef.current) {
        invoke("terminal_write", {
            id: terminalIdRef.current,
            data,
        });
        }
    });

    termRef.current = term;
    fitRef.current = fit;

    // 🔥 ONLY SPAWN WHEN WORKSPACE ACTUALLY CHANGES
    if (prevWorkspaceIdRef.current !== workspaceId) {
        console.log("[TERMINAL][FE] spawning for workspace", workspaceId);

        invoke<[string, string]>("terminal_spawn", {
        shell: null,
        cwd: workspaceRoot ?? undefined,
        }).then(([id, shell]) => {
        terminalIdRef.current = id;
        setTerminalId(id);

        addTerminal({
            id,
            shell,
            workspaceId: workspaceId!,
            active: true,
        });
        });


        prevWorkspaceIdRef.current = workspaceId;
    }

    const unlistenPromise = listen<[string, string]>(
        "terminal-output",
        (e) => {
        const [id, output] = e.payload;
        if (id === terminalIdRef.current) {
            term.write(output);
        }
        }
    );

    return () => {
        // 🚫 DO NOT KILL BACKEND TERMINAL ON REFRESH
        unlistenPromise.then((u) => u());
        term.dispose();
    };
    }, [workspaceId, workspaceRoot]);




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
            <button onClick={() => setIsMaximized(prev => !prev)}>
                {isMaximized ? '🗗' : '▢'}
            </button>
            <button onClick={() => closeTerminal(activeTerminalId!)}>✕</button>
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
