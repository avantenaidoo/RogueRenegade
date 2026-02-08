import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

export default function TerminalPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [terminalId, setTerminalId] = useState<string | null>(null);

  /* ───────────── SPAWN TERMINAL ONCE ───────────── */
  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({ cursorBlink: true });
    const fit = new FitAddon();

    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();

    term.onData((data) => {
      if (terminalId) {
        invoke("terminal_write", { id: terminalId, data });
      }
    });

    termRef.current = term;
    fitRef.current = fit;

    invoke<string>("terminal_spawn", { shell: null }).then(setTerminalId);

    const unlistenPromise = listen<[string, string]>(
      "terminal-output",
      (e) => {
        const [id, output] = e.payload;
        if (id === terminalId) {
          term.write(output);
        }
      }
    );

    return () => {
      unlistenPromise.then((u) => u());
      if (terminalId) invoke("terminal_kill", { id: terminalId });
      term.dispose();
    };
  }, []); // 👈 IMPORTANT: EMPTY DEP ARRAY

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

  return <div ref={containerRef} className="w-full h-full bg-black" />;
}
