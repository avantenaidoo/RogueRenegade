import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

export default function TerminalPanel({
  workspaceId,
  workspaceRoot,
}: {
  workspaceId: string | null;
  workspaceRoot: string | null;
}) {
  const prevWorkspaceIdRef = useRef<string | null>(null);
  
  const terminalIdRef = useRef<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [terminalId, setTerminalId] = useState<string | null>(null);

  const displayPath = workspaceRoot ?? "~";



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

        invoke<string>("terminal_spawn", {
        shell: null,
        cwd: workspaceRoot ?? undefined, // blank window = system root
        }).then((id) => {
        terminalIdRef.current = id;
        setTerminalId(id);
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
    <div className="flex flex-col w-full h-full bg-black">
      {/* TERMINAL HEADER (VS CODE / CURSOR STYLE) */}

      {/* TERMINAL CONTENT */}
      <div ref={containerRef} className="flex-1 overflow-hidden" />
    </div>
  );
}
