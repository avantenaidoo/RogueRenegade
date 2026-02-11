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

  /* ───────────── SPAWN TERMINAL PER WORKSPACE ───────────── */
    useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({ cursorBlink: true });
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
    <div className="flex flex-col w-full h-full bg-default border-t border-default">

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
            <button onClick={() => {/* maximize */}}>▢</button>
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
                className={`px-2 py-1 cursor-pointer ${
                t.id === activeTerminalId ? "bg-default text-default" : ""
                }`}
                onClick={() => setActiveTerminal(t.id)}
            >
                {t.shell}
            </div>
            ))}
        </div>
        </div>
    </div>
    );

}
